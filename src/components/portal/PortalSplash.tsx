import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Accent = { color: string; deep: string; bg: string };
type Props = { ready: boolean; accent: Accent | null; onDone: () => void };

const PARTS = ['engines', 'fins', 'body', 'nose', 'window'] as const;
const prefersReduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Splash de arranque del portal: el cohete CreAPP se arma por partes y despega.
// A medida que avanza, toda la pantalla se tiñe fluido al color de la campaña.
// Al terminar el despegue llama onDone() y el portal revela el contenido.
export const PortalSplash: React.FC<Props> = ({ ready, accent, onDone }) => {
  const reduced = useMemo(prefersReduced, []);
  const [built, setBuilt] = useState(reduced ? PARTS.length : 0);
  const [flameOn, setFlameOn] = useState(reduced);
  const [launching, setLaunching] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (!doneRef.current) { doneRef.current = true; onDone(); }
  }, [onDone]);

  // Armado escalonado (una parte cada ~220ms) + llama al final.
  useEffect(() => {
    if (reduced) return;
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setBuilt(i);
      if (i >= PARTS.length) { clearInterval(iv); setFlameOn(true); }
    }, 220);
    return () => clearInterval(iv);
  }, [reduced]);

  const assembled = built >= PARTS.length;

  // Despegue: gated por armado mínimo + datos listos. reduced-motion: cierra directo.
  useEffect(() => {
    if (reduced) { const t = setTimeout(finish, 650); return () => clearTimeout(t); }
    if (ready && assembled && !launching) {
      const t = setTimeout(() => setLaunching(true), 420); // beat para que el tinte asiente
      return () => clearTimeout(t);
    }
    return undefined;
  }, [ready, assembled, launching, reduced, finish]);

  // Fin del liftoff → revelar contenido.
  useEffect(() => {
    if (!launching) return undefined;
    const t = setTimeout(finish, 1300);
    return () => clearTimeout(t);
  }, [launching, finish]);

  const stars = useMemo(
    () => Array.from({ length: 44 }, () => ({
      left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`, scale: 0.6 + Math.random() * 1.4,
    })),
    [],
  );

  const style = accent
    ? ({ '--sp-acc': accent.color, '--sp-deep': accent.deep, '--sp-bg': accent.bg } as React.CSSProperties)
    : undefined;

  return (
    <div className={`splash${accent ? ' tinted' : ''}${launching ? ' go' : ''}`} style={style} aria-busy="true">
      <div className="sp-stars" aria-hidden>
        {stars.map((s, i) => (
          <i key={i} style={{ left: s.left, top: s.top, animationDelay: s.delay, transform: `scale(${s.scale})` }} />
        ))}
      </div>

      <div className={`sp-rocketwrap${flameOn ? ' live' : ''}${launching ? ' launch' : ''}`}>
        <svg viewBox="0 0 120 220" width="170" role="img" aria-label="Cohete CreAPP">
          <defs>
            <linearGradient id="spBody" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#e5e7f0" /><stop offset="1" stopColor="#9ca3c4" />
            </linearGradient>
            <linearGradient id="spAcc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--sp-acc)" /><stop offset="1" stopColor="var(--sp-deep)" />
            </linearGradient>
          </defs>
          <g className="sp-flameG">
            <path className="sp-flame" d="M48 176 Q60 232 72 176 Z" fill="#fb923c" style={{ opacity: flameOn ? undefined : 0 }} />
            <path className="sp-flame2" d="M54 176 Q60 206 66 176 Z" fill="#fde047" />
          </g>
          <g className={`sp-part${built > 0 ? ' on' : ''}`}>
            <rect x="46" y="168" width="28" height="12" rx="3" fill="#374151" />
            <rect x="42" y="176" width="36" height="6" rx="2" fill="#1f2937" />
          </g>
          <g className={`sp-part${built > 1 ? ' on' : ''}`}>
            <path d="M38 120 L16 170 L40 160 Z" fill="url(#spAcc)" />
            <path d="M82 120 L104 170 L80 160 Z" fill="url(#spAcc)" />
            <path d="M56 150 L60 176 L64 150 Z" fill="var(--sp-deep)" />
          </g>
          <g className={`sp-part${built > 2 ? ' on' : ''}`}>
            <path d="M40 60 L80 60 L82 168 L38 168 Z" fill="url(#spBody)" />
            <rect x="38" y="128" width="44" height="8" fill="url(#spAcc)" />
          </g>
          <g className={`sp-part${built > 3 ? ' on' : ''}`}>
            <path d="M40 62 Q60 -8 80 62 Z" fill="url(#spAcc)" />
          </g>
          <g className={`sp-part${built > 4 ? ' on' : ''}`}>
            <circle cx="60" cy="94" r="14" fill="#1f2937" />
            <circle cx="60" cy="94" r="14" fill="none" stroke="var(--sp-acc)" strokeWidth="3" strokeOpacity=".4" />
            <circle cx="60" cy="94" r="11" fill="#38bdf8" />
            <circle cx="56" cy="90" r="3.5" fill="#fff" opacity=".7" />
          </g>
          <g>
            <circle className="sp-spark" cx="50" cy="186" r="2" />
            <circle className="sp-spark" cx="60" cy="190" r="2.5" />
            <circle className="sp-spark" cx="70" cy="186" r="2" />
          </g>
        </svg>
      </div>

      <div className={`sp-copy${launching ? ' out' : ''}`}>
        <div className="sp-eyebrow">Tu agencia te presenta</div>
        <div className="sp-msg">Preparando tu campaña…</div>
      </div>
    </div>
  );
};

export default PortalSplash;
