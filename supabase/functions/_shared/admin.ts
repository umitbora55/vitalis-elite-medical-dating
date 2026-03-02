import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.95.3';

type AdminRole = 'viewer' | 'moderator' | 'admin' | 'superadmin';

export const jsonHeaders = {
  'Content-Type': 'application/json',
};

// AUDIT-FIX BE-004: Replace wildcard CORS with env-var-based origin whitelist.
// Set APP_BASE_URL (e.g. https://vitalis.app) and optionally ALLOWED_ORIGINS
// (comma-separated, e.g. https://staging.vitalis.app,http://localhost:5173).
const _normalizeOrigin = (url: string): string => url.replace(/\/+$/, '');

const _getAllowedOrigins = (): Set<string> => {
  const base = _normalizeOrigin(Deno.env.get('APP_BASE_URL') ?? 'https://vitalis.app');
  const allowed = new Set<string>([base]);
  const extra = Deno.env.get('ALLOWED_ORIGINS') ?? '';
  for (const o of extra.split(',')) {
    const t = _normalizeOrigin(o.trim());
    if (t) allowed.add(t);
  }
  return allowed;
};

export const getCorsHeaders = (requestOrigin: string | null): Record<string, string> => {
  const allowedOrigins = _getAllowedOrigins();
  const appBaseUrl = _normalizeOrigin(Deno.env.get('APP_BASE_URL') ?? 'https://vitalis.app');
  const normalized = requestOrigin ? _normalizeOrigin(requestOrigin) : '';
  const safeOrigin = (normalized && allowedOrigins.has(normalized)) ? normalized : appBaseUrl;
  return {
    'Access-Control-Allow-Origin': safeOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
};

// Backward-compat static headers (used in OPTIONS preflight handlers).
// Resolved once at module load; reflects APP_BASE_URL env var.
export const corsHeaders = getCorsHeaders(null);

const getEnv = (key: string): string => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing env ${key}`);
  return value;
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const getServiceClient = (): SupabaseClient => {
  const url = getEnv('SUPABASE_URL');
  const serviceRole = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, serviceRole, { auth: { persistSession: false } });
};

export const getUserClient = (authHeader: string): SupabaseClient => {
  const url = getEnv('SUPABASE_URL');
  const anon = getEnv('SUPABASE_ANON_KEY');
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
};

export const response = (
  body: Record<string, unknown>,
  status = 200,
  requestOrigin?: string | null,
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(requestOrigin ?? null), ...jsonHeaders },
  });

export const readJsonBody = async (req: Request): Promise<Record<string, unknown>> => {
  try {
    const parsed = await req.json();
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

export const assertModeratorAccess = async (
  req: Request,
  requireAal2 = true,
): Promise<{
  ok: true;
  service: SupabaseClient;
  actorId: string;
  actorRole: AdminRole;
} | {
  ok: false;
  response: Response;
}> => {
  const origin = req.headers.get('origin');
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: response({ error: 'Missing authorization' }, 401, origin) };
  }

  const userClient = getUserClient(authHeader);
  const service = getServiceClient();
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return { ok: false, response: response({ error: 'Unauthorized' }, 401, origin) };
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const payload = decodeJwtPayload(token);
  const aal = payload?.aal;
  if (requireAal2 && aal !== 'aal2') {
    return { ok: false, response: response({ error: 'MFA aal2 required' }, 403, origin) };
  }

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('user_role')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, response: response({ error: 'Failed to read role' }, 500, origin) };
  }

  const role = (profile?.user_role || 'viewer') as AdminRole;
  if (!['moderator', 'admin', 'superadmin'].includes(role)) {
    return { ok: false, response: response({ error: 'Forbidden' }, 403, origin) };
  }

  return {
    ok: true,
    service,
    actorId: authData.user.id,
    actorRole: role,
  };
};

export const writeAuditLog = async (
  service: SupabaseClient,
  payload: {
    actorId: string;
    actorRole: string;
    action: string;
    entity: string;
    entityId: string;
    metadata?: Record<string, unknown>;
    ip?: string | null;
    userAgent?: string | null;
  },
): Promise<void> => {
  await service.from('admin_audit_logs').insert({
    actor_id: payload.actorId,
    actor_role: payload.actorRole,
    action: payload.action,
    entity: payload.entity,
    entity_id: payload.entityId,
    metadata: payload.metadata ?? {},
    ip: payload.ip ?? null,
    user_agent: payload.userAgent ?? null,
  });
};
