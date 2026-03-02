/**
 * Delete Account Edge Function
 *
 * Handles complete account deletion for GDPR/KVKK compliance.
 * Deletes: Storage files, database records, and auth user.
 *
 * Deploy: supabase functions deploy delete-account
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STORAGE_BUCKETS = ['profile-photos', 'verification-documents'];
const FILES_PER_PAGE = 100;

// AUDIT-FIX: SEC-003 — CORS whitelist instead of wildcard (same pattern as generate-icebreaker)
const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/, '');

const getAppBaseUrl = (): string => {
  const appBaseUrl = Deno.env.get('APP_BASE_URL');
  return appBaseUrl ? normalizeBaseUrl(appBaseUrl) : 'https://vitalis.app';
};

const getAllowedOrigins = (appBaseUrl: string): Set<string> => {
  const allowed = new Set<string>([appBaseUrl]);
  const extraOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (!extraOrigins) return allowed;
  for (const origin of extraOrigins.split(',')) {
    const trimmed = origin.trim();
    if (trimmed) allowed.add(normalizeBaseUrl(trimmed));
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
    'Vary': 'Origin',
  };
};

serve(async (req) => {
  const appBaseUrl = getAppBaseUrl();
  const allowedOrigins = getAllowedOrigins(appBaseUrl);
  const corsHeaders = getCorsHeaders(req.headers.get('origin'), allowedOrigins, appBaseUrl);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Authenticate user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Create client with user's auth
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Create admin client for privileged operations
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const deletionLog: string[] = [];

  try {
    // 1. Delete storage files from user's buckets
    for (const bucket of STORAGE_BUCKETS) {
      let offset = 0;
      let totalDeleted = 0;

      while (true) {
        const { data: files, error: listError } = await supabaseAdmin.storage
          .from(bucket)
          .list(user.id, { limit: FILES_PER_PAGE, offset });

        if (listError) {
          console.error(`Error listing ${bucket}:`, listError);
          break;
        }

        if (!files?.length) break;

        const paths = files.map((f) => `${user.id}/${f.name}`);
        const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths);

        if (removeError) {
          console.error(`Error removing from ${bucket}:`, removeError);
        } else {
          totalDeleted += paths.length;
        }

        if (files.length < FILES_PER_PAGE) break;
        offset += FILES_PER_PAGE;
      }

      if (totalDeleted > 0) {
        deletionLog.push(`Deleted ${totalDeleted} files from ${bucket}`);
      }
    }

    // 2. Delete chat media (user's files across conversations)
    const { data: participations, error: partError } = await supabaseAdmin
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (partError) {
      console.error('Error fetching participations:', partError);
    } else if (participations) {
      let chatMediaDeleted = 0;

      for (const p of participations) {
        let offset = 0;

        while (true) {
          const { data: files, error: listError } = await supabaseAdmin.storage
            .from('chat-media')
            .list(p.conversation_id, { limit: FILES_PER_PAGE, offset });

          if (listError || !files?.length) break;

          // Filter to only user's files
          const userFiles = files.filter((f) => f.name.includes(user.id));

          if (userFiles.length) {
            const paths = userFiles.map((f) => `${p.conversation_id}/${f.name}`);
            const { error: removeError } = await supabaseAdmin.storage
              .from('chat-media')
              .remove(paths);

            if (!removeError) {
              chatMediaDeleted += paths.length;
            }
          }

          if (files.length < FILES_PER_PAGE) break;
          offset += FILES_PER_PAGE;
        }
      }

      if (chatMediaDeleted > 0) {
        deletionLog.push(`Deleted ${chatMediaDeleted} chat media files`);
      }
    }

    // 3. Delete database records via RPC
    const { error: dataError } = await supabaseAdmin.rpc('delete_user_data', {
      p_user_id: user.id,
    });

    if (dataError) {
      console.error('Error deleting user data:', dataError);
      throw new Error(`Database deletion failed: ${dataError.message}`);
    }

    deletionLog.push('Deleted database records');

    // 4. Delete auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      throw new Error(`Auth deletion failed: ${authDeleteError.message}`);
    }

    deletionLog.push('Deleted auth user');

    console.log(`Account deleted successfully: ${user.id}`);
    console.log('Deletion log:', deletionLog);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account deleted successfully',
        log: deletionLog,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Account deletion error:', errorMessage);
    console.error('Partial deletion log:', deletionLog);

    return new Response(
      JSON.stringify({
        error: 'Deletion failed',
        details: errorMessage,
        partialLog: deletionLog,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
