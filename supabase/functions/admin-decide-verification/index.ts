import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { assertModeratorAccess, corsHeaders, response, writeAuditLog } from '../_shared/admin.ts';

type Decision = 'approve' | 'reject' | 'need_more_info';

const toProfileStatus = (decision: Decision): 'VERIFIED' | 'REJECTED' | 'NEED_MORE_INFO' => {
  if (decision === 'approve') return 'VERIFIED';
  if (decision === 'reject') return 'REJECTED';
  return 'NEED_MORE_INFO';
};

const toRequestStatus = (decision: Decision): 'APPROVED' | 'REJECTED' | 'NEED_MORE_INFO' => {
  if (decision === 'approve') return 'APPROVED';
  if (decision === 'reject') return 'REJECTED';
  return 'NEED_MORE_INFO';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const access = await assertModeratorAccess(req);
  if (!access.ok) return access.response;

  const body = await req.json().catch(() => ({}));
  const requestId = typeof body?.requestId === 'string' ? body.requestId : '';
  const decision = (typeof body?.decision === 'string' ? body.decision : '') as Decision;
  const reasonCode = typeof body?.reasonCode === 'string' ? body.reasonCode : null;
  const notes = typeof body?.notes === 'string' ? body.notes : null;
  const templateMessage = typeof body?.templateMessage === 'string' ? body.templateMessage : null;

  if (!requestId) return response({ error: 'requestId is required' }, 400);
  if (!['approve', 'reject', 'need_more_info'].includes(decision)) {
    return response({ error: 'Invalid decision' }, 400);
  }
  if (decision === 'reject' && !reasonCode) {
    return response({ error: 'reasonCode is required for rejection' }, 400);
  }

  const { data: request, error: requestError } = await access.service
    .from('verification_requests')
    .select('id,user_id,status')
    .eq('id', requestId)
    .maybeSingle();
  if (requestError) return response({ error: requestError.message }, 500);
  if (!request) return response({ error: 'Verification request not found' }, 404);

  const beforeSnapshot = {
    status: request.status,
    decision: null,
  };

  const requestStatus = toRequestStatus(decision);
  const profileStatus = toProfileStatus(decision);
  const reviewedAt = new Date().toISOString();

  const { error: updateRequestError } = await access.service
    .from('verification_requests')
    .update({
      status: requestStatus,
      decision,
      reason_code: reasonCode,
      notes,
      reviewed_by: access.actorId,
      reviewed_at: reviewedAt,
      claimed_by: access.actorId,
      claimed_at: reviewedAt,
    })
    .eq('id', requestId);

  if (updateRequestError) return response({ error: updateRequestError.message }, 500);

  const { error: updateProfileError } = await access.service
    .from('profiles')
    .update({
      verification_status: profileStatus,
      verification_method: 'DOCUMENTS',
      verified: decision === 'approve',
    })
    .eq('id', request.user_id);
  if (updateProfileError) return response({ error: updateProfileError.message }, 500);

  await writeAuditLog(access.service, {
    actorId: access.actorId,
    actorRole: access.actorRole,
    action: `verification.decision.${decision}`,
    entity: 'verification_requests',
    entityId: requestId,
    metadata: {
      before: beforeSnapshot,
      after: { status: requestStatus, profileStatus, decision, reasonCode, notes },
      templateMessage,
    },
    ip: req.headers.get('x-forwarded-for'),
    userAgent: req.headers.get('user-agent'),
  });

  return response({ data: null });
});

