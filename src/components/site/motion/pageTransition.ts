// Variantes de transición ENTRE páginas (desliz lateral + fade), para framer-motion.
// Salen de los mismos tokens que el resto del motion (fuente única de curva/duración).

import { DUR, EASE } from './tokens';

/** Parsea 'cubic-bezier(a,b,c,d)' → [a,b,c,d] (framer-motion no consume el string CSS). */
export function bezier(css: string): [number, number, number, number] {
    const m = css.match(/cubic-bezier\(([^)]+)\)/);
    if (!m) throw new Error(`bezier: formato inválido: ${css}`);
    const nums = m[1].split(',').map((n) => Number(n.trim()));
    if (nums.length !== 4 || nums.some(Number.isNaN)) throw new Error(`bezier: valores inválidos: ${css}`);
    return [nums[0], nums[1], nums[2], nums[3]];
}

/** Desplazamiento lateral (px): entra desde la derecha, sale hacia la izquierda. */
export const PAGE_ENTER_X = 40;
export const PAGE_EXIT_X = -24;

type Transition = { duration: number; ease: [number, number, number, number] };
export interface PageVariants {
    initial: { opacity: number; x?: number };
    animate: { opacity: number; x?: number; transition: Transition };
    exit: { opacity: number; x?: number; transition: Transition };
}

/**
 * Variantes initial/animate/exit para el contenido de ruta. El desliz es en X
 * (nunca Y) para no alterar el cálculo vertical de GSAP ScrollTrigger.
 * reduced-motion → sin desliz, sólo fade rápido.
 */
export function pageTransitionVariants(reduced: boolean): PageVariants {
    const ease = bezier(EASE.cout);
    if (reduced) {
        const transition = { duration: DUR.fast, ease };
        return {
            initial: { opacity: 0 },
            animate: { opacity: 1, transition },
            exit: { opacity: 0, transition },
        };
    }
    const transition = { duration: DUR.base, ease };
    return {
        initial: { opacity: 0, x: PAGE_ENTER_X },
        animate: { opacity: 1, x: 0, transition },
        exit: { opacity: 0, x: PAGE_EXIT_X, transition },
    };
}
