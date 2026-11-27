import React, { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Check } from 'lucide-react';
import { Box, Gfx, makeIso, pts, reducedMotion, useLive } from './iso';

// Gráficos de las páginas de Seguridad. Mismo vocabulario isométrico que
// AreaGraphics. Datos 100% sintéticos: ambos llevan nota "ejemplo / ilustrativo"
// para no implicar un SOC corriendo ni hallazgos de clientes reales (ciber en
// capacidad). Animación por scroll + reduced-motion los gobierna site.css.

const asm = (i: number): React.CSSProperties => ({ ['--i' as string]: i });

/* ── Seguridad · Análisis SOC: sala de servidores + cámara 24/7 ──
   Varias torres (unas con LEDs verdes, otras rojos, titilando) y una cámara de
   seguridad con cono de visión monitoreando la sala en vivo. */
export const SocGraphic: React.FC = () => {
    const k = makeIso(236, 66, 31);
    const TW = 1.45, TD = 1.45, TH = 3.0;
    // Torres: posición + color de sus LEDs.
    const towers: { x: number; y: number; led: 'g' | 'r' }[] = [
        { x: 0.5, y: 1.8, led: 'g' },
        { x: 2.3, y: 3.0, led: 'r' },
        { x: 3.9, y: 1.4, led: 'g' },
    ];
    // LEDs en la cara derecha de cada torre (2 columnas × 5).
    const leds = (tx: number, ty: number, led: 'g' | 'r', base: number) => {
        const out: React.ReactElement[] = [];
        [0.42, 0.95].forEach((a, ci) =>
            [0.55, 1.1, 1.65, 2.2, 2.75].forEach((z, zi) => {
                const p = k.P(tx + TW, ty + a, z);
                out.push(
                    <circle key={`${ci}${zi}`} className={led === 'g' ? 'cw-soc-led-g' : 'cw-soc-led-r'}
                        cx={p[0]} cy={p[1]} r={2.9} style={asm(base + ci * 5 + zi)} />,
                );
            }),
        );
        return out;
    };
    return (
        <Gfx fig="S1" caption="Monitoreo 24/7 de tu entorno" note="en vivo">
            <svg className="iso cw-soc" viewBox="26 6 470 300" role="img" aria-label="Una sala de servidores isométrica con torres encendidas y una cámara de seguridad que barre la sala.">
                <polygon className="iso-floor" points={pts([k.P(-0.6, -0.6), k.P(6.6, -0.6), k.P(6.6, 5.6), k.P(-0.6, 5.6)])} />
                {/* Torres de servidores. */}
                {towers.map((t, i) => (
                    <g key={i} className="asm" style={asm(i)}>
                        <Box k={k} x={t.x} y={t.y} z={0} w={TW} d={TD} h={TH} />
                        <Box k={k} x={t.x} y={t.y} z={TH} w={TW} d={TD} h={0.12} tone="a" />
                        {leds(t.x, t.y, t.led, 6 + i * 8)}
                    </g>
                ))}
                {/* Cámara de seguridad (bullet) con barrido. El brazo queda fijo; la
                    cabeza + el cono panean de lado a lado monitoreando la sala. */}
                <g className="asm" style={asm(5)}>
                    <line className="cw-soc-arm" x1={430} y1={52} x2={430} y2={104} />
                    <circle className="cw-soc-joint" cx={430} cy={104} r={4} />
                    <g className="cw-soc-cam">
                        {!reducedMotion() && (
                            <animateTransform
                                attributeName="transform"
                                attributeType="XML"
                                type="rotate"
                                values="-14 430 104; 14 430 104; -14 430 104"
                                keyTimes="0;0.5;1"
                                calcMode="spline"
                                keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
                                dur="5s"
                                repeatCount="indefinite"
                            />
                        )}
                        <polygon className="cw-soc-cone" points="356,118 150,236 300,274" />
                        <rect className="cw-soc-body" x={352} y={106} width={78} height={22} rx={10} />
                        <rect className="cw-soc-hood" x={348} y={100} width={46} height={6} rx={2} />
                        <circle className="cw-soc-lens" cx={358} cy={117} r={8} />
                        <circle className="cw-soc-lens-in" cx={358} cy={117} r={3.4} />
                        <circle className="cw-soc-rec" cx={422} cy={104} r={3} />
                    </g>
                </g>
                <text x={k.P(2.6, 5.9)[0]} y={k.P(2.6, 5.9)[1] + 22} textAnchor="middle">SALA DE SERVIDORES</text>
            </svg>
        </Gfx>
    );
};

