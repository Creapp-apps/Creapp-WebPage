import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, BrainCircuit, Bug, Check, DoorOpen, FileSearch, Fish, Radar as RadarIcon, Search, Server, ShieldAlert, ShieldOff, Waypoints } from 'lucide-react';
import { Gfx, reducedMotion, useLive } from './iso';

// Ilustraciones conceptuales animadas, UNA METÁFORA DISTINTA POR SECCIÓN.
//   · "Qué incluye"  → arquitectura técnica: el código en el centro con sus piezas
//                      reales (API REST, auth, DB, CI/CD…) señaladas con llamadas.
//   · "Qué te llevás" → acta de entrega que se imprime + sello y, al cerrar, la
//                      pantalla se convierte en el cohete de CreApp y despega.

// Componentes técnicos REALES por servicio (lo que de verdad entra en el proyecto).
const TECH: Record<string, string[]> = {
    software: ['API REST', 'AUTH / JWT', 'POSTGRES', 'CI / CD'],
    ia: ['LLM', 'RAG', 'VECTOR DB', 'EVALS'],
    'apis-escala': ['REST', 'GATEWAY', 'RATE LIMIT', 'OBSERVAB.'],
    pentesting: ['OWASP', 'RECON', 'FUZZING', 'REPORTE'],
    soc: ['SIEM', 'ALERTAS', 'IOC', 'TRIAGE'],
    auditorias: ['ISO 27001', 'CONTROLES', 'EVIDENCIA', 'INFORME'],
    community: ['CALENDARIO', 'PIEZAS', 'MÉTRICAS', 'RESPUESTAS'],
    publicidad: ['META ADS', 'PÍXEL', 'AUDIENCIAS', 'ROAS'],
};

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', '&', 'en', 'con', 'a', 'por', 'para', 'un', 'una', 'tu', 'su', 'lo', 'que']);
function shortLabel(t: string): string {
    const w = t.replace(/[/|,.()]/g, ' ').split(/\s+/).filter(Boolean).filter((x) => !STOP.has(x.toLowerCase()));
    const p = (w[0] || t).toUpperCase();
    return p.length > 11 ? p.slice(0, 10) + '.' : p;
}

/* ══ "Qué incluye" · Fig. A — Arquitectura ══
   El código (centro) y sus piezas técnicas reales señaladas por líneas que se
   dibujan solas, con un dato que fluye por cada una. Plano, no isométrico. */
export const IncludesFigure: React.FC<{ slug: string; items: { t: string }[] }> = ({ slug, items }) => {
    const labels = TECH[slug] ?? items.slice(0, 4).map((it) => shortLabel(it.t));
    const nodes = [
        { from: [196, 118], mark: [78, 60], lx: 78, ly: 44, anchor: 'start' as const },
        { from: [324, 118], mark: [442, 60], lx: 442, ly: 44, anchor: 'end' as const },
        { from: [196, 182], mark: [78, 242], lx: 78, ly: 262, anchor: 'start' as const },
        { from: [324, 182], mark: [442, 242], lx: 442, ly: 262, anchor: 'end' as const },
    ];
    return (
        <Gfx fig="A" caption="La arquitectura" note={`${labels.length} piezas`}>
            <svg className="iso cw-schem" viewBox="0 20 520 260" role="img" aria-label="La arquitectura del servicio: el código y sus piezas técnicas.">
                <g className="cw-schem-grid" aria-hidden="true">
                    {[88, 150, 212].map((y) => <line key={y} x1={40} y1={y} x2={480} y2={y} />)}
                </g>
                {/* código en el centro */}
                <g className="cw-schem-core">
                    <rect x={200} y={118} width={120} height={64} rx={10} />
                    {[136, 146, 156, 166].map((y, i) => (
                        <line key={y} x1={i % 2 ? 232 : 218} y1={y} x2={i === 1 ? 300 : i === 3 ? 278 : 290} y2={y}
                            className={i === 2 ? 'cw-schem-spec is-a' : 'cw-schem-spec'} />
                    ))}
                </g>
                {labels.map((label, i) => {
                    const n = nodes[i];
                    return (
                        <g key={label}>
                            <path className="cw-schem-lead" pathLength={1} style={{ ['--i' as string]: i }} fill="none"
                                d={`M${n.from[0]} ${n.from[1]} L${n.mark[0]} ${n.mark[1]}`} />
                            <path className="cw-schem-flow" pathLength={1} style={{ ['--i' as string]: i }} fill="none"
                                d={`M${n.from[0]} ${n.from[1]} L${n.mark[0]} ${n.mark[1]}`} />
                            <g className="asm" style={{ ['--i' as string]: i }}>
                                <circle className="cw-schem-mark" cx={n.mark[0]} cy={n.mark[1]} r={5} />
                                <text x={n.lx} y={n.ly} textAnchor={n.anchor}>{label}</text>
                            </g>
                        </g>
                    );
                })}
            </svg>
        </Gfx>
    );
};

