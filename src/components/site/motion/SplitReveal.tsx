import React, { useLayoutEffect, useRef } from 'react';
import { SplitText } from 'gsap/SplitText';
import { gsap, prefersReducedMotion } from './runtime';
import { DUR, GSAP_EASE, STAGGER } from './tokens';

gsap.registerPlugin(SplitText);

type SplitRevealProps = {
    children: React.ReactNode;
    as?: keyof React.JSX.IntrinsicElements;
    /** Unidad del reveal. 'lines' preserva mejor los <span cw-accent> internos. */
    per?: 'lines' | 'words';
    className?: string;
    id?: string;
};

/**
 * Revelado del título al entrar en viewport: SplitText divide en líneas (o palabras)
 * y las desliza desde detrás de una máscara recortada, escalonadas, con los tokens del
 * sistema. Opera sobre el DOM renderizado → preserva los <span class="cw-accent">
 * (shimmer) internos, igual que el hero. reduced-motion → visible sin animación.
 */
export const SplitReveal: React.FC<SplitRevealProps> = ({ children, as = 'h2', per = 'lines', className, id }) => {
    const ref = useRef<HTMLElement>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || prefersReducedMotion()) return;
        let split: SplitText | null = null;
        const ctx = gsap.context(() => {
            split = SplitText.create(el, {
                type: per,
                mask: per,
                linesClass: 'cw-reveal-line',
                wordsClass: 'cw-reveal-word',
            });
            const targets = (per === 'lines' ? split.lines : split.words) as HTMLElement[];
            gsap.set(targets, { yPercent: 115 });
            gsap.to(targets, {
                yPercent: 0,
                duration: DUR.slow,
                ease: GSAP_EASE.cout,
                stagger: STAGGER,
                scrollTrigger: { trigger: el, start: 'top 85%', once: true },
            });
        }, el);
        return () => {
            ctx.revert();
            split?.revert();
        };
    }, [per]);
    return React.createElement(as as string, { ref, className, id }, children);
};

export default SplitReveal;
