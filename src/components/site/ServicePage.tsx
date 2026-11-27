import React, { useEffect } from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { Chapter, Reveal } from './Chapter';
import { ParallaxLayer, StaggerGroup } from './motion';
import { useSiteChrome } from './SiteShell';
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
    const { openContact } = useSiteChrome();

    useEffect(() => {
        if (service) document.title = `${service.title} · CreAPP`;
    }, [service]);

    if (!service) return <Navigate to="/" replace />;

    const Graphic = GRAPHICS[service.graphicKey];

    return (
            <main id="contenido">
                {/* Hero: gráfico + lead + CTA */}
                <Chapter id="servicio" eyebrow={GROUP_LABELS[service.group]} title={service.title} lead={service.lead}>
                    {Graphic && <ParallaxLayer speed={0.08}><Reveal><Graphic /></Reveal></ParallaxLayer>}
                    {/* Sin CTAs en el hero de ninguna página de servicio: duplicaban la banda de
                        cierre del final del scroll (decisión del usuario). */}
                </Chapter>

                <hr className="cw-rule" />

                {/* Qué incluye — texto derecha / figura izquierda (alterna con el hero) */}
                <section className="cw-section cw-svcsec" aria-labelledby="incluye-t">
                    <div className="cw-wrap cw-svcsec-grid is-flip">
                        <StaggerGroup className="cw-svcsec-copy">
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
                        </StaggerGroup>
                        <ParallaxLayer speed={0.06} className="cw-svcsec-fig">
                            <Reveal delay={80}>
                                <IncludesFor slug={service.slug} items={service.includes} />
                            </Reveal>
                        </ParallaxLayer>
                    </div>
                </section>

                <hr className="cw-rule" />

                {/* Qué te llevás — texto izquierda / figura derecha */}
                <section className="cw-section cw-svcsec" aria-labelledby="llevas-t">
                    <div className="cw-wrap cw-svcsec-grid">
                        <StaggerGroup className="cw-svcsec-copy">
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
                        </StaggerGroup>
                        <ParallaxLayer speed={0.06} className="cw-svcsec-fig">
                            <Reveal delay={80}>
                                <DeliverablesFor slug={service.slug} items={service.deliverables} />
                            </Reveal>
                        </ParallaxLayer>
                    </div>
                </section>

                <hr className="cw-rule" />

                {/* Franja CTA liviana (el formulario vive en el modal) */}
                <section className="cw-section cw-cta-band" aria-labelledby="cta-t">
                    <div className="cw-wrap cw-cta-inner">
                        <StaggerGroup>
                            <span className="cw-mono">Hablemos</span>
                            <h2 id="cta-t" className="cw-display cw-h2">
                                ¿Arrancamos con <span className="cw-accent">{service.title}</span>?
                            </h2>
                            <p className="cw-lead">
                                Contanos qué necesitás resolver. Te respondemos rápido, con una propuesta
                                clara y un plan de trabajo — sin vueltas.
                            </p>
                            <div className="cw-hero-ctas cw-cta-actions">
                                <button type="button" className="cw-btn cw-btn-primary" onClick={openContact}>
                                    Agendá una llamada <Calendar size={17} />
                                </button>
                                <Link to="/#servicios" className="cw-btn cw-btn-ghost">
                                    Ver todos los servicios <ArrowRight size={17} />
                                </Link>
                            </div>
                        </StaggerGroup>
                    </div>
                </section>
            </main>
    );
};

export default ServicePage;
