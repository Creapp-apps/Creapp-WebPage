// =========================================================================
// CreAPP — Avisos previos de publicación (Capa 4 del plan de notificaciones).
// Dos salidas, ambas a app_notifications (campanita + SO vía la suite desktop):
//   1) Ping por pieza: ~LEAD min antes de que salga cada publicación.
//   2) Digest matinal: una vez al día (hora local AR) con la agenda del día.
// Idempotencia: el ping usa scheduled_posts.reminder_sent_at; el digest usa
// notification_daily_marks (una marca por día). Corre con service role desde el
// cron, así que puede insertar en app_notifications (RLS insert=false para users).
// =========================================================================

// Argentina no tiene horario de verano desde 2009: UTC-3 todo el año.
const AR_OFFSET_MIN = -180;
const PUBLISHABLE = ['queued', 'ready', 'containerizing', 'publishing'] as const;

type Sb = {
  from: (t: string) => any;
};

type SpRow = { id: string; client_id: string | null; job_id: string | null; scheduled_at: string; status: string };

export interface RemindersResult {
  pings: number;
  digest: boolean;
}

/** HH:MM en hora local AR a partir de un timestamp ISO (UTC). */
export function formatLocalTime(iso: string, offsetMin = AR_OFFSET_MIN): string {
  const local = new Date(new Date(iso).getTime() + offsetMin * 60000);
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Día local AR (YYYY-MM-DD) de un instante. */
export function localDayKey(now: Date, offsetMin = AR_OFFSET_MIN): string {
  return new Date(now.getTime() + offsetMin * 60000).toISOString().slice(0, 10);
}

/** Hora local AR (0-23) de un instante. */
export function localHour(now: Date, offsetMin = AR_OFFSET_MIN): number {
  return new Date(now.getTime() + offsetMin * 60000).getUTCHours();
}

/** Rango UTC [inicio, fin) del día local AR que contiene a `now`. */
export function localDayRangeUtc(now: Date, offsetMin = AR_OFFSET_MIN): { startUtc: string; endUtc: string } {
  const dayKey = localDayKey(now, offsetMin);
  const startUtc = new Date(Date.parse(`${dayKey}T00:00:00Z`) - offsetMin * 60000);
  const endUtc = new Date(startUtc.getTime() + 24 * 3600 * 1000);
  return { startUtc: startUtc.toISOString(), endUtc: endUtc.toISOString() };
}

async function resolveNames(sb: Sb, row: SpRow): Promise<{ marca: string; pieza: string }> {
  let marca = 'un cliente';
  let pieza = 'una pieza';
  try {
    if (row.client_id) {
      const { data } = await sb.from('clients').select('name').eq('id', row.client_id).maybeSingle();
      if (data?.name) marca = String(data.name).trim() || marca;
    }
    if (row.job_id) {
      const { data } = await sb.from('content_jobs').select('title').eq('job_id_motor', row.job_id).limit(1).maybeSingle();
      if (data?.title) pieza = String(data.title).trim() || pieza;
    }
  } catch { /* nombres best-effort */ }
  return { marca, pieza };
}

async function insertTeamNotif(
  sb: Sb,
  type: string,
  title: string,
  body: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const rows = ['admin', 'sales'].map((role) => ({
    type, title, body, url: '/admin?tab=content_campaigns', target_role: role, metadata,
  }));
  await sb.from('app_notifications').insert(rows);
}

export async function runPublishReminders(sb: Sb, now: Date, env: Record<string, string | undefined>): Promise<RemindersResult> {
  const leadMin = Number(env.REMINDER_LEAD_MINUTES ?? 45);
  const digestHour = Number(env.DIGEST_HOUR_LOCAL ?? 9);
  const result: RemindersResult = { pings: 0, digest: false };

  // --- 1) Ping por pieza: publicaciones dentro de la ventana de aviso ---
  try {
    const windowEnd = new Date(now.getTime() + leadMin * 60000);
    const { data: due } = await sb.from('scheduled_posts')
      .select('id, client_id, job_id, scheduled_at, status')
      .in('status', ['queued', 'ready'])
      .is('reminder_sent_at', null)
      .gt('scheduled_at', now.toISOString())
      .lte('scheduled_at', windowEnd.toISOString());
    for (const row of (due ?? []) as SpRow[]) {
      const { marca, pieza } = await resolveNames(sb, row);
      const body = `Hoy a las ${formatLocalTime(row.scheduled_at)} se publica «${pieza}» de «${marca}». Entrá a revisar.`;
      await insertTeamNotif(sb, 'publish_soon', 'Publicación en camino', body, { scheduled_post_id: row.id, client_id: row.client_id });
      await sb.from('scheduled_posts').update({ reminder_sent_at: now.toISOString() }).eq('id', row.id);
      result.pings++;
    }
  } catch (e) {
    console.error('[publish-reminders] ping falló:', (e as Error).message);
  }

  // --- 2) Digest matinal: una vez al día, a la hora local configurada ---
  try {
    if (localHour(now) === digestHour) {
      const markKey = `publish_digest_${localDayKey(now)}`;
      // Claim idempotente: solo el primer tick del día inserta la marca.
      const { error: markErr } = await sb.from('notification_daily_marks').insert({ mark_key: markKey });
      if (!markErr) {
        const { startUtc, endUtc } = localDayRangeUtc(now);
        const { data: todays } = await sb.from('scheduled_posts')
          .select('id, client_id, job_id, scheduled_at, status')
          .in('status', PUBLISHABLE as unknown as string[])
          .gte('scheduled_at', startUtc)
          .lt('scheduled_at', endUtc)
          .order('scheduled_at', { ascending: true });
        const list = (todays ?? []) as SpRow[];
        if (list.length > 0) {
          const parts: string[] = [];
          for (const row of list.slice(0, 8)) {
            const { marca, pieza } = await resolveNames(sb, row);
            parts.push(`${formatLocalTime(row.scheduled_at)} · ${pieza} (${marca})`);
          }
          const extra = list.length > 8 ? ` y ${list.length - 8} más` : '';
          const body = `Hoy se publican ${list.length}: ${parts.join(' · ')}${extra}.`;
          await insertTeamNotif(sb, 'publish_digest', `Agenda de hoy · ${list.length} publicaciones`, body, { day: localDayKey(now), count: list.length });
          result.digest = true;
        }
      }
    }
  } catch (e) {
    console.error('[publish-reminders] digest falló:', (e as Error).message);
  }

  return result;
}
