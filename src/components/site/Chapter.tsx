import React, { useEffect, useRef } from 'react';
import { SplitReveal, TextReveal } from './motion';

/** Marca .is-in al entrar en viewport (una vez). Con reduced-motion el CSS ya lo muestra fijo. */
export function useReveal<T extends HTMLElement>() {
    const ref = useRef<T>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) {
                    el.classList.add('is-in');
                    io.disconnect();
                }
            },
            { rootMargin: '0px 0px -12% 0px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);
    return ref;
}

export const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
    children,
    delay = 0,
    className = '',
}) => {
    const ref = useReveal<HTMLDivElement>();
    return (
        <div ref={ref} className={`cw-reveal ${className}`} style={{ ['--d' as string]: `${delay}ms` }}>
            {children}
        </div>
    );
};

interface ChapterProps {
    id: string;
    /** Rótulo mono sobre el título: "Área 01", "Proceso"… */
    eyebrow: string;
    /** Número gigante de marca de agua. */
    mark?: string;
    title: React.ReactNode;
    lead?: string;
    /** Alterna: cabecera a la derecha, cuerpo a la izquierda. */
    flip?: boolean;
    badge?: string;
    children: React.ReactNode;
}

/**
 * Capítulo editorial: cabecera sticky (nº + título + bajada) y cuerpo que scrollea al lado.
 * En mobile colapsa a una columna y la cabecera deja de ser sticky.
 */
export const Chapter: React.FC<ChapterProps> = ({ id, eyebrow, mark, title, lead, flip, badge, children }) => (
    <section id={id} className={`cw-chapter ${flip ? 'is-flip' : ''}`} aria-labelledby={`${id}-t`}>
        {mark && (
            <span className="cw-watermark" aria-hidden="true">
                {mark}
            </span>
        )}
        <div className="cw-wrap cw-chapter-grid">
            <header className="cw-chapter-head">
                <Reveal>
                    <div className="cw-chapter-n cw-mono">
                        {eyebrow}
                        {badge && <span className="cw-tag-new">{badge}</span>}
                    </div>
                </Reveal>
                <SplitReveal as="h2" id={`${id}-t`} className="cw-display cw-h2">
                    {title}
                </SplitReveal>
                {lead && <TextReveal as="p" className="cw-lead" preset="word-blur">{lead}</TextReveal>}
            </header>
            <div className="cw-chapter-body">{children}</div>
        </div>
    </section>
);

export default Chapter;