/* ══ "Qué te llevás" · Fig. B — El acta + despegue ══
   Se imprime el acta renglón por renglón, cae el sello "ENTREGADO" y, al cerrar,
   la pantalla se convierte en el cohete de CreApp y despega. */
export const DeliverablesFigure: React.FC<{ items: string[] }> = ({ items }) => {
    const four = items.slice(0, 4);
    const rowY = (i: number) => 112 + i * 34;
    return (
        <Gfx fig="B" caption="De la entrega al despegue" note="Entregado">
            <svg className="iso cw-acta" viewBox="40 24 440 272" role="img" aria-label="Acta de entrega que al sellarse despega como un cohete.">
                {/* documento (se va al final) */}
                <g className="cw-acta-doc">
                    <rect className="cw-acta-paper" x={70} y={44} width={380} height={232} rx={12} />
                    <text x={94} y={82} className="cw-acta-h">ACTA DE ENTREGA</text>
                    <line className="cw-acta-div" x1={94} y1={94} x2={426} y2={94} />
                    {four.map((d, i) => (
                        <g key={d} className="asm cw-acta-row" style={{ ['--i' as string]: i }}>
                            <path className="cw-acta-check" pathLength={1} fill="none" d={`M${98} ${rowY(i)} l6 7 l12 -14`} />
                            <text x={126} y={rowY(i) + 5} className="cw-acta-line">{d}</text>
                        </g>
                    ))}
                    <g className="cw-stamp" style={{ ['--i' as string]: four.length }}>
                        <rect className="cw-stamp-box" x={330} y={212} width={120} height={46} rx={7} transform="rotate(-8 390 235)" />
                        <text x={390} y={240} textAnchor="middle" className="cw-stamp-txt" transform="rotate(-8 390 235)">ENTREGADO</text>
                    </g>
                </g>
                {/* cohete CreApp: aparece y despega al cerrar el acta */}
                <g className="cw-acta-rocket" style={{ ['--i' as string]: four.length }}>
                    <g className="cw-rk-flame">
                        <polygon className="cw-rk-f1" points="248,214 272,214 260,250" />
                        <polygon className="cw-rk-f2" points="253,214 267,214 260,236" />
                    </g>
                    <path className="cw-rk-body" d="M260 120 C276 134 276 176 270 206 L250 206 C244 176 244 134 260 120 Z" />
                    <circle className="cw-rk-win" cx={260} cy={154} r={8} />
                    <polygon className="cw-rk-fin" points="250,196 236,214 250,210" />
                    <polygon className="cw-rk-fin" points="270,196 284,214 270,210" />
                    <g className="cw-rk-trail" aria-hidden="true">
                        {[0, 1, 2].map((i) => <line key={i} x1={210 + i * 45} y1={250} x2={210 + i * 45} y2={290} />)}
                    </g>
                </g>
                {/* cierre del terminal, tras el despegue */}
                <g className="cw-acta-welcome">
                    {/* end-anchored: el caret queda SIEMPRE después del texto, sin tapar letras */}
                    <text x={372} y={158} textAnchor="end" className="cw-welcome-tx">¡Bienvenido a CreApp!</text>
                    <rect className="cw-welcome-cur" x={378} y={146} width={11} height={17} rx={1.5} />
                </g>
            </svg>
        </Gfx>
    );
};

/* ══ PENTESTING · "Qué incluye" — Finding radar (adaptado de 21st.dev) ══
   Un radar con barrido que rota: cada técnica/hallazgo se "descubre" cuando el
   barrido lo cruza y se desvanece cuando el barrido pasó >50% del giro → loop de
   finding constante. framer no hace falta: un rAF sincroniza barrido y nodos. */
