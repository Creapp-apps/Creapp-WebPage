/** Entrada del hilo de una pieza: mensaje de texto o decisión del cliente. */
export interface ThreadEntry {
  id: string;
  kind: 'message' | 'decision';
  authorRole: 'team' | 'client';
  authorName: string | null;
  body: string | null;
  decision: 'approved' | 'changes_requested' | null;
  at: string;
}
