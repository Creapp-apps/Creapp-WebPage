// Runtime de motion: registro de ScrollTrigger + guards (reduced-motion, touch) +
// helpers de refresh. Nada corre en import salvo el registro del plugin.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isTouch(): boolean {
    return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

export function refreshScrollTriggers(): void {
    ScrollTrigger.refresh();
}

/**
 * Llama `cb` cuando las fuentes cargaron y el layout se estabilizó (2 rAF después),
 * para refrescar triggers cuando cambian las alturas. Devuelve un cleanup.
 */
export function onFontsAndLayoutReady(cb: () => void): () => void {
    let cancelled = false;
    let raf1 = 0;
    let raf2 = 0;
    const ready = typeof document !== 'undefined' && 'fonts' in document ? document.fonts.ready : Promise.resolve();
    ready.then(() => {
        if (cancelled) return;
        raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => {
                if (!cancelled) cb();
            });
        });
    });
    return () => {
        cancelled = true;
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
    };
}
