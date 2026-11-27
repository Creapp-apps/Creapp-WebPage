import React, { useLayoutEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from './runtime';
import { DUR, GSAP_EASE } from './tokens';
import './motion.css';

type MaskRevealProps = {
    children: React.ReactNode;
    /** Etiqueta del wrapper (el que recorta). Default 'div'. */
    as?: keyof React.JSX.IntrinsicElements;
    delay?: number; // s
    dur?: number; // s
    /** Offset inicial del inner (gsap y). Default '100%' (una altura hacia abajo). */
    y?: string;
    once?: boolean;
    className?: string;
};

/**
 * Revelado con máscara: el `children` entra deslizándose desde detrás del borde
 * recortado del wrapper (`overflow:hidden`), disparado al entrar en viewport.
 * reduced-motion → estado final visible, sin animación.
 */
export const MaskReveal: React.FC<MaskRevealProps> = ({
    children, as = 'div', delay = 0, dur = DUR.slow, y = '100%', once = true, className,
}) => {
    const wrapRef = useRef<HTMLElement>(null);
    useLayoutEffect(() => {
        const wrap = wrapRef.current;
        const inner = wrap?.firstElementChild as HTMLElement | null;
        if (!wrap || !inner) return;
        if (prefersReducedMotion()) { gsap.set(inner, { y: 0 }); return; }
        const ctx = gsap.context(() => {
            gsap.fromTo(inner, { y }, {
                y: 0, duration: dur, delay, ease: GSAP_EASE.cout,
                scrollTrigger: { trigger: wrap, start: 'top 85%', once },
            });
        }, wrap);
        return () => ctx.revert();
    }, []);
    return React.createElement(
        as as string,
        { ref: wrapRef, className: `cw-mask${className ? ` ${className}` : ''}` },
        React.createElement('div', { className: 'cw-mask-in' }, children),
    );
};

export default MaskReveal;