const PT_NODES = [
    { label: 'OWASP', Icon: ShieldAlert, angle: 215, r: 38 },
    { label: 'RECON', Icon: RadarIcon, angle: 325, r: 38 },
    { label: 'VULNS', Icon: ShieldOff, angle: 180, r: 40 },
    { label: 'BACKDOORS', Icon: DoorOpen, angle: 270, r: 33 },
    { label: 'PHISHING', Icon: Fish, angle: 90, r: 28 },
    { label: 'FUZZING', Icon: Bug, angle: 145, r: 31 },
    { label: 'REPORTE', Icon: FileSearch, angle: 35, r: 37 },
];
const RAD = Math.PI / 180;
const PERIOD = 6200; // ms por vuelta

export const PentestRadar: React.FC = () => {
    const wrapRef = useRef<HTMLDivElement>(null);
    const sweepRef = useRef<HTMLDivElement>(null);
    const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
            nodeRefs.current.forEach((el) => el && (el.style.opacity = '0.85'));
            return;
        }
        let visible = true;
        const io = wrapRef.current
            ? new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.1 })
            : null;
        if (io && wrapRef.current) io.observe(wrapRef.current);

        let raf = 0;
        let start = 0;
        const loop = (t: number) => {
            raf = requestAnimationFrame(loop);
            if (!start) start = t;
            if (!visible || document.hidden) return;
            const phi = (((t - start) % PERIOD) / PERIOD) * 360;
            if (sweepRef.current) sweepRef.current.style.transform = `rotate(${phi}deg)`;
            nodeRefs.current.forEach((el, i) => {
                if (!el) return;
                const delta = (phi - PT_NODES[i].angle + 360) % 360;
                let o = 0;
                if (delta < 16) o = delta / 16;            // se descubre al pasar el barrido
                else if (delta < 158) o = 1;               // visible
                else if (delta < 186) o = 1 - (delta - 158) / 28; // >50% → se desvanece
                el.style.opacity = o.toFixed(3);
                el.style.transform = `translate(-50%, -50%) scale(${(0.9 + o * 0.12).toFixed(3)})`;
            });
        };
        raf = requestAnimationFrame(loop);
        return () => { cancelAnimationFrame(raf); io?.disconnect(); };
    }, []);

    return (
        <Gfx fig="A" caption="Superficie de ataque" note="finding en vivo">
            <div className="cw-ptradar" ref={wrapRef}>
                {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="cw-ptradar-ring" style={{ inset: `${i * 12.5}%`, opacity: 0.6 - i * 0.12 }} />
                ))}
                <span className="cw-ptradar-cross cw-ptradar-cross-h" />
                <span className="cw-ptradar-cross cw-ptradar-cross-v" />
                <div className="cw-ptradar-sweep" ref={sweepRef} aria-hidden="true">
                    <span className="cw-ptradar-fan" />
                    <span className="cw-ptradar-beam" />
                </div>
                <span className="cw-ptradar-core" />
                {PT_NODES.map((n, i) => (
                    <div
                        key={n.label}
                        ref={(el) => { nodeRefs.current[i] = el; }}
                        className="cw-ptradar-node"
                        style={{
                            left: `${50 + n.r * Math.cos(n.angle * RAD)}%`,
                            top: `${50 + n.r * Math.sin(n.angle * RAD)}%`,
                            opacity: 0,
                        }}
                    >
                        <span className="cw-ptradar-chip"><n.Icon size={18} /></span>
                        <span className="cw-ptradar-lbl">{n.label}</span>
                    </div>
                ))}
            </div>
        </Gfx>
    );
};

/* ══ PENTESTING · "Qué te llevás" — El sistema blindado ══
   Un escudo que se dibuja mientras los hallazgos pasan de abierto (rojo) a
   resuelto; al cerrar, un candado y "BLINDADO". */
