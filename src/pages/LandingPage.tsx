import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
    ArrowRight,
    Globe,
    MessageCircle,
    Shield,
    Zap,
    Code2,
    Smartphone,
    ChevronDown,
    Link,
    Send,
    Mail
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ContactModal } from '../components/ui/ContactModal';
import { ContactForm } from '../components/ui/ContactForm';
import { Input } from '../components/ui/Input';
import { fadeIn, staggerContainer, slideUp } from '../lib/animations';
import Hero3D from '../components/ui/Hero3D';
import { TiltCard } from '../components/ui/TiltCard';
import { PhoneMockup } from '../components/ui/PhoneMockup';
import { CodeBackground } from '../components/ui/CodeBackground';
import { ScrollytellingProcess } from '../components/ui/ScrollytellingProcess';
import { CodeTypewriter } from '../components/ui/CodeTypewriter';
import { SplashScreen } from '../components/ui/SplashScreen';
import Counter from '../components/ui/Counter';

import logo from '../assets/creapp-logo.png';

const LandingPage: React.FC = () => {
    // Note: useScroll might need a ref to the container if we are scrolling a div instead of window.
    // However, fast solution is to let window scroll and using standard CSS snap.
    // If we lock body scroll and use a container, we need useRef.

    // For simplicity and "GSAP" feel, we stick to window scroll but enforce snap on html/body via CSS if possible, 
    // or use the container approach. 
    // Container approach is cleaner for React.

    const containerRef = React.useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ container: containerRef });
    const [scrolled, setScrolled] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            if (containerRef.current) {
                setScrolled(containerRef.current.scrollTop > 50);
            }
        };
        const el = containerRef.current;
        if (el) el.addEventListener('scroll', handleScroll);
        return () => el?.removeEventListener('scroll', handleScroll);
    }, []);

    const y1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
    const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

    return (
        // Main Container: Fixed height, scrollable, snapping
        <div ref={containerRef} className="h-screen bg-background-dark text-slate-100 font-body overflow-y-scroll overflow-x-hidden scroll-smooth selection:bg-primary/30 scrollbar-hide">
            <AnimatePresence>
                {showSplash && (
                    <SplashScreen onComplete={() => setShowSplash(false)} />
                )}
            </AnimatePresence>

            {/* Dynamic Background with 3D & Texture */}
            <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#050505]">
                {/* 3D Stars */}
                <Hero3D />

                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                {/* Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#3e3e3e00,transparent),radial-gradient(circle_at_center,transparent_0%,#000000_100%)]"></div>

                {/* Moving Color Blobs (Enhanced) */}
                <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[10s]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-secondary/15 rounded-full blur-[100px] mix-blend-screen animate-pulse duration-[15s]"></div>
                <div className="absolute top-[30%] left-[40%] w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-[12s]"></div>
            </div>

            {/* Top Gradient Overlay for Navigation Readability */}
            <div className="fixed top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-40 pointer-events-none" />

            {/* Navigation */}
            <motion.nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-surface-dark/80 backdrop-blur-md border-b border-white/5 py-4' : 'py-6'}`}
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: "circOut" }}
            >
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <div className="flex items-center gap-0">
                        <motion.div
                            whileHover={{
                                scale: 1.2,
                                rotate: 15,
                                filter: "drop-shadow(0 0 10px rgba(168,85,247,0.6))"
                            }}
                            whileTap={{ scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 300, damping: 10 }}
                            className="cursor-pointer"
                        >
                            <img src={logo} alt="CREAPP Logo" className="w-16 h-16 object-contain" />
                        </motion.div>
                        <span className="font-display font-bold text-4xl tracking-tighter -ml-1">creapp</span>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
                        {[
                            { label: 'Servicios', id: 'services' },
                            { label: 'Metodología', id: 'methodology' },
                            { label: 'Nosotros', id: 'about' }
                        ].map(({ label, id }) => (
                            <a
                                key={id}
                                href={`#${id}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="relative px-4 py-2 rounded-full hover:text-white transition-colors duration-500 group overflow-hidden"
                            >
                                <span className="relative z-10">{label}</span>
                                {/* Tech Hover Effect: Glass Pill + Glow */}
                                <span className="absolute inset-0 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out backdrop-blur-sm border border-white/10" />
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-primary blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out" />
                            </a>
                        ))}
                        <Button
                            onClick={() => setIsModalOpen(true)}
                            variant="primary"
                            size="sm"
                            className="rounded-full px-6 shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-shadow border border-white/20"
                        >
                            Hablemos
                        </Button>
                    </div>
                </div>
            </motion.nav>

            {/* Hero Section */}
            <section className="relative min-h-screen flex flex-col justify-center px-6">

                <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-12 pt-20">

                    {/* Left Content */}
                    <motion.div
                        className="md:w-1/2 text-center md:text-left z-10"
                        style={{ y: y1, opacity: opacityHero }}
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.h1
                            variants={staggerContainer}
                            initial="hidden"
                            animate="visible"
                            className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.1] mb-8 tracking-tight"
                        >
                            {/* Animated Text: Soluciones */}
                            <span className="block">
                                <motion.span
                                    className="inline-block"
                                    initial={{ y: 20, opacity: 0, filter: "blur(10px)" }}
                                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                >
                                    Soluciones
                                </motion.span>
                            </span>

                            {/* Animated Text: Digitales */}
                            <span className="block">
                                <motion.span
                                    className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-blue-500 animate-gradient-x py-2"
                                    initial={{ y: 20, opacity: 0, filter: "blur(10px)" }}
                                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                                >
                                    Digitales
                                </motion.span>
                            </span>

                            {/* Animated Text: que se ajustan a vos. */}
                            <span className="block text-4xl md:text-6xl lg:text-7xl mt-2 text-slate-200">
                                <motion.span
                                    className="inline-block"
                                    initial={{ y: 20, opacity: 0, filter: "blur(10px)" }}
                                    animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                                >
                                    que se ajustan a vos.
                                </motion.span>
                            </span>
                        </motion.h1>

                        <motion.p variants={slideUp} className="text-slate-400 text-lg md:text-xl leading-relaxed mb-12 max-w-lg mx-auto md:mx-0 font-light">
                            Desarrollamos softwares y aplicaciones a medida para tu negocio.
                        </motion.p>

                        <motion.div variants={slideUp} className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                animate={{
                                    boxShadow: ["0px 0px 0px rgba(168,85,247,0)", "0px 0px 20px rgba(168,85,247,0.5)", "0px 0px 0px rgba(168,85,247,0)"],
                                }}
                                transition={{
                                    boxShadow: {
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }
                                }}
                                className="rounded-full"
                            >
                                <Button
                                    onClick={() => setIsModalOpen(true)}
                                    size="lg"
                                    className="rounded-full px-8 text-lg shadow-[0_0_40px_-10px_rgba(168,85,247,0.5)] hover:shadow-[0_0_80px_-10px_rgba(168,85,247,1)] group transition-all duration-300 relative overflow-hidden bg-primary hover:bg-primary/90"
                                >
                                    <span className="relative z-10 flex items-center">
                                        Contactanos
                                        <MessageCircle className="ml-2 w-5 h-5 group-hover:rotate-12 transition-transform" />
                                    </span>
                                    {/* Shimmer effect */}
                                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent z-0"></div>
                                </Button>
                            </motion.div>

                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Button variant="outline" size="lg" className="rounded-full px-8 text-lg border-white/10 hover:bg-white/5 backdrop-blur-md group">
                                    <span className="group-hover:text-white transition-colors">
                                        Nuestros Trabajos
                                    </span>
                                </Button>
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    {/* Right Content (Showcase) */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="md:w-1/2 flex justify-center relative z-10"
                    >
                        {/* Animations centered behind phone */}
                        <div className="absolute inset-0 z-[-1] flex items-center justify-center pointer-events-none scale-105">
                            <CodeBackground />
                        </div>

                        <PhoneMockup appUrl="https://crop-crm.vercel.app/login" />
                    </motion.div>
                </div>


            </section>

            {/* Scroll Indicator (Fixed) */}
            <motion.div
                className="fixed bottom-10 left-1/2 -translate-x-1/2 text-slate-500 z-40 pointer-events-none"
                style={{ opacity: opacityHero }}
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
                <ChevronDown size={32} />
            </motion.div>

            {/* Services Section */}
            <section id="services" className="min-h-screen flex flex-col justify-center px-6 relative z-10">
                <div className="max-w-7xl mx-auto w-full">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                        className="mb-20 text-center md:text-left"
                    >
                        <motion.h2 variants={fadeIn} className="font-display text-4xl md:text-5xl font-bold mb-6">
                            Más que una APP. <br /> <span className="text-secondary">La solución a tus problemas operativos.</span>
                        </motion.h2>
                        <motion.p variants={fadeIn} className="text-slate-400 text-lg max-w-xl">
                            Nos especializamos en diseñar aplicaciones y softwares totalmente a medida, segun el requisito operativo del cliente
                        </motion.p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8 relative">
                        {/* Connecting Line (Circuit Pattern Background) */}
                        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent -translate-y-1/2 hidden md:block pointer-events-none" />

                        {[
                            { title: 'Desarrollo Móvil', icon: Smartphone, desc: 'Apps nativas y multiplataforma con rendimiento de primer nivel y UX excepcional.', color: 'text-primary', spotlight: 'rgba(168, 85, 247, 0.25)' },
                            { title: 'Plataformas Web', icon: Globe, desc: 'Aplicaciones web escalables y de alto rendimiento construidas para el crecimiento.', color: 'text-secondary', spotlight: 'rgba(236, 72, 153, 0.25)' },
                            { title: 'Software a Medida', icon: Code2, desc: 'Soluciones empresariales personalizadas, integraciones de API y automatización.', color: 'text-blue-500', spotlight: 'rgba(59, 130, 246, 0.25)' }
                        ].map((service, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.2, duration: 0.6 }}
                                className="h-full"
                            >
                                <TiltCard
                                    className="glass p-8 rounded-3xl relative overflow-hidden group border border-white/5 hover:border-white/20 h-full"
                                    spotlightColor={service.spotlight}
                                >
                                    {/* Living 3D Background Icon */}
                                    <div className="absolute -right-10 -top-10 opacity-[0.05] group-hover:opacity-[0.15] transition-all duration-500 z-0">
                                        <motion.div
                                            className={`${service.color}`}
                                            animate={{
                                                rotate: [0, 5, 0],
                                                scale: [1, 1.05, 1],
                                            }}
                                            transition={{
                                                duration: 6,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                            whileHover={{
                                                rotate: [0, 90],
                                                scale: 1.2,
                                                opacity: 1
                                            }}
                                        >
                                            <service.icon size={220} strokeWidth={1} />
                                        </motion.div>
                                    </div>

                                    <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-8 border border-white/10 ${service.color} group-hover:scale-110 group-hover:border-${service.color}/30 transition-all duration-300 relative z-10 shadow-lg shadow-${service.color}/10`}>
                                        <service.icon size={28} />
                                    </div>

                                    <h3 className="text-2xl font-bold mb-4 font-display relative z-10">{service.title}</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm relative z-10">
                                        {service.desc}
                                    </p>
                                </TiltCard>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Methodology / Process Section (Scrollytelling) */}
            <ScrollytellingProcess />

            {/* Tech & Trust Section */}
            <section className="min-h-screen flex flex-col justify-center py-20 bg-black border-y border-white/5 relative overflow-hidden">
                {/* Removed grainy noise background */}
                <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12 w-full">

                    <div className="md:w-1/2">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="flex items-center gap-2 mb-6 text-primary font-bold tracking-widest uppercase text-sm">
                                <Shield size={18} />
                                <span>Escalabilidad Empresarial</span>
                            </div>
                            <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 leading-tight">
                                Construimos <br />
                                <span className="text-white">Arquitecturas Digitales.</span>
                            </h2>
                            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                                No solo escribimos código; diseñamos soluciones digitales robustas. Nuestros sistemas cumplen con los más altos estándares globales de calidad y seguridad.
                            </p>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-3xl font-bold text-white mb-1 flex items-center">
                                        <Counter value={100} prefix="+" />
                                    </h4>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">clientes satisfechos</p>
                                </div>
                                <div>
                                    <h4 className="text-3xl font-bold text-white mb-1 flex items-center">
                                        <Counter value={12} prefix="+" />
                                    </h4>
                                    <p className="text-xs text-slate-500 uppercase tracking-wider">CreAPP presente en paises</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <div className="md:w-1/2 relative">
                        <div className="aspect-square rounded-full bg-gradient-to-tr from-primary/20 to-secondary/20 blur-3xl absolute inset-0 -z-10 animate-pulse"></div>
                        <motion.div
                            className="glass p-8 rounded-3xl border border-white/10"
                            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, type: "spring" }}
                        >
                            <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-6">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <div className="ml-auto text-xs text-slate-500 font-mono">AppCore.ts</div>
                            </div>

                            {/* Animated Typewriter Code Block */}
                            <CodeTypewriter />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className="min-h-screen flex flex-col justify-center px-6 relative z-10" id="contact">
                <div className="max-w-4xl mx-auto glass rounded-[3rem] p-8 md:p-16 border border-white/10 relative overflow-hidden w-full">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 blur-[100px] rounded-full"></div>

                    <div className="text-center mb-12 relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">¿Listo para innovar?</h2>
                            <p className="text-slate-400 text-lg">Envianos un mensaje, generalmente contestamos en las proximas 2 horas.</p>
                        </motion.div>
                    </div>

                    {/* Unified Contact Form with Rocket Animation */}
                    <div className="max-w-lg mx-auto relative z-10 bg-transparent">
                        <ContactForm />
                    </div>

                    <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex items-center gap-6 text-slate-400">
                            <a href="#" className="hover:text-white transition-colors flex items-center gap-2">
                                <Mail size={16} /> creapp.ar@gmail.com
                            </a>
                            <a href="#" className="hover:text-white transition-colors flex items-center gap-2">
                                <Globe size={16} /> Buenos Aires, Argentina
                            </a>
                        </div>
                        <div className="flex gap-4">
                            {[Globe, MessageCircle, Code2].map((Icon, i) => (
                                <a key={i} href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all text-slate-400 hover:text-white">
                                    <Icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer (Inside Contact for cleaner snap) */}
                <footer className="py-8 text-center text-slate-600 text-sm absolute bottom-0 left-0 right-0">
                    <p>© 2026 CreAPP Soluciones y Desarrollos tecnológicos. Todos los derechos reservados.</p>
                </footer>
            </section >

            <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div >
    );
};

export default LandingPage;
