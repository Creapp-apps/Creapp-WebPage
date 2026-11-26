import React, { useEffect, useRef, useState } from 'react';
import { Box, Flat, Gfx, Seg, makeIso, pts, reducedMotion } from './iso';

// Ilustraciones por scroll de las áreas 01, 03, 04 y 06 (spec §6).
// Cada una dibuja literalmente el servicio. Un solo elemento en magenta por ilustración.

const asm = (i: number): React.CSSProperties => ({ ['--i' as string]: i });

/* ── 01 · Desarrollo de Software: de la idea al producto ── */
export const SoftwareGraphic: React.FC = () => {
    const k = makeIso(215, 46, 26);
    const [tx, ty] = k.V(6.2, 0);
    const X = 9.15; // cara visible del dispositivo
    const Q = (y: number, z: number) => k.P(X, y, z);
    return (
        <Gfx fig="01" caption="De la idea al producto">
            <svg className="iso" viewBox="6 24 500 290" role="img" aria-label="Una línea de montaje lleva módulos desde una idea hasta una app terminada.">
                <polygon className="iso-floor" points={pts([k.P(-2.4, 1.2), k.P(11, 1.2), k.P(11, 6.4), k.P(-2.4, 6.4)])} />
                <g className="asm" style={asm(0)}>
                    <Box k={k} x={-1.9} y={3} z={0} w={1.1} d={1.1} h={1.1} tone="dash" />
                </g>
                <g className="asm" style={asm(1)}>
                    <Box k={k} x={0} y={2.6} z={0} w={8.2} d={1.9} h={0.42} />
                    <Seg k={k} a={[0.3, 3.55, 0.42]} b={[7.9, 3.55, 0.42]} className="iso-flow" />
                </g>
                {/* Módulos que viajan por la cinta */}
                {[0, 1, 2].map((i) => (
                    <g key={i} className="iso-crate" style={{ ['--tx' as string]: `${tx.toFixed(1)}px`, ['--ty' as string]: `${ty.toFixed(1)}px`, animationDelay: `${-i * 2}s` }}>
                        <Box k={k} x={0.5} y={3} z={0.42} w={1.1} d={1.1} h={1.1} tone={i === 1 ? 'a' : undefined} />
                    </g>
                ))}
                {/* Producto: dispositivo con la interfaz armándose */}
                <g className="asm" style={asm(2)}>
                    <Box k={k} x={8.8} y={2.1} z={0} w={0.35} d={2.9} h={4.3} tone="a" />
                    <polygon className="iso-screen" points={pts([Q(2.35, 4), Q(4.75, 4), Q(4.75, 0.35), Q(2.35, 0.35)])} />
                    {[3.4, 2.8, 2.2].map((z, i) => (
                        <line key={z} className="iso-row" style={{ animationDelay: `${i * 0.5}s` }}
                            x1={Q(2.65, z)[0]} y1={Q(2.65, z)[1]} x2={Q(i === 2 ? 3.7 : 4.45, z)[0]} y2={Q(i === 2 ? 3.7 : 4.45, z)[1]} />
                    ))}
                    <polygon className="iso-hot" points={pts([Q(2.65, 1.45), Q(4.45, 1.45), Q(4.45, 0.85), Q(2.65, 0.85)])} />
                </g>
                <text x={k.P(-1.35, 4.1)[0]} y={k.P(-1.35, 4.1)[1] + 26} textAnchor="middle">IDEA</text>
                <text x={k.P(4.1, 4.5)[0]} y={k.P(4.1, 4.5)[1] + 30} textAnchor="middle">MÓDULOS</text>
                <text x={k.P(9, 5)[0] + 4} y={k.P(9, 5)[1] + 30} textAnchor="middle">PRODUCTO</text>
            </svg>
        </Gfx>
    );
};

