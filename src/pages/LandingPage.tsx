import React, { useRef, useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
    MessageCircle,
    Globe,
    Smartphone,
    Code2,
    Brain,
    Palette,
    ArrowRight,
    Mail,
    ExternalLink,
} from 'lucide-react';
import { ContactForm } from '../components/ui/ContactForm';
import { ContactModal } from '../components/ui/ContactModal';
import MagneticButton from '../components/ui/MagneticButton';
import CustomCursor from '../components/systems/CustomCursor';
import Preloader from '../components/systems/Preloader';
import WebGLCanvas from '../components/canvas/WebGLCanvas';
import FloatingLines from '../components/backgrounds/FloatingLines';
import ShowroomSection from '../components/landing/ShowroomSection';
import RocketProcess from '../components/landing/RocketProcess';

import logo from '../assets/creapp-logo.png';

gsap.registerPlugin(ScrollTrigger);

// ── Services Data ──────────────────────────────────
const SERVICES = [
    {
        title: 'Desarrollo Móvil',
        desc: 'Apps nativas y multiplataforma con rendimiento de primer nivel y UX excepcional.',
        icon: Smartphone,
        accent: '#00F0FF',
    },
    {
        title: 'Plataformas Web',
        desc: 'Aplicaciones web escalables y de alto rendimiento construidas para el crecimiento.',
        icon: Globe,
        accent: '#8B5CF6',
    },
    {
        title: 'Software a Medida',
        desc: 'Soluciones empresariales personalizadas, integraciones de API y automatización.',
        icon: Code2,
        accent: '#EC4899',
    },
    {
        title: 'IA / Machine Learning',
        desc: 'Modelos predictivos, procesamiento de lenguaje natural y automatización inteligente.',
        icon: Brain,
        accent: '#00F0FF',
    },
    {
        title: 'UX/UI Design',
        desc: 'Interfaces centradas en el usuario que combinan estética premium con usabilidad excepcional.',
        icon: Palette,
        accent: '#8B5CF6',
    },
];

// MARQUEE_TEXT removed — replaced by ShowroomSection and RocketProcess

