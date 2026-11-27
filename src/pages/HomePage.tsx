import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { SplitText } from 'gsap/SplitText';
import { ContactForm } from '../components/ui/ContactForm';
import { ContactModal } from '../components/ui/ContactModal';
import { SiteNav } from '../components/site/SiteNav';
import { Reveal } from '../components/site/Chapter';
import RocketHero from '../components/site/RocketHero';
import { ParallaxLayer, PinScrub, StaggerGroup, gsap, prefersReducedMotion, refreshScrollTriggers, onFontsAndLayoutReady, GSAP_EASE, DUR, STAGGER } from '../components/site/motion';
import { useSiteTheme } from '../components/site/theme';
import EcosystemOrbital from '../components/site/EcosystemOrbital';
import { EngineLive } from '../components/site/EngineLive';
import { Process } from '../components/site/Process';
import { ClientShowcase } from '../components/site/Showcase';
import { Methodology } from '../components/site/MethodologySection';
import '../components/site/site.css';

gsap.registerPlugin(SplitText);


// Home institucional: CreAPP · Software & Agentic Lab. Posicionamiento +
// metodología (agentic) + índice de servicios + prueba en vivo (motor,
// productos, clientes) + nosotros + contacto. Los 9 servicios viven en sus
// propias rutas (ServicePage); acá solo se indexan.

