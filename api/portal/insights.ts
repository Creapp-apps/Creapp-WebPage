// GET /api/portal/insights  (opcional ?client=<slug>, ?refresh=1)
// Insights de IG del cliente del portal. Token server-only; caché ~45 min.
// Ver spec §6.3 / plan Task 4.
import { requireMember } from '../_lib/requireMember.js';
import { serviceClient } from '../_lib/serviceClient.js';
import { applyPortalCors } from '../_lib/portalCors.js';
import { resolveClientToken } from '../../src/lib/publishQueuePhases.js';
import {
  pickClientSlug, isCacheFresh, canForceRefresh, mapAccountInsights, mapPieceInsights,
  normalizeAccountDatum,
} from '../../src/lib/insightsMapper.js';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';
const TTL_MIN = 45;
const MAX_PIECES = 12;

// Métricas de cuenta (serie, total_value, period=day). follower_count va aparte.
const ACCOUNT_TS = ['reach', 'profile_views', 'accounts_engaged', 'total_interactions', 'views'];
// Métricas por pieza (lifetime) — set confirmado en vivo.
const PIECE_METRICS = ['reach', 'likes', 'comments', 'shares', 'saved', 'total_interactions'];

async function graphGet(url: string, ms = 8000): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    const j = await r.json().catch(() => null);
    return r.ok ? j : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchAccountMetric(ig: string, token: string, metric: string, extra: string) {
  const url = `${GRAPH_API_BASE}/${ig}/insights?metric=${metric}&${extra}&access_token=${encodeURIComponent(token)}`;
  const j = await graphGet(url);
  const values = normalizeAccountDatum(j?.data?.[0]);
  return values ? { name: metric, values } : null;
}

async function fetchPieceMetrics(mediaId: string, token: string) {
  const url = `${GRAPH_API_BASE}/${mediaId}/insights?metric=${PIECE_METRICS.join(',')}&access_token=${encodeURIComponent(token)}`;
  const j = await graphGet(url);
  return Array.isArray(j?.data) ? j.data.map((d: any) => ({ name: d.name, values: d.values })) : null;
}

export default async function handler(req, res) {
  if (applyPortalCors(req, res)) return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  let member;
  try {
    member = await requireMember(req);
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }

  const pick = pickClientSlug(member.clients, req.query?.client ? String(req.query.client) : null);
  if ('error' in pick) return res.status(pick.error).json({ error: pick.error === 403 ? 'Forbidden' : 'Sin cliente' });
  const slug = pick.slug;

  let sb;
  try {
    sb = serviceClient();
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message });
  }

  const now = new Date();
  const { data: cached } = await sb
    .from('ig_insights_cache').select('payload, fetched_at').eq('client_id', slug).maybeSingle();

  const wantsRefresh = req.query?.refresh === '1';
  const forceAllowed = wantsRefresh && canForceRefresh(cached?.fetched_at ?? null, now);
  if (cached && isCacheFresh(cached.fetched_at, now, TTL_MIN) && !forceAllowed) {
    return res.status(200).json({ ok: true, payload: cached.payload, fetched_at: cached.fetched_at });
  }

  // Recompute.
  const { data: acctRow } = await sb
    .from('scheduled_posts').select('ig_account_id')
    .eq('client_id', slug).not('ig_account_id', 'is', null).limit(1).maybeSingle();
  const igAccountId = acctRow?.ig_account_id ?? null;

  let token: string | null = null;
  try { token = resolveClientToken(slug, process.env); } catch { token = null; }

  let payload;
  if (!token || !igAccountId) {
    payload = { account: [], pieces: [], followerCount: null, needsConnection: true };
  } else {
    // Piezas: últimas N publicadas.
    const { data: pieceRows } = await sb
      .from('scheduled_posts')
      .select('published_media_id, platform, cover_r2_url, permalink, caption')
      .eq('client_id', slug).eq('status', 'published').not('published_media_id', 'is', null)
      .order('scheduled_at', { ascending: false }).limit(MAX_PIECES);
    const rows = pieceRows ?? [];

    // Todos los fetches a Graph en paralelo (cada uno degrada solo si falla):
    // cuenta + follower_count + una llamada por pieza. Wall-time ≈ un round-trip,
    // bien dentro del límite del serverless (no hace falta Vercel Workflow).
    const [accountResults, pieceResults] = await Promise.all([
      Promise.all([
        ...ACCOUNT_TS.map((metric) => fetchAccountMetric(igAccountId, token, metric, 'period=day&metric_type=time_series')),
        fetchAccountMetric(igAccountId, token, 'follower_count', 'period=day'),
      ]),
      Promise.all(rows.map((row) => fetchPieceMetrics(row.published_media_id, token))),
    ]);
    const accountRaw = accountResults.filter(Boolean);
    const byId: Record<string, any> = {};
    rows.forEach((row, i) => { byId[row.published_media_id] = pieceResults[i]; });

    const acct = mapAccountInsights(accountRaw as any);
    payload = {
      account: acct.account,
      followerCount: acct.followerCount,
      pieces: mapPieceInsights(rows as any, byId),
      needsConnection: false,
    };
  }

  const fetchedAt = now.toISOString();
  await sb.from('ig_insights_cache').upsert({ client_id: slug, payload, fetched_at: fetchedAt });
  return res.status(200).json({ ok: true, payload, fetched_at: fetchedAt });
}
