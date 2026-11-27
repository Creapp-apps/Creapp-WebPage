import React, { useEffect } from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { Chapter, Reveal } from './Chapter';
import { SplitReveal, TextReveal, RevealIn, StaggerGroup } from './motion';
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

    // Titular del CTA, único por servicio, con una palabra en acento (substring de ctaTitle).
    const ctaIdx = service.ctaTitle.indexOf(service.ctaAccent);
    const ctaParts = ctaIdx >= 0
        ? [service.ctaTitle.slice(0, ctaIdx), service.ctaAccent, service.ctaTitle.slice(ctaIdx + service.ctaAccent.length)]
        : [service.ctaTitle, '', ''];

    return (
            <main id="contenido">
                {/* Hero: gráfico + lead + CTA */}
                <Chapter id="servicio" eyebrow={GROUP_LABELS[service.group]} title={service.title} lead={service.lead}>
                    {Graphic && <RevealIn x={44} y={0}><Reveal><Graphic /></Reveal></RevealIn>}
                    {/* Sin CTAs en el hero de ninguna página de servicio: duplicaban la banda de
                        cierre del final del scroll (decisión del usuario). */}
                </Chapter>

                <hr className="cw-rule" />

                {/* Qué incluye — texto derecha / figura izquierda (alterna con el hero) */}
                <section className="cw-section cw-svcsec" aria-labelledby="incluye-t">
                    <div className="cw-wrap cw-svcsec-grid is-flip">
                        <div className="cw-svcsec-copy">
                            <span className="cw-mono">Qué incluye</span>
                            <SplitReveal as="h2" id="incluye-t" className="cw-display cw-h2">
                                {service.includesTitle}
                            </SplitReveal>
                            <StaggerGroup as="ul" x={-30} className="cw-fig-legend cw-fig-legend-rich">
                                {service.includes.map((it, idx) => (
                                    <li key={it.t}>
                                        <b className="cw-fig-ix" aria-hidden="true">{String(idx + 1).padStart(2, '0')}</b>
                                        <div>
                                            <b>{it.t}</b>
                                            <span>{it.d}</span>
                                        </div>
                                    </li>
                                ))}
                            </StaggerGroup>
                        </div>
                        <RevealIn className="cw-svcsec-fig" x={40} y={0}>
                            <Reveal>
                                <IncludesFor slug={service.slug} items={service.includes} />
                            </Reveal>
                        </RevealIn>
                    </div>
                </section>

                <hr className="cw-rule" />

                {/* Qué te llevás — texto izquierda / figura derecha */}
                <section className="cw-section cw-svcsec" aria-labelledby="llevas-t">
                    <div className="cw-wrap cw-svcsec-grid">
                        <div className="cw-svcsec-copy">
                            <span className="cw-mono">Qué te llevás</span>
                            <SplitReveal as="h2" id="llevas-t" className="cw-display cw-h2">
                                {service.deliverablesTitle}
                            </SplitReveal>
                            <StaggerGroup as="ul" x={-30} className="cw-fig-legend">
                                {service.deliverables.map((d, idx) => (
                                    <li key={d}>
                                        <b className="cw-fig-ix" aria-hidden="true">{String(idx + 1).padStart(2, '0')}</b>
                                        <span>{d}</span>
                                    </li>
                                ))}
                            </StaggerGroup>
                        </div>
                        <RevealIn className="cw-svcsec-fig" x={40} y={0}>
                            <Reveal>
                                <DeliverablesFor slug={service.slug} items={service.deliverables} />
                            </Reveal>
                        </RevealIn>
                    </div>
                </section>

                <hr className="cw-rule" />

                {/* Franja CTA liviana (el formulario vive en el modal) */}
                <section className="cw-section cw-cta-band" aria-labelledby="cta-t">
                    <div className="cw-wrap cw-cta-inner">
                        <div>
                            <span className="cw-mono">Hablemos</span>
                            <SplitReveal as="h2" id="cta-t" className="cw-display cw-h2">
                                {ctaParts[0]}<span className="cw-accent">{ctaParts[1]}</span>{ctaParts[2]}
                            </SplitReveal>
                            <TextReveal as="p" className="cw-lead" preset="fade">
                                Contanos qué necesitás resolver. Te respondemos rápido, con una propuesta clara y un plan de trabajo — sin vueltas.
                            </TextReveal>
                            <Reveal>
                                <div className="cw-hero-ctas cw-cta-actions">
                                    <button type="button" className="cw-btn cw-btn-primary" onClick={openContact}>
                                        Agendá una llamada <Calendar size={17} />
                                    </button>
                                    <Link to="/#servicios" className="cw-btn cw-btn-ghost">
                                        Ver todos los servicios <ArrowRight size={17} />
                                    </Link>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </section>
            </main>
    );
};

export default ServicePage;
