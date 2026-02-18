import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, getServiceClient, response } from '../_shared/admin.ts';

const parseNumber = (raw: string | null, fallback: number): number => {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const cronSecret = Deno.env.get('RETENTION_CRON_SECRET');
  if (cronSecret) {
    const provided = req.headers.get('x-retention-secret');
    if (provided !== cronSecret) return response({ error: 'Forbidden' }, 403);
  }

  const service = getServiceClient();
  const { data: settings } = await service.from('app_settings').select('key,value').in('key', ['retention_days', 'immediate_delete_on_verify']);
  const settingsMap = new Map((settings || []).map((item) => [item.key, item.value]));
  const retentionDays = parseNumber(settingsMap.get('retention_days') ?? null, 30);
  const immediateDeleteOnVerify = settingsMap.get('immediate_delete_on_verify') === 'true';
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  let query = service
    .from('verification_requests')
    .select('id,status,reviewed_at')
    .in('status', ['APPROVED', 'REJECTED']);
  if (!immediateDeleteOnVerify) {
    query = query.lte('reviewed_at', cutoffDate);
  }

  const { data: expiredRequests, error: requestError } = await query.limit(500);
  if (requestError) return response({ error: requestError.message }, 500);

  const requestIds = (expiredRequests || []).map((item) => item.id);
  if (requestIds.length === 0) return response({ data: { deletedDocuments: 0, requests: 0 } });

  const { data: docs } = await service
    .from('verification_documents')
    .select('id,storage_path,request_id')
    .in('request_id', requestIds);

  const storagePaths = (docs || []).map((doc) => doc.storage_path).filter(Boolean);
  if (storagePaths.length > 0) {
    await service.storage.from('verification-docs').remove(storagePaths);
  }

  await service.from('verification_documents').delete().in('request_id', requestIds);

  return response({
    data: {
      deletedDocuments: storagePaths.length,
      requests: requestIds.length,
      retentionDays,
      immediateDeleteOnVerify,
    },
  });
});

