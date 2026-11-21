import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CronLogEventInsert, DeployEventInsert } from './launchesTypes.ts';

const CRON_PATH = '/api/cron/publish-queue';
const ERROR_LEVELS = new Set(['error', 'fatal']);
const DEPLOY_TYPES = new Set(['deployment.succeeded', 'deployment.error', 'deployment.ready']);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/** HMAC-SHA1 hex del body crudo vs header x-vercel-signature, timing-safe. Nunca tira. */
export function verifyVercelSignature(rawBody: string, header: string, secret: string): boolean {
  try {
    if (typeof header !== 'string' || !header || typeof rawBody !== 'string' || !secret) return false;
    const expected = Buffer.from(createHmac('sha1', secret).update(rawBody).digest('hex'));
    const got = Buffer.from(header.trim());
    if (expected.length !== got.length) return false;
    return timingSafeEqual(expected, got);
  } catch {
    return false;
  }
}

/** Línea de Log Drain -> insert, solo si es del cron y level error/fatal. */
export function parseDrainLine(entry: unknown): CronLogEventInsert | null {
  if (!isObj(entry)) return null;
  const proxy = isObj(entry.proxy) ? entry.proxy : {};
  const path = str(proxy.path) ?? str(entry.path) ?? str(entry.requestPath) ?? str(entry.request_path);
  if (!path || path.split(/[?#]/)[0].replace(/\/+$/, '') !== CRON_PATH) return null;
  const level = (str(entry.level) ?? str(entry.severity) ?? '').toLowerCase();
  if (!ERROR_LEVELS.has(level)) return null;
  return {
    deployment_id: str(entry.deploymentId) ?? str(entry.deployment_id),
    request_id: str(entry.requestId) ?? str(entry.request_id) ?? str(proxy.requestId),
    level,
    message: str(entry.message),
    request_path: path,
    raw: entry,
  };
}

/** Evento de webhook de deploy -> insert; null si no es succeeded/error/ready. */
export function parseDeployEvent(payload: unknown): DeployEventInsert | null {
  if (!isObj(payload)) return null;
  const type = str(payload.type);
  if (!type || !DEPLOY_TYPES.has(type)) return null;
  const inner = isObj(payload.payload) ? payload.payload : {};
  const dep = isObj(inner.deployment) ? inner.deployment : {};
  const meta = isObj(dep.meta) ? dep.meta : {};
  return {
    type,
    deployment_id: str(dep.id) ?? str(inner.deploymentId),
    git_sha: str(meta.githubCommitSha) ?? str(meta.gitlabCommitSha) ?? str(meta.bitbucketCommitSha),
    state: type.slice('deployment.'.length),
    raw: payload,
  };
}
