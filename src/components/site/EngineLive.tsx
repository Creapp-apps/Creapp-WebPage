import React, { useEffect, useRef, useState } from 'react';
import { reducedMotion, useLive } from './iso';
import { SplitReveal, TextReveal, RevealIn, StaggerGroup } from './motion';

/**
 * S9 · El motor en vivo. Terminal (xterm, carga diferida) que reproduce el recorrido real de
 * una pieza por nuestro motor de contenido: guion → render → QA → pre-flight → programación →
 * publicación. Es una simulación del flujo (rotulado), con la hora real del visitante.
 * Franja siempre oscura: acá el negro es protagonista. Un solo acento: cyan.
 */

const STAGES = ['Guion', 'Render', 'QA', 'Pre-flight', 'Programación', 'Publicación'];
const FORMATS = [
    { name: 'reel', size: '1080×1920' },
    { name: 'carrusel', size: '1080×1350' },
    { name: 'historia', size: '1080×1920' },
];

const C = {
    dim: '\x1b[38;2;90;100;120m',
    ink: '\x1b[38;2;228;232;244m',
    cyan: '\x1b[38;2;0;240;255m',
    violet: '\x1b[38;2;167;139;250m',
    off: '\x1b[0m',
};

const clock = () => new Date().toTimeString().slice(0, 8);

export const EngineLive: React.FC = () => {
    const hostRef = useRef<HTMLDivElement>(null);
    const liveRef = useRef(false);
    const wake = useRef<() => void>(() => {});
    const [stage, setStage] = useState(-1);
    const [piece, setPiece] = useState(1);
    const sectionRef = useLive<HTMLElement>((live) => {
        liveRef.current = live;
        if (live) wake.current();
    });

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        let disposed = false;
        let timer = 0;
        let term: import('@xterm/xterm').Terminal | null = null;
        let ro: ResizeObserver | null = null;
        let started = false;

        const boot = async () => {
            if (started || disposed) return;
            started = true;
            const [{ Terminal }, { FitAddon }] = await Promise.all([
                import('@xterm/xterm'),
                import('@xterm/addon-fit'),
                import('@xterm/xterm/css/xterm.css'),
                document.fonts?.load('13px "Geist Mono"').catch(() => undefined),
            ]);
            if (disposed) return;
            term = new Terminal({
                fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                fontSize: host.clientWidth < 420 ? 11.5 : 13,
                lineHeight: 1.45,
                cursorBlink: false,
                cursorStyle: 'bar',
                disableStdin: true,
                scrollback: 0,
                convertEol: true,
                allowTransparency: true,
                theme: { background: 'rgba(0,0,0,0)', foreground: '#E4E8F4', cursor: '#00F0FF' },
            });
            const fit = new FitAddon();
            term.loadAddon(fit);
            term.open(host);
            fit.fit();
            ro = new ResizeObserver(() => fit.fit());
            ro.observe(host);

            const line = (tag: string, msg: string, mark = '✓') => {
                const wide = (term?.cols ?? 0) >= 46;
                const ts = wide ? `${C.dim}[${clock()}]${C.off} ` : '';
                term?.writeln(`${ts}${C.ink}${tag.padEnd(10)}${C.off}${mark === '✓' ? C.cyan : C.dim}${mark}${C.off} ${C.ink}${msg}${C.off}`);
            };

            let n = 1;
            const steps = (num: number): [number, () => void][] => {
                const f = FORMATS[(num - 1) % FORMATS.length];
                return [
                    [500, () => { setPiece(num); setStage(-1); term?.writeln(`${C.violet}$${C.off} ${C.ink}motor producir --pieza ${String(num).padStart(2, '0')}${C.off}`); }],
                    [900, () => { setStage(0); line('guion', `${f.name} · texto y tiempos`); }],
                    [900, () => { setStage(1); line('render', `${f.size} …`, '▸'); }],
                    [1500, () => line('render', 'listo')],
                    [800, () => { setStage(2); line('qa', 'formato, audio y marca'); }],
                    [900, () => { setStage(3); line('preflight', 'verde · token vigente'); }],
                    [800, () => { setStage(4); line('programar', 'en calendario'); }],
                    [1000, () => { setStage(5); line('publicar', 'publicado'); }],
                    [700, () => term?.writeln(`${C.dim}— sin intervención humana · sigue la próxima —${C.off}\n`)],
                    [1800, () => undefined],
                ];
            };

            if (reducedMotion()) {
                // Frame fijo: una corrida completa, sin tickear.
                steps(1).forEach(([, fn]) => fn());
                return;
            }

            let queue = steps(n);
            const tick = () => {
                if (disposed) return;
                if (!liveRef.current) { timer = 0; return; } // pausa fuera de pantalla
                const next = queue.shift();
                if (!next) { n += 1; queue = steps(n); timer = window.setTimeout(tick, 0); return; }
                timer = window.setTimeout(() => { next[1](); tick(); }, next[0]);
            };
            wake.current = () => { if (!timer) tick(); };
            tick();
        };

        // xterm se descarga recién cuando la franja se acerca al viewport.
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { boot(); io.disconnect(); } }, { rootMargin: '300px' });
        io.observe(host);

        return () => {
            disposed = true;
            window.clearTimeout(timer);
            io.disconnect();
            ro?.disconnect();
            term?.dispose();
            wake.current = () => {};
        };
    }, []);

    return (
        <section ref={sectionRef} id="motor" className="cw-engine" aria-labelledby="motor-t">
            <div className="cw-wrap cw-engine-grid cw-split-rev">
                <div className="cw-engine-copy">
                    <RevealIn y={14}>
                        <span className="cw-mono cw-engine-eyebrow"><i />Nuestra agencia 24/7</span>
                    </RevealIn>
                    <SplitReveal as="h2" id="motor-t" className="cw-display cw-h2">
                        Mientras dormís, nuestro sistema produce, revisa y publica.
                    </SplitReveal>
                    <TextReveal as="p" className="cw-lead" preset="type-word">Esto no es una promesa: es nuestro propio motor.</TextReveal>
                    <StaggerGroup as="ol" x={30} className="cw-stages">
                        {STAGES.map((s, i) => (
                            <li key={s} className={i <= stage ? 'is-on' : ''}>
                                <span className="cw-mono">0{i + 1}</span>
                                {s}
                            </li>
                        ))}
                    </StaggerGroup>
                </div>
                <RevealIn className="cw-term" x={-40} y={0}>
                    <div className="cw-term-bar cw-mono">
                        <span>motor · pieza {String(piece).padStart(2, '0')}</span>
                        <span>Simulación del flujo</span>
                    </div>
                    <div ref={hostRef} className="cw-term-host" aria-hidden="true" />
                    <p className="cw-sr">
                        Simulación: el motor toma una pieza, escribe el guion, la renderiza, pasa control de
                        calidad y pre-flight, la programa y la publica sin intervención humana.
                    </p>
                </RevealIn>
            </div>
        </section>
    );
};

export default EngineLive;
