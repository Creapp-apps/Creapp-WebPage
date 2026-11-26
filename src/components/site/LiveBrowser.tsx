import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, MousePointerClick } from 'lucide-react';
import { reducedMotion } from './iso';

/**
 * Navegador embebido para mostrar sitios en producción (productos propios y clientes).
 *  - `embed`: iframe real e interactivo. Arranca "en reposo" para no secuestrar el scroll de la
 *    página; un click lo activa y al sacar el cursor vuelve al reposo.
 *  - `loop`: grabación del sitio real, para los que prohíben embeberse (X-Frame-Options: DENY).
 * Regla dura (spec): jamás un marco vacío o roto. Skeleton mientras carga; si el sitio no
 * responde queda un panel con el link.
 */

export interface LiveSite {
    id: string;
    name: string;
    url: string;
    display: string;
    kind: 'embed' | 'loop';
    /** Solo `loop`: nombre base en /site/loops (mp4 + jpg). */
    loop?: string;
}

const LOAD_TIMEOUT_MS = 6000;
type State = 'idle' | 'loading' | 'ready' | 'failed';

export const LiveBrowser: React.FC<{ site: LiveSite }> = ({ site }) => {
    const boxRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [state, setState] = useState<State>('idle');
    const [reachable, setReachable] = useState(false);
    const [active, setActive] = useState(false);
    const [inView, setInView] = useState(false);
    const [dims, setDims] = useState({ w: 1280, h: 800, scale: 0.5, mobile: false });
    const isLoop = site.kind === 'loop';
    // Hay una grabación con el layout mobile del sitio para marcos angostos.
    const loopFile = `/site/loops/${site.loop}${dims.mobile ? '_m' : ''}`;

    // Al cambiar de sitio se arranca de cero.
    useEffect(() => {
        setState('idle');
        setReachable(false);
        setActive(false);
    }, [site.id]);

    useEffect(() => {
        const el = boxRef.current;
        if (!el) return;
        const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '300px' });
        io.observe(el);
        // La página se renderiza a tamaño real y se escala al marco (desktop o mobile según el ancho).
        const ro = new ResizeObserver(() => {
            const cw = el.clientWidth;
            const mobile = cw < 520;
            const w = mobile ? 400 : 1280, h = mobile ? 540 : 800;
            setDims({ w, h, scale: cw / w, mobile });
        });
        ro.observe(el);
        return () => { io.disconnect(); ro.disconnect(); };
    }, []);

    useEffect(() => {
        if (inView && state === 'idle') setState(isLoop ? 'ready' : 'loading');
    }, [inView, state, isLoop]);

    // Un iframe dispara `load` aunque la página no exista: primero se prueba que el sitio responda.
    // Límite conocido: si el sitio empezara a prohibir el embed, esto no lo detecta.
    useEffect(() => {
        if (isLoop || state !== 'loading') return;
        let alive = true;
        fetch(site.url, { mode: 'no-cors', cache: 'no-store' })
            .then(() => alive && setReachable(true))
            .catch(() => alive && setState('failed'));
        const t = window.setTimeout(() => setState((s) => (s === 'loading' ? 'failed' : s)), LOAD_TIMEOUT_MS);
        return () => { alive = false; window.clearTimeout(t); };
    }, [state, site.url, isLoop]);

    // La grabación corre solo en pantalla; con reduced-motion queda el fotograma fijo.
    useEffect(() => {
        const v = videoRef.current;
        if (!v || !isLoop || reducedMotion()) return;
        if (inView) v.play().catch(() => undefined);
        else v.pause();
    }, [inView, isLoop, loopFile, state]);

    // Fuera de pantalla el embed vuelve al reposo (en touch no hay "sacar el cursor").
    useEffect(() => { if (!inView) setActive(false); }, [inView]);

    const height = isLoop ? undefined : state === 'failed' ? undefined : dims.h * dims.scale;
    const touch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;


    return (
        <figure className="cw-browser">
            <div className="cw-browser-bar">
                <span className="cw-browser-dots" aria-hidden="true"><i /><i /><i /></span>
                <span className="cw-browser-url cw-mono">{site.display}</span>
                <a className="cw-browser-open" href={site.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${site.name} en una pestaña nueva`}>
                    <ArrowUpRight size={16} />
                </a>
            </div>
            <div
                ref={boxRef}
                className={`cw-browser-view ${isLoop ? 'is-loop' : ''} ${isLoop && dims.mobile ? 'is-loop-m' : ''} ${active ? 'is-active' : ''}`}
                style={{ height }}
                data-state={state}
                onPointerLeave={() => setActive(false)}
            >
                {isLoop && state !== 'idle' && (
                    <video
                        key={loopFile}
                        ref={videoRef}
                        src={`${loopFile}.mp4`}
                        poster={`${loopFile}.jpg`}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        aria-label={`Grabación del sitio de ${site.name}`}
                    />
                )}
                {!isLoop && reachable && (state === 'loading' || state === 'ready') && (
                    <iframe
                        key={site.id}
                        src={site.url}
                        title={`${site.name} funcionando en vivo`}
                        loading="lazy"
                        tabIndex={active ? 0 : -1}
                        referrerPolicy="no-referrer"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        onLoad={() => setState('ready')}
                        style={{ width: dims.w, height: dims.h, transform: `scale(${dims.scale})` }}
                    />
                )}
                {!isLoop && state === 'ready' && !active && (
                    <button type="button" className="cw-browser-wake" onClick={() => setActive(true)}>
                        <span className="cw-mono"><MousePointerClick size={15} /> {touch ? 'Tocá para usarlo' : 'Click para usarlo'}</span>
                    </button>
                )}
                {(state === 'idle' || state === 'loading') && (
                    <div className="cw-skel" aria-hidden="true">
                        <i style={{ width: '38%' }} /><i style={{ width: '72%' }} /><i style={{ width: '56%' }} />
                        <span className="cw-mono">Cargando {site.name}…</span>
                    </div>
                )}
                {state === 'failed' && (
                    <div className="cw-browser-fallback">
                        <p>La vista en vivo no cargó a tiempo.</p>
                        <a className="cw-btn cw-btn-ghost cw-btn-sm" href={site.url} target="_blank" rel="noopener noreferrer">
                            Abrir {site.name} <ArrowUpRight size={15} />
                        </a>
                    </div>
                )}
            </div>
            <figcaption className="cw-mono">
                {state === 'failed' ? <span>Vista no disponible</span>
                    : isLoop ? <span>Grabación del sitio real</span>
                        : <span className="cw-live">En vivo</span>}
                {active ? (
                    <button type="button" className="cw-browser-release cw-mono" onClick={() => setActive(false)}>Soltar</button>
                ) : (
                    <span className="cw-gfx-note">{isLoop ? 'Abrilo con la flecha' : 'Sitio real, en producción'}</span>
                )}
            </figcaption>
        </figure>
    );
};

export default LiveBrowser;
