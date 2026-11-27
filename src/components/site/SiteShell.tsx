import React, { createContext, useContext, useState, useCallback, Suspense } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, type TargetAndTransition } from 'framer-motion';
import { SiteNav } from './SiteNav';
import { ContactModal } from '../ui/ContactModal';
import { useSiteTheme } from './theme';
import { useSmoothScroll } from '../systems/SmoothScroll';
import { pageTransitionVariants, refreshScrollTriggers } from './motion';
import './site.css';

// Contexto para que el contenido de cada página dispare el modal de contacto
// sin renderizar su propio chrome (nav/footer/modal viven acá, en el shell).
interface SiteChromeValue {
    openContact: () => void;
}
const SiteChromeContext = createContext<SiteChromeValue>({ openContact: () => {} });
export const useSiteChrome = (): SiteChromeValue => useContext(SiteChromeContext);

/**
 * Shell persistente del sitio público (home + servicios). Renderiza una sola vez
 * el skip-link, la navbar, el footer y el modal de contacto; el contenido de la
 * ruta (Outlet) transiciona con desliz lateral + fade (AnimatePresence mode="wait":
 * sale una página y entra la otra, nunca dos montadas a la vez → un solo set de
 * ScrollTriggers). El desliz es en X, así no altera el cálculo vertical de GSAP.
 */
const SiteShell: React.FC = () => {
    const { theme, toggle } = useSiteTheme();
    const [contactOpen, setContactOpen] = useState(false);
    const openContact = useCallback(() => setContactOpen(true), []);
    const location = useLocation();
    const outlet = useOutlet();
    const reduce = useReducedMotion();
    const variants = pageTransitionVariants(!!reduce);
    const { lenis } = useSmoothScroll();

    // Al terminar la salida de la página anterior: scroll arriba + refresco de GSAP
    // (lenis puede ser null → fallback a window). La nueva página entra desde arriba.
    const resetScroll = useCallback(() => {
        try {
            lenis?.scrollTo(0, { immediate: true });
        } catch {
            /* lenis no disponible */
        }
        window.scrollTo(0, 0);
        refreshScrollTriggers();
    }, [lenis]);

    return (
        <SiteChromeContext.Provider value={{ openContact }}>
            <div className="cw" id="top">
                <a href="#contenido" className="cw-skip">Saltar al contenido</a>
                <SiteNav theme={theme} onToggleTheme={toggle} onContact={openContact} />

                <Suspense fallback={<div className="cw-route-fallback" style={{ minHeight: '60vh' }} aria-hidden="true" />}>
                    <AnimatePresence mode="wait" onExitComplete={resetScroll}>
                        <motion.div
                            key={location.pathname}
                            initial={variants.initial as TargetAndTransition}
                            animate={variants.animate as TargetAndTransition}
                            exit={variants.exit as TargetAndTransition}
                            onAnimationComplete={() => refreshScrollTriggers()}
                        >
                            {outlet}
                        </motion.div>
                    </AnimatePresence>
                </Suspense>

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
        </SiteChromeContext.Provider>
    );
};

export default SiteShell;