/* ── 03 · UX/UI: del wireframe a la interfaz ── */
export const DesignGraphic: React.FC = () => {
    const k = makeIso(210, 150, 29);
    const W = 6, D = 4.4, T = 0.12;
    const zs = [0, 1.95, 3.9];
    const labels = ['DISCOVERY', 'PROTOTIPO', 'INTERFAZ'];
    const layout = (z: number, mode: 'notes' | 'wire' | 'ui') => {
        const zz = z + T;
        if (mode === 'notes') {
            return [[0.6, 0.6], [2.3, 0.9], [4.2, 0.5], [1.1, 2.5], [3.3, 2.7]].map(([x, y], i) => (
                <Flat key={i} k={k} x={x} y={y} z={zz} w={1.2} d={1.1} className="iso-ghost" />
            ));
        }
        const c = mode === 'wire' ? 'iso-ghost' : 'iso-fill';
        return (
            <>
                <Flat k={k} x={0.5} y={0.5} z={zz} w={5} d={0.7} className={c} />
                <Flat k={k} x={0.5} y={1.6} z={zz} w={2.3} d={1.5} className={mode === 'ui' ? 'iso-fill is-a' : c} />
                <Flat k={k} x={3.2} y={1.6} z={zz} w={2.3} d={1.5} className={c} />
                <Flat k={k} x={3.2} y={3.4} z={zz} w={2.3} d={0.6} className={mode === 'ui' ? 'iso-hot' : c} />
            </>
        );
    };
    return (
        <Gfx fig="03" caption="Del problema a la interfaz">
            <svg className="iso" viewBox="0 0 520 340" role="img" aria-label="Tres capas apiladas: investigación, prototipo en wireframe e interfaz final.">
                {[[0, 0], [W, 0], [W, D], [0, D]].map(([x, y], i) => (
                    <Seg key={i} k={k} a={[x, y, 0]} b={[x, y, zs[2]]} className="iso-guide" />
                ))}
                {zs.map((z, i) => (
                    <g key={z} className={`asm iso-layer iso-layer-${i}`} style={asm(i)}>
                        <Box k={k} x={0} y={0} z={z} w={W} d={D} h={T} tone={i === 2 ? 'a' : undefined} />
                        {layout(z, i === 0 ? 'notes' : i === 1 ? 'wire' : 'ui')}
                        <line className="iso-leader" x1={k.P(W, 0.6, z)[0] + 6} y1={k.P(W, 0.6, z)[1]} x2={404} y2={k.P(W, 0.6, z)[1]} />
                        <text x={410} y={k.P(W, 0.6, z)[1] + 4}>{labels[i]}</text>
                    </g>
                ))}
            </svg>
        </Gfx>
    );
};

/* ── 04 · Integración & Escala: sistemas que se hablan ── */
export const ScaleGraphic: React.FC = () => {
    const k = makeIso(260, 44, 33);
    const S = 1.5;
    const hub: [number, number] = [4, 4];
    const nodes: { at: [number, number]; label: string; dx: number; dy: number; anchor: 'start' | 'end' | 'middle' }[] = [
        { at: [4, 0.4], label: 'PAGOS', dx: 34, dy: -52, anchor: 'start' },
        { at: [0.4, 4], label: 'CRM', dx: -34, dy: -52, anchor: 'end' },
        { at: [7.6, 4], label: 'MENSAJERÍA', dx: 0, dy: 50, anchor: 'middle' },
        { at: [4, 7.6], label: 'DATOS', dx: 0, dy: 50, anchor: 'middle' },
    ];
    const cable = (n: [number, number]) => `M${k.P(hub[0], hub[1]).join(' ')} L${k.P(n[0], n[1]).join(' ')}`;
    const box = (c: [number, number], h: number, tone?: 'a') => (
        <Box k={k} x={c[0] - S / 2} y={c[1] - S / 2} z={0} w={S} d={S} h={h} tone={tone} />
    );
    const top = k.P(hub[0], hub[1], 2.05);
    return (
        <Gfx fig="04" caption="Sistemas que se hablan">
            <svg className="iso" viewBox="0 0 520 340" role="img" aria-label="Un sistema central conectado con pagos, CRM, mensajería y datos; pulsos viajan por los cables.">
                {nodes.map((n) => (
                    <g key={n.label}>
                        <path className="iso-cable" d={cable(n.at)} />
                        <path className="iso-pulse" d={cable(n.at)} />
                    </g>
                ))}
                {nodes.slice(0, 2).map((n, i) => (
                    <g key={n.label} className="asm" style={asm(i)}>{box(n.at, 1.1)}</g>
                ))}
                <g className="asm" style={asm(2)}>
                    {box(hub, 1.7, 'a')}
                    {/* Monitoreo: baliza sobre el sistema central */}
                    <circle className="iso-beacon-halo" cx={top[0]} cy={top[1]} r={9} />
                    <circle className="iso-beacon" cx={top[0]} cy={top[1]} r={4} />
                </g>
                {nodes.slice(2).map((n, i) => (
                    <g key={n.label} className="asm" style={asm(3 + i)}>{box(n.at, 1.1)}</g>
                ))}
                {nodes.map((n) => {
                    const p = k.P(n.at[0], n.at[1]);
                    return <text key={n.label} x={p[0] + n.dx} y={p[1] + n.dy} textAnchor={n.anchor}>{n.label}</text>;
                })}
                <text x={top[0] + 16} y={top[1] + 4} className="iso-t-ink">MONITOREO</text>
            </svg>
        </Gfx>
    );
};

