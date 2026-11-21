export interface CronRunInsert {
  cron_name: string;
  started_at: string;
  deployment_id: string | null;
  git_sha: string | null;
}

export interface CronRunEnd {
  outcome: 'ok' | 'error';
  processed_count: number;
  published_count: number;
  error_count: number;
  error_text: string | null;
}

export function buildRunStart(env: Record<string, string | undefined>): CronRunInsert {
  return {
    cron_name: 'publish-queue',
    started_at: new Date().toISOString(),
    deployment_id: env.VERCEL_DEPLOYMENT_ID ?? null,
    git_sha: env.VERCEL_GIT_COMMIT_SHA ?? null,
  };
}

export function buildRunEnd(results: Array<{ id?: string; status: string; error?: string }>): CronRunEnd {
  const errors = results.filter((r) => r.status === 'error');
  return {
    outcome: errors.length > 0 ? 'error' : 'ok',
    processed_count: results.length,
    published_count: results.filter((r) => r.status === 'published').length,
    error_count: errors.length,
    error_text: errors.length > 0
      ? errors.map((e) => `${e.id ?? '?'}: ${e.error ?? 'error'}`).join('; ').slice(0, 1000)
      : null,
  };
}
