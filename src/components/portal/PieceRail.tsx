import React, { useRef } from 'react';
import type { PortalPiece } from '@/lib/portalTypes';
import { TYPE_META } from '@/lib/portalView';

type Props = { type: PortalPiece['type']; count: number; children: React.ReactNode };

export const PieceRail: React.FC<Props> = ({ type, count, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const meta = TYPE_META[type];
  const go = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.75), behavior: 'smooth' });
  };
  return (
    <div className="section">
      <div className="sec-head">
        <h2 className="serif">{meta.title}</h2>
        <span className="count">{count} {count === 1 ? 'pieza' : 'piezas'} · {meta.hint}</span>
        <div className="rule" />
      </div>
      <div className={`railwrap ${meta.cls}`}>
        <button type="button" className="arrow l" aria-label="Anterior" onClick={() => go(-1)}>‹</button>
        <button type="button" className="arrow r" aria-label="Siguiente" onClick={() => go(1)}>›</button>
        <div className="rail" ref={ref}>{children}</div>
      </div>
    </div>
  );
};
