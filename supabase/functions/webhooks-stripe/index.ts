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

// AUDIT-FIX IDEMPOTENCY: Atomic RPC replaces raw INSERT idempotency.
// Uses process_webhook_atomic() → ON CONFLICT DO NOTHING (race-safe).
// 4-status model: processing | processed | failed_retryable | failed_fatal
// Retry schedule: 1m → 5m → 15m → fatal (see 20260323_idempotency_processed_events.sql)

const TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 dakika — Stripe default

const isTimestampFresh = (event: Stripe.Event): boolean => {
  const eventAge = Math.floor(Date.now() / 1000) - event.created;
  return eventAge <= TIMESTAMP_TOLERANCE_SECONDS;
};

const claimEvent = async (
  supabase: ReturnType<typeof createClient>,
  event: Stripe.Event
): Promise<{ is_new: boolean; status: string } | null> => {
  const { data, error } = await supabase.rpc('process_webhook_atomic', {
    p_provider:    'stripe',
    p_event_id:    event.id,
    p_event_type:  event.type,
  });
  if (error) return null;
  return data as { is_new: boolean; status: string };
};

const completeEvent = async (
  supabase: ReturnType<typeof createClient>,
  eventId: string
): Promise<void> => {
  await supabase.rpc('complete_processed_event', {
    p_provider: 'stripe',
    p_event_id: eventId,
  });
};

const failEvent = async (
  supabase: ReturnType<typeof createClient>,
  eventId: string,
  errorMsg: string,
  fatal = false
): Promise<void> => {
  await supabase.rpc('fail_processed_event', {
    p_provider:   'stripe',
    p_event_id:   eventId,
    p_error_msg:  errorMsg,
    p_fatal:      fatal,
  });
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

  // AUDIT-FIX IDEMPOTENCY: Timestamp tolerance check (5 dakika)
  // Eski event'ler replay saldırılarını önlemek için reddedilir.
  if (!isTimestampFresh(event)) {
    return new Response(JSON.stringify({ error: 'Event timestamp too old (>5 min)' }), {
      status: 400,
      headers: responseHeaders,
    });
  }

  // AUDIT-FIX IDEMPOTENCY: Atomic claim via process_webhook_atomic RPC
  const claim = await claimEvent(supabase, event);

  if (!claim) {
    return new Response(JSON.stringify({ error: 'Failed to claim event idempotency slot' }), {
      status: 500,
      headers: responseHeaders,
    });
  }

  // Already processed or being processed by another worker — safe no-op
  if (!claim.is_new) {
    return new Response(JSON.stringify({ received: true, duplicate: true, status: claim.status }), {
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

    // Mark event as successfully processed
    await completeEvent(supabase, event.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: responseHeaders,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';

    // Classify error: transient vs fatal
    // fatal = validation/business logic errors (retry won't help)
    // retryable = DB/network errors
    const isFatal = errMsg.includes('Invalid') || errMsg.includes('Missing');
    await failEvent(supabase, event.id, errMsg, isFatal);

    return new Response(JSON.stringify({ error: 'Webhook handler failed' }), {
      status: 500,
      headers: responseHeaders,
    });
  }
});
