import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
    children: React.ReactNode;
    className?: string;
    spotlightColor?: string;
}

export const TiltCard: React.FC<TiltCardProps> = ({
    children,
    className = "",
    spotlightColor = "rgba(168, 85, 247, 0.15)"
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const opacity = useSpring(0); // Using spring for smooth opacity transition

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Mouse position for spotlight
    const mouseXPos = useMotionValue(0);
    const mouseYPos = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;

        const rect = ref.current.getBoundingClientRect();

        const width = rect.width;
        const height = rect.height;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;

        x.set(xPct);
        y.set(yPct);

        mouseXPos.set(mouseX);
        mouseYPos.set(mouseY);
        opacity.set(1);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
        opacity.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateY,
                rotateX,
                transformStyle: "preserve-3d",
            }}
            className={`relative transform-gpu transition-all duration-200 ease-out ${className}`}
        >
            {/* Spotlight Gradient */}
            <motion.div
                className="pointer-events-none absolute -inset-px z-0 transition duration-300 rounded-[inherit]"
                style={{
                    opacity,
                    background: useTransform(
                        [mouseXPos, mouseYPos],
                        ([x, y]) => `radial-gradient(600px circle at ${x}px ${y}px, ${spotlightColor}, transparent 40%)`
                    ),
                }}
            />



            <div style={{ transform: "translateZ(50px)" }} className="h-full relative z-10">
                {children}
            </div>
        </motion.div>
    );
};
