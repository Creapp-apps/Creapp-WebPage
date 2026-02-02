import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface CounterProps {
    value: number;
    direction?: "up" | "down";
    prefix?: string;
    suffix?: string;
    className?: string;
}

export default function Counter({
    value,
    direction = "up",
    prefix = "",
    suffix = "",
    className = "",
}: CounterProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(direction === "down" ? value : 0);
    const springValue = useSpring(motionValue, {
        damping: 100,
        stiffness: 100,
    });
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    useEffect(() => {
        if (isInView) {
            motionValue.set(direction === "down" ? 0 : value);
        }
    }, [isInView, motionValue, direction, value]);

    useEffect(() => {
        springValue.on("change", (latest) => {
            if (ref.current) {
                ref.current.textContent = `${prefix}${Intl.NumberFormat("en-US").format(
                    latest.toFixed(0)
                )}${suffix}`;
            }
        });
    }, [springValue, prefix, suffix]);

    return <span ref={ref} className={className} />;
}
