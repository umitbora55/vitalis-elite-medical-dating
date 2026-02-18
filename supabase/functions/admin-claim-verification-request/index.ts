import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { assertModeratorAccess, corsHeaders, response, writeAuditLog } from '../_shared/admin.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const access = await assertModeratorAccess(req);
  if (!access.ok) return access.response;

  const body = await req.json().catch(() => ({}));
  const requestId = typeof body?.requestId === 'string' ? body.requestId : '';
  if (!requestId) return response({ error: 'requestId is required' }, 400);

  const { data: existing, error: existingError } = await access.service
    .from('verification_requests')
    .select('id,claimed_by,status')
    .eq('id', requestId)
    .maybeSingle();
  if (existingError) return response({ error: existingError.message }, 500);
  if (!existing) return response({ error: 'Verification request not found' }, 404);
  if (existing.claimed_by && existing.claimed_by !== access.actorId) {
    return response({ error: 'Already claimed by another moderator' }, 409);
  }

  const nextStatus = existing.status === 'PENDING' ? 'UNDER_REVIEW' : existing.status;
  const { data: updated, error: updateError } = await access.service
    .from('verification_requests')
    .update({
      claimed_by: access.actorId,
      claimed_at: new Date().toISOString(),
      status: nextStatus,
    })
    .eq('id', requestId)
    .select('id,claimed_by,claimed_at')
    .single();

  if (updateError || !updated) return response({ error: updateError?.message || 'Unable to claim request' }, 500);

  await writeAuditLog(access.service, {
    actorId: access.actorId,
    actorRole: access.actorRole,
    action: 'verification.claim',
    entity: 'verification_requests',
    entityId: requestId,
    metadata: { nextStatus },
    ip: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  });

  return response({
    data: {
      requestId: updated.id,
      claimedBy: updated.claimed_by,
      claimedAt: updated.claimed_at,
    },
  });
});

