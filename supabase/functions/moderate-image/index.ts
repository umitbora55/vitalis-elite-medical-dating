/**
 * Moderate Image Edge Function
 *
 * Uses Google Cloud Vision API for NSFW/violence detection.
 * Queues flagged content for manual review.
 *
 * Deploy: supabase functions deploy moderate-image
 *
 * Required env vars:
 * - GOOGLE_VISION_API_KEY
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as encodeBase64 } from 'https://deno.land/std@0.177.0/encoding/base64.ts';

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

// Likelihood levels from Vision API
type Likelihood = 'UNKNOWN' | 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';

interface SafeSearchAnnotation {
  adult: Likelihood;
  spoof: Likelihood;
  medical: Likelihood;
  violence: Likelihood;
  racy: Likelihood;
}

interface VisionResponse {
  responses: Array<{
    safeSearchAnnotation?: SafeSearchAnnotation;
    error?: { message: string };
  }>;
}

interface ModerationRequest {
  imagePath: string;
  bucket: string;
}

interface ModerationResult {
  safe: boolean;
  flagged: boolean;
  scores: Partial<SafeSearchAnnotation>;
  flagReason?: string;
  queuedForReview: boolean;
}

// AUDIT-FIX: SEC-001/BE-004 — CORS whitelist (same pattern as generate-icebreaker)
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

// AUDIT-FIX: SEC-001 — Only allow moderation of profile-photos bucket
const ALLOWED_BUCKETS = new Set(['profile-photos']);

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

  // AUDIT-FIX: SEC-001/BE-004 — Require authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { imagePath, bucket }: ModerationRequest = await req.json();

    if (!imagePath || !bucket) {
      return new Response(
        JSON.stringify({ error: 'Missing imagePath or bucket' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AUDIT-FIX: SEC-001 — Restrict to allowed buckets only
    if (!ALLOWED_BUCKETS.has(bucket)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden bucket' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AUDIT-FIX: SEC-001 — Verify the image belongs to the authenticated user
    if (!imagePath.startsWith(`${user.id}/`)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: can only moderate own images' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get signed URL for the image
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(imagePath, 300);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Image not found', details: signedUrlError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download and encode image
    const imageResponse = await fetch(signedUrlData.signedUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = encodeBase64(new Uint8Array(imageBuffer));

    // Call Vision API
    const apiKey = Deno.env.get('GOOGLE_VISION_API_KEY');

    if (!apiKey) {
      console.warn('GOOGLE_VISION_API_KEY not set, skipping moderation');
      return new Response(
        JSON.stringify({
          safe: true,
          flagged: false,
          scores: {},
          queuedForReview: false,
          message: 'Moderation skipped: API key not configured',
        } as ModerationResult),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // AUDIT-FIX BE-031: Use x-goog-api-key header instead of ?key= query param.
    // Query params appear in access logs, proxy caches, and Referer headers.
    const visionResponse = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: 'SAFE_SEARCH_DETECTION' }],
          },
        ],
      }),
    });

    if (!visionResponse.ok) {
      throw new Error(`Vision API error: ${visionResponse.status}`);
    }

    const visionResult: VisionResponse = await visionResponse.json();

    if (visionResult.responses[0]?.error) {
      throw new Error(visionResult.responses[0].error.message);
    }

    const safeSearch = visionResult.responses[0]?.safeSearchAnnotation;

    if (!safeSearch) {
      throw new Error('No SafeSearch annotation in response');
    }

    // Determine if content is problematic
    const highLikelihood: Likelihood[] = ['LIKELY', 'VERY_LIKELY'];

    const isAdult = highLikelihood.includes(safeSearch.adult);
    const isViolent = highLikelihood.includes(safeSearch.violence);
    const isRacy = safeSearch.racy === 'VERY_LIKELY'; // Stricter for racy

    const isNsfw = isAdult || isViolent;
    const needsReview = isNsfw || isRacy;

    let flagReason: string | undefined;
    if (isAdult) flagReason = 'nsfw_adult';
    else if (isViolent) flagReason = 'nsfw_violence';
    else if (isRacy) flagReason = 'racy_content';

    // Queue for moderation if flagged
    let queuedForReview = false;

    if (needsReview) {
      // Extract user ID from path (format: userId/timestamp_index.jpg)
      const userId = imagePath.split('/')[0];

      const { error: queueError } = await supabase.from('moderation_queue').insert({
        content_type: 'photo',
        content_ref: imagePath,
        content_id: null,
        content_user_id: userId,
        content_path: imagePath,
        auto_flag_reason: flagReason,
        auto_flag_score: isAdult || isViolent ? 0.9 : 0.7,
        status: 'pending',
      });

      if (queueError) {
        console.error('Moderation queue error:', queueError);
      } else {
        queuedForReview = true;
        console.log(`Image flagged for review: ${imagePath} (${flagReason})`);
      }
    }

    const result: ModerationResult = {
      safe: !isNsfw,
      flagged: needsReview,
      scores: {
        adult: safeSearch.adult,
        violence: safeSearch.violence,
        racy: safeSearch.racy,
        medical: safeSearch.medical,
      },
      flagReason,
      queuedForReview,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Moderation error:', errorMessage);

    return new Response(
      JSON.stringify({ error: 'Moderation failed', details: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
