import React, { useEffect, useState } from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { ContactModal } from '../ui/ContactModal';
import { SiteNav } from './SiteNav';
import { Chapter, Reveal } from './Chapter';
import { useSiteTheme } from './theme';
import { GROUP_LABELS, getService } from './services';
import { AdsGraphic, DesignGraphic, MarketingGraphic, ScaleGraphic, SoftwareGraphic } from './AreaGraphics';
import { AgentDemo } from './AgentDemo';
import { ScanDemo } from './ScanDemo';
import { AuditGraphic, SocGraphic } from './SecurityGraphics';
import { DeliverablesFor, IncludesFor } from './SectionFigures';
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
                {/* Hero: gráfico + lead + CTA */}
                <Chapter id="servicio" eyebrow={GROUP_LABELS[service.group]} title={service.title} lead={service.lead}>
                    {Graphic && <Reveal><Graphic /></Reveal>}
                    {/* Pentesting: el hero ya cierra con su demo interactiva (Escanear); los CTAs
                        del hero duplicaban la banda de cierre, así que se ocultan en esa página. */}
                    {service.slug !== 'pentesting' && (
                        <Reveal delay={80}>
                            <div className="cw-hero-ctas" style={{ marginTop: 28 }}>
                                <button type="button" className="cw-btn cw-btn-primary" onClick={() => setContactOpen(true)}>
                                    Hablemos <ArrowRight size={17} />
                                </button>
                                <Link to="/#clientes" className="cw-btn cw-btn-ghost">
                                    Ver casos reales <ArrowRight size={17} />
                                </Link>
                            </div>
                        </Reveal>
                    )}
                </Chapter>

                <hr className="cw-rule" />

                {/* Qué incluye — texto derecha / figura izquierda (alterna con el hero) */}
                <section className="cw-section cw-svcsec" aria-labelledby="incluye-t">
                    <div className="cw-wrap cw-svcsec-grid is-flip">
                        <Reveal className="cw-svcsec-copy">
                            <span className="cw-mono">Qué incluye</span>
                            <h2 id="incluye-t" className="cw-display cw-h2">
                                Todo lo que entra en {service.title}.
                            </h2>
                            <ul className="cw-fig-legend cw-fig-legend-rich">
                                {service.includes.map((it, idx) => (
                                    <li key={it.t}>
                                        <b className="cw-fig-ix" aria-hidden="true">{String(idx + 1).padStart(2, '0')}</b>
                                        <div>
                                            <b>{it.t}</b>
                                            <span>{it.d}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Reveal>
                        <Reveal className="cw-svcsec-fig" delay={80}>
                            <IncludesFor slug={service.slug} items={service.includes} />
                        </Reveal>
                    </div>
                </section>

                <hr className="cw-rule" />

                {/* Qué te llevás — texto izquierda / figura derecha */}
                <section className="cw-section cw-svcsec" aria-labelledby="llevas-t">
                    <div className="cw-wrap cw-svcsec-grid">
                        <Reveal className="cw-svcsec-copy">
                            <span className="cw-mono">Qué te llevás</span>
                            <h2 id="llevas-t" className="cw-display cw-h2">
                                Resultados concretos, no promesas.
                            </h2>
                            <ul className="cw-fig-legend">
                                {service.deliverables.map((d, idx) => (
                                    <li key={d}>
                                        <b className="cw-fig-ix" aria-hidden="true">{String(idx + 1).padStart(2, '0')}</b>
                                        <span>{d}</span>
                                    </li>
                                ))}
                            </ul>
                        </Reveal>
                        <Reveal className="cw-svcsec-fig" delay={80}>
                            <DeliverablesFor slug={service.slug} items={service.deliverables} />
                        </Reveal>
                    </div>
                </section>

                <hr className="cw-rule" />

                {/* Franja CTA liviana (el formulario vive en el modal) */}
                <section className="cw-section cw-cta-band" aria-labelledby="cta-t">
                    <div className="cw-wrap cw-cta-inner">
                        <Reveal>
                            <span className="cw-mono">Hablemos</span>
                            <h2 id="cta-t" className="cw-display cw-h2">
                                ¿Arrancamos con <span className="cw-accent">{service.title}</span>?
                            </h2>
                            <p className="cw-lead">
                                Contanos qué necesitás resolver. Te respondemos rápido, con una propuesta
                                clara y un plan de trabajo — sin vueltas.
                            </p>
                            <div className="cw-hero-ctas cw-cta-actions">
                                <button type="button" className="cw-btn cw-btn-primary" onClick={() => setContactOpen(true)}>
                                    Agendá una llamada <Calendar size={17} />
                                </button>
                                <Link to="/#servicios" className="cw-btn cw-btn-ghost">
                                    Ver todos los servicios <ArrowRight size={17} />
                                </Link>
                            </div>
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
