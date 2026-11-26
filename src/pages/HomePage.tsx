import React, { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowRight, Calendar } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { ContactForm } from '../components/ui/ContactForm';
import { ContactModal } from '../components/ui/ContactModal';
import { SiteNav } from '../components/site/SiteNav';
import { Chapter, Reveal } from '../components/site/Chapter';
import { Orb } from '../components/site/Orb';
import { useSiteTheme } from '../components/site/theme';
import { ABOUT_POINTS, STACK, TEAM } from '../components/site/content';
import { GROUP_LABELS, servicePath, servicesByGroup, type ServiceGroup } from '../components/site/services';
import { LabGraphic } from '../components/site/AreaGraphics';
import { EngineLive } from '../components/site/EngineLive';
import { Process } from '../components/site/Process';
import { ClientShowcase, ProductShowcase } from '../components/site/Showcase';
import { Methodology } from '../components/site/MethodologySection';
import '../components/site/site.css';

const GROUP_ORDER: ServiceGroup[] = ['desarrollo', 'seguridad', 'marketing'];

// Home institucional: CreAPP · Software & Agentic Lab. Posicionamiento +
// metodología (agentic) + índice de servicios + prueba en vivo (motor,
// productos, clientes) + nosotros + contacto. Los 9 servicios viven en sus
// propias rutas (ServicePage); acá solo se indexan.

