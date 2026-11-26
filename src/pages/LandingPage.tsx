import React, { useState } from 'react';
import { ArrowDownRight, ArrowRight, Calendar } from 'lucide-react';
import { ContactForm } from '../components/ui/ContactForm';
import { ContactModal } from '../components/ui/ContactModal';
import { SiteNav } from '../components/site/SiteNav';
import { Chapter, Reveal } from '../components/site/Chapter';
import { Orb } from '../components/site/Orb';
import { useSiteTheme } from '../components/site/theme';
import { ABOUT_POINTS, AREAS, STACK, TEAM } from '../components/site/content';
import { DesignGraphic, LabGraphic, MarketingGraphic, ScaleGraphic, SoftwareGraphic } from '../components/site/AreaGraphics';
import { AgentDemo } from '../components/site/AgentDemo';
import { ScanDemo } from '../components/site/ScanDemo';
import { EngineLive } from '../components/site/EngineLive';
import { Process } from '../components/site/Process';
import { ClientShowcase, ProductShowcase } from '../components/site/Showcase';
import '../components/site/site.css';

// Gráfico de cada área: 4 por scroll + 2 con interacción real (IA y Ciberseguridad).
const AREA_GRAPHIC: Record<string, React.FC> = {
    'area-software': SoftwareGraphic,
    'area-ia': AgentDemo,
    'area-diseno': DesignGraphic,
    'area-escala': ScaleGraphic,
    'area-ciber': ScanDemo,
    'area-marketing': MarketingGraphic,
};

// Sitio público CreAPP · IT Solutions.
// Spec: docs/2026-11-25-rediseno-web-design-spec.md — Fases 1–4 (fundaciones, hero con orbe, gráficos de las 6 áreas, motor en vivo, proceso, productos).
// Fase 5: Nosotros con el lab, clientes (S13), contacto y pulido mobile.
// Pendiente: citas de clientes (solo se muestran con texto confirmado).

const LandingPage: React.FC = () => {
    const { theme, toggle } = useSiteTheme();
    const [contactOpen, setContactOpen] = useState(false);
    const openContact = () => setContactOpen(true);

    return (
        <div className="cw" id="top">
            <a href="#contenido" className="cw-skip">Saltar al contenido</a>
            <SiteNav theme={theme} onToggleTheme={toggle} onContact={openContact} />

            <main id="contenido">
                {/* ── S1 · Hero ── */}
                <section className="cw-hero" aria-labelledby="hero-t">
                    <div className="cw-wrap cw-hero-grid">
                        <div className="cw-hero-copy">
                            <Reveal>
                                <span className="cw-mono">CreAPP · IT Solutions</span>
                                <h1 id="hero-t" className="cw-display">
                                    El software y la <span className="cw-accent">IA</span> que tu negocio necesita.
                                </h1>
                                <p className="cw-hero-remate">Y te los mostramos funcionando.</p>
                            </Reveal>
                            <Reveal delay={120}>
                                <p className="cw-hero-lead">
                                    Un software lab AI-native con productos propios en producción. Dev a medida, IA,
                                    diseño, infraestructura, ciberseguridad y marketing — bajo un mismo techo.
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
                                <ul className="cw-chips" aria-label="Las seis áreas">
                                    {AREAS.map((a) => (
                                        <li key={a.id}>
                                            <a href={`#${a.id}`}>
                                                <b>{a.n}</b>
                                                {a.short}
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

                {/* ── S2 · Qué hacemos: índice de las 6 áreas ── */}
                <section id="servicios" className="cw-section" aria-labelledby="servicios-t">
                    <div className="cw-wrap">
                        <Reveal className="cw-intro-head">
                            <div>
                                <span className="cw-mono">Qué hacemos</span>
                                <h2 id="servicios-t" className="cw-display cw-h2">
                                    Seis áreas, un mismo techo.
                                </h2>
                            </div>
                            <p className="cw-lead">
                                Desarrollo a medida, inteligencia artificial, diseño de producto, infraestructura,
                                ciberseguridad y marketing. Un solo equipo y un solo proceso para todo lo que tu
                                producto necesita.
                            </p>
                        </Reveal>
                        <ol className="cw-index">
                            {AREAS.map((a) => (
                                <li key={a.id}>
                                    <a href={`#${a.id}`}>
                                        <span className="cw-index-n cw-mono">
                                            Área {a.n}
                                            <ArrowDownRight size={18} aria-hidden="true" />
                                        </span>
                                        <span className="cw-index-t">{a.title}</span>
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* ── S3–S8 · Las 6 áreas ── */}
                {AREAS.map((a, i) => (
                    <React.Fragment key={a.id}>
                        <hr className="cw-rule" />
                        <Chapter
                            id={a.id}
                            eyebrow={`Área ${a.n} / 06`}
                            mark={a.n}
                            title={a.title}
                            lead={a.lead}
                            flip={i % 2 === 1}
                            badge={a.isNew ? 'Nueva' : undefined}
                        >
                            <Reveal>{React.createElement(AREA_GRAPHIC[a.id])}</Reveal>
                            <Reveal delay={80}>
                                <div className="cw-deliver">
                                    <span className="cw-mono">Entregables</span>
                                    <ul>
                                        {a.deliverables.map((d) => (
                                            <li key={d}>{d}</li>
                                        ))}
                                    </ul>
                                </div>
                                <p className="cw-closing">{a.closing}</p>
                            </Reveal>
                        </Chapter>
                    </React.Fragment>
                ))}

                <hr className="cw-rule" />

                {/* ── S9 · El motor en vivo ── */}
                <EngineLive />

                {/* ── S10 · Cómo trabajamos ── */}
                <Process />

                <hr className="cw-rule" />

                {/* ── S11 · Productos propios (prueba, sin precio ni CTA) ── */}
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

                {/* ── S12 · Nosotros ── */}
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

                {/* ── S13 · Clientes con su plataforma en producción ── */}
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
                                Seis clientes con su plataforma en la calle. Elegí uno y usalo acá mismo, tal como
                                lo usan hoy.
                            </p>
                        </Reveal>
                        <Reveal>
                            <ClientShowcase />
                        </Reveal>
                    </div>
                </section>

                <hr className="cw-rule" />

                {/* ── S14 · Contacto ── */}
                <section id="contacto" className="cw-section cw-contact" aria-labelledby="contacto-t">
                    <div className="cw-wrap cw-contact-grid">
                        <Reveal>
                            <span className="cw-mono">Hablemos</span>
                            <h2 id="contacto-t" className="cw-display cw-h2">
                                Empecemos tu <span className="cw-accent">proyecto</span>.
                            </h2>
                            <p className="cw-lead" style={{ marginTop: 20 }}>
                                Contanos qué necesitás resolver. Te respondemos rápido, con una propuesta clara y un
                                plan de trabajo — sin vueltas.
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

export default LandingPage;
