import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { bezier } from './pageTransition';
import { DUR, EASE } from './tokens';

/**
 * Entrada de una pieza/ilustración al entrar en viewport: fade + slide (lateral o
 * vertical) suave, con los tokens del sistema. Para que las figuras no aparezcan ya
 * "spawneadas". reduced-motion → visible sin animación. Nota: el slide es transform;
 * no envolver con esto un elemento que contenga un pin GSAP (position:fixed).
 */
export type RevealInProps = {
    children: React.ReactNode;
    /** Desplazamiento inicial (px). x = lateral, y = vertical. */
    x?: number;
    y?: number;
    delay?: number;
    className?: string;
    once?: boolean;
};

const EASE_ARR = bezier(EASE.cout);

export const RevealIn: React.FC<RevealInProps> = ({ children, x = 0, y = 28, delay = 0, className, once = true }) => {
    const reduce = useReducedMotion();
    if (reduce) return <div className={className}>{children}</div>;
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, x, y }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once, margin: '0px 0px -12% 0px' }}
            transition={{ duration: DUR.slow, ease: EASE_ARR, delay }}
        >
            {children}
        </motion.div>
    );
};

export default RevealIn;
