// Motion tokens — fuente única de easings / duraciones / stagger para el lenguaje
// de motion del sitio. Nadie hardcodea curvas sueltas: todo sale de acá.

/** Easings (strings cubic-bezier, válidos para CSS y gsap). */
export const EASE = {
    qout: 'cubic-bezier(.25,1,.5,1)', // quart out
    cout: 'cubic-bezier(.33,1,.68,1)', // cubic out
    cin: 'cubic-bezier(.32,0,.67,0)', // cubic in
    expo: 'cubic-bezier(.16,1,.3,1)', // expo out (hover/zoom)
} as const;

/**
 * Easings equivalentes para gsap (gsap no consume strings `cubic-bezier(...)` de CSS).
 * Se mapean a los power/expo built-in más cercanos a cada curva de `EASE`.
 */
export const GSAP_EASE = {
    qout: 'power3.out',
    cout: 'power2.out',
    cin: 'power2.in',
    expo: 'expo.out',
} as const;

/** Duraciones base (segundos). */
export const DUR = {
    fast: 0.35,
    base: 0.6,
    slow: 0.9,
    cinematic: 1.3,
} as const;

/** Stagger base entre ítems (segundos). */
export const STAGGER = 0.08;

/**
 * Curva "glide-then-settle" del spec (section-2-in de Embers): genera `count`
 * offsets de desplazamiento restante (fracción 0..1), para entradas que suben desde
 * abajo con un deslizamiento firme y un asentamiento exponencial.
 * Se fuerza monótona no-creciente y último = 0.
 */
export function glideSettleOffsets(count: number): number[] {
    if (count <= 1) return count === 1 ? [0] : [];
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
        const t = (i / (count - 1)) * 1.8;
        const f = t < 0.47 ? 1 - 1.506 * t : 0.293 * Math.exp(-(t - 0.47) / 0.232);
        out.push(Math.max(0, f));
    }
    // monótona no-creciente
    for (let i = 1; i < out.length; i++) if (out[i] > out[i - 1]) out[i] = out[i - 1];
    out[out.length - 1] = 0;
    return out;
}
