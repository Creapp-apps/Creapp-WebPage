import React, { useLayoutEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from './runtime';

type ParallaxLayerProps = {
    children: React.ReactNode;
    /** Desplazamiento vertical relativo al atravesar el viewport (fracción de su alto). */
    speed?: number;
    /** Escala extra al atravesar (0 = sin escala). */
    scale?: number;
    className?: string;
};

/**
 * Capa con parallax: `y` (y opcional `scale`) atados al progreso del scroll con
 * `scrub`. reduced-motion → sin transform.
 */
export const ParallaxLayer: React.FC<ParallaxLayerProps> = ({ children, speed = 0.15, scale = 0, className }) => {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || prefersReducedMotion()) return;
        const ctx = gsap.context(() => {
            gsap.fromTo(el,
                { yPercent: 0, scale: 1 },
                {
                    yPercent: -speed * 100,
                    scale: scale ? 1 + scale : 1,
                    ease: 'none',
                    scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
                });
        }, el);
        return () => ctx.revert();
    }, []);
    return <div ref={ref} className={className} style={{ willChange: 'transform' }}>{children}</div>;
};

export default ParallaxLayer;
