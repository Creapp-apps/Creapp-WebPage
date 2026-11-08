import { getSupabase } from '@/lib/supabaseClient';
import { buildThread, type TMessageRow, type TApprovalRow, type TProfileRow } from './threadMapper';
import type { ThreadEntry } from './threadTypes';

export async function getThread(jobId: string): Promise<ThreadEntry[]> {
  const sb = getSupabase();
  const [m, a] = await Promise.all([
    sb.from('content_messages').select('id, job_id, author_role, author_user_id, body, created_at').eq('job_id', jobId),
    sb.from('content_approvals').select('job_id, client_user_id, decision, comment, created_at').eq('job_id', jobId),
  ]);
  if (m.error) throw m.error;
  if (a.error) throw a.error;
  const msgs = (m.data ?? []) as TMessageRow[];
  const apps = (a.data ?? []) as TApprovalRow[];
  // Solo resolvemos nombres de quienes participaron en este hilo (nunca emails).
  const ids = [...new Set([...msgs.map((x) => x.author_user_id), ...apps.map((x) => x.client_user_id)])];
  const profiles: Record<string, TProfileRow> = {};
  if (ids.length > 0) {
    const p = await sb.from('user_profiles').select('id, full_name').in('id', ids);
    if (p.error) throw p.error;
    for (const r of (p.data ?? []) as TProfileRow[]) profiles[r.id] = r;
  }
  return buildThread(msgs, apps, profiles);
}

async function post(jobId: string, body: string, role: 'team' | 'client'): Promise<void> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error('Necesitás iniciar sesión para escribir en el hilo.');
  const text = body.trim();
  if (!text) throw new Error('El mensaje está vacío.');
  const { error } = await sb.from('content_messages')
    .insert({ job_id: jobId, author_role: role, author_user_id: uid, body: text });
  if (error) throw error;
}

/** El rol lo fija la función, no la UI (la RLS igual lo refuerza). */
export const postTeamMessage = (jobId: string, body: string) => post(jobId, body, 'team');
export const postClientMessage = (jobId: string, body: string) => post(jobId, body, 'client');

export function subscribeThread(jobId: string, onChange: () => void): () => void {
  const sb = getSupabase();
  const filter = `job_id=eq.${jobId}`;
  const channel = sb
    .channel(`thread-${jobId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'content_messages', filter }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'content_approvals', filter }, () => onChange())
    .subscribe();
  return () => { void sb.removeChannel(channel); };
}
