import React, { useEffect, useState } from 'react';
import type { PortalPiece } from '@/lib/portalTypes';
import { TYPE_META } from '@/lib/portalView';

type Props = {
  piece: PortalPiece;
  startWithChanges?: boolean;
  busy: boolean;
  error?: string | null;
  onClose: () => void;
  onApprove: () => void;
  onSendChanges: (comment: string) => void;
};

export const PiecePlayer: React.FC<Props> = ({ piece, startWithChanges, busy, error, onClose, onApprove, onSendChanges }) => {
  const [slide, setSlide] = useState(0);
  const [asking, setAsking] = useState(!!startWithChanges);
  const [comment, setComment] = useState('');
  const approved = piece.status === 'approved';

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  return (
    <div className="modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="media">
          {piece.mediaUrl ? (
            <video src={piece.mediaUrl} poster={piece.coverUrl ?? undefined} controls playsInline autoPlay />
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
          <button type="button" className="close" onClick={onClose} aria-label="Cerrar">✕</button>
          <div className="ty" style={{ color: 'var(--wood)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 600 }}>{TYPE_META[piece.type].singular}</div>
          <h3>{piece.title}</h3>
          {piece.caption && <div className="cap">{piece.caption}</div>}
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
          {error && <div className="err">{error}</div>}
        </div>
      </div>
    </div>
  );
};