const HomePage: React.FC = () => {
    const { theme, toggle } = useSiteTheme();
    const [contactOpen, setContactOpen] = useState(false);
    const openContact = () => setContactOpen(true);
    const location = useLocation();
    const heroRef = useRef<HTMLElement>(null);
    const heroCopyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        document.title = 'CreAPP · Software & Agentic Lab';
    }, []);

    // Las fuentes/escenas/imágenes cambian alturas al cargar: refrescar los triggers
    // una vez estabilizado el layout para que las posiciones de scroll no queden corridas.
    useEffect(() => onFontsAndLayoutReady(refreshScrollTriggers), []);

    // Intro cinematográfica del hero: H1 línea por línea (SplitText con máscara) +
    // fade-slide escalonado del resto, con los tokens de motion. Parallax del copy al
    // scrollear. reduced-motion → todo visible, sin animación.
    useLayoutEffect(() => {
        const copy = heroCopyRef.current;
        const section = heroRef.current;
        if (!copy || !section) return;
        const q = (s: string) => copy.querySelector<HTMLElement>(`[data-hero="${s}"]`);
        const eyebrow = q('eyebrow'), title = q('title'), remate = q('remate'), lead = q('lead'), ctas = q('ctas');
        const fade = [eyebrow, remate, lead, ctas].filter(Boolean) as HTMLElement[];
        if (prefersReducedMotion()) { gsap.set([...fade, title].filter(Boolean), { autoAlpha: 1, y: 0 }); return; }
        let split: SplitText | null = null;
        const ctx = gsap.context(() => {
            if (title) split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'cw-hero-line' });
            gsap.set(fade, { autoAlpha: 0, y: 18 });
            if (split) gsap.set(split.lines, { yPercent: 100 });
            const tl = gsap.timeline({ defaults: { ease: GSAP_EASE.cout } });
            tl.to(eyebrow, { autoAlpha: 1, y: 0, duration: DUR.base }, 0);
            if (split) tl.to(split.lines, { yPercent: 0, duration: DUR.slow, stagger: STAGGER }, 0.1);
            tl.to(remate, { autoAlpha: 1, y: 0, duration: DUR.base }, 0.45);
            tl.to(lead, { autoAlpha: 1, y: 0, duration: DUR.base }, 0.58);
            tl.to(ctas, { autoAlpha: 1, y: 0, duration: DUR.base }, 0.68);
            gsap.to(copy, {
                yPercent: -6, ease: 'none',
                scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: true },
            });
        }, section);
        return () => { ctx.revert(); split?.revert(); };
    }, []);

    // Momento firma: el Agentic Lab recorre sus modos con el scroll mientras la
    // sección está clavada (PinScrub). Sólo cambia de modo al cruzar un umbral.
    const labMode = useRef<string>('');
    const onLabProgress = (p: number) => {
        const mode = p < 0.25 ? 'assembled' : p < 0.5 ? 'cutaway' : p < 0.78 ? 'stations' : 'order';
        if (mode !== labMode.current) { labMode.current = mode; window.__lab?.setMode(mode); }
    };

    // Scroll al ancla al llegar con hash (p. ej. /#nosotros desde una página de servicio).
    // Salto instantáneo tras un breve delay: no pelea con el RAF de Lenis y cae en la sección
    // aunque la home recién montada reflowee con fuentes/imágenes.
    useEffect(() => {
        const hash = location.hash;
        if (hash.length < 2) return; // ignora '' y '#'
        let el: Element | null = null;
        try {
            el = document.querySelector(hash);
        } catch {
            return; // hash no es un selector válido
        }
        if (!el) return;
        const target = el as HTMLElement;
        const id = window.setTimeout(() => target.scrollIntoView({ block: 'start' }), 120);
        return () => window.clearTimeout(id);
    }, [location.hash]);

    return (
        <div className="cw" id="top">
            <a href="#contenido" className="cw-skip">Saltar al contenido</a>
            <SiteNav theme={theme} onToggleTheme={toggle} onContact={openContact} />

            <main id="contenido">
                {/* ── Hero ── */}
                <section className="cw-hero" aria-labelledby="hero-t" ref={heroRef}>
                    <div className="cw-wrap cw-hero-grid">
                        <div className="cw-hero-copy" ref={heroCopyRef}>
                            <span className="cw-mono" data-hero="eyebrow">CreAPP · Software & Agentic Lab</span>
                            <h1 id="hero-t" className="cw-display" data-hero="title">
                                Tenemos las piezas que faltan para hacer <span className="cw-accent">despegar</span> tu negocio.
                            </h1>
                            <p className="cw-hero-remate" data-hero="remate">Software, IA y seguridad, listos para ensamblar.</p>
                            <p className="cw-hero-lead" data-hero="lead">
                                Un software lab AI-native con productos propios en producción. Desarrollo,
                                seguridad y marketing — bajo un mismo techo.
                            </p>
                            <div className="cw-hero-ctas" data-hero="ctas">
                                <button type="button" className="cw-btn cw-btn-primary" onClick={openContact}>
                                    Agendá una llamada <Calendar size={17} />
                                </button>
                                <a href="#servicios" className="cw-btn cw-btn-ghost">
                                    Explorar <ArrowRight size={17} />
                                </a>
                            </div>
                        </div>
                        <div className="cw-hero-orb">
                            <ParallaxLayer speed={0.14} className="cw-hero-rocket">
                                <RocketHero />
                            </ParallaxLayer>
                        </div>
                    </div>
                </section>

                <hr className="cw-rule" />

                {/* ── Metodología · Agentic Lab (diferencial) ── */}
                <PinScrub length={1.5} onProgress={onLabProgress}>
                    <Methodology />
                </PinScrub>

                <hr className="cw-rule" />

                {/* ── Índice de servicios (3 grupos → 9 rutas) ── */}
                <section id="servicios" className="cw-section" aria-labelledby="servicios-t">
                    <div className="cw-wrap">
                        <div className="cw-lab-split cw-svc-hero">
                            <StaggerGroup className="cw-lab-copy">
                                <span className="cw-mono">Quiénes somos</span>
                                <h2 id="servicios-t" className="cw-display cw-h2">
                                    No somos freelancers. Somos un <span className="cw-accent">ecosistema</span>.
                                </h2>
                                <p className="cw-lead">
                                    Desarrollo, seguridad y marketing girando alrededor de un mismo núcleo.
                                    Tocá un área y entrá.
                                </p>
                            </StaggerGroup>
                            <ParallaxLayer speed={0.12} className="cw-lab-stage cw-svc-stage">
                                <EcosystemOrbital radius={190} />
                            </ParallaxLayer>
                        </div>
                    </div>
                </section>

                <hr className="cw-rule" />

                {/* ── El motor en vivo ── */}
                <EngineLive />

                {/* ── Cómo trabajamos ── */}
                <Process />

                <hr className="cw-rule" />

                {/* ── Clientes en producción ── */}
                <section id="clientes" className="cw-section" aria-labelledby="clientes-t">
                    <div className="cw-wrap">
                        <StaggerGroup className="cw-intro-head">
                            <div>
                                <span className="cw-mono">En producción</span>
                                <h2 id="clientes-t" className="cw-display cw-h2">
                                    Entrá y miralo funcionando.
                                </h2>
                            </div>
                            <p className="cw-lead">
                                Clientes con su plataforma en la calle. Elegí uno y usalo acá mismo, tal como lo usan hoy.
                            </p>
                        </StaggerGroup>
                        <Reveal>
                            <ClientShowcase />
                        </Reveal>
                    </div>
                </section>

                <hr className="cw-rule" />

                {/* ── Contacto ── */}
                <section id="contacto" className="cw-section cw-contact" aria-labelledby="contacto-t">
                    <div className="cw-wrap cw-contact-grid">
                        <StaggerGroup>
                            <span className="cw-mono">Hablemos</span>
                            <h2 id="contacto-t" className="cw-display cw-h2">
                                Empecemos tu <span className="cw-accent">proyecto</span>.
                            </h2>
                            <p className="cw-lead" style={{ marginTop: 20 }}>
                                Contanos qué necesitás resolver. Te respondemos rápido, con una propuesta clara y un plan
                                de trabajo — sin vueltas.
                            </p>
                            <ul className="cw-contact-list">
                                <li>
                                    <span className="cw-mono">Email</span>
                                    <a href="mailto:creapp.ar@gmail.com">creapp.ar@gmail.com</a>
                                </li>
                                <li>
                                    <span className="cw-mono">Instagram</span>
                                    <a href="https://instagram.com/creapp.ar" target="_blank" rel="noopener noreferrer">
                                        @creapp.ar
                                    </a>
                                </li>
                                <li>
                                    <span className="cw-mono">LinkedIn</span>
                                    <a href="https://linkedin.com/company/creapp" target="_blank" rel="noopener noreferrer">
                                        linkedin.com/company/creapp
                                    </a>
                                </li>
                                <li>
                                    <span className="cw-mono">GitHub</span>
                                    <a href="https://github.com/creapp" target="_blank" rel="noopener noreferrer">
                                        github.com/creapp
                                    </a>
                                </li>
                                <li>
                                    <span className="cw-mono">Respuesta</span>
                                    <span>En menos de 2 h</span>
                                </li>
                            </ul>
                        </StaggerGroup>
                        <Reveal delay={100} className="cw-form-panel">
                            <ContactForm />
                        </Reveal>
                    </div>
                </section>
            </main>

            <footer className="cw-footer">
                <div className="cw-wrap cw-footer-in">
                    <a href="#top" className="cw-brand" aria-label="Volver arriba">
                        <img src="/CREAPP%20LOGO%20VECTOR.png" alt="" width={17} height={30} />
                        <span className="cw-brand-name">CreAPP</span>
                        <span className="cw-brand-tag">IT SOLUTIONS</span>
                    </a>
                    <p>Buenos Aires, Argentina · Remote-first</p>
                    <p>© 2026 CreAPP Soluciones y Desarrollos Tecnológicos.</p>
                </div>
            </footer>

            <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
        </div>
    );
};

export default HomePage;