export const PentestShield: React.FC<{ items: string[] }> = ({ items }) => {
    const four = items.slice(0, 4);
    const shield = 'M260 58 L336 88 L336 158 C336 206 302 236 260 254 C218 236 184 206 184 158 L184 88 Z';
    const fx = (i: number) => 215 + i * 30; // fila de hallazgos arriba
    const fy = 106;
    return (
        <Gfx fig="B" caption="El sistema blindado" note="0 abiertos">
            <svg className="iso cw-shield" viewBox="40 24 440 272" role="img" aria-label="Un escudo que se blinda a medida que se resuelven los hallazgos.">
                <defs>
                    <linearGradient id="cwLockGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#A78BFA" />
                        <stop offset="0.55" stopColor="#8B5CF6" />
                        <stop offset="1" stopColor="#6D28D9" />
                    </linearGradient>
                </defs>
                <path className="cw-shield-fill" d={shield} />
                <path className="cw-shield-line" pathLength={1} fill="none" d={shield} />
                {four.map((_, i) => (
                    <g key={i} className="cw-shield-find" style={{ ['--i' as string]: i }}>
                        <circle className="cw-find-open" cx={fx(i)} cy={fy} r={7} />
                        <path className="cw-find-done" pathLength={1} fill="none" d={`M${fx(i) - 4} ${fy} l3 4 l7 -8`} />
                    </g>
                ))}
                <g className="cw-shield-seal">
                    <path className="cw-shield-lock-s" fill="none" stroke="url(#cwLockGrad)" d="M250 152 v-7 a10 10 0 0 1 20 0 v7" />
                    <rect className="cw-shield-lock-b" x={246} y={152} width={28} height={23} rx={4} fill="url(#cwLockGrad)" />
                    <rect x={258} y={160} width={4} height={8} rx={2} fill="#2a1259" />
                    <text x={260} y={282} textAnchor="middle" className="cw-shield-tx">Blindado por CreApp</text>
                </g>
            </svg>
        </Gfx>
    );
};

/* ══ SOC · Torre de servidores monitoreada ══
   mode="alert" → luces rojas + tooltips de lo que se monitorea (Qué incluye).
   mode="protected" → todo en verde + "Servidores Protegidos by CreApp" (Qué te llevás). */
const SOC_MON = ['ALERTAS', 'LOGS', 'ACTIVIDAD', 'CONEXIONES', 'PROCESOS'];
export const SocRack: React.FC<{ mode: 'alert' | 'protected' }> = ({ mode }) => {
    const units = [0, 1, 2, 3, 4];
    const unitY = (u: number) => 62 + u * 36;
    return (
        <Gfx
            fig={mode === 'alert' ? 'A' : 'B'}
            caption={mode === 'alert' ? 'Monitoreo de tu entorno' : 'Entorno protegido'}
            note={mode === 'alert' ? 'en vivo' : undefined}
            bare={mode === 'protected'}
        >
            <svg className={`iso cw-rack cw-rack-${mode}`} viewBox="0 20 520 260" role="img"
                aria-label={mode === 'alert' ? 'Torre de servidores con alertas que se monitorean en vivo.' : 'Torre de servidores protegida, todo en verde.'}>
                {/* gabinete */}
                <rect className="cw-rack-cab" x={198} y={54} width={124} height={192} rx={10} />
                {units.map((u) => {
                    const y = unitY(u);
                    return (
                        <g key={u} className="cw-rack-unit" style={{ ['--i' as string]: u }}>
                            <rect className="cw-rack-blade" x={206} y={y} width={108} height={28} rx={5} />
                            {[0, 1, 2].map((v) => (
                                <line key={v} className="cw-rack-vent" x1={214} y1={y + 8 + v * 6} x2={250} y2={y + 8 + v * 6} />
                            ))}
                            {[0, 1, 2].map((l) => (
                                <circle key={l} className="cw-rack-led" cx={302 - l * 13} cy={y + 14} r={3.6} style={{ ['--j' as string]: u * 3 + l }} />
                            ))}
                        </g>
                    );
                })}
                {mode === 'alert'
                    ? SOC_MON.map((m, i) => {
                        const left = i % 2 === 0;
                        const uy = unitY(i) + 14;
                        return (
                            <g key={m} className="cw-rack-tip" style={{ ['--i' as string]: i }}>
                                <line className="cw-rack-tipline" x1={left ? 206 : 314} y1={uy} x2={left ? 150 : 370} y2={uy} />
                                <g transform={`translate(${left ? 42 : 370}, ${uy - 13})`}>
                                    <rect className="cw-rack-pill" x={0} y={0} width={108} height={26} rx={13} />
                                    <circle className="cw-rack-pilldot" cx={15} cy={13} r={4} />
                                    <text x={30} y={17} className="cw-rack-piltx">{m}</text>
                                </g>
                            </g>
                        );
                    })
                    : (
                        <g className="cw-rack-seal">
                            <text x={260} y={270} textAnchor="middle" className="cw-rack-sealtx">Servidores Protegidos by CreApp</text>
                        </g>
                    )}
            </svg>
        </Gfx>
    );
};

