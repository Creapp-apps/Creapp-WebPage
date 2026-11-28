import { getSupabase } from '@/lib/supabaseClient';

export type InboxRole = 'team' | 'client';
export type InboxKind = 'message' | 'suggestion';

export interface InboxEntry {
  id: string;
  authorRole: InboxRole;
  authorName: string | null;
  kind: InboxKind;
  body: string;
  at: string;
}

type RawMsg = {
  id: string;
  campaign_id: string;
  author_role: InboxRole;
  author_user_id: string;
  kind: InboxKind;
  body: string;
  created_at: string;
};

/** Mensajes del inbox de una campaña, con el nombre del autor resuelto (nunca email). */
export async function getInbox(campaignId: string): Promise<InboxEntry[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('content_inbox_messages')
    .select('id, campaign_id, author_role, author_user_id, kind, body, created_at')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as RawMsg[];

  const ids = [...new Set(rows.map((r) => r.author_user_id))];
  const names: Record<string, string | null> = {};
  if (ids.length > 0) {
    const p = await sb.from('user_profiles').select('id, full_name').in('id', ids);
    if (p.error) throw p.error;
    for (const r of (p.data ?? []) as { id: string; full_name: string | null }[]) names[r.id] = r.full_name;
  }

  return rows.map((r) => ({
    id: r.id,
    authorRole: r.author_role,
    authorName: names[r.author_user_id] ?? null,
    kind: r.kind,
    body: r.body,
    at: r.created_at,
  }));
}

/** El rol lo fija la función (y la RLS lo refuerza). kind: 'message' | 'suggestion'. */
export async function postInboxMessage(
  campaignId: string,
  body: string,
  role: InboxRole,
  kind: InboxKind = 'message',
): Promise<void> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error('Necesitás iniciar sesión para escribir en la bandeja.');
  const text = body.trim();
  if (!text) throw new Error('El mensaje está vacío.');
  const { error } = await sb.from('content_inbox_messages').insert({
    campaign_id: campaignId,
    author_role: role,
    author_user_id: uid,
    kind,
    body: text,
  });
  if (error) throw error;
}

/** Marca como leído: guarda last_read_at = now() para el usuario actual en esta campaña. */
export async function markInboxRead(campaignId: string): Promise<void> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return;
  const { error } = await sb
    .from('content_inbox_reads')
    .upsert(
      { campaign_id: campaignId, user_id: uid, last_read_at: new Date().toISOString() },
      { onConflict: 'campaign_id,user_id' },
    );
  if (error) throw error;
}

/**
 * Cantidad de mensajes sin leer para el lado indicado.
 * side 'client' cuenta mensajes del equipo; side 'team' cuenta los del cliente.
 */
export async function getInboxUnread(campaignId: string, side: InboxRole): Promise<number> {
  const sb = getSupabase();
  const { data: u } = await sb.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return 0;

  const read = await sb
    .from('content_inbox_reads')
    .select('last_read_at')
    .eq('campaign_id', campaignId)
    .eq('user_id', uid)
    .maybeSingle();
  if (read.error) throw read.error;
  const lastRead = read.data?.last_read_at ?? '1970-01-01T00:00:00Z';

  const otherRole: InboxRole = side === 'client' ? 'team' : 'client';
  const { count, error } = await sb
    .from('content_inbox_messages')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('author_role', otherRole)
    .gt('created_at', lastRead);
  if (error) throw error;
  return count ?? 0;
}

/** Suscripción realtime a los mensajes nuevos de la campaña. */
export function subscribeInbox(campaignId: string, onChange: () => void): () => void {
  const sb = getSupabase();
  const channel = sb
    .channel(`inbox-${campaignId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'content_inbox_messages', filter: `campaign_id=eq.${campaignId}` },
      () => onChange(),
    )
    .subscribe();
  return () => { void sb.removeChannel(channel); };
}
