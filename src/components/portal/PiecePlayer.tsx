import React, { useCallback, useEffect, useState } from 'react';
import type { PortalPiece } from '@/lib/portalTypes';
import { typeMeta } from '@/lib/portalView';
import { PieceThread } from '@/components/admin/campaigns/PieceThread';
import { PortalVideo } from '@/components/portal/PortalVideo';

type Props = {
  piece: PortalPiece;
  startWithChanges?: boolean;
  busy: boolean;
  error?: string | null;
  onClose: () => void;
  onApprove: () => void;
  onSendChanges: (comment: string) => void;
  /** Vista previa del equipo: muestra la pieza sin disparar decisiones reales del cliente. */
  readOnly?: boolean;
};

export const PiecePlayer: React.FC<Props> = ({ piece, startWithChanges, busy, error, onClose, onApprove, onSendChanges, readOnly = false }) => {
  const [slide, setSlide] = useState(0);
  const [asking, setAsking] = useState(!!startWithChanges);
  const [comment, setComment] = useState('');
  const [closing, setClosing] = useState(false);
  const approved = piece.status === 'approved';

  const requestClose = useCallback(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { onClose(); return; }
    setClosing(true);
    window.setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && requestClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [requestClose]);

  return (
    <div className={`modal${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" onClick={requestClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="media">
          {piece.mediaUrl ? (
            <PortalVideo src={piece.mediaUrl} poster={piece.coverUrl} />
          ) : piece.slides.length > 0 ? (
            <>
              <img className="slide" src={piece.slides[slide]} alt={`Lámina ${slide + 1}`} />
              <div className="slidenav">
                <button type="button" aria-label="Lámina anterior" onClick={() => setSlide((s) => Math.max(0, s - 1))}>‹</button>
                <span>{slide + 1} / {piece.slides.length}</span>
                <button type="button" aria-label="Lámina siguiente" onClick={() => setSlide((s) => Math.min(piece.slides.length - 1, s + 1))}>›</button>
              </div>
            </>
          ) : piece.coverUrl ? (
            <img className="slide" src={piece.coverUrl} alt={piece.title} />
          ) : null}
        </div>
        <div className="side">
          <button type="button" className="close" onClick={requestClose} aria-label="Cerrar">✕</button>
          <div className="ty" style={{ color: 'var(--wood)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 600 }}>{typeMeta(piece.type).singular}</div>
          <h3>{piece.title}</h3>
          {piece.caption && <div className="cap">{piece.caption}</div>}
          {piece.description && (
            <div style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{piece.description}</div>
          )}
          {piece.hashtags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {piece.hashtags.map((h) => (
                <span key={h} style={{ fontSize: 12, color: 'var(--wood)', border: '1px solid var(--line)', borderRadius: 999, padding: '3px 9px' }}>
                  #{h.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}
          {approved ? (
            <div className="btn done">✓ Aprobada por vos</div>
          ) : asking ? (
            <div className="discuss">
              <div className="lab">Contanos qué cambiarías</div>
              <textarea className="ta" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ej: me gustaría otra toma de apertura…" />
              <button type="button" className="send" disabled={busy || !comment.trim()} onClick={() => onSendChanges(comment.trim())}>{busy ? 'Enviando…' : 'Enviar comentarios'}</button>
            </div>
          ) : (
            <div className="actions" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button type="button" className="btn approve" disabled={busy} onClick={onApprove}>{busy ? 'Enviando…' : 'Aprobar'}</button>
              <button type="button" className="btn change" disabled={busy} onClick={() => setAsking(true)}>Pedir cambios</button>
            </div>
          )}
          {readOnly && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: -2 }}>
              Vista previa del equipo — así lo ve el cliente. Las acciones se completan desde su portal.
            </div>
          )}
          {error && <div className="err">{error}</div>}
          {!readOnly && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: 'var(--wood)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 600 }}>Conversación con tu equipo</div>
              <PieceThread jobId={piece.id} mode="client" variant="portal" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