/* ══ IA · "Qué incluye" — El cerebro que entrenamos ══
   El motor de IA (cerebro-circuito) al que se le inyecta la información del
   propio negocio por cuatro canales con pulsos que entran. Cierra con el sello
   "sin alucinaciones": entrenado 100% en tu negocio. */
const BRAIN_FEED: { label: string; at: [number, number] }[] = [
    { label: 'Tu catálogo', at: [21, 25] },
    { label: 'Tus clientes', at: [79, 25] },
    { label: 'Tu histórico', at: [21, 75] },
    { label: 'Tu tono de marca', at: [79, 75] },
];
export const BrainTraining: React.FC = () => (
    <Gfx>
        <div className="cw-brain">
            <div className="cw-brain-stage">
                <svg className="cw-brain-leads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    {BRAIN_FEED.map((f, i) => (
                        <g key={f.label}>
                            <line className="cw-brain-lead" x1={f.at[0]} y1={f.at[1]} x2={50} y2={50} />
                            <line className="cw-brain-flow" style={{ ['--i' as string]: i }} x1={f.at[0]} y1={f.at[1]} x2={50} y2={50} />
                        </g>
                    ))}
                </svg>
                <div className="cw-brain-hub">
                    <span className="cw-brain-core" aria-hidden="true">
                        <BrainCircuit className="cw-brain-ico" size={62} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <span className="cw-brain-label">Motor de IA</span>
                </div>
                {BRAIN_FEED.map((f, i) => (
                    <span key={f.label} className="cw-brain-chip"
                        style={{ left: `${f.at[0]}%`, top: `${f.at[1]}%`, ['--i' as string]: i }}>
                        <span className="cw-brain-chip-dot" aria-hidden="true" />
                        {f.label}
                    </span>
                ))}
            </div>
            <p className="cw-brain-seal">
                <Check size={15} strokeWidth={3} aria-hidden="true" />
                <span>Entrenado en tu negocio · <b>sin alucinaciones</b></span>
            </p>
        </div>
    </Gfx>
);

/* ══ IA · "Qué te llevás" — El chatbot que funciona ══
   Chat de alta fidelidad (mismo lenguaje que el agente del hero): el humano
   pregunta quién construyó y entrenó el sistema; el asistente responde que lo
   desarrolló CreApp. Se reproduce solo al entrar en viewport. */
type ChatPhase = 'idle' | 'ask' | 'typing' | 'done';
export const ChatbotProof: React.FC = () => {
    const [phase, setPhase] = useState<ChatPhase>('idle');
    const timers = useRef<number[]>([]);
    const clear = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
    useEffect(() => clear, []);
    const ref = useLive<HTMLDivElement>((live) => {
        clear();
        if (!live) { setPhase('idle'); return; }
        if (reducedMotion()) { setPhase('done'); return; }
        setPhase('ask');
        timers.current.push(window.setTimeout(() => setPhase('typing'), 900));
        timers.current.push(window.setTimeout(() => setPhase('done'), 2200));
    });
    const status = phase === 'typing' ? 'Escribiendo…' : 'En línea';
    return (
        <div ref={ref} className="cw-demo cw-chatproof" data-phase={phase}>
            <div className="cw-demo-bar">
                <span className="cw-agent" aria-hidden="true">
                    <svg viewBox="0 0 40 40">
                        <circle className="cw-agent-ring r1" cx="20" cy="20" r="17" />
                        <circle className="cw-agent-ring r2" cx="20" cy="20" r="11" />
                        <circle className="cw-agent-core" cx="20" cy="20" r="4.5" />
                    </svg>
                </span>
                <span className="cw-mono cw-demo-status">Asistente CreApp · {status}</span>
                <span className="cw-mono cw-gfx-note">Conversación de ejemplo</span>
            </div>
            <div className="cw-demo-log" aria-live="polite">
                {phase !== 'idle' && (
                    <p className="cw-msg is-user">¿Quién construyó y entrenó todo este sistema?</p>
                )}
                {phase === 'typing' && (
                    <p className="cw-msg is-agent cw-chat-typing" aria-label="escribiendo…">
                        <i /><i /><i />
                    </p>
                )}
                {phase === 'done' && (
                    <p className="cw-msg is-agent">
                        Lo desarrolló <b className="cw-chat-brand">CreApp</b>. Por eso funciona tan increíblemente bien.
                    </p>
                )}
            </div>
            <form className="cw-demo-input" onSubmit={(e) => e.preventDefault()}>
                <label htmlFor="cw-chatproof-q" className="cw-sr">Preguntale al asistente</label>
                <input id="cw-chatproof-q" type="text" placeholder="Preguntale al asistente…" disabled />
                <button type="submit" aria-label="Enviar" disabled>
                    <ArrowUp size={16} />
                </button>
            </form>
        </div>
    );
};

