import type { ThreadEntry } from './threadTypes.ts';

export interface TMessageRow {
  id: string;
  job_id: string;
  author_role: 'team' | 'client';
  author_user_id: string;
  body: string;
  created_at: string;
}
export interface TApprovalRow {
  job_id: string;
  client_user_id: string;
  decision: 'approved' | 'changes_requested';
  comment: string | null;
  created_at: string;
}
export interface TProfileRow {
  id: string;
  email?: string | null;
  full_name?: string | null;
}

/**
 * content_approvals no tiene columna id: el id sintético es determinista
 * ('ap:<job>:<created_at>:<client_user_id>') para un desempate estable.
 */
export function approvalId(a: TApprovalRow): string {
  return `ap:${a.job_id}:${a.created_at}:${a.client_user_id}`;
}

function nameOf(profiles: Record<string, TProfileRow>, userId: string): string | null {
  const p = profiles[userId];
  return p?.full_name || p?.email || null;
}

/** Fusiona mensajes y decisiones en un hilo cronológico (asc, desempate por id). PURA. */
export function buildThread(
  messages: TMessageRow[],
  approvals: TApprovalRow[],
  profiles: Record<string, TProfileRow>,
): ThreadEntry[] {
  const entries: ThreadEntry[] = [
    ...messages.map((m): ThreadEntry => ({
      id: m.id, kind: 'message', authorRole: m.author_role,
      authorName: nameOf(profiles, m.author_user_id),
      body: m.body, decision: null, at: m.created_at,
    })),
    ...approvals.map((a): ThreadEntry => ({
      id: approvalId(a), kind: 'decision', authorRole: 'client',
      authorName: nameOf(profiles, a.client_user_id),
      body: a.comment, decision: a.decision, at: a.created_at,
    })),
  ];
  return entries.sort((x, y) => {
    const tx = Date.parse(x.at), ty = Date.parse(y.at);
    if (tx !== ty) return tx - ty;
    return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  });
}
