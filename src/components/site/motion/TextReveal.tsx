import React from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { bezier } from './pageTransition';
import { EASE } from './tokens';

/**
 * Reveals de texto para subtítulos/bajadas (string plano). Presets VARIADOS para
 * no caer en monotonía entre secciones contiguas. Adaptado del patrón 21st.dev a
 * framer-motion (ya instalado) + tokens del sistema + disparo al entrar en viewport.
 * reduced-motion → texto completo, sin animación.
 */
export type RevealPreset = 'typewriter' | 'type-word' | 'word-blur' | 'line-slow' | 'fade';
type Per = 'word' | 'char' | 'line';

const EASE_ARR = bezier(EASE.cout);

const PER: Record<RevealPreset, Per> = {
    typewriter: 'char',
    'type-word': 'word',
    'word-blur': 'word',
    'line-slow': 'line',
    fade: 'word',
};
const STEP: Record<RevealPreset, number> = {
    typewriter: 0.022,
    'type-word': 0.045,
    'word-blur': 0.05,
    'line-slow': 0.12,
    fade: 0.04,
};
const ITEM: Record<RevealPreset, { hidden: Variants[string]; visible: Variants[string]; dur: number }> = {
    typewriter: { hidden: { opacity: 0 }, visible: { opacity: 1 }, dur: 0.01 },
    'type-word': { hidden: { opacity: 0 }, visible: { opacity: 1 }, dur: 0.01 },
    'word-blur': { hidden: { opacity: 0, filter: 'blur(8px)', y: 8 }, visible: { opacity: 1, filter: 'blur(0px)', y: 0 }, dur: 0.5 },
    'line-slow': { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 }, dur: 0.7 },
    fade: { hidden: { opacity: 0 }, visible: { opacity: 1 }, dur: 0.4 },
};

function splitText(text: string, per: Per): string[] {
    if (per === 'line') return text.split('\n');
    if (per === 'char') return text.split('');
    return text.split(/(\s+)/);
}

export type TextRevealProps = {
    children: string;
    preset?: RevealPreset;
    as?: keyof React.JSX.IntrinsicElements;
    className?: string;
    delay?: number;
    once?: boolean;
    style?: React.CSSProperties;
};

export const TextReveal: React.FC<TextRevealProps> = ({
    children, preset = 'word-blur', as = 'p', className, delay = 0, once = true, style,
}) => {
    const reduce = useReducedMotion();
    if (reduce) return React.createElement(as as string, { className, style }, children);

    const per = PER[preset];
    const item = ITEM[preset];
    const segs = splitText(children, per);
    const MotionTag = motion[as as 'p'] as typeof motion.p;

    const container: Variants = {
        hidden: {},
        visible: { transition: { delayChildren: delay, staggerChildren: STEP[preset] } },
    };
    const itemVars: Variants = {
        hidden: item.hidden,
        visible: { ...item.visible, transition: { duration: item.dur, ease: EASE_ARR } },
    };

    return (
        <MotionTag
            className={className}
            style={style}
            variants={container}
            initial="hidden"
            whileInView="visible"
            viewport={{ once, margin: '0px 0px -10% 0px' }}
            aria-label={children}
        >
            {segs.map((s, i) => (
                <motion.span
                    key={i}
                    aria-hidden="true"
                    variants={itemVars}
                    style={{ display: per === 'line' ? 'block' : 'inline-block', whiteSpace: 'pre' }}
                >
                    {s}
                </motion.span>
            ))}
        </MotionTag>
    );
};

export default TextReveal;
