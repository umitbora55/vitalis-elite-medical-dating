// @ts-nocheck
// AUDIT-FIX: BE-007 — Removed unnecessary CORS headers (webhooks are server-to-server)
// AUDIT-FIX: BE-013 — Added plan metadata validation
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

// AUDIT-FIX: BE-007 — Minimal headers for webhook endpoint
// Webhooks are called by Stripe servers, not browsers, so CORS is unnecessary
// Only stripe-signature header is needed for validation
const responseHeaders = {
  'Content-Type': 'application/json',
};

// AUDIT-FIX: BE-013 — Valid plan values to prevent invalid subscription creation
const VALID_PLANS = new Set(['DOSE', 'FORTE', 'ULTRA', 'GOLD', 'PLATINUM']);

const isDuplicateEventError = (error: unknown): boolean => {
  const code = (error as { code?: string } | null)?.code;
  return code === '23505';
};

const persistEventIdempotencyKey = async (supabase: ReturnType<typeof createClient>, event: Stripe.Event) => {
  const { error } = await supabase.from('stripe_webhook_events').insert({
    event_id: event.id,
    event_type: event.type,
    payload: event,
  });

  if (!error) return { duplicate: false, error: null };
  if (isDuplicateEventError(error)) return { duplicate: true, error: null };

  return { duplicate: false, error };
};

serve(async (req) => {
  // AUDIT-FIX: BE-007 — Webhooks don't need OPTIONS/CORS (server-to-server)
  // Stripe doesn't send preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 204 });
  }

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !supabaseServiceRole) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), {
      status: 500,
      headers: responseHeaders,
    });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });
  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  let event;
  try {
    const signature = req.headers.get('stripe-signature') ?? '';
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: responseHeaders,
    });
  }

  const { duplicate, error: idempotencyError } = await persistEventIdempotencyKey(supabase, event);

  if (idempotencyError) {
    return new Response(JSON.stringify({ error: 'Failed to persist event idempotency key' }), {
      status: 500,
      headers: responseHeaders,
    });
  }

  if (duplicate) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: responseHeaders,
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscriptionId = session.subscription;
        const userId = session.metadata?.userId || session.client_reference_id;
        const plan = session.metadata?.plan;

        // AUDIT-FIX: BE-013 — Reject if plan metadata is missing or invalid
        if (!plan) {
          console.error('Missing plan metadata in checkout session', { sessionId: session.id });
          return new Response(JSON.stringify({ error: 'Missing plan metadata' }), {
            status: 400,
            headers: responseHeaders,
          });
        }

        if (!VALID_PLANS.has(plan)) {
          console.error('Invalid plan value in checkout session', { sessionId: session.id, plan });
          return new Response(JSON.stringify({ error: 'Invalid plan value' }), {
            status: 400,
            headers: responseHeaders,
          });
        }

        if (subscriptionId && userId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const period = subscription.items.data[0]?.price?.recurring?.interval || 'month';

          const { error } = await supabase.from('subscriptions').upsert(
            {
              profile_id: userId,
              plan,
              period,
              platform: 'web',
              store_transaction_id: subscriptionId,
              starts_at: new Date(subscription.current_period_start * 1000).toISOString(),
              expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
              is_active: subscription.status === 'active' || subscription.status === 'trialing',
              cancelled_at: subscription.cancel_at
                ? new Date(subscription.cancel_at * 1000).toISOString()
                : null,
              cancel_at_period_end: subscription.cancel_at_period_end || false,
            },
            { onConflict: 'store_transaction_id' },
          );

          if (error) {
            throw error;
          }
        }
        break;
      }
      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const { error } = await supabase
          .from('subscriptions')
          .update({
            is_active: subscription.status === 'active' || subscription.status === 'trialing',
            expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
            cancelled_at: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end || false,
          })
          .eq('store_transaction_id', subscription.id);

        if (error) {
          throw error;
        }
        break;
      }
      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Webhook handler failed' }), {
      status: 500,
      headers: responseHeaders,
    });
  }
});