// ── Landing Page ───────────────────────────────────
const LandingPage: React.FC = () => {
    const [showPreloader, setShowPreloader] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Refs shared between DOM and Canvas
    const scrollProgress = useRef(0);

    // DOM section refs
    const mainRef = useRef<HTMLDivElement>(null);
    const heroRef = useRef<HTMLElement>(null);
    const heroTitleRef = useRef<HTMLHeadingElement>(null);
    const heroSubRef = useRef<HTMLParagraphElement>(null);
    const heroCTARef = useRef<HTMLDivElement>(null);
    const footerRef = useRef<HTMLElement>(null);
    const navRef = useRef<HTMLElement>(null);

    // ── Preloader Complete ───────────────────────────
    const handlePreloaderComplete = useCallback(() => {
        setShowPreloader(false);

        // Start hero elements hidden
        const heroEls = [navRef.current, heroTitleRef.current, heroSubRef.current, heroCTARef.current].filter(Boolean);
        gsap.set(heroEls, { opacity: 0, y: 40, filter: 'blur(8px)' });

        // Entrance animation
        gsap.to(heroEls, {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            stagger: 0.15,
            duration: 1.2,
            ease: 'power3.out',
            delay: 0.3,
        });
    }, []);

    // ── GSAP ScrollTrigger Setup ─────────────────────
    useEffect(() => {
        if (showPreloader) return;

        // Delay ScrollTrigger setup to let entrance animation finish
        const setupTimer = setTimeout(() => {
            const ctx = gsap.context(() => {
                // Track overall scroll progress for 3D scene
                ScrollTrigger.create({
                    trigger: mainRef.current,
                    start: 'top top',
                    end: 'bottom bottom',
                    onUpdate: (self) => {
                        scrollProgress.current = self.progress;
                    },
                });

                // Nav scroll detection
                ScrollTrigger.create({
                    trigger: mainRef.current,
                    start: '50px top',
                    onEnter: () => setScrolled(true),
                    onLeaveBack: () => setScrolled(false),
                });

                // Hero fade out on scroll — immediateRender:false prevents capturing opacity:0
                gsap.to([heroTitleRef.current, heroSubRef.current, heroCTARef.current], {
                    scrollTrigger: {
                        trigger: heroRef.current,
                        start: 'top top',
                        end: '40% top',
                        scrub: 1,
                    },
                    y: -60,
                    opacity: 0,
                    filter: 'blur(6px)',
                    stagger: 0.05,
                    immediateRender: false,
                });

                // Footer reveal
                gsap.from(footerRef.current, {
                    scrollTrigger: {
                        trigger: footerRef.current,
                        start: 'top 80%',
                        end: 'top 40%',
                        scrub: 1,
                    },
                    y: 80,
                    opacity: 0,
                });
            }, mainRef);

            ctxRef = ctx;
        }, 1500); // Wait for entrance animation to finish

        let ctxRef: gsap.Context | null = null;

        return () => {
            clearTimeout(setupTimer);
            ctxRef?.revert();
        };
    }, [showPreloader]);

    return (
        <>
            {/* Custom cursor (desktop only) */}
            <CustomCursor />

            {/* Preloader */}
            <AnimatePresence>
                {showPreloader && (
                    <Preloader onComplete={handlePreloaderComplete} />
                )}
            </AnimatePresence>

            {/* Fixed 3D Canvas background */}
            <WebGLCanvas scrollProgress={scrollProgress} />

            {/* Floating Lines background effect — deferred to avoid dual WebGL context crash */}
            {!showPreloader && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.35 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                    className="fixed inset-0 pointer-events-none"
                    style={{ zIndex: 0 }}
                >
                    <FloatingLines
                        linesGradient={['#FF2D78', '#9B30FF', '#EC4899', '#FF2D78']}
                        enabledWaves={['middle', 'bottom']}
                        lineCount={[8, 6]}
                        lineDistance={[4, 3]}
                        animationSpeed={0.6}
                        interactive={true}
                        bendRadius={6}
                        bendStrength={-0.4}
                        parallax={true}
                        parallaxStrength={0.15}
                        mixBlendMode="screen"
                    />
                </motion.div>
            )}

            {/* ═══════════════ DOM LAYER ═══════════════ */}
            <div ref={mainRef} className="relative z-10">
                {/* ── Navigation ── */}
                <nav
                    ref={navRef}
                    className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl transition-all duration-500 opacity-0"
                    style={{
                        paddingTop: scrolled ? '1rem' : '1.5rem',
                        paddingBottom: scrolled ? '1rem' : '1.5rem',
                        backgroundColor: scrolled ? 'rgba(5,5,5,0.3)' : 'rgba(5,5,5,0)',
                        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                    }}
                >
                    <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                            <img
                                src={logo}
                                alt="CreAPP"
                                className="w-12 h-12 object-contain"
                            />
                            <span className="font-display font-bold text-2xl tracking-tighter">
                                creapp
                            </span>
                        </div>

                        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
                            {['Servicios', 'Nosotros', 'Contacto'].map((label) => (
                                <a
                                    key={label}
                                    href={`#${label.toLowerCase()}`}
                                    className="relative px-3 py-2 hover:text-white transition-colors duration-300 group"
                                    data-cursor-hover
                                >
                                    {label}
                                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-cyan-electric group-hover:w-full transition-all duration-300" />
                                </a>
                            ))}

                            <MagneticButton
                                onClick={() => setIsModalOpen(true)}
                                className="relative px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-electric/20 to-purple-digital/20 border border-cyan-electric/30 text-white text-sm font-medium hover:border-cyan-electric/60 transition-all duration-300 overflow-hidden group"
                            >
                                <span className="relative z-10">Hablemos</span>
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-electric/10 to-purple-digital/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </MagneticButton>
                        </div>
                    </div>
                </nav>

                {/* ── HERO SECTION (0%) ── */}
                <section
                    ref={heroRef}
                    className="relative min-h-screen flex items-center justify-center px-6"
                >
                    <div className="max-w-5xl mx-auto text-center">
                        <h1
                            ref={heroTitleRef}
                            className="font-display text-[clamp(3rem,10vw,8rem)] font-bold leading-tight tracking-tighter mb-8 opacity-0 translate-y-10 blur-sm"
                        >
                            <span className="block text-white">Soluciones</span>
                            <span className="block text-gradient-cyan pb-3">Digitales</span>
                            <span className="block text-[clamp(1.5rem,5vw,4rem)] text-slate-300 font-light tracking-tight mt-4">
                                que se ajustan a vos.
                            </span>
                        </h1>

                        <p
                            ref={heroSubRef}
                            className="text-slate-400 text-lg md:text-xl max-w-xl mx-auto mb-12 leading-relaxed opacity-0 translate-y-10 blur-sm"
                        >
                            Desarrollamos software y aplicaciones a medida para negocios que
                            quieren escalar.
                        </p>

                        <div ref={heroCTARef} className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 translate-y-10 blur-sm">
                            <MagneticButton
                                onClick={() => setIsModalOpen(true)}
                                className="px-10 py-4 rounded-full bg-gradient-to-r from-cyan-electric to-purple-digital text-black font-bold text-lg shadow-[0_0_40px_rgba(0,240,255,0.3)] hover:shadow-[0_0_60px_rgba(0,240,255,0.5)] transition-all duration-300"
                            >
                                Contactanos
                                <MessageCircle className="w-5 h-5" />
                            </MagneticButton>

                            <MagneticButton
                                onClick={() =>
                                    document
                                        .getElementById('servicios')
                                        ?.scrollIntoView({ behavior: 'smooth' })
                                }
                                className="px-10 py-4 rounded-full border border-white/10 text-white font-medium text-lg hover:bg-white/5 hover:border-white/20 transition-all duration-300 backdrop-blur-sm"
                            >
                                Explorar
                                <ArrowRight className="w-5 h-5" />
                            </MagneticButton>
                        </div>
                    </div>

                    {/* Scroll indicator */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500">
                        <span className="text-xs tracking-[0.3em] uppercase">Scroll</span>
                        <div className="w-[1px] h-8 bg-gradient-to-b from-cyan-electric/60 to-transparent animate-pulse" />
                    </div>
                </section>

                {/* ── SHOWROOM — Interactive Phone Mockup ── */}
                <ShowroomSection />

                {/* ── ROCKET PROCESS — Cómo Trabajamos ── */}
                <RocketProcess />

                {/* ── FOOTER / CTA SECTION (75-100%) ── */}
                <section
                    ref={footerRef}
                    id="contacto"
                    className="min-h-screen flex flex-col justify-center px-6 relative"
                >
                    <div className="max-w-4xl mx-auto glass-card rounded-[2.5rem] p-8 md:p-16 relative overflow-hidden w-full">
                        {/* Background glows */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-electric/10 blur-[120px] rounded-full pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-digital/10 blur-[120px] rounded-full pointer-events-none" />

                        <div className="text-center mb-12 relative z-10">
                            <h2 className="font-display text-4xl md:text-6xl font-bold mb-4">
                                ¿Listo para{' '}
                                <span className="text-gradient-cyan">innovar</span>?
                            </h2>
                            <p className="text-slate-400 text-lg">
                                Envianos un mensaje, generalmente contestamos en las próximas 2
                                horas.
                            </p>
                        </div>

                        <div className="max-w-lg mx-auto relative z-10 bg-transparent">
                            <ContactForm />
                        </div>

                        {/* Social links & info */}
                        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                            <div className="flex items-center gap-6 text-slate-400 text-sm">
                                <a
                                    href="mailto:creapp.ar@gmail.com"
                                    className="hover:text-white transition-colors flex items-center gap-2"
                                    data-cursor-hover
                                >
                                    <Mail size={14} /> creapp.ar@gmail.com
                                </a>
                                <span className="flex items-center gap-2">
                                    <Globe size={14} /> Buenos Aires, Argentina
                                </span>
                            </div>

                            <div className="flex gap-3">
                                {[
                                    { label: 'Instagram', href: 'https://instagram.com/creapp.ar' },
                                    { label: 'LinkedIn', href: 'https://linkedin.com/company/creapp' },
                                    { label: 'GitHub', href: 'https://github.com/creapp' },
                                ].map((social) => (
                                    <a
                                        key={social.label}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-cyan-electric/10 hover:border-cyan-electric/30 border border-transparent hover:scale-110 transition-all text-slate-400 hover:text-cyan-electric"
                                        data-cursor-hover
                                        title={social.label}
                                    >
                                        <ExternalLink size={16} />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer bottom */}
                    <footer className="py-8 text-center text-slate-600 text-xs mt-8">
                        <p>
                            © 2026 CreAPP Soluciones y Desarrollos Tecnológicos. Todos los
                            derechos reservados.
                        </p>
                    </footer>
                </section>
            </div>

            {/* Contact Modal */}
            <ContactModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
};

export default LandingPage;