/* ══ APIs & Escala · "Qué incluye" — Gateway de integración + escala ══
   Los sistemas del negocio (izq) entran por un API Gateway central, que enruta
   hacia un backend que autoescala (der). Pulsos de request fluyen izq → gateway
   → escala. Congruente con APIs REST + integraciones + arquitectura escalable. */
const GW_SYS = ['Pagos', 'CRM', 'WhatsApp'];
const GW_SYS_Y = [26, 50, 74];
export const ApiGateway: React.FC = () => (
    <Gfx>
        <div className="cw-apis">
            <div className="cw-apis-stage">
                <svg className="cw-apis-leads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    {GW_SYS_Y.map((y, i) => (
                        <g key={`l${i}`}>
                            <line className="cw-apis-lead" x1={15} y1={y} x2={48} y2={50} />
                            <line className="cw-apis-flow" style={{ ['--i' as string]: i }} x1={15} y1={y} x2={48} y2={50} />
                        </g>
                    ))}
                    {[38, 50, 62].map((y, i) => (
                        <g key={`r${i}`}>
                            <line className="cw-apis-lead" x1={52} y1={50} x2={84} y2={y} />
                            <line className="cw-apis-flow cw-apis-flow-r" style={{ ['--i' as string]: i }} x1={52} y1={50} x2={84} y2={y} />
                        </g>
                    ))}
                </svg>
                {GW_SYS.map((s, i) => (
                    <span key={s} className="cw-apis-sys" style={{ left: '15%', top: `${GW_SYS_Y[i]}%`, ['--i' as string]: i }}>
                        <span className="cw-apis-sys-dot" aria-hidden="true" />{s}
                    </span>
                ))}
                <div className="cw-apis-gw">
                    <span className="cw-apis-gw-core" aria-hidden="true">
                        <Waypoints className="cw-apis-gw-ico" size={30} strokeWidth={1.8} />
                    </span>
                    <span className="cw-apis-gw-t">API Gateway</span>
                    <span className="cw-apis-gw-tag">REST · /v2</span>
                </div>
                <div className="cw-apis-scale">
                    <span className="cw-apis-scale-core" aria-hidden="true">
                        <Server size={20} strokeWidth={1.8} />
                    </span>
                    <span className="cw-apis-scale-lbl">Autoescala</span>
                    <span className="cw-apis-scale-bar" aria-hidden="true"><i /></span>
                </div>
            </div>
        </div>
    </Gfx>
);

/* ══ APIs & Escala · "Qué te llevás" — El handshake que conecta todo ══
   Los distintos sistemas se van conectando a la API central; cuando el handshake
   se concreta, la ilustración se tiñe de verde (success) y cierra con la firma
   "API desarrollada por CreApp". Se reproduce al entrar en viewport. */
const HS_NODES: { label: string; at: [number, number] }[] = [
    { label: 'Auth', at: [50, 15] },
    { label: 'Pagos', at: [84, 37] },
    { label: 'CRM', at: [73, 84] },
    { label: 'Envíos', at: [27, 84] },
    { label: 'WhatsApp', at: [16, 37] },
];
export const ApiHandshake: React.FC = () => (
    <Gfx>
        <div className="cw-hs">
            <div className="cw-hs-stage">
                <svg className="cw-hs-leads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    {HS_NODES.map((n, i) => (
                        <g key={n.label}>
                            <line className="cw-hs-link" x1={50} y1={50} x2={n.at[0]} y2={n.at[1]} />
                            <line className="cw-hs-flow" style={{ ['--i' as string]: i }} x1={50} y1={50} x2={n.at[0]} y2={n.at[1]} />
                        </g>
                    ))}
                </svg>
                <div className="cw-hs-core"><span>API</span></div>
                {HS_NODES.map((n, i) => (
                    <span key={n.label} className="cw-hs-node" style={{ left: `${n.at[0]}%`, top: `${n.at[1]}%`, ['--i' as string]: i }}>
                        <span className="cw-hs-node-dot" aria-hidden="true" />{n.label}
                    </span>
                ))}
                <span className="cw-hs-success">
                    <Check size={14} strokeWidth={3} aria-hidden="true" /> Conectado · 200 OK
                </span>
            </div>
            <p className="cw-hs-seal">API desarrollada por <b>CreApp</b></p>
        </div>
    </Gfx>
);

