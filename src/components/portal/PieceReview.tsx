import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PortalPiece } from '@/lib/portalTypes';
import { typeMeta } from '@/lib/portalView';
import { reviewSummary } from '@/lib/reviewQueue';
import { PortalVideo } from '@/components/portal/PortalVideo';
import { PieceThread } from '@/components/admin/campaigns/PieceThread';

type Props = {
  pieces: PortalPiece[];
  index: number;
  onIndex: (i: number) => void;
  busy: boolean;
  error?: string | null;
  readOnly?: boolean;
  onApprove: () => void;
  onSendChanges: (comment: string) => void;
  onApproveRemaining: () => void;
};

// Visor de piezas tipo reel: una pieza a la vez, centrada, con barras de progreso,
// navegación y decisión. Reemplaza los rieles de tarjetas 9:16.
export const PieceReview: React.FC<Props> = ({
  pieces, index, onIndex, busy, error, readOnly = false, onApprove, onSendChanges, onApproveRemaining,
}) => {
  const [slide, setSlide] = useState(0);
  const [asking, setAsking] = useState(false);
  const [comment, setComment] = useState('');
  const piece = pieces[index];
  const total = pieces.length;
  const summary = reviewSummary(pieces);

  // Reset de estado local al cambiar de pieza.
  useEffect(() => { setSlide(0); setAsking(false); setComment(''); }, [piece?.id]);

  const go = useCallback((i: number) => { if (i >= 0 && i < total) onIndex(i); }, [total, onIndex]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT')) return;
      if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key === 'ArrowRight') go(index + 1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [go, index]);

  if (!piece) return null;
  const approved = piece.status === 'approved';
  const changed = piece.status === 'changes_requested';

  return (
    <div className="viewer">
      {/* progreso tipo stories */}
      <div className="vprog" role="tablist" aria-label="Piezas de la campaña">
        {pieces.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`vprog-seg${i === index ? ' on' : ''}${p.status !== 'sent' ? ' done' : ''}`}
            aria-label={`Pieza ${i + 1} de ${total}`}
            aria-selected={i === index}
            onClick={() => go(i)}
          />
        ))}
      </div>
      <div className="vcount">Pieza {index + 1} de {total}</div>

      <div className="vstage">
        <button type="button" className="varrow l" aria-label="Pieza anterior" disabled={index === 0} onClick={() => go(index - 1)}>
          <ChevronLeft size={22} />
        </button>

        <div className="vmedia">
          {piece.mediaUrl ? (
            <PortalVideo src={piece.mediaUrl} poster={piece.coverUrl} />
          ) : piece.slides.length > 0 ? (
            <div className="vslides">
              <img className="vslide" src={piece.slides[slide]} alt={`Lámina ${slide + 1}`} />
              <div className="slidenav">
                <button type="button" aria-label="Lámina anterior" onClick={() => setSlide((s) => Math.max(0, s - 1))}>‹</button>
                <span>{slide + 1} / {piece.slides.length}</span>
                <button type="button" aria-label="Lámina siguiente" onClick={() => setSlide((s) => Math.min(piece.slides.length - 1, s + 1))}>›</button>
              </div>
            </div>
          ) : piece.coverUrl ? (
            <img className="vslide" src={piece.coverUrl} alt={piece.title} />
          ) : (
            <div className="vmedia-empty">Sin vista previa todavía</div>
          )}
        </div>

        <div className="vside">
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

          {readOnly ? (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Vista previa del equipo — así lo ve el cliente. Las acciones se completan desde su portal.</div>
          ) : approved ? (
            <div className="btn done">✓ Aprobada por vos</div>
          ) : changed ? (
            <div className="btn done" style={{ background: 'rgba(245,196,81,.14)', borderColor: 'rgba(245,196,81,.5)', color: '#fde9b0' }}>✎ Pediste cambios</div>
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

          {!readOnly && (
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: 'var(--wood)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 600 }}>Conversación con tu equipo</div>
              <PieceThread jobId={piece.id} mode="client" variant="portal" />
            </div>
          )}
        </div>

        <button type="button" className="varrow r" aria-label="Pieza siguiente" disabled={index === total - 1} onClick={() => go(index + 1)}>
          <ChevronRight size={22} />
        </button>
      </div>

      {/* resumen + atajo */}
      <div className="vsummary">
        <span>
          {summary.pending === 0
            ? <><b>Revisaste todo</b> · {summary.approved} {summary.approved === 1 ? 'aprobada' : 'aprobadas'}{summary.changes > 0 && ` · ${summary.changes} con cambios`}</>
            : <><b>{summary.approved} de {summary.total}</b> {summary.approved === 1 ? 'aprobada' : 'aprobadas'} · {summary.pending} {summary.pending === 1 ? 'espera' : 'esperan'} tu mirada</>}
        </span>
        {!readOnly && summary.pending > 0 && (
          <button type="button" className="vskip" disabled={busy} onClick={onApproveRemaining}>
            Aprobar las que falten ({summary.pending})
          </button>
        )}
      </div>
    </div>
  );
};

export default PieceReview;
