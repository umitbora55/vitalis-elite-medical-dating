import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { assertModeratorAccess, corsHeaders, response } from '../_shared/admin.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const access = await assertModeratorAccess(req);
  if (!access.ok) return access.response;

  const body = await req.json().catch(() => ({}));
  const filters = (body?.filters ?? {}) as {
    status?: string[];
    emailType?: string | null;
  };

  let query = access.service
    .from('verification_requests')
    .select('id,user_id,status,email_type,method,submitted_at,claimed_by,claimed_at,risk_flags')
    .order('submitted_at', { ascending: true })
    .limit(200);

  if (Array.isArray(filters.status) && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }
  if (typeof filters.emailType === 'string' && filters.emailType.length > 0) {
    query = query.eq('email_type', filters.emailType);
  }

  const { data: requests, error } = await query;
  if (error) return response({ error: error.message }, 500);

  const userIds = Array.from(new Set((requests || []).map((item) => item.user_id)));
  const { data: profiles } = userIds.length > 0
    ? await access.service.from('profiles').select('id,name,city').in('id', userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const items = (requests || []).map((request) => ({
    id: request.id,
    userId: request.user_id,
    status: request.status,
    emailType: request.email_type,
    method: request.method,
    submittedAt: request.submitted_at,
    claimedBy: request.claimed_by,
    claimedAt: request.claimed_at,
    requestorName: profileMap.get(request.user_id)?.name ?? null,
    requestorEmail: null,
    requestorCity: profileMap.get(request.user_id)?.city ?? null,
    riskFlags: request.risk_flags || {},
  }));

  return response({ data: items });
});

