import { getSupabase } from '@/lib/supabaseClient';
import { sendPortalInvite } from '@/lib/emailService';
import { deriveAccessStatus, type ClientAccessStatus } from './portalOnboardingMapper';

export type { ClientAccessStatus } from './portalOnboardingMapper';

/**
 * Estado de acceso del cliente. Solo anon + RLS de equipo.
 * auth.users.last_sign_in_at no es legible desde el front, así que "actividad"
 * se infiere de content_approvals (un member que aprobó/comentó ya ingresó).
 */
export async function getClientAccess(
  clientId: string,
): Promise<{ status: ClientAccessStatus; email: string | null }> {
  const sb = getSupabase();
  const { data: members, error } = await sb
    .from('client_members').select('user_id').eq('client_id', clientId);
  if (error) throw error;
  const list = (members ?? []) as { user_id: string }[];
  if (list.length === 0) return { status: 'none', email: null };

  const ids = list.map((m) => m.user_id);
  const [pr, ap] = await Promise.all([
    sb.from('user_profiles').select('id, email').in('id', ids),
    sb.from('content_approvals').select('client_user_id, created_at').in('client_user_id', ids),
  ]);
  if (pr.error) throw pr.error;
  if (ap.error) throw ap.error;

  const seen: Record<string, string | null> = {};
  for (const a of (ap.data ?? []) as { client_user_id: string; created_at: string }[]) {
    if (!seen[a.client_user_id] || a.created_at > (seen[a.client_user_id] as string)) {
      seen[a.client_user_id] = a.created_at;
    }
  }
  const email = ((pr.data ?? []) as { id: string; email: string | null }[])[0]?.email ?? null;
  return { status: deriveAccessStatus(list, seen), email };
}

/** Crea/reusa el usuario cliente (edge fn) y le manda el mail con el link de activación. */
export async function invitePortalClient(args: {
  clientId: string; brandName: string; email: string; fullName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const email = args.email.trim().toLowerCase();
    const { data, error } = await getSupabase().functions.invoke('invite-client', {
      body: { clientId: args.clientId, email, fullName: args.fullName },
    });
    if (error) {
      let message = error.message;
      try {
        const body = await (error as any).context?.json?.();
        if (body?.code) message = body.code;
        else if (body?.error) message = body.error;
      } catch { /* sin cuerpo JSON legible */ }
      return { success: false, error: message };
    }
    if (data?.error) return { success: false, error: data.code ?? data.error };
    if (!data?.activationLink) return { success: false, error: 'No se recibió el link de activación.' };

    const sent = await sendPortalInvite({
      email, fullName: args.fullName, brandName: args.brandName, activationLink: data.activationLink,
    });
    return sent.success ? { success: true } : { success: false, error: sent.error ?? 'No se pudo enviar el email.' };
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'Error inesperado al invitar al cliente.' };
  }
}