/* ══ Auditorías · "Qué incluye" — Lupa que audita los controles ══
   Una lupa recorre la lista de controles de seguridad y a su paso revela el
   veredicto: cumple (✓) o hallazgo (!). Loop continuo = auditoría en curso.
   Se reproduce al entrar en viewport. */
const CTRL_ROWS: { label: string; verdict: 'ok' | 'find' }[] = [
    { label: 'Cifrado en tránsito y reposo', verdict: 'ok' },
    { label: 'Control de accesos · MFA', verdict: 'ok' },
    { label: 'Gestión de parches', verdict: 'find' },
    { label: 'Backups con restauración', verdict: 'ok' },
    { label: 'Registro y monitoreo', verdict: 'ok' },
    { label: 'Hardening de servidores', verdict: 'find' },
];
export const ControlsAudit: React.FC = () => {
    const [active, setActive] = useState(-1);
    const timers = useRef<number[]>([]);
    const clear = () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; };
    useEffect(() => clear, []);
    const ref = useLive<HTMLDivElement>((live) => {
        clear();
        if (!live) { setActive(-1); return; }
        if (reducedMotion()) { setActive(CTRL_ROWS.length - 1); return; }
        let i = -1;
        const tick = () => {
            i += 1;
            if (i >= CTRL_ROWS.length) {
                timers.current.push(window.setTimeout(() => { setActive(-1); i = -1; timers.current.push(window.setTimeout(tick, 700)); }, 1700));
                return;
            }
            setActive(i);
            timers.current.push(window.setTimeout(tick, 740));
        };
        tick();
    });
    const findings = CTRL_ROWS.filter((r) => r.verdict === 'find').length;
    return (
        <Gfx>
            <div className="cw-ctrl" ref={ref}>
                <div className="cw-ctrl-head">
                    <Search size={15} /> Auditoría de controles · en curso
                </div>
                <ul className="cw-ctrl-list" style={{ ['--active' as string]: Math.max(active, 0) }}>
                    <span className="cw-ctrl-lens" aria-hidden="true" style={{ opacity: active >= 0 ? 1 : 0 }}>
                        <Search size={17} strokeWidth={2} />
                    </span>
                    {CTRL_ROWS.map((r, i) => {
                        const done = i <= active;
                        return (
                            <li key={r.label} className={`cw-ctrl-row${done ? ' is-done' : ''}${i === active ? ' is-active' : ''}`}>
                                <span className="cw-ctrl-label">{r.label}</span>
                                <span className={`cw-ctrl-status is-${r.verdict}`}>
                                    {done ? (r.verdict === 'ok' ? <Check size={14} strokeWidth={3} /> : '!') : '—'}
                                </span>
                            </li>
                        );
                    })}
                </ul>
                <p className="cw-ctrl-foot">
                    <b>{CTRL_ROWS.length - findings}</b> cumplen · <b className="cw-ctrl-foot-find">{findings}</b> hallazgos a remediar
                </p>
            </div>
        </Gfx>
    );
};

/* ── Resolver por servicio: cada uno tiene su propia figura. ── */
export const IncludesFor: React.FC<{ slug: string; items: { t: string }[] }> = ({ slug, items }) => {
    if (slug === 'pentesting') return <PentestRadar />;
    if (slug === 'soc') return <SocRack mode="alert" />;
    if (slug === 'ia') return <BrainTraining />;
    if (slug === 'apis-escala') return <ApiGateway />;
    if (slug === 'auditorias') return <ControlsAudit />;
    return <IncludesFigure slug={slug} items={items} />;
};

export const DeliverablesFor: React.FC<{ slug: string; items: string[] }> = ({ slug, items }) => {
    if (slug === 'pentesting') return <PentestShield items={items} />;
    if (slug === 'soc') return <SocRack mode="protected" />;
    if (slug === 'ia') return <ChatbotProof />;
    if (slug === 'apis-escala') return <ApiHandshake />;
    return <DeliverablesFigure items={items} />;
};
