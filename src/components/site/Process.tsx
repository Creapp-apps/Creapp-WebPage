import React, { useEffect, useRef, useState } from 'react';
import { PROCESS, PROCESS_FACTS } from './content';
import { Reveal } from './Chapter';
import { reducedMotion } from './iso';

/**
 * S10 · Cómo trabajamos. Cuatro etapas sobre una línea que se completa con el scroll.
 * El cohete viaja por la línea y despega recién en "Lanzamiento": es el remate, no relleno.
 */
export const Process: React.FC = () => {
    const trackRef = useRef<HTMLOListElement>(null);
    const [active, setActive] = useState(reducedMotion() ? PROCESS.length : 0);

    useEffect(() => {
        const el = trackRef.current;
        if (!el) return;
        if (reducedMotion()) {
            el.style.setProperty('--p', '1');
            return;
        }
        let raf = 0;
        const update = () => {
            raf = 0;
            const r = el.getBoundingClientRect();
            const vh = window.innerHeight;
            // 0 cuando el recorrido asoma por abajo; 1 cuando su final cruza el centro.
            const p = Math.max(0, Math.min(1, (vh * 0.9 - r.top) / (r.height + vh * 0.4)));
            el.style.setProperty('--p', p.toFixed(4));
            setActive(Math.min(PROCESS.length, Math.floor(p * PROCESS.length + 0.35)));
        };
        const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    const launched = active >= PROCESS.length;

    return (
        <section id="proceso" className="cw-section cw-process" aria-labelledby="proceso-t">
            <div className="cw-wrap">
                <Reveal className="cw-intro-head">
                    <div>
                        <span className="cw-mono">Cómo trabajamos</span>
                        <h2 id="proceso-t" className="cw-display cw-h2">De la idea al lanzamiento.</h2>
                    </div>
                    <p className="cw-lead">
                        Un proceso estructurado en cuatro etapas. Cada una con objetivos, entregables y validación
                        antes de avanzar — para que el presupuesto se invierta en lo correcto.
                    </p>
                </Reveal>

                <ol ref={trackRef} className={`cw-track ${launched ? 'is-launched' : ''}`}>
                    <li className="cw-track-line" aria-hidden="true">
                        <i />
                        <img className="cw-rocket" src="/CREAPP%20LOGO%20VECTOR.png" alt="" width={20} height={35} />
                    </li>
                    {PROCESS.map((p, i) => (
                        <li key={p.n} className={`cw-stage ${i < active ? 'is-on' : ''}`}>
                            <span className="cw-stage-dot" aria-hidden="true" />
                            <span className="cw-mono">Etapa {p.n}</span>
                            <h3>{p.t}</h3>
                            <p>{p.d}</p>
                        </li>
                    ))}
                </ol>

                <Reveal className="cw-facts">
                    {PROCESS_FACTS.map((f) => (
                        <div key={f.k} className="cw-fact">
                            <b>{f.k}</b>
                            <span>{f.d}</span>
                        </div>
                    ))}
                </Reveal>
            </div>
        </section>
    );
};

export default Process;
