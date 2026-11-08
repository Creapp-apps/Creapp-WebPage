import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PortalPiece } from '@/lib/portalTypes';
import { typeMeta } from '@/lib/portalView';

type Props = { type: PortalPiece['type']; count: number; children: React.ReactNode };

export const PieceRail: React.FC<Props> = ({ type, count, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const meta = typeMeta(type);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanL(el.scrollLeft > 4);
    setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    el?.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      el?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [measure, count]);

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
      <div className={`railwrap ${meta.cls} ${canR ? 'more' : ''}`}>
        {canL && <button type="button" className="arrow l" aria-label="Anterior" onClick={() => go(-1)}>‹</button>}
        {canR && <button type="button" className="arrow r" aria-label="Siguiente" onClick={() => go(1)}>›</button>}
        <div className="rail" ref={ref}>{children}</div>
      </div>
    </div>
  );
};