/* ── 06 · Marketing & Contenidos: pipeline con dato vivo ── */
export const MarketingGraphic: React.FC = () => {
    const k = makeIso(120, 62, 29);
    const STEP = 3.25, TW = 2.2, TH = 0.45;
    const stages = ['BRIEF', 'PIEZA', 'CALENDARIO', 'PUBLICADO'];
    const [tx, ty] = k.V(STEP * 3, 0);
    const [secs, setSecs] = useState(0);
    const [live, setLive] = useState(false);
    const reduced = useRef(reducedMotion());

    // El contador mide de verdad: se reinicia cada vez que la pieza llega a "Publicado".
    useEffect(() => {
        if (!live || reduced.current) return;
        const id = window.setInterval(() => setSecs((s) => s + 1), 1000);
        return () => window.clearInterval(id);
    }, [live]);

    const zt = TH;
    const icon = (i: number) => {
        const x = i * STEP;
        if (i === 0) return [0.55, 1, 1.45].map((y) => <Seg key={y} k={k} a={[x + 0.5, y, zt]} b={[x + (y > 1.2 ? 1.3 : 1.7), y, zt]} className="iso-ink" />);
        if (i === 1) return <Box k={k} x={x + 0.95} y={0.55} z={zt} w={0.3} d={1.1} h={1.75} tone="a" />;
        if (i === 2) return [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => (
            <Flat key={`${r}${c}`} k={k} x={x + 0.42 + c * 0.5} y={0.42 + r * 0.5} z={zt} w={0.36} d={0.36} className={r === 1 && c === 2 ? 'iso-fill is-a' : 'iso-ghost'} />
        )));
        const a = k.P(x + 0.6, 1.15, zt), b = k.P(x + 1, 1.6, zt), c = k.P(x + 1.7, 0.6, zt);
        return <polyline className="iso-check" points={pts([a, b, c])} />;
    };

    return (
        <Gfx fig="06" caption="Del brief a la publicación" note="Demo del flujo" onLive={setLive}>
            <svg className="iso" viewBox="22 30 458 262" role="img" aria-label="Una pieza de contenido recorre cuatro etapas: brief, pieza, calendario y publicado.">
                <Seg k={k} a={[1.1, 1.1, 0]} b={[STEP * 3 + 1.1, 1.1, 0]} className="iso-cable" />
                <Seg k={k} a={[1.1, 1.1, 0]} b={[STEP * 3 + 1.1, 1.1, 0]} className="iso-pulse" />
                {stages.map((s, i) => {
                    const p = k.P(i * STEP, TW);
                    return (
                        <g key={s} className="asm" style={asm(i)}>
                            <Box k={k} x={i * STEP} y={0} z={0} w={TW} d={TW} h={TH} tone={i === 3 ? 'a' : undefined} />
                            {icon(i)}
                            <text x={p[0] - 10} y={p[1] + 5} textAnchor="end" className="iso-t-ink" aria-hidden="true">0{i + 1}</text>
                        </g>
                    );
                })}
                {/* La pieza que viaja; al completar el recorrido quedó publicada. */}
                <g className="iso-piece" style={{ ['--tx' as string]: `${tx.toFixed(1)}px`, ['--ty' as string]: `${ty.toFixed(1)}px` }}
                    onAnimationIteration={() => setSecs(0)}>
                    <Flat k={k} x={0.75} y={0.75} z={TH + 1.2} w={0.7} d={0.7} className="iso-hot" />
                </g>
            </svg>
            <ol className="cw-legend cw-mono">
                {stages.map((s, i) => (
                    <li key={s}><b>0{i + 1}</b>{s}</li>
                ))}
            </ol>
            <p className="cw-tick cw-mono" aria-hidden="true">
                <i />
                {reduced.current ? 'Publicación automática' : `Publicado hace ${secs} s`}
            </p>
        </Gfx>
    );
};

