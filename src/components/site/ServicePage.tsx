import React, { useEffect, useState } from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { ContactForm } from '../ui/ContactForm';
import { ContactModal } from '../ui/ContactModal';
import { SiteNav } from './SiteNav';
import { Chapter, Reveal } from './Chapter';
import { useSiteTheme } from './theme';
import { GROUP_LABELS, getService } from './services';
import { AdsGraphic, DesignGraphic, MarketingGraphic, ScaleGraphic, SoftwareGraphic } from './AreaGraphics';
import { AgentDemo } from './AgentDemo';
import { ScanDemo } from './ScanDemo';
import { AuditGraphic, SocGraphic } from './SecurityGraphics';
import './site.css';

const GRAPHICS: Record<string, React.FC> = {
    software: SoftwareGraphic,
    ia: AgentDemo,
    design: DesignGraphic,
    scale: ScaleGraphic,
    scan: ScanDemo,
    marketing: MarketingGraphic,
    soc: SocGraphic,
    audit: AuditGraphic,
    ads: AdsGraphic,
};

interface ServicePageProps {
    group: string;
    slug: string;
}

const ServicePage: React.FC<ServicePageProps> = ({ group, slug }) => {
    const service = getService(group, slug);
    const { theme, toggle } = useSiteTheme();
    const [contactOpen, setContactOpen] = useState(false);

    useEffect(() => {
        if (service) document.title = `${service.title} · CreAPP`;
    }, [service]);

    if (!service) return <Navigate to="/" replace />;

    const Graphic = GRAPHICS[service.graphicKey];

    return (
        <div className="cw" id="top">
            <a href="#contenido" className="cw-skip">Saltar al contenido</a>
            <SiteNav theme={theme} onToggleTheme={toggle} onContact={() => setContactOpen(true)} />

            <main id="contenido">
                {/* Hero del servicio + gráfico + entregables */}
                <Chapter id="servicio" eyebrow={GROUP_LABELS[service.group]} title={service.title} lead={service.lead}>
                    {Graphic && <Reveal><Graphic /></Reveal>}
                    <Reveal delay={80}>
                        <div className="cw-deliver">
                            <span className="cw-mono">Entregables</span>
                            <ul>
                                {service.deliverables.map((d) => (
                                    <li key={d}>{d}</li>
                                ))}
                            </ul>
                        </div>
                    </Reveal>
                </Chapter>

                <hr className="cw-rule" />

                {/* Qué incluye */}
                <section className="cw-section" aria-labelledby="incluye-t">
                    <div className="cw-wrap">
                        <Reveal className="cw-intro-head">
                            <div>
                                <span className="cw-mono">Qué incluye</span>
                                <h2 id="incluye-t" className="cw-display cw-h2">
                                    Todo lo que entra en {service.title}.
                                </h2>
                            </div>
                        </Reveal>
                        <Reveal>
                            <ul className="cw-points">
                                {service.includes.map((i) => (
                                    <li key={i.t}>
                                        <b>{i.t}</b>
                                        <span>{i.d}</span>
                                    </li>
                                ))}
                            </ul>
                        </Reveal>
                    </div>
                </section>

                <hr className="cw-rule" />

                {/* CTA */}
                <section className="cw-section cw-contact" aria-labelledby="cta-t">
                    <div className="cw-wrap cw-contact-grid">
                        <Reveal>
                            <span className="cw-mono">Hablemos</span>
                            <h2 id="cta-t" className="cw-display cw-h2">
                                ¿Arrancamos con <span className="cw-accent">{service.title}</span>?
                            </h2>
                            <p className="cw-lead" style={{ marginTop: 20 }}>
                                Contanos qué necesitás resolver. Te respondemos rápido, con una propuesta clara y un plan
                                de trabajo — sin vueltas.
                            </p>
                            <div className="cw-hero-ctas" style={{ marginTop: 24 }}>
                                <button type="button" className="cw-btn cw-btn-primary" onClick={() => setContactOpen(true)}>
                                    Agendá una llamada <Calendar size={17} />
                                </button>
                                <Link to="/#servicios" className="cw-btn cw-btn-ghost">
                                    Ver todos los servicios <ArrowRight size={17} />
                                </Link>
                            </div>
                        </Reveal>
                        <Reveal delay={100} className="cw-form-panel">
                            <ContactForm />
                        </Reveal>
                    </div>
                </section>
            </main>

            <footer className="cw-footer">
                <div className="cw-wrap cw-footer-in">
                    <Link to="/" className="cw-brand" aria-label="Volver al inicio">
                        <img src="/CREAPP%20LOGO%20VECTOR.png" alt="" width={17} height={30} />
                        <span className="cw-brand-name">CreAPP</span>
                        <span className="cw-brand-tag">IT SOLUTIONS</span>
                    </Link>
                    <p>Buenos Aires, Argentina · Remote-first</p>
                    <p>© 2026 CreAPP Soluciones y Desarrollos Tecnológicos.</p>
                </div>
            </footer>

            <ContactModal isOpen={contactOpen} onClose={() => setContactOpen(false)} />
        </div>
    );
};

export default ServicePage;
