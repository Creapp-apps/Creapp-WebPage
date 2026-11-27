// Servicio del showroom "Mis Piezas" (browser). Une el calendario del cliente con la
// disponibilidad real del media y baja piezas con el Bearer de la sesión Supabase.
import { getMyCalendarPieces, subscribeMyCalendar } from './calendarService';
import { selectPublishedPieces } from './showroomSelect';
import { getSupabase } from './supabaseClient';
import type { CalendarPiece } from './calendarTypes';

async function bearer(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sin sesión activa');
  return token;
}

export async function getMyShowroomPieces(campaignId: string | null): Promise<CalendarPiece[]> {
  const pieces = selectPublishedPieces(await getMyCalendarPieces(campaignId));
  if (pieces.length === 0) return [];
  try {
    const token = await bearer();
    const ids = pieces.map((p) => p.id).join(',');
    const res = await fetch(`/api/portal/pieces-availability?post=${encodeURIComponent(ids)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return pieces;
    const json = (await res.json()) as { available?: Record<string, boolean> };
    const available = json.available || {};
    return pieces.filter((p) => available[p.id] !== false);
  } catch {
    // Mejor mostrar que ocultar: el proxy de descarga igual responde 404 si se purgó.
    return pieces;
  }
}

export async function fetchPieceBlob(postId: string, index = 0): Promise<{ blob: Blob; filename: string }> {
  const token = await bearer();
  const res = await fetch(`/api/download-video?post=${encodeURIComponent(postId)}&i=${index}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: string }).error || 'No disponible');
  }
  const blob = await res.blob();
  const m = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '');
  return { blob, filename: m ? m[1] : `pieza-${postId}.mp4` };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const subscribeMyShowroom = subscribeMyCalendar;
