import React, { useState } from 'react';
import { CLIENTS, PRODUCTS } from './content';
import { LiveBrowser, type LiveSite } from './LiveBrowser';

// Qué se ve de cada sitio. `embed` = iframe interactivo (verificado sin X-Frame-Options el
// 2026-11-25). `loop` = grabación: Dental-IA, Curadent y Consultorio Álvarez responden
// X-Frame-Options: DENY. Para pasarlos a embed real hay que permitir a creapp.com.ar en su
// frame-ancestors (los tres corren sobre Dental-IA, que es nuestro).
const PRODUCT_SITES: Record<string, LiveSite> = {
    Stacked: { id: 'p-stacked', name: 'Stacked', url: 'https://software.stacked.com.ar/damafa', display: 'software.stacked.com.ar/damafa', kind: 'embed' },
    Trazapp: { id: 'p-trazapp', name: 'Trazapp', url: 'https://www.trazapp.ar', display: 'trazapp.ar', kind: 'embed' },
    'Dental-IA': { id: 'p-dentalia', name: 'Dental-IA', url: 'https://www.dentalia.com.ar', display: 'dentalia.com.ar', kind: 'loop', loop: 'dentalia' },
};

const CLIENT_LOOPS: Record<string, string> = { Curadent: 'curadent', 'Consultorio Álvarez': 'dentalva' };

/** S11 · Productos propios: tres pestañas, un navegador. Sin precios ni CTA de producto. */
export const ProductShowcase: React.FC = () => {
    const [i, setI] = useState(0);
    const p = PRODUCTS[i];
    const site = PRODUCT_SITES[p.name];
    return (
        <div className="cw-showcase">
            <div className="cw-tabs" role="tablist" aria-label="Productos propios">
                {PRODUCTS.map((x, k) => (
                    <button key={x.name} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)}>
                        <b>{x.name}</b>
                        <span className="cw-mono">{x.kind}</span>
                    </button>
                ))}
            </div>
            <LiveBrowser key={site.id} site={site} />
            <p className="cw-showcase-desc">
                <span className="cw-mono cw-live">En producción</span>
                {p.d}
            </p>
        </div>
    );
};

/** S13 · Clientes: se elige uno de la lista y su plataforma se abre al lado. */
export const ClientShowcase: React.FC = () => {
    const [i, setI] = useState(0);
    const c = CLIENTS[i];
    const loop = CLIENT_LOOPS[c.name];
    const site: LiveSite = { id: `c-${i}`, name: c.name, url: c.url, display: c.display, kind: loop ? 'loop' : 'embed', loop };
    return (
        <div className="cw-clientbox">
            <div className="cw-clientlist" role="tablist" aria-label="Clientes en producción" aria-orientation="vertical">
                {CLIENTS.map((x, k) => (
                    <button key={x.name} type="button" role="tab" aria-selected={k === i} onClick={() => setI(k)}>
                        <span className="cw-mono">0{k + 1}</span>
                        <span className="cw-client-name">{x.name}</span>
                        <span className="cw-client-meta">{x.sector} <i>·</i> {x.built}</span>
                    </button>
                ))}
            </div>
            <div className="cw-clientview">
                <LiveBrowser key={site.id} site={site} />
                {c.quoteConfirmed && <blockquote className="cw-quote">{c.quote}</blockquote>}
            </div>
        </div>
    );
};
