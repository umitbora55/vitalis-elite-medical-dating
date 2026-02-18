import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { assertModeratorAccess, corsHeaders, response, writeAuditLog } from '../_shared/admin.ts';

type AppSettingRow = {
  key: string;
  value: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const access = await assertModeratorAccess(req);
  if (!access.ok) return access.response;

  const body = await req.json().catch(() => ({}));
  const entries = Array.isArray(body?.entries) ? (body.entries as AppSettingRow[]) : null;

  if (entries && entries.length > 0) {
    if (!['admin', 'superadmin'].includes(access.actorRole)) {
      return response({ error: 'Only admin+ can update settings' }, 403);
    }

    const payload = entries
      .filter((item) => typeof item?.key === 'string' && typeof item?.value === 'string')
      .map((item) => ({
        key: item.key,
        value: item.value,
        updated_at: new Date().toISOString(),
        updated_by: access.actorId,
      }));

    const { error: upsertError } = await access.service
      .from('app_settings')
      .upsert(payload, { onConflict: 'key' });
    if (upsertError) return response({ error: upsertError.message }, 500);

    await writeAuditLog(access.service, {
      actorId: access.actorId,
      actorRole: access.actorRole,
      action: 'settings.update',
      entity: 'app_settings',
      entityId: 'bulk',
      metadata: { keys: payload.map((item) => item.key) },
      ip: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });

    return response({ data: null });
  }

  const { data, error } = await access.service
    .from('app_settings')
    .select('key,value')
    .order('key', { ascending: true });
  if (error) return response({ error: error.message }, 500);

  return response({ data: data || [] });
});

