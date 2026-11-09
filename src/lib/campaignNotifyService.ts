import { getSupabase } from '@/lib/supabaseClient';
import { sendCampaignUpdate } from '@/lib/emailService';
import { countChangesSince, type NotifyPiece } from './campaignNotifyMapper';

export { countChangesSince } from './campaignNotifyMapper';

/** Email del dueño del cliente de la campaña (mismo recorrido que getClientAccess). */
export async function getCampaignClientEmail(campaignId: string): Promise<string | null> {
  const sb = getSupabase();
  const { data: camp, error } = await sb
    .from('content_campaigns').select('client_id').eq('id', campaignId).maybeSingle();
  if (error) throw error;
  const clientId = (camp as { client_id: string } | null)?.client_id;
  if (!clientId) return null;

  const { data: members, error: mErr } = await sb
    .from('client_members').select('user_id').eq('client_id', clientId);
  if (mErr) throw mErr;
  const ids = ((members ?? []) as { user_id: string }[]).map((m) => m.user_id);
  if (ids.length === 0) return null;

  const { data: profiles, error: pErr } = await sb
    .from('user_profiles').select('id, email').in('id', ids);
  if (pErr) throw pErr;
  return ((profiles ?? []) as { id: string; email: string | null }[])[0]?.email ?? null;
}

/** Envía el aviso de novedades y registra el envío. Nunca lanza. */
export async function notifyCampaignClient(args: {
  campaignId: string;
  brandName: string;
  month: string | null;
  pieces: NotifyPiece[];
}): Promise<{ success: boolean; error?: string; sent?: boolean }> {
  try {
    const sb = getSupabase();
    const { data: last, error: lErr } = await sb
      .from('content_client_notifications')
      .select('sent_at')
      .eq('campaign_id', args.campaignId)
      .order('sent_at', { ascending: false })
      .limit(1);
    if (lErr) throw lErr;
    const lastSentAt = ((last ?? []) as { sent_at: string }[])[0]?.sent_at ?? null;

    const { newCount, updatedCount, total } = countChangesSince(args.pieces, lastSentAt);
    if (total === 0) return { success: true, sent: false };

    const email = await getCampaignClientEmail(args.campaignId);
    if (!email) return { success: false, error: 'El cliente todavía no tiene acceso al portal.' };

    const base = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) ?? 'https://creapp.com.ar';
    const res = await sendCampaignUpdate({
      email,
      brandName: args.brandName,
      month: args.month,
      campaignUrl: `${base}/portal?campaign=${args.campaignId}`,
      newCount,
      updatedCount,
    });
    if (!res.success) return { success: false, error: res.error ?? 'No se pudo enviar el aviso.' };

    // Best-effort: el mail ya salió; un fallo del registro no debe provocar un reintento (mail duplicado).
    try {
      const { data: auth } = await sb.auth.getUser();
      const { error: iErr } = await sb.from('content_client_notifications').insert({
        campaign_id: args.campaignId,
        piece_count: total,
        sent_by: auth?.user?.id ?? null,
      });
      if (iErr) throw iErr;
    } catch (e) {
      console.warn('No se pudo registrar el aviso enviado en content_client_notifications:', e);
    }
    return { success: true, sent: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error al enviar el aviso.' };
  }
}
