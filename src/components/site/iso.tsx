import React, { useEffect, useRef } from 'react';

/**
 * Base de las ilustraciones isométricas del sitio (dibujo propio, SVG de línea).
 * Todo el color sale de tokens CSS (--iso-*, --accent, --accent-2, --accent-3): recolorea con el tema.
 */

export type Pt = [number, number];

export interface Iso {
    /** Proyecta un punto (x, y, z) del mundo a pantalla. */
    P: (x: number, y: number, z?: number) => Pt;
    /** Desplazamiento en pantalla de un vector del mundo (para animar con translate). */
    V: (dx: number, dy: number, dz?: number) => Pt;
}

export function makeIso(ox: number, oy: number, u: number): Iso {
    return {
        P: (x, y, z = 0) => [ox + (x - y) * 0.866 * u, oy + (x + y) * 0.5 * u - z * u],
        V: (dx, dy, dz = 0) => [(dx - dy) * 0.866 * u, (dx + dy) * 0.5 * u - dz * u],
    };
}

export const pts = (a: Pt[]) => a.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

interface BoxProps {
    k: Iso;
    x: number;
    y: number;
    z?: number;
    w: number;
    d: number;
    h: number;
    /** "a" = acento violeta · "dash" = contorno punteado sin relleno. */
    tone?: 'a' | 'dash';
    className?: string;
}

/** Caja isométrica: cara superior + las dos caras visibles. */
export const Box: React.FC<BoxProps> = ({ k, x, y, z = 0, w, d, h, tone, className = '' }) => {
    const { P } = k;
    const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
    const left = [P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)];
    const right = [P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)];
    return (
        <g className={`iso-box ${tone ? `is-${tone}` : ''} ${className}`}>
            <polygon className="iso-l" points={pts(left)} />
            <polygon className="iso-r" points={pts(right)} />
            <polygon className="iso-t" points={pts(top)} />
        </g>
    );
};

/** Rectángulo apoyado sobre un plano horizontal (para dibujar "sobre" una cara superior). */
export const Flat: React.FC<{ k: Iso; x: number; y: number; z: number; w: number; d: number; className?: string }> = ({
    k, x, y, z, w, d, className,
}) => <polygon className={className} points={pts([k.P(x, y, z), k.P(x + w, y, z), k.P(x + w, y + d, z), k.P(x, y + d, z)])} />;

export const Seg: React.FC<{ k: Iso; a: [number, number, number?]; b: [number, number, number?]; className?: string }> = ({
    k, a, b, className,
}) => {
    const p = k.P(a[0], a[1], a[2] ?? 0), q = k.P(b[0], b[1], b[2] ?? 0);
    return <line className={className} x1={p[0].toFixed(1)} y1={p[1].toFixed(1)} x2={q[0].toFixed(1)} y2={q[1].toFixed(1)} />;
};

/**
 * Marco de un gráfico. `.is-in` = ya entró una vez (se arma). `.is-live` = está en pantalla
 * y la pestaña visible (los loops corren); fuera de eso el CSS pausa toda animación.
 */
export function useLive<T extends HTMLElement>(onLive?: (live: boolean) => void) {
    const ref = useRef<T>(null);
    const cb = useRef(onLive);
    cb.current = onLive;
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        let inView = false;
        const apply = () => {
            const live = inView && !document.hidden;
            el.classList.toggle('is-live', live);
            cb.current?.(live);
        };
        const io = new IntersectionObserver(
            ([e]) => {
                inView = e.isIntersecting;
                if (inView) el.classList.add('is-in');
                apply();
            },
            { threshold: 0.25 },
        );
        io.observe(el);
        document.addEventListener('visibilitychange', apply);
        return () => {
            io.disconnect();
            document.removeEventListener('visibilitychange', apply);
        };
    }, []);
    return ref;
}

export const Gfx: React.FC<{
    fig: string;
    caption: string;
    note?: string;
    onLive?: (live: boolean) => void;
    children: React.ReactNode;
}> = ({ fig, caption, note, onLive, children }) => {
    const ref = useLive<HTMLElement>(onLive);
    return (
        <figure ref={ref} className="cw-gfx">
            <div className="cw-gfx-stage">{children}</div>
            <figcaption className="cw-mono">
                <span>
                    <b>Fig. {fig}</b> — {caption}
                </span>
                {note && <span className="cw-gfx-note">{note}</span>}
            </figcaption>
        </figure>
    );
};

export const reducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
