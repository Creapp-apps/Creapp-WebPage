import { getSupabase } from '@/lib/supabaseClient';
import { computeCronHealth } from './launchesView';
import { mapLaunchPieces, type LAssetRow, type LClientRow, type LJobRow, type LScheduledRow } from './launchesMapper';
import type { CronLogEventRow, CronRunRow, DeployEventRow, LaunchesOverview } from './launchesTypes';

export type { LaunchesOverview, LaunchPiece } from './launchesTypes';

/** Solo lectura bajo RLS de equipo (anon key). scheduled_posts es la fuente principal; las tablas de salud se aíslan. */
export async function getLaunchesOverview(): Promise<LaunchesOverview> {
  const sb = getSupabase();
  const sp = await sb.from('scheduled_posts').select('*').order('updated_at', { ascending: false }).limit(300);
  if (sp.error) throw sp.error;
  const motorIds = [...new Set(((sp.data ?? []) as { job_id?: string | null }[]).map((r) => r.job_id).filter((x): x is string => !!x))];
  // scheduled_posts.job_id = content_jobs.job_id_motor; content_assets.job_id = content_jobs.id (UUID).
  const jobsP = motorIds.length
    ? sb.from('content_jobs').select('id, client_id, type, title, job_id_motor').in('job_id_motor', motorIds)
    : Promise.resolve({ data: [], error: null });
  const assetsP = jobsP.then(async (jr) => {
    if (jr.error) return { data: [], error: null };
    const jobUuids = ((jr.data ?? []) as { id?: string | null }[]).map((j) => j.id).filter((x): x is string => !!x);
    return jobUuids.length
      ? await sb.from('content_assets').select('job_id, kind, url').in('kind', ['cover_9_16', 'slide']).in('job_id', jobUuids).order('created_at', { ascending: true }).limit(5000)
      : { data: [], error: null };
  });
  const [cl, jo, as, runs, logs, deploys] = await Promise.all([
    sb.from('clients').select('id, slug, name').limit(1000),
    jobsP,
    assetsP,
    sb.from('cron_runs').select('*').order('started_at', { ascending: false }).limit(50),
    sb.from('cron_log_events').select('*').order('received_at', { ascending: false }).limit(100),
    sb.from('deploy_events').select('*').order('received_at', { ascending: false }).limit(30),
  ]);
  for (const r of [sp, cl, jo, as]) if (r.error) throw r.error;

  const healthErrors: string[] = [];
  const health = <T,>(name: string, r: { data: unknown; error: { message: string } | null }): T[] => {
    if (r.error) {
      console.warn(`[launches] no se pudo leer ${name}:`, r.error.message);
      healthErrors.push(name);
      return [];
    }
    return (r.data ?? []) as T[];
  };
  const cronRuns = health<CronRunRow>('cron_runs', runs);
  const logEvents = health<CronLogEventRow>('cron_log_events', logs);
  const deployEvents = health<DeployEventRow>('deploy_events', deploys);

  const now = new Date();
  const cronHealthy = computeCronHealth(cronRuns, now).state === 'ok';
  const pieces = mapLaunchPieces(
    (sp.data ?? []) as LScheduledRow[], (cl.data ?? []) as LClientRow[],
    (jo.data ?? []) as LJobRow[], (as.data ?? []) as LAssetRow[], cronHealthy, now,
  );
  const clients = ((cl.data ?? []) as LClientRow[]).map((c) => ({ slug: c.slug, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));
  return { pieces, clients, cronRuns, logEvents, deployEvents, healthErrors, fetchedAt: now.toISOString() };
}

/** Realtime sobre las 4 tablas. Devuelve cleanup. */
export function subscribeLaunches(onChange: () => void): () => void {
  const sb = getSupabase();
  let ch = sb.channel('launches');
  for (const table of ['scheduled_posts', 'cron_runs', 'cron_log_events', 'deploy_events']) {
    ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange());
  }
  const channel = ch.subscribe();
  return () => { void sb.removeChannel(channel); };
}

async function call<T = unknown>(path: string, body: unknown, accessToken?: string): Promise<T> {
  let token = accessToken;
  if (!token) {
    const { data } = await getSupabase().auth.getSession();
    token = data.session?.access_token;
  }
  if (!token) throw new Error('Sin sesión activa');
  const res = await fetch(`/api/launches/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || `Error ${res.status}`);
  return json as T;
}

export const callRetry = (args: { id: string }, accessToken?: string) => call('retry', args, accessToken);
export const callForce = (args: { id: string }, accessToken?: string) => call('force-run', args, accessToken);
export const callRunTick = (args: Record<string, never> = {}, accessToken?: string) => call('run-tick', args, accessToken);
export const callCancel = (args: { id: string }, accessToken?: string) => call('cancel', args, accessToken);
export const callReschedule = (args: { id: string; scheduled_at: string }, accessToken?: string) => call('reschedule', args, accessToken);

/** GET /api/launches/cron-logs?deploymentId=... */
export async function fetchCronLogs(deploymentId: string, accessToken?: string): Promise<unknown> {
  let token = accessToken;
  if (!token) token = (await getSupabase().auth.getSession()).data.session?.access_token;
  if (!token) throw new Error('Sin sesión activa');
  const res = await fetch(`/api/launches/cron-logs?deploymentId=${encodeURIComponent(deploymentId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error || `Error ${res.status}`);
  return json;
}
