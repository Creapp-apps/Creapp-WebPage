import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Lightbulb, Palette, Code2, Rocket } from 'lucide-react';

import rocketLogo from '../../assets/creapp-logo.png';

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
    {
        num: '01',
        title: 'Descubrimiento',
        desc: 'Entendemos tu visión, analizamos el mercado y diseñamos la estrategia ideal para tu producto.',
        icon: Lightbulb,
        accent: '#FF2D78',
    },
    {
        num: '02',
        title: 'Diseño',
        desc: 'Prototipos interactivos, design system personalizado y UX validada antes de escribir una línea de código.',
        icon: Palette,
        accent: '#8B5CF6',
    },
    {
        num: '03',
        title: 'Desarrollo',
        desc: 'Código de producción con CI/CD, testing automatizado y arquitectura escalable desde el día uno.',
        icon: Code2,
        accent: '#EC4899',
    },
    {
        num: '04',
        title: 'Lanzamiento',
        desc: 'Deploy en producción, monitoreo en tiempo real y soporte continuo para escalar tu producto.',
        icon: Rocket,
        accent: '#FF2D78',
    },
];

const RocketProcess: React.FC = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const rocketRef = useRef<HTMLDivElement>(null);
    const trailRef = useRef<HTMLDivElement>(null);
    const stepsRef = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (!sectionRef.current || !rocketRef.current) return;

        // Start all cards hidden
        stepsRef.current.forEach((step) => {
            if (step) gsap.set(step, { opacity: 0, x: 0, scale: 0.9, filter: 'blur(8px)' });
        });

        const ctx = gsap.context(() => {
            // Single ScrollTrigger with onUpdate controlling everything via progress
            ScrollTrigger.create({
                trigger: sectionRef.current,
                start: 'top top',
                end: '+=250%',
                pin: true,
                anticipatePin: 1,
                onUpdate: (self) => {
                    const p = self.progress; // 0 → 1

                    // ─── Fade out scroll indicator ───
                    const indicator = sectionRef.current?.querySelector('.scroll-indicator') as HTMLElement | null;
                    if (indicator) {
                        indicator.style.opacity = `${Math.max(0, 1 - p * 20)}`;
                    }

                    // ─── Rocket ascent ───
                    if (rocketRef.current) {
                        const rocketY = -p * 420;
                        const rocketScale = 1 - p * 0.3;
                        const glowIntensity = Math.round(p * 50);
                        rocketRef.current.style.transform = `translateY(${rocketY}px) scale(${rocketScale})`;
                        rocketRef.current.style.filter = `drop-shadow(0 0 ${glowIntensity}px rgba(0, 240, 255, 0.5))`;
                    }

                    // ─── Trail grows ───
                    if (trailRef.current) {
                        trailRef.current.style.height = `${p * 420}px`;
                        trailRef.current.style.opacity = `${Math.min(p * 3, 1)}`;
                    }

                    // ─── Cards reveal at progress thresholds ───
                    // Card 0: 10-25%, Card 1: 25-45%, Card 2: 45-65%, Card 3: 65-85%
                    const thresholds = [0.1, 0.3, 0.5, 0.7];

                    stepsRef.current.forEach((step, i) => {
                        if (!step) return;
                        const start = thresholds[i];
                        const fadeIn = 0.12; // how much progress for full reveal
                        const localP = Math.max(0, Math.min(1, (p - start) / fadeIn));

                        step.style.opacity = `${localP}`;
                        step.style.transform = `scale(${0.9 + localP * 0.1})`;
                        step.style.filter = `blur(${(1 - localP) * 8}px)`;
                    });
                },
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={sectionRef}
            className="relative h-screen overflow-hidden z-20 mt-32"
        >
            {/* Section header */}
            <div className="absolute top-8 left-0 right-0 text-center z-10 px-6">
                <p className="text-cyan-electric text-xs tracking-[0.3em] uppercase mb-3">
                    El Proceso
                </p>
                <h2 className="font-display text-3xl md:text-5xl font-bold text-white">
                    Cómo <span className="text-gradient-cyan">Trabajamos</span>
                </h2>
                <p className="text-slate-500 text-sm md:text-base mt-4 max-w-md mx-auto leading-relaxed">
                    4 etapas que transforman tu idea en un producto digital de alto impacto.
                </p>
            </div>

            {/* Scroll indicator — fades out on scroll */}
            <div
                ref={(el) => { if (el) (el as any).__scrollIndicator = true; }}
                className="absolute top-[45%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-10 transition-opacity duration-500 scroll-indicator"
            >
                <span className="text-[10px] text-slate-600 uppercase tracking-[0.25em] font-medium">
                    Scroll para explorar
                </span>
                <div className="w-5 h-8 rounded-full border border-white/10 flex justify-center pt-1.5">
                    <div className="w-1 h-2 bg-cyan-electric/40 rounded-full animate-bounce" style={{ animationDuration: '1.5s' }} />
                </div>
            </div>

            {/* Center rocket column */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[12%] flex flex-col items-center z-10">

                {/* Orbit rings — ambient decoration around the rocket */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none">
                    <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border border-white/[0.03] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" style={{ animationDuration: '20s' }} />
                    <div className="w-48 h-48 md:w-56 md:h-56 rounded-full border border-white/[0.02] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" style={{ animationDuration: '30s', animationDirection: 'reverse' }} />
                </div>

                {/* Trail */}
                <div
                    ref={trailRef}
                    className="w-[2px] origin-bottom"
                    style={{
                        background:
                            'linear-gradient(to top, rgba(0,240,255,0.5), rgba(139,92,246,0.3), transparent)',
                        filter: 'blur(1px)',
                        height: 0,
                        opacity: 0,
                    }}
                />

                {/* Rocket (CreAPP logo) */}
                <div
                    ref={rocketRef}
                    className="relative"
                    style={{
                        filter: 'drop-shadow(0 0 20px rgba(0, 240, 255, 0.3))',
                    }}
                >
                    <img
                        src={rocketLogo}
                        alt="CreAPP Rocket"
                        className="w-16 h-16 md:w-20 md:h-20 object-contain relative z-10"
                    />

                    {/* 🚀 ENGINE FIRE IGNITION SYSTEM 🚀 */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        {/* Core intense plasma */}
                        <div className="absolute top-0 w-4 h-10 bg-white blur-[4px] rounded-full opacity-90 animate-pulse" style={{ animationDuration: '0.5s' }} />

                        {/* Main thruster flame (Pink/Purple) */}
                        <div className="absolute top-2 w-10 h-20 bg-gradient-to-b from-cyan-electric via-purple-digital to-transparent blur-xl rounded-full opacity-80 animate-pulse" />

                        {/* Trailing sparks */}
                        <div className="relative top-4 flex justify-center gap-[3px] w-12">
                            <div className="w-[3px] h-[12px] bg-white rounded-full opacity-0" style={{ animation: 'spark-fall 0.6s ease-out infinite 0.1s' }} />
                            <div className="w-[4px] h-[16px] bg-cyan-electric rounded-full opacity-0" style={{ animation: 'spark-fall 0.8s ease-out infinite 0.3s' }} />
                            <div className="w-[2px] h-[10px] bg-white rounded-full opacity-0" style={{ animation: 'spark-fall 0.5s ease-out infinite 0.5s' }} />
                            <div className="w-[4px] h-[14px] bg-purple-digital rounded-full opacity-0" style={{ animation: 'spark-fall 0.7s ease-out infinite 0.2s' }} />
                            <div className="w-[3px] h-[8px] bg-cyan-electric rounded-full opacity-0" style={{ animation: 'spark-fall 0.9s ease-out infinite 0.4s' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Step cards — positioned absolutely, two per side */}
            <div className="absolute inset-0 pointer-events-none z-20">
                {STEPS.map((step, i) => {
                    const isLeft = i % 2 === 0;
                    // Vertical position: stagger cards down the viewport
                    const topPercent = 18 + i * 18;

                    return (
                        <div
                            key={step.num}
                            ref={(el) => { stepsRef.current[i] = el; }}
                            className={`absolute pointer-events-auto ${isLeft
                                ? 'left-4 md:left-[20%]'
                                : 'right-4 md:right-[20%]'
                                }`}
                            style={{
                                top: `${topPercent}%`,
                                width: 'min(320px, 42vw)',
                                opacity: 0,
                            }}
                        >
                            <div
                                className="rounded-2xl p-5 md:p-6 relative overflow-hidden border border-white/8"
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    backdropFilter: 'blur(16px)',
                                }}
                            >
                                {/* Accent bar */}
                                <div
                                    className="absolute top-0 left-0 w-full h-[2px]"
                                    style={{
                                        background: `linear-gradient(90deg, transparent, ${step.accent}, transparent)`,
                                    }}
                                />

                                <div className="flex items-start gap-3 md:gap-4">
                                    <div
                                        className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                                        style={{
                                            background: `${step.accent}15`,
                                            color: step.accent,
                                        }}
                                    >
                                        <step.icon size={18} />
                                    </div>

                                    <div>
                                        <span
                                            className="text-[10px] font-mono tracking-wider block mb-1"
                                            style={{ color: step.accent }}
                                        >
                                            {step.num}
                                        </span>
                                        <h3 className="text-base md:text-lg font-bold font-display text-white mb-1.5">
                                            {step.title}
                                        </h3>
                                        <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                                            {step.desc}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Background particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 15 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 rounded-full bg-cyan-electric/15 animate-pulse"
                        style={{
                            left: `${10 + Math.random() * 80}%`,
                            top: `${10 + Math.random() * 80}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 3}s`,
                        }}
                    />
                ))}
            </div>
        </section>
    );
};

export default RocketProcess;
