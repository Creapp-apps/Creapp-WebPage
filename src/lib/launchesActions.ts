// Guardas puras de acción para filas de scheduled_posts.
export type LaunchStatus =
  | 'queued' | 'containerizing' | 'ready' | 'publishing' | 'published' | 'error' | 'cancelled';
export type LaunchAction = 'retry' | 'cancel' | 'reschedule' | 'force';

const ALLOWED: Record<'cancel' | 'reschedule' | 'force', readonly string[]> = {
  cancel: ['queued', 'containerizing', 'ready'],
  reschedule: ['queued', 'ready'],
  force: ['queued', 'containerizing', 'ready'],
};

export const canCancel = (status: string): boolean => ALLOWED.cancel.includes(status);
export const canReschedule = (status: string): boolean => ALLOWED.reschedule.includes(status);
export const canForce = (status: string): boolean => ALLOWED.force.includes(status);
// Reintentar: fila en error, o trabada (el caller pasa `stuck`). Nunca published/cancelled.
export const canRetry = (status: string, stuck = false): boolean =>
  status === 'error' || (stuck && status !== 'published' && status !== 'cancelled');

export function actionError(action: LaunchAction, status: string, stuck = false): string | null {
  const ok = action === 'retry' ? canRetry(status, stuck) : ALLOWED[action].includes(status);
  if (ok) return null;
  if (status === 'published') return 'La publicación ya está publicada; no se puede modificar.';
  if (status === 'publishing') return 'La publicación ya está en curso; no se puede modificar.';
  if (status === 'cancelled') return 'La publicación ya está cancelada.';
  const label = { retry: 'reintentar', cancel: 'cancelar', reschedule: 'reprogramar', force: 'forzar' }[action];
  return `No se puede ${label} una publicación en estado "${status}".`;
}
