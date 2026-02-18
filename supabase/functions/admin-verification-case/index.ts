import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { assertModeratorAccess, corsHeaders, response } from '../_shared/admin.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const access = await assertModeratorAccess(req);
  if (!access.ok) return access.response;

  const body = await req.json().catch(() => ({}));
  const requestId = typeof body?.requestId === 'string' ? body.requestId : '';
  if (!requestId) return response({ error: 'requestId is required' }, 400);

  const { data: request, error: requestError } = await access.service
    .from('verification_requests')
    .select('id,user_id,status,email_type,method,submitted_at,claimed_by,claimed_at,reason_code,notes,decision,risk_flags')
    .eq('id', requestId)
    .maybeSingle();

  if (requestError) return response({ error: requestError.message }, 500);
  if (!request) return response({ error: 'Request not found' }, 404);

  const [{ data: profile }, { data: docs }] = await Promise.all([
    access.service
      .from('profiles')
      .select('id,name,city,verification_status,created_at')
      .eq('id', request.user_id)
      .maybeSingle(),
    access.service
      .from('verification_documents')
      .select('id,storage_path,doc_type,mime,size,sha256')
      .eq('request_id', request.id)
      .order('created_at', { ascending: true }),
  ]);

  return response({
    data: {
      requestId: request.id,
      userId: request.user_id,
      status: request.status,
      emailType: request.email_type,
      method: request.method,
      submittedAt: request.submitted_at,
      claim: {
        actorId: request.claimed_by,
        claimedAt: request.claimed_at,
      },
      reasonCode: request.reason_code,
      notes: request.notes,
      decision: request.decision,
      riskFlags: request.risk_flags || {},
      requestor: {
        id: profile?.id ?? request.user_id,
        name: profile?.name ?? null,
        city: profile?.city ?? null,
        verificationStatus: profile?.verification_status ?? null,
        createdAt: profile?.created_at ?? null,
      },
      documents: (docs || []).map((doc) => ({
        id: doc.id,
        storagePath: doc.storage_path,
        docType: doc.doc_type,
        mime: doc.mime,
        size: doc.size,
        sha256: doc.sha256,
      })),
    },
  });
});

