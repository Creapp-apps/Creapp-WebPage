import React, { Suspense, useState, useLayoutEffect, useRef } from 'react';
import { METHODOLOGY } from './methodology';
import { SplitReveal, TextReveal, RevealIn, gsap, prefersReducedMotion, DUR, GSAP_EASE } from './motion';

// La máquina 3D es pesada (three.js): se carga aparte y solo cuando esta sección
// se monta, para no bloquear el resto de la home.
const AgenticLab3D = React.lazy(() => import('./AgenticLab3D'));

/**
 * Acordeón sobrio: los 4 títulos siempre visibles, uno abierto a la vez.
 * Se abre con hover (desktop) o click/tap (touch y teclado). Ahorra scroll
 * mostrando solo una descripción por vez, con transición de altura sin saltos.
 */
const LabFeatures: React.FC = () => {
    // Todos colapsados por default; el usuario abre el que quiera (y lo cierra al reclicar).
    const [active, setActive] = useState<number | null>(null);
    const olRef = useRef<HTMLOListElement>(null);

    // Las filas del acordeón entran deslizándose lateralmente, una tras otra, al
    // llegar a la sección. reduced-motion → visibles sin animación.
    useLayoutEffect(() => {
        const ol = olRef.current;
        if (!ol || prefersReducedMotion()) return;
        const items = Array.from(ol.children) as HTMLElement[];
        const ctx = gsap.context(() => {
            gsap.set(items, { autoAlpha: 0, x: -34 });
            gsap.to(items, {
                autoAlpha: 1,
                x: 0,
                duration: DUR.base,
                ease: GSAP_EASE.cout,
                stagger: 0.1,
                scrollTrigger: { trigger: ol, start: 'top 82%', once: true },
            });
        }, ol);
        return () => ctx.revert();
    }, []);

    return (
        <ol className="cw-lab-acc" ref={olRef}>
            {METHODOLOGY.points.map((p, i) => {
                const open = i === active;
                return (
                    <li key={p.t} className={open ? 'is-open' : ''}>
                        <button
                            type="button"
                            className="cw-lab-acc-head"
                            aria-expanded={open}
                            onClick={() => setActive(open ? null : i)}
                        >
                            <span className="cw-lab-n">{String(i + 1).padStart(2, '0')}</span>
                            <b>{p.t}</b>
                            <svg
                                className="cw-lab-acc-ico"
                                viewBox="0 0 16 16"
                                fill="none"
                                aria-hidden="true"
                            >
                                <path
                                    d="M6 4l4 4-4 4"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                        <div className="cw-lab-acc-body">
                            <div>
                                <span className="cw-lab-d">{p.d}</span>
                            </div>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
};

/**
 * Sección "Agentic Lab" unificada en dos columnas: a la izquierda el texto
 * (eyebrow + título + lead + acordeón de las 4 características), a la derecha
 * la ilustración 3D animada flotando sobre el lienzo.
 */
export const Methodology: React.FC = () => (
    <section id="metodologia" className="cw-section cw-lab" aria-labelledby="met-t">
        <div className="cw-wrap">
            <div className="cw-lab-split">
                <div className="cw-lab-copy">
                    <SplitReveal as="h2" id="met-t" className="cw-display cw-h2">
                        {METHODOLOGY.title}
                    </SplitReveal>
                    <TextReveal as="p" className="cw-lead" preset="type-word">{METHODOLOGY.lead}</TextReveal>
                    <LabFeatures />
                </div>

                <RevealIn className="cw-lab-stage" x={48} y={0}>
                    <Suspense fallback={<div className="cw-lab-stage-ph" />}>
                        <AgenticLab3D embed centered height="100%" />
                    </Suspense>
                </RevealIn>
            </div>
        </div>
    </section>
);

export default Methodology;
