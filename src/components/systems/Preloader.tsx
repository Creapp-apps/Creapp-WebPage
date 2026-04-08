import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

interface PreloaderProps {
    onComplete: () => void;
}

const Preloader: React.FC<PreloaderProps> = ({ onComplete }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const counterRef = useRef<HTMLSpanElement>(null);
    const [displayProgress, setDisplayProgress] = useState(0);
    const hasCompleted = useRef(false);

    // Simulated loading counter (procedural scene — no assets to track)
    useEffect(() => {
        const target = { val: 0 };
        gsap.to(target, {
            val: 100,
            duration: 2.5,
            ease: 'power2.inOut',
            onUpdate: () => {
                setDisplayProgress(Math.round(target.val));
            },
        });
    }, []);

    // Trigger exit animation when counter reaches 100
    useEffect(() => {
        if (displayProgress >= 100 && !hasCompleted.current) {
            hasCompleted.current = true;

            const tl = gsap.timeline({
                onComplete: () => {
                    onComplete();
                },
            });

            // Counter scale up
            tl.to(counterRef.current, {
                scale: 1.2,
                duration: 0.3,
                ease: 'power2.in',
            });

            // Fade out container
            tl.to(
                containerRef.current,
                {
                    opacity: 0,
                    scale: 1.05,
                    duration: 0.8,
                    ease: 'power3.inOut',
                },
                '+=0.1'
            );
        }
    }, [displayProgress, onComplete]);

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-[200] bg-[#050505] flex items-center justify-center overflow-hidden"
        >
            {/* Counter */}
            <div className="relative z-10 flex flex-col items-center">
                <span
                    ref={counterRef}
                    className="font-display text-[clamp(6rem,20vw,14rem)] font-bold text-white leading-none tabular-nums tracking-tighter"
                    style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                    {String(displayProgress).padStart(3, '0')}
                </span>
                <div className="w-32 h-[1px] bg-white/20 mt-6 mb-4 relative overflow-hidden">
                    <div
                        className="absolute inset-y-0 left-0"
                        style={{
                            width: `${displayProgress}%`,
                            background: 'linear-gradient(90deg, #FF2D78, #9B30FF)',
                            transition: 'width 0.1s ease-out',
                            boxShadow: '0 0 20px #FF2D78',
                        }}
                    />
                </div>
                <span className="text-white/30 text-xs uppercase tracking-[0.3em] font-body">
                    Compilando shaders
                </span>
            </div>
        </div>
    );
};

export default Preloader;
