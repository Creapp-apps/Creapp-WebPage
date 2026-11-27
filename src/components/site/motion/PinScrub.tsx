import React, { useLayoutEffect, useRef } from 'react';
import { ScrollTrigger, gsap, isTouch, prefersReducedMotion } from './runtime';

type PinScrubProps = {
    children: React.ReactNode;
    /** Múltiplo de viewport que dura el pin. Default 1.4. */
    length?: number;
    /** Progreso 0..1 durante el scrub (o 1 una vez en touch/reduced-motion). */
    onProgress?: (p: number) => void;
    className?: string;
};

/**
 * Clava la sección y entrega progreso 0..1 mientras scrolleás (scrub). En touch o
 * reduced-motion NO pinea: renderiza normal y llama onProgress(1) al entrar.
 * ctx.revert() mata el ScrollTrigger y su pin-spacer al desmontar (SPA-safe).
 */
export const PinScrub: React.FC<PinScrubProps> = ({ children, length = 1.4, onProgress, className }) => {
    const ref = useRef<HTMLDivElement>(null);
    const cb = useRef(onProgress);
    cb.current = onProgress;
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (prefersReducedMotion() || isTouch()) { cb.current?.(1); return; }
        const ctx = gsap.context(() => {
            ScrollTrigger.create({
                trigger: el,
                start: 'top top',
                end: () => `+=${window.innerHeight * length}`,
                pin: true,
                scrub: true,
                anticipatePin: 1,
                onUpdate: (self) => cb.current?.(self.progress),
            });
        }, el);
        return () => ctx.revert();
    }, [length]);
    return <div ref={ref} className={className}>{children}</div>;
};

export default PinScrub;
