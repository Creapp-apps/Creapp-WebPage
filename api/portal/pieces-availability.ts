// GET /api/portal/pieces-availability?post=<id,id,...>  ->  { available: { [id]: boolean } }
import { requireMember } from '../_lib/requireMember.js';
import { serviceClient } from '../_lib/serviceClient.js';
import { applyPortalCors } from '../_lib/portalCors.js';
import { buildAvailabilityMap } from '../../src/lib/pieceAvailability.js';

export default async function handler(req: any, res: any) {
  if (applyPortalCors(req, res)) return res.status(200).end();

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let member: any;
  try {
    member = await requireMember(req);
  } catch (e: any) {
    return res.status(e.status || 500).json({ error: e.message });
  }

  const ids = String(req.query?.post || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return res.status(200).json({ available: {} });

  const slugs: string[] = member.clients.map((c: any) => c.slug);
  const { data: rows, error } = await serviceClient()
    .from('scheduled_posts')
    .select('id,client_id,status,media_r2_urls')
    .in('id', ids);

  if (error) return res.status(500).json({ error: 'Error de servidor' });

  const urlById: Record<string, string | null> = {};
  for (const r of (rows ?? []) as any[]) {
    if (slugs.includes(r.client_id) && r.status === 'published') {
      urlById[r.id] = r.media_r2_urls?.[0] ?? null;
    }
  }

  const available = await buildAvailabilityMap(urlById, async (u: string) => {
    try {
      const r = await fetch(u, { method: 'GET', headers: { Range: 'bytes=0-0' } });
      try { await r.body?.cancel(); } catch { /* ignore */ }
      return r.ok; // 200 o 206
    } catch {
      return false;
    }
  });
  return res.status(200).json({ available });
}
