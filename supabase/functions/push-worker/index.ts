/**
 * Push Worker Edge Function
 *
 * Processes notification outbox and sends push notifications via Expo Push API.
 * Called by cron job (every minute) with CRON_SECRET authentication.
 *
 * Deploy: supabase functions deploy push-worker
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 50;

interface NotificationOutbox {
  id: string;
  recipient_user_id: string;
  notification_type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  status: string;
  attempts: number;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error: string };
}

interface PushToken {
  user_id: string;
  token: string;
}

serve(async (req) => {
  // CORS headers for preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, x-cron-secret, Content-Type',
      },
    });
  }

  // Auth: CRON_SECRET only
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');

  const provided =
    req.headers.get('x-cron-secret') ??
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

  if (!cronSecret || provided !== cronSecret) {
    console.error('Unauthorized: Invalid or missing CRON_SECRET');
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Reclaim stale notifications first
    const { data: reclaimedCount, error: reclaimError } = await supabase.rpc(
      'reclaim_stale_notifications',
      { p_stale_minutes: 5 }
    );

    if (reclaimError) {
      console.error('Reclaim error:', reclaimError);
    } else if (reclaimedCount && reclaimedCount > 0) {
      console.log(`Reclaimed ${reclaimedCount} stale notifications`);
    }

    // Claim notifications
    const { data: notifications, error: claimError } = await supabase.rpc(
      'claim_notifications',
      { p_batch_size: BATCH_SIZE }
    );

    if (claimError) {
      console.error('Claim error:', claimError);
      return new Response(JSON.stringify({ error: claimError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!notifications?.length) {
      return new Response(
        JSON.stringify({ processed: 0, reclaimed: reclaimedCount || 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get push tokens for all recipients
    const userIds = [...new Set(notifications.map((n: NotificationOutbox) => n.recipient_user_id))];

    const { data: tokens, error: tokenError } = await supabase
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (tokenError) {
      console.error('Token fetch error:', tokenError);
    }

    // Build token map
    const tokenMap = new Map<string, string[]>();
    tokens?.forEach((t: PushToken) => {
      const existing = tokenMap.get(t.user_id) || [];
      existing.push(t.token);
      tokenMap.set(t.user_id, existing);
    });

    const results: { id: string; success: boolean; error?: string }[] = [];

    // Process each notification
    for (const notif of notifications as NotificationOutbox[]) {
      const userTokens = tokenMap.get(notif.recipient_user_id);

      if (!userTokens?.length) {
        await supabase.rpc('mark_notification_failed', {
          p_notification_id: notif.id,
          p_error_message: 'No active push tokens',
          p_retry: false,
        });
        results.push({ id: notif.id, success: false, error: 'No tokens' });
        continue;
      }

      // Build Expo push messages
      const messages = userTokens.map((token) => ({
        to: token,
        sound: 'default',
        title: notif.title,
        body: notif.body,
        data: {
          ...notif.data,
          notificationId: notif.id,
          type: notif.notification_type,
        },
        badge: 1,
        priority: 'high',
      }));

      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(messages),
        });

        if (!response.ok) {
          throw new Error(`Expo API error: ${response.status}`);
        }

        const tickets: ExpoPushTicket[] = await response.json();

        let anySuccess = false;

        // Process tickets
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          const token = userTokens[i];

          if (ticket.status === 'ok') {
            anySuccess = true;
          } else if (ticket.details?.error === 'DeviceNotRegistered') {
            // Token is invalid, disable it
            await supabase.rpc('disable_push_token', { p_token: token });
            console.log(`Disabled invalid token: ${token.substring(0, 20)}...`);
          }
        }

        if (anySuccess) {
          await supabase.rpc('mark_notification_sent', {
            p_notification_id: notif.id,
          });
          results.push({ id: notif.id, success: true });
        } else {
          await supabase.rpc('mark_notification_failed', {
            p_notification_id: notif.id,
            p_error_message: 'All tokens failed',
            p_retry: true,
          });
          results.push({ id: notif.id, success: false, error: 'All tokens failed' });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Push send error for ${notif.id}:`, errorMessage);

        await supabase.rpc('mark_notification_failed', {
          p_notification_id: notif.id,
          p_error_message: errorMessage,
          p_retry: true,
        });
        results.push({ id: notif.id, success: false, error: errorMessage });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
      `Push worker complete: ${successCount} sent, ${failCount} failed, ${reclaimedCount || 0} reclaimed`
    );

    return new Response(
      JSON.stringify({
        processed: notifications.length,
        sent: successCount,
        failed: failCount,
        reclaimed: reclaimedCount || 0,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Push worker error:', errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
