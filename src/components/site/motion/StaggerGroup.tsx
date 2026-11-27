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
    className?: string;
};

/**
 * Anima los hijos directos entrando escalonados (opacity + translateY) al entrar
 * en viewport. reduced-motion → estado final, sin animación.
 */
export const StaggerGroup: React.FC<StaggerGroupProps> = ({
    children, step = STAGGER, dur = DUR.base, from = 'up', glide = false, className,
}) => {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const items = Array.from(el.children) as HTMLElement[];
        if (!items.length) return;
        if (prefersReducedMotion()) { gsap.set(items, { autoAlpha: 1, y: 0 }); return; }
        const yFrom = from === 'up' ? 24 : -24;
        const ctx = gsap.context(() => {
            gsap.set(items, { autoAlpha: 0, y: yFrom });
            gsap.to(items, {
                autoAlpha: 1, y: 0, duration: glide ? DUR.slow : dur,
                ease: glide ? GSAP_EASE.expo : GSAP_EASE.cout, stagger: step,
                scrollTrigger: { trigger: el, start: 'top 82%', once: true },
            });
        }, el);
        return () => ctx.revert();
    }, []);
    return <div ref={ref} className={className}>{children}</div>;
};

export default StaggerGroup;
