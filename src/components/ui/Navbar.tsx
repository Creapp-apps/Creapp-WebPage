import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sparkles, MessageSquare, ArrowRight } from 'lucide-react';
import logo from '../../assets/creapp-logo.png';
import MagneticButton from './MagneticButton';

interface NavbarProps {
    scrolled: boolean;
    onOpenContact: () => void;
    navRef?: React.RefObject<HTMLElement | null>;
}

const NAV_ITEMS = [
    { id: 'servicios', label: 'Servicios' },
    { id: 'proceso', label: 'Proceso' },
    { id: 'showroom', label: 'Proyectos' },
    { id: 'nosotros', label: 'Nosotros' },
    { id: 'contacto', label: 'Contacto' },
];

export const Navbar: React.FC<NavbarProps> = ({ scrolled, onOpenContact, navRef }) => {
    const [activeSection, setActiveSection] = useState('servicios');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Track active section based on scroll position
    useEffect(() => {
        const handleScroll = () => {
            const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(Boolean);
            const scrollPosition = window.scrollY + 200;

            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                if (section && section.offsetTop <= scrollPosition) {
                    setActiveSection(NAV_ITEMS[i].id);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        setMobileMenuOpen(false);

        if (id === 'contacto') {
            onOpenContact();
            return;
        }

        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <header
            ref={navRef}
            className="fixed top-3 md:top-5 left-0 right-0 z-50 flex justify-center px-3 md:px-6 pointer-events-none"
        >
            {/* Outer Giant Pill Shell */}
            <motion.nav
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className={`pointer-events-auto relative w-full max-w-6xl transition-all duration-500 rounded-full border backdrop-blur-2xl flex items-center justify-between shadow-2xl ${
                    scrolled
                        ? 'py-2 px-3 md:px-5 bg-[#060814]/85 border-cyan-electric/30 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_25px_rgba(255,45,120,0.15)]'
                        : 'py-2.5 px-4 md:px-6 bg-[#060814]/60 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:border-white/20'
                }`}
            >
                {/* ── 1. BRANDING (Logo & Title) ── */}
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="flex items-center gap-2.5 group cursor-pointer"
                    data-cursor-hover
                >
                    <div className="relative flex items-center justify-center">
                        <img
                            src={logo}
                            alt="CreAPP"
                            className="w-9 h-9 md:w-10 md:h-10 object-contain transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-cyan-electric/30 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <span className="font-display font-extrabold text-xl md:text-2xl tracking-tighter text-white">
                        cre<span className="text-gradient-cyan">app</span>
                    </span>
                </a>

                {/* ── 2. CENTER NAVIGATION CAPSULE (Reference Sub-Pill Style) ── */}
                <div className="hidden lg:flex items-center bg-white/[0.03] border border-white/10 rounded-full p-1 shadow-inner backdrop-blur-md">
                    {NAV_ITEMS.map((item) => {
                        const isActive = activeSection === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => scrollToSection(item.id)}
                                className={`relative px-4 md:px-5 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 ${
                                    isActive
                                        ? 'text-white bg-gradient-to-r from-cyan-electric/25 to-purple-digital/25 border border-cyan-electric/40 shadow-[0_0_15px_rgba(255,45,120,0.25)]'
                                        : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                                }`}
                                data-cursor-hover
                            >
                                {/* Top Glow Accent Indicator Line for Active Tab (Badge Gigante Reference) */}
                                {isActive && (
                                    <motion.span
                                        layoutId="activeTabIndicator"
                                        className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-7 h-[3px] bg-gradient-to-r from-cyan-electric to-purple-digital rounded-full shadow-[0_0_10px_#FF2D78]"
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                {/* ── 3. RIGHT ACTION CTAs (Outline + Gradient Pill Buttons) ── */}
                <div className="hidden md:flex items-center gap-3">
                    {/* Secondary Action Pill Button */}
                    <button
                        onClick={() => scrollToSection('showroom')}
                        className="px-4 py-2 rounded-full border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] hover:border-cyan-electric/40 text-slate-300 hover:text-white text-xs font-semibold tracking-wide uppercase transition-all duration-300 flex items-center gap-1.5 group"
                        data-cursor-hover
                    >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-electric group-hover:rotate-12 transition-transform duration-300" />
                        <span>Ver Demos</span>
                    </button>

                    {/* Primary Highlighted CTA Pill */}
                    <MagneticButton
                        onClick={onOpenContact}
                        className="relative px-5 md:px-6 py-2 md:py-2.5 rounded-full bg-gradient-to-r from-cyan-electric to-purple-digital text-white font-bold text-xs md:text-sm tracking-wide shadow-[0_0_25px_rgba(255,45,120,0.35)] hover:shadow-[0_0_40px_rgba(255,45,120,0.6)] transition-all duration-300 overflow-hidden group border border-white/20"
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            <span>Hablemos</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                        </span>
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </MagneticButton>
                </div>

                {/* ── 4. MOBILE CONTROLS ── */}
                <div className="flex md:hidden items-center gap-2">
                    <button
                        onClick={onOpenContact}
                        className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-cyan-electric to-purple-digital text-white font-bold text-xs shadow-md"
                    >
                        Hablemos
                    </button>

                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-full border border-white/10 bg-white/5 text-slate-300 hover:text-white focus:outline-none"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </motion.nav>

            {/* ── 5. MOBILE EXPANDABLE PILL DRAWER ── */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="pointer-events-auto absolute top-full left-4 right-4 mt-2 p-4 rounded-3xl bg-[#060814]/95 border border-cyan-electric/30 backdrop-blur-2xl shadow-2xl flex flex-col gap-2 md:hidden"
                    >
                        <div className="flex flex-col gap-1">
                            {NAV_ITEMS.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollToSection(item.id)}
                                    className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-semibold tracking-wide transition-all ${
                                        activeSection === item.id
                                            ? 'bg-gradient-to-r from-cyan-electric/20 to-purple-digital/20 text-white border border-cyan-electric/30'
                                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                            <button
                                onClick={() => scrollToSection('showroom')}
                                className="w-full py-3 rounded-2xl border border-white/15 bg-white/5 text-center text-sm font-semibold text-slate-200 flex items-center justify-center gap-2"
                            >
                                <Sparkles className="w-4 h-4 text-cyan-electric" />
                                <span>Ver Demos & Proyectos</span>
                            </button>

                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    onOpenContact();
                                }}
                                className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-electric to-purple-digital text-center text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2"
                            >
                                <MessageSquare className="w-4 h-4" />
                                <span>Agendar Llamada</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Navbar;