const HomePage: React.FC = () => {
    const { theme, toggle } = useSiteTheme();
    const [contactOpen, setContactOpen] = useState(false);
    const openContact = () => setContactOpen(true);
    const byGroup = servicesByGroup();
    const location = useLocation();

    useEffect(() => {
        document.title = 'CreAPP · Software & Agentic Lab';
    }, []);

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
                <section className="cw-hero" aria-labelledby="hero-t">
                    <div className="cw-wrap cw-hero-grid">
                        <div className="cw-hero-copy">
                            <Reveal>
                                <span className="cw-mono">CreAPP · Software & Agentic Lab</span>
                                <h1 id="hero-t" className="cw-display">
                                    El software y la <span className="cw-accent">IA</span> que tu negocio necesita.
                                </h1>
                                <p className="cw-hero-remate">Y te los mostramos funcionando.</p>
                            </Reveal>
                            <Reveal delay={120}>
                                <p className="cw-hero-lead">
                                    Un software lab AI-native con productos propios en producción. Desarrollo,
                                    seguridad y marketing — bajo un mismo techo.
                                </p>
                                <div className="cw-hero-ctas">
                                    <button type="button" className="cw-btn cw-btn-primary" onClick={openContact}>
                                        Agendá una llamada <Calendar size={17} />
                                    </button>
                                    <a href="#servicios" className="cw-btn cw-btn-ghost">
                                        Explorar <ArrowRight size={17} />
                                    </a>
                                </div>
                            </Reveal>
                            <Reveal delay={220}>
                                <ul className="cw-chips" aria-label="Los tres frentes">
                                    {GROUP_ORDER.map((g, i) => (
                                        <li key={g}>
                                            <a href="#servicios">
                                                <b>0{i + 1}</b>
                                                {GROUP_LABELS[g]}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </Reveal>
                        </div>
                        <div className="cw-hero-orb">
                            <Orb />
                        </div>
                    </div>
                </section>

                <hr className="cw-rule" />

                {/* ── Metodología · Agentic Lab (diferencial) ── */}
                <Methodology />

                <hr className="cw-rule" />

                {/* ── Índice de servicios (3 grupos → 9 rutas) ── */}
                <section id="servicios" className="cw-section" aria-labelledby="servicios-t">
                    <div className="cw-wrap">
                        <Reveal className="cw-intro-head">
                            <div>
                                <span className="cw-mono">Qué hacemos</span>
                                <h2 id="servicios-t" className="cw-display cw-h2">
                                    Tres frentes, un mismo techo.
                                </h2>
                            </div>
                            <p className="cw-lead">
                                Desarrollo, seguridad y marketing. Un solo equipo y un solo proceso para todo lo que tu
                                producto necesita. Elegí un servicio y entrá.
                            </p>
                        </Reveal>
                        {GROUP_ORDER.map((g) => (
                            <Reveal key={g}>
                                <h3 className="cw-mono cw-svc-group-h">{GROUP_LABELS[g]}</h3>
                                <ol className="cw-index">
                                    {byGroup[g].map((s) => (
                                        <li key={s.slug}>
                                            <Link to={servicePath(s)}>
                                                <span className="cw-index-n cw-mono">
                                                    {s.eyebrow}
                                                    <ArrowDownRight size={18} aria-hidden="true" />
                                                </span>
                                                <span className="cw-index-t">{s.title}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ol>
                            </Reveal>
                        ))}
                    </div>
                </section>

                <hr className="cw-rule" />

                {/* ── El motor en vivo ── */}
                <EngineLive />

                {/* ── Cómo trabajamos ── */}
                <Process />

                <hr className="cw-rule" />

                {/* ── Productos propios ── */}
                <Chapter
                    id="productos"
                    eyebrow="La prueba"
                    title="Productos propios en producción."
                    lead="No hablamos en abstracto. Construimos, lanzamos y sostenemos nuestros propios SaaS verticales — la mejor garantía de que podemos construir el tuyo."
                    flip
                >
                    <Reveal>
                        <ProductShowcase />
                    </Reveal>
                </Chapter>

                <hr className="cw-rule" />

                {/* ── Nosotros ── */}
                <Chapter
                    id="nosotros"
                    eyebrow="Quiénes somos"
                    title="No somos freelancers. Somos un lab."
                    lead="CreAPP transforma ideas en productos digitales de alto impacto. Trabajamos con contrato formal, SLA y un proceso claro: sin sorpresas, sin freelancers que desaparecen a mitad del proyecto."
                >
                    <Reveal className="cw-team">
                        {TEAM.map((t) => (
                            <div key={t.name} className="cw-person">
                                <span className="cw-monogram" aria-hidden="true">
                                    {t.mono}
                                </span>
                                <div>
                                    <b>{t.name}</b>
                                    <span className="cw-mono">{t.role}</span>
                                </div>
                            </div>
                        ))}
                    </Reveal>
                    <Reveal><LabGraphic /></Reveal>
                    <Reveal delay={80}>
                        <ul className="cw-points">
                            {ABOUT_POINTS.map((p) => (
                                <li key={p.t}>
                                    <b>{p.t}</b>
                                    <span>{p.d}</span>
                                </li>
                            ))}
                        </ul>
                        <ul className="cw-stack" aria-label="Stack tecnológico">
                            {STACK.map((s) => (
                                <li key={s}>{s}</li>
                            ))}
                        </ul>
                    </Reveal>
                </Chapter>

                <hr className="cw-rule" />

                {/* ── Clientes en producción ── */}
                <section id="clientes" className="cw-section" aria-labelledby="clientes-t">
                    <div className="cw-wrap">
                        <Reveal className="cw-intro-head">
                            <div>
                                <span className="cw-mono">En producción</span>
                                <h2 id="clientes-t" className="cw-display cw-h2">
                                    Entrá y miralo funcionando.
                                </h2>
                            </div>
                            <p className="cw-lead">
                                Clientes con su plataforma en la calle. Elegí uno y usalo acá mismo, tal como lo usan hoy.
                            </p>
                        </Reveal>
                        <Reveal>
                            <ClientShowcase />
                        </Reveal>
                    </div>
                </section>

                <hr className="cw-rule" />

                {/* ── Contacto ── */}
                <section id="contacto" className="cw-section cw-contact" aria-labelledby="contacto-t">
                    <div className="cw-wrap cw-contact-grid">
                        <Reveal>
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
                        </Reveal>
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
