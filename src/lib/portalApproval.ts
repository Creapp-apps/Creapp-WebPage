import type { PortalDecision } from './portalTypes.ts';

export type ApprovalInsert = {
  job_id: string; client_user_id: string; decision: PortalDecision; comment: string | null;
};

export function buildApprovalInsert(
  user: { id: string }, jobId: string, decision: PortalDecision, comment?: string,
): ApprovalInsert {
  return { job_id: jobId, client_user_id: user.id, decision, comment: comment ?? null };
}

// Cliente mínimo (estructural) para poder inyectar un fake en tests.
export type ApprovalClient = {
  auth: { getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  from(table: string): { insert(row: ApprovalInsert): PromiseLike<{ error: unknown }> };
};

export async function submitDecisionWith(
  sb: ApprovalClient, jobId: string, decision: PortalDecision, comment?: string,
): Promise<void> {
  const { data, error: uErr } = await sb.auth.getUser();
  if (uErr) throw uErr;
  if (!data.user) throw new Error('Sesión no iniciada');
  const { error } = await sb.from('content_approvals').insert(buildApprovalInsert(data.user, jobId, decision, comment));
  if (error) throw error;
}
