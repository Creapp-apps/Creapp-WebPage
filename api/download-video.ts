// GET /api/download-video?post=<scheduled_posts.id>&i=<index=0>
// Proxy de descarga autorizado del portal (Mis Piezas). Buffer completo (reels de pocos MB).
import { Readable } from 'node:stream';
import { requireMember } from './_lib/requireMember.js';
import { serviceClient } from './_lib/serviceClient.js';
import { applyPortalCors } from './_lib/portalCors.js';
import { authorizePiece, pickMediaUrl, safeFilename } from '../src/lib/downloadProxy.js';
import { deriveType } from '../src/lib/calendarMapper.js';

export default async function handler(req: any, res: any) {
  if (applyPortalCors(req, res)) return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let member: any;
  try {
    member = await requireMember(req);
  } catch (e: any) {
    return res.status(e.status || 500).json({ error: e.message });
  }

  const post = String(req.query?.post || '');
  const i = req.query?.i;
  const { data: row, error } = await serviceClient()
    .from('scheduled_posts')
    .select('client_id,status,media_r2_urls,platform,scheduled_at')
    .eq('id', post)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Error de servidor' });

  const auth = authorizePiece(row as any, member.clients.map((c: any) => c.slug));
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.status === 403 ? 'Forbidden' : 'No disponible' });
  }

  const url = pickMediaUrl(row as any, Number(i) || 0);
  if (!url) return res.status(404).json({ error: 'No disponible' });

  try {
    const upstream = await fetch(url);
    if (!upstream.ok || !upstream.body) return res.status(404).json({ error: 'No disponible' });

    const filename = safeFilename({
      brand: (row as any).client_id,
      type: deriveType((row as any).platform),
      date: (row as any).scheduled_at,
      url,
    });
    res.status(200);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    Readable.fromWeb(upstream.body as any).pipe(res);
  } catch {
    if (!res.headersSent) return res.status(404).json({ error: 'No disponible' });
    res.end();
  }
}
