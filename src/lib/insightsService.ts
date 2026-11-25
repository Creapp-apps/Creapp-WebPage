// Fetch de insights del cliente desde el portal (browser). Manda el Bearer de la
// sesión Supabase; el endpoint resuelve token+cuenta server-side. Patrón de
// launchesService.call. Ver spec §6.5.
import { getSupabase } from './supabaseClient';
import type { InsightsPayload } from './insightsTypes';

export type { InsightsPayload } from './insightsTypes';

export interface InsightsResult {
  payload: InsightsPayload;
  fetchedAt: string;
}

export async function getMyInsights(opts?: { refresh?: boolean }): Promise<InsightsResult> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sin sesión activa');

  const qs = opts?.refresh ? '?refresh=1' : '';
  const res = await fetch(`/api/portal/insights${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || `Error ${res.status}`);
  return { payload: (json as { payload: InsightsPayload }).payload, fetchedAt: (json as { fetched_at: string }).fetched_at };
}
