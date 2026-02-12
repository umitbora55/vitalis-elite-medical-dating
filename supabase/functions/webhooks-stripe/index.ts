// @ts-nocheck
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!stripeSecret || !webhookSecret || !supabaseUrl || !supabaseServiceRole) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { duplicate, error: idempotencyError } = await persistEventIdempotencyKey(supabase, event);

  if (idempotencyError) {
    return new Response(JSON.stringify({ error: 'Failed to persist event idempotency key' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (duplicate) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscriptionId = session.subscription;
        const userId = session.metadata?.userId || session.client_reference_id;
        const plan = session.metadata?.plan || 'GOLD';

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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Webhook handler failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
