/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
// @ts-nocheck
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

const getAppBaseUrl = (): string => {
  const appBaseUrl = Deno.env.get('APP_BASE_URL');
  if (!appBaseUrl) {
    throw new Error('Missing APP_BASE_URL');
  }

  const normalized = normalizeBaseUrl(appBaseUrl);
  const parsed = new URL(normalized);
  const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

  if (parsed.protocol !== 'https:' && !isLocal) {
    throw new Error('APP_BASE_URL must use HTTPS in production');
  }

  return normalized;
};

const getAllowedOrigins = (appBaseUrl: string): Set<string> => {
  const allowed = new Set<string>([appBaseUrl]);
  const extraOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (!extraOrigins) return allowed;

  for (const origin of extraOrigins.split(',')) {
    const trimmed = origin.trim();
    if (trimmed) {
      allowed.add(normalizeBaseUrl(trimmed));
    }
  }

  return allowed;
};

const getCorsHeaders = (origin: string | null, allowedOrigins: Set<string>, appBaseUrl: string) => {
  const normalizedOrigin = origin ? normalizeBaseUrl(origin) : '';
  const safeOrigin = allowedOrigins.has(normalizedOrigin) ? normalizedOrigin : appBaseUrl;

  return {
    'Access-Control-Allow-Origin': safeOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
};

const getAuthenticatedUser = async (authHeader: string | null) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: new Error('Missing authorization token') };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY') };
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) {
    return { user: null, error: new Error('Unauthorized') };
  }

  return { user: data.user, error: null };
};

serve(async (req) => {
  let appBaseUrl = '';
  let allowedOrigins = new Set<string>();

  try {
    appBaseUrl = getAppBaseUrl();
    allowedOrigins = getAllowedOrigins(appBaseUrl);
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Invalid app base URL configuration' }), {
      status: 500,
      headers: { ...jsonHeaders },
    });
  }

  const corsHeaders = getCorsHeaders(req.headers.get('origin'), allowedOrigins, appBaseUrl);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }

  try {
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    const priceGold = Deno.env.get('STRIPE_PRICE_GOLD');
    const pricePlatinum = Deno.env.get('STRIPE_PRICE_PLATINUM');

    if (!stripeSecret) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, ...jsonHeaders },
      });
    }

    const { user, error: authError } = await getAuthenticatedUser(req.headers.get('authorization'));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, ...jsonHeaders },
      });
    }

    const body = await req.json();
    const plan = body?.plan;
    if (plan !== 'GOLD' && plan !== 'PLATINUM') {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { ...corsHeaders, ...jsonHeaders },
      });
    }

    const priceId = plan === 'PLATINUM' ? pricePlatinum : priceGold;
    if (!priceId) {
      return new Response(JSON.stringify({ error: 'Missing price id' }), {
        status: 500,
        headers: { ...corsHeaders, ...jsonHeaders },
      });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appBaseUrl}/?checkout=success`,
      cancel_url: `${appBaseUrl}/?checkout=cancel`,
      client_reference_id: user.id,
      metadata: { userId: user.id, plan },
      customer_email: user.email || undefined,
    });

    return new Response(JSON.stringify({ sessionUrl: session.url }), {
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Checkout error' }), {
      status: 500,
      headers: { ...corsHeaders, ...jsonHeaders },
    });
  }
});
