import React from 'react';
import type { PortalPiece } from '@/lib/portalTypes';
import { typeMeta } from '@/lib/portalView';

const GRADS = ['#0c2b4f,#071a33', '#1a3a24,#0a1f12', '#3a2a1a,#1f1408', '#143a66,#0c2b4f', '#2a1f14,#4a3420'];

type Props = {
  piece: PortalPiece;
  index: number;
  busy: boolean;
  error?: string | null;
  onOpen: () => void;
  onApprove: () => void;
  onRequestChanges: () => void;
};

export const PieceCard: React.FC<Props> = ({ piece, index, busy, error, onOpen, onApprove, onRequestChanges }) => {
  const meta = typeMeta(piece.type);
  const vertical = piece.type !== 'carousel';
  const approved = piece.status === 'approved';
  const label = piece.type === 'carousel' && piece.slides.length ? `${meta.singular} · ${piece.slides.length} láminas` : meta.singular;
  return (
    <div className="card">
      <button type="button" className={`preview ${vertical ? 'v' : 'c'}`} onClick={onOpen} aria-label={`Ver ${piece.title}`}>
        <div className="ph" style={{ backgroundImage: `linear-gradient(135deg,${GRADS[index % GRADS.length]})` }} />
        {piece.coverUrl && <img className="thumbimg" src={piece.coverUrl} alt="" loading="lazy" />}
        <div className="veil" />
        <div className={`pill ${approved ? 'aprob' : 'rev'}`}>
          {approved ? '✓ Aprobada' : piece.status === 'changes_requested' ? 'Cambios pedidos' : 'Espera tu mirada'}
        </div>
        {vertical && <div className="play" />}
      </button>
      <div className="body">
        <div className="ty">{label}</div>
        <h3>{piece.title}</h3>
        <p>{piece.caption}</p>
        <div className="actions">
          {approved ? (
            <div className="btn done">✓ Aprobada por vos</div>
          ) : (
            <>
              <button type="button" className="btn approve" disabled={busy} onClick={onApprove}>{busy ? 'Enviando…' : 'Aprobar'}</button>
              <button type="button" className="btn change" disabled={busy} onClick={onRequestChanges}>Pedir cambios</button>
            </>
          )}
        </div>
        {error && <div className="err">{error}</div>}
      </div>
    </div>
  );
};
