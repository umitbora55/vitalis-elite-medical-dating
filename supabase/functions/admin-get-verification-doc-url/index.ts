import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { assertModeratorAccess, corsHeaders, response, writeAuditLog } from '../_shared/admin.ts';

const DOC_URL_TTL_SECONDS = 60;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const access = await assertModeratorAccess(req);
  if (!access.ok) return access.response;

  const body = await req.json().catch(() => ({}));
  const requestId = typeof body?.requestId === 'string' ? body.requestId : '';
  if (!requestId) return response({ error: 'requestId is required' }, 400);

  const { data: docs, error: docsError } = await access.service
    .from('verification_documents')
    .select('id,storage_path,mime')
    .eq('request_id', requestId);

  if (docsError) return response({ error: docsError.message }, 500);

  const signedDocs = await Promise.all((docs || []).map(async (doc) => {
    const { data: signed, error } = await access.service.storage
      .from('verification-docs')
      .createSignedUrl(doc.storage_path, DOC_URL_TTL_SECONDS);

    if (error || !signed?.signedUrl) {
      return null;
    }

    await writeAuditLog(access.service, {
      actorId: access.actorId,
      actorRole: access.actorRole,
      action: 'verification.document.view',
      entity: 'verification_documents',
      entityId: doc.id,
      metadata: { requestId },
      ip: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });

    return {
      docId: doc.id,
      signedUrl: signed.signedUrl,
      expiresIn: DOC_URL_TTL_SECONDS,
      mime: doc.mime,
    };
  }));

  return response({ data: signedDocs.filter(Boolean) });
});