/* ── Nosotros · el lab: dos puestos, la infraestructura y la plataforma de lanzamiento ── */
export const LabGraphic: React.FC = () => {
    const k = makeIso(262, 44, 31);
    const desk = (y: number) => (
        <>
            <Box k={k} x={0.8} y={y} z={0} w={2.7} d={1.35} h={0.85} />
            <Box k={k} x={1.55} y={y + 0.2} z={0.85} w={1.2} d={0.12} h={0.95} tone="a" />
        </>
    );
    const apex = k.P(5.85, 5.65, 2.95);
    const line = (a: [number, number], b: [number, number]) => `M${k.P(a[0], a[1]).join(' ')} L${k.P(b[0], b[1]).join(' ')}`;
    const cables = [line([3.5, 1.7], [5.2, 1.7]), line([3.5, 5.3], [4.9, 5.3]), line([5.85, 2.2], [5.85, 4.7])];
    const label = (x: number, y: number, t: string, dx = 0, dy = 0, anchor: 'start' | 'middle' | 'end' = 'middle') => {
        const p = k.P(x, y);
        return <text x={p[0] + dx} y={p[1] + dy} textAnchor={anchor}>{t}</text>;
    };
    return (
        <Gfx fig="07" caption="El lab">
            <svg className="iso" viewBox="0 20 520 300" role="img" aria-label="El lab: dos puestos de trabajo conectados a la infraestructura y a una plataforma de lanzamiento con un cohete.">
                <polygon className="iso-floor" points={pts([k.P(0, 0), k.P(7.6, 0), k.P(7.6, 7.6), k.P(0, 7.6)])} />
                {cables.map((d) => (
                    <g key={d}><path className="iso-cable" d={d} /><path className="iso-pulse" d={d} /></g>
                ))}
                <g className="asm" style={asm(0)}>{desk(1)}</g>
                <g className="asm" style={asm(1)}>{desk(4.6)}</g>
                <g className="asm" style={asm(2)}>
                    <Box k={k} x={5.2} y={0.9} z={0} w={1.3} d={1.3} h={2.5} />
                    {[0.6, 1.2, 1.8].map((z) => (
                        <Seg key={z} k={k} a={[5.4, 2.2, z]} b={[6.3, 2.2, z]} className="iso-ink" />
                    ))}
                </g>
                <g className="asm" style={asm(3)}>
                    <Box k={k} x={4.9} y={4.7} z={0} w={1.9} d={1.9} h={0.22} tone="a" />
                    <g className="iso-lift">
                        <Box k={k} x={5.55} y={5.35} z={0.5} w={0.6} d={0.6} h={1.6} />
                        <polygon className="iso-hot" points={pts([k.P(5.55, 5.95, 2.1), k.P(6.15, 5.95, 2.1), apex])} />
                        <polygon className="iso-hot" points={pts([k.P(6.15, 5.35, 2.1), k.P(6.15, 5.95, 2.1), apex])} />
                    </g>
                </g>
                {label(0.8, 1, 'SEBA', -14, -22, 'end')}
                {label(0.8, 5.95, 'FACU', -12, 4, 'end')}
                {label(6.5, 0.9, 'INFRA', 14, -40, 'start')}
                {label(6.8, 6.6, 'LANZAMIENTO', 0, 30)}
            </svg>
        </Gfx>
    );
};
