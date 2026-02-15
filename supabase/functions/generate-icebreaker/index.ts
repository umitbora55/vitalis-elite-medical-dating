// @ts-nocheck
// AUDIT-FIX: SEC-003 / BE-009 — Added CORS whitelist, auth check, and rate limiting
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

// Rate limiting: Track requests per user (in-memory, resets on function cold start)
// For production, consider using Supabase/Redis for distributed rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // max requests per window
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window

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

const getAuthenticatedUser = async (authHeader: string | null) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: new Error('Missing authorization token') };
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return { user: null, error: new Error('Missing Supabase configuration') };
  }
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) {
    return { user: null, error: new Error('Unauthorized') };
  }
  return { user: data.user, error: null };
};

const checkRateLimit = (userId: string): { allowed: boolean; retryAfterMs: number } => {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { allowed: true, retryAfterMs: 0 };
};

serve(async (req) => {
  const appBaseUrl = getAppBaseUrl();
  const allowedOrigins = getAllowedOrigins(appBaseUrl);
  const corsHeaders = getCorsHeaders(req.headers.get('origin'), allowedOrigins, appBaseUrl);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // AUDIT-FIX: BE-009 — Require authentication
  const { user, error: authError } = await getAuthenticatedUser(req.headers.get('authorization'));
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', text: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // AUDIT-FIX: SEC-003 — Rate limiting to prevent API abuse
  const rateLimit = checkRateLimit(user.id);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', retryAfterMs: rateLimit.retryAfterMs }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        }
      },
    );
  }

  try {
    const { myProfile, matchProfile } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ text: 'So, do you come to this hospital often?' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // AUDIT-FIX: PR-001 / SEC-002 — Anonymize PII before sending to Gemini AI
    // Only send non-identifying professional information required for icebreaker generation
    // Stripped: name, age, hospital, bio, photos, location, phone, email, id
    const anonymizeProfile = (profile: Record<string, unknown> | null | undefined) => {
      if (!profile) return null;
      return {
        role: profile.role || null,
        specialty: profile.specialty || null,
        subSpecialty: profile.sub_specialty || profile.subSpecialty || null,
        // Send only first 3 interests (non-identifying)
        interests: Array.isArray(profile.interests)
          ? profile.interests.slice(0, 3)
          : [],
        // Send only personality tags (non-identifying)
        personalityTags: Array.isArray(profile.personalityTags)
          ? profile.personalityTags.slice(0, 3)
          : [],
      };
    };

    const safeMyProfile = anonymizeProfile(myProfile);
    const safeMatchProfile = anonymizeProfile(matchProfile);

    const prompt = `Create a short, professional but playful icebreaker for a medical dating app.
My profile: Role: ${safeMyProfile?.role || 'Medical Professional'}, Specialty: ${safeMyProfile?.specialty || 'General'}, Interests: ${(safeMyProfile?.interests || []).join(', ') || 'healthcare'}
Their profile: Role: ${safeMatchProfile?.role || 'Medical Professional'}, Specialty: ${safeMatchProfile?.specialty || 'General'}, Interests: ${(safeMatchProfile?.interests || []).join(', ') || 'healthcare'}
Return one sentence that is witty and references their shared medical background.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Failed to generate icebreaker');
    }

    const payload = await response.json();
    const text =
      payload?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'I seem to have lost my train of thought, but your profile is stunning.';

    return new Response(JSON.stringify({ text: text.trim() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ text: 'So, do you come to this hospital often?' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
