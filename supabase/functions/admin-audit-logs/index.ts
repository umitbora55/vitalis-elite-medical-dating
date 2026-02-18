import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { assertModeratorAccess, corsHeaders, response } from '../_shared/admin.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405);

  const access = await assertModeratorAccess(req);
  if (!access.ok) return access.response;

  const body = await req.json().catch(() => ({}));
  const requestedLimit = typeof body?.limit === 'number' ? body.limit : 25;
  const limit = Math.max(1, Math.min(200, requestedLimit));

  const { data, error } = await access.service
    .from('admin_audit_logs')
    .select('id,actor_id,actor_role,action,entity,entity_id,metadata,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return response({ error: error.message }, 500);

  return response({
    data: (data || []).map((entry) => ({
      id: entry.id,
      actorId: entry.actor_id,
      actorRole: entry.actor_role,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entity_id,
      metadata: entry.metadata || {},
      createdAt: entry.created_at,
    })),
  });
});

