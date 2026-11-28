// Puente a la cáscara Electron (suite desktop). Si no corre en el desktop,
// las funciones son no-op: la web sigue andando igual en el navegador.

type DesktopApi = {
  notify?: (payload: { title: string; body?: string; url?: string }) => void;
  setBadge?: (n: number) => void;
};

function desktop(): DesktopApi | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { creappDesktop?: DesktopApi }).creappDesktop ?? null;
}

/** ¿Estamos dentro de la suite desktop (Electron)? */
export const isDesktop = (): boolean => !!desktop()?.notify;

/** Pide una notificación nativa del SO (solo tiene efecto en el desktop). */
export function notifyDesktop(payload: { title: string; body?: string; url?: string }): void {
  try { desktop()?.notify?.(payload); } catch { /* best-effort */ }
}

/** Setea el badge del dock con la cantidad de no leídos (solo desktop). */
export function setDesktopBadge(n: number): void {
  try { desktop()?.setBadge?.(n); } catch { /* best-effort */ }
}
