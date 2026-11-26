import React from 'react';
import { Box, Flat, Gfx, Seg, makeIso, pts } from './iso';

// Gráficos de las páginas de Seguridad. Mismo vocabulario isométrico que
// AreaGraphics. Datos 100% sintéticos: ambos llevan nota "ejemplo / ilustrativo"
// para no implicar un SOC corriendo ni hallazgos de clientes reales (ciber en
// capacidad). Animación por scroll + reduced-motion los gobierna site.css.

const asm = (i: number): React.CSSProperties => ({ ['--i' as string]: i });

/* ── Seguridad · Análisis SOC: monitor con telemetría viva ── */
export const SocGraphic: React.FC = () => {
    const k = makeIso(215, 46, 27);
    const X = 9.15; // cara visible del monitor
    const Q = (y: number, z: number) => k.P(X, y, z);
    const wave = [
        [2.55, 2.2], [2.9, 3.4], [3.2, 2.0], [3.55, 3.1], [3.9, 1.9], [4.25, 3.5], [4.6, 2.4],
    ].map(([y, z]) => Q(y, z));
    const rows = [1.55, 1.1, 0.65];
    return (
        <Gfx fig="S1" caption="Visibilidad continua de tu entorno" note="Datos de ejemplo">
            <svg className="iso" viewBox="6 24 500 290" role="img" aria-label="Un monitor muestra una onda de telemetría en vivo y un registro de eventos de ejemplo.">
                <polygon className="iso-floor" points={pts([k.P(5.6, 0.4), k.P(10.4, 0.4), k.P(10.4, 5.6), k.P(5.6, 5.6)])} />
                {/* Base del monitor */}
                <g className="asm" style={asm(0)}>
                    <Box k={k} x={8.1} y={2.1} z={0} w={1.2} d={2.9} h={0.4} />
                </g>
                {/* Pantalla */}
                <g className="asm" style={asm(1)}>
                    <Box k={k} x={8.8} y={2.1} z={0.4} w={0.35} d={2.9} h={4.1} tone="a" />
                    <polygon className="iso-screen" points={pts([Q(2.35, 4.3), Q(4.8, 4.3), Q(4.8, 0.75), Q(2.35, 0.75)])} />
                    <polyline className="iso-leader" points={pts([Q(2.4, 2.7), Q(4.75, 2.7)])} fill="none" />
                    <polyline className="iso-pulse" points={pts(wave)} fill="none" />
                    <circle className="iso-beacon-halo" cx={wave[wave.length - 1][0]} cy={wave[wave.length - 1][1]} r={8} />
                    <circle className="iso-beacon" cx={wave[wave.length - 1][0]} cy={wave[wave.length - 1][1]} r={3.5} />
                </g>
                {/* Registro de eventos */}
                <g className="asm" style={asm(2)}>
                    {rows.map((z, i) => (
                        <line key={z} className={i === 1 ? 'iso-row is-a' : 'iso-row'} style={{ animationDelay: `${i * 0.5}s` }}
                            x1={Q(2.6, z)[0]} y1={Q(2.6, z)[1]} x2={Q(i === 1 ? 3.8 : 4.5, z)[0]} y2={Q(i === 1 ? 3.8 : 4.5, z)[1]} />
                    ))}
                    <polygon className="iso-hot" points={pts([Q(4.0, 1.25), Q(4.5, 1.25), Q(4.5, 0.95), Q(4.0, 0.95)])} />
                </g>
                <text x={Q(3.5, 4.3)[0]} y={Q(3.5, 4.3)[1] - 12} textAnchor="middle" className="iso-t-ink">EN VIVO</text>
                <text x={k.P(7.6, 3.5)[0]} y={k.P(7.6, 3.5)[1] + 30} textAnchor="middle">EVENTOS</text>
            </svg>
        </Gfx>
    );
};

/* ── Seguridad · Auditorías: scorecard de postura ── */
export const AuditGraphic: React.FC = () => {
    const k = makeIso(250, 70, 30);
    const W = 6, D = 4.6, T = 0.3;
    const zt = T;
    const rows = [
        { y: 0.6, label: 'APLICACIONES', ok: true },
        { y: 1.7, label: 'INFRAESTRUCTURA', ok: true },
        { y: 2.8, label: 'ACCESOS', ok: false }, // hallazgo
        { y: 3.9, label: 'PROCESOS', ok: true },
    ];
    return (
        <Gfx fig="S2" caption="La foto honesta de tu postura" note="Ejemplo ilustrativo">
            <svg className="iso" viewBox="0 10 520 320" role="img" aria-label="Un scorecard de auditoría con cuatro filas; una está marcada como hallazgo, de ejemplo.">
                <polygon className="iso-floor" points={pts([k.P(-0.8, -0.8), k.P(6.8, -0.8), k.P(6.8, 5.4), k.P(-0.8, 5.4)])} />
                <g className="asm" style={asm(0)}>
                    <Box k={k} x={0} y={0} z={0} w={W} d={D} h={T} />
                </g>
                {rows.map((r, i) => (
                    <g key={r.label} className="asm" style={asm(1 + i)}>
                        <Flat k={k} x={0.5} y={r.y} z={zt} w={4.1} d={0.74} className={r.ok ? 'iso-ghost' : 'iso-fill is-a'} />
                        {r.ok ? (
                            <polyline className="iso-check" fill="none"
                                points={pts([k.P(5.0, r.y + 0.55, zt), k.P(5.25, r.y + 0.8, zt), k.P(5.7, r.y + 0.2, zt)])} />
                        ) : (
                            <>
                                <Seg k={k} a={[5.05, r.y + 0.2, zt]} b={[5.6, r.y + 0.75, zt]} className="iso-hot" />
                                <Seg k={k} a={[5.6, r.y + 0.2, zt]} b={[5.05, r.y + 0.75, zt]} className="iso-hot" />
                            </>
                        )}
                    </g>
                ))}
            </svg>
            <ol className="cw-legend cw-mono">
                <li><b>OK</b>CUMPLE</li>
                <li><b>!</b>HALLAZGO</li>
                <li><b>→</b>REMEDIACIÓN</li>
            </ol>
        </Gfx>
    );
};