/* ── Seguridad · Auditorías: hojas de informe que se tildan y se firman ──
   Hojas de informe frontales: se van tildando los ítems de la auditoría de
   ciberseguridad, se pasan las hojas y la última la firma CreApp como aprobación.
   Datos de ejemplo. Se reproduce al entrar en viewport. */
const AUDIT_PAGES: { title: string; items: string[] }[] = [
    { title: 'Accesos & identidad', items: ['MFA en accesos críticos', 'Permisos mínimos por rol', 'Cuentas inactivas revisadas'] },
    { title: 'Infraestructura & datos', items: ['Cifrado en tránsito y reposo', 'Parches de seguridad al día', 'Backups con restauración probada'] },
];
export const AuditGraphic: React.FC = () => {
    const [page, setPage] = useState(0);
    const [checked, setChecked] = useState(0);
    const timers = useRef<number[]>([]);
    const clear = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
    useEffect(() => clear, []);
    const ref = useLive<HTMLDivElement>((live) => {
        clear();
        if (!live) { setPage(0); setChecked(0); return; }
        if (reducedMotion()) { setPage(2); setChecked(3); return; }
        setPage(0); setChecked(0);
        const STEP = 620, GAP = 650;
        let t = 500;
        AUDIT_PAGES[0].items.forEach((_, i) => timers.current.push(window.setTimeout(() => setChecked(i + 1), t + i * STEP)));
        t += AUDIT_PAGES[0].items.length * STEP + GAP;
        timers.current.push(window.setTimeout(() => { setPage(1); setChecked(0); }, t));
        t += 500;
        AUDIT_PAGES[1].items.forEach((_, i) => timers.current.push(window.setTimeout(() => setChecked(i + 1), t + i * STEP)));
        t += AUDIT_PAGES[1].items.length * STEP + GAP;
        timers.current.push(window.setTimeout(() => setPage(2), t));
    });
    const signed = page === 2;
    const data = AUDIT_PAGES[Math.min(page, 1)];
    return (
        <div ref={ref} className="cw-audit" data-signed={signed ? 'y' : 'n'}>
            <div className="cw-audit-paper" key={page}>
                {!signed ? (
                    <>
                        <div className="cw-audit-head">
                            <span>Informe de auditoría</span>
                            <span className="cw-audit-tag">Ciberseguridad</span>
                        </div>
                        <h4 className="cw-audit-title">{data.title}</h4>
                        <ul className="cw-audit-items">
                            {data.items.map((it, i) => (
                                <li key={it} className={i < checked ? 'is-ok' : ''}>
                                    <span className="cw-audit-box" aria-hidden="true">{i < checked && <Check size={13} strokeWidth={3.2} />}</span>
                                    {it}
                                </li>
                            ))}
                        </ul>
                        <div className="cw-audit-foot">Hoja 0{page + 1} / 03 · continúa →</div>
                    </>
                ) : (
                    <div className="cw-audit-signed">
                        <span className="cw-audit-seal"><BadgeCheck size={26} strokeWidth={1.9} /> Aprobado</span>
                        <p className="cw-audit-signed-t">Auditoría cerrada · sin hallazgos críticos abiertos.</p>
                        <div className="cw-audit-sign">
                            <span className="cw-audit-sign-name">CreApp</span>
                            <span className="cw-audit-sign-line" aria-hidden="true" />
                            <span className="cw-audit-sign-cap">Firmado por CreApp · Auditoría de seguridad</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
