import React, { useLayoutEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from './runtime';
import { DUR, GSAP_EASE, STAGGER } from './tokens';

type StaggerGroupProps = {
    children: React.ReactNode;
    step?: number; // s entre ítems
    dur?: number; // s
    from?: 'up' | 'down';
    /** Entrada estilo "glide-then-settle" (expo) para cards. */
    glide?: boolean;
    /** Si se pasa, los ítems entran deslizando lateral desde x (px) en vez de vertical. */
    x?: number;
    /** Etiqueta del contenedor (p. ej. 'ul' / 'ol' para listas). Default 'div'. */
    as?: keyof React.JSX.IntrinsicElements;
    className?: string;
};

/**
 * Anima los hijos directos entrando escalonados (opacity + translate) al entrar en
 * viewport. Vertical por default; lateral si se pasa `x`. Con `as` puede ser la propia
 * lista (ul/ol) para escalonar sus <li>. reduced-motion → estado final, sin animación.
 */
export const StaggerGroup: React.FC<StaggerGroupProps> = ({
    children, step = STAGGER, dur = DUR.base, from = 'up', glide = false, x, as = 'div', className,
}) => {
    const ref = useRef<HTMLElement>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const items = Array.from(el.children) as HTMLElement[];
        if (!items.length) return;
        if (prefersReducedMotion()) { gsap.set(items, { autoAlpha: 1, x: 0, y: 0 }); return; }
        const lateral = typeof x === 'number';
        const fromVars = lateral ? { x } : { y: from === 'up' ? 24 : -24 };
        const ctx = gsap.context(() => {
            gsap.set(items, { autoAlpha: 0, ...fromVars });
            gsap.to(items, {
                autoAlpha: 1, x: 0, y: 0, duration: glide ? DUR.slow : dur,
                ease: glide ? GSAP_EASE.expo : GSAP_EASE.cout, stagger: step,
                scrollTrigger: { trigger: el, start: 'top 82%', once: true },
            });
        }, el);
        return () => ctx.revert();
    }, []);
    return React.createElement(as as string, { ref, className }, children);
};

export default StaggerGroup;
