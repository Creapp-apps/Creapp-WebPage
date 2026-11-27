import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, type Variants } from 'framer-motion';
import {
    ChevronDown,
    ClipboardCheck,
    Code,
    Megaphone,
    Menu,
    MessageSquare,
    Moon,
    Radar,
    Share2,
    ShieldAlert,
    Sparkles,
    Sun,
    X,
    type LucideIcon,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import type { SiteTheme } from './theme';
import { GROUP_LABELS, servicePath, servicesByGroup, type ServiceGroup } from './services';

interface SiteNavProps {
    theme: SiteTheme;
    onToggleTheme: () => void;
    onContact: () => void;
}

const GROUP_ORDER: ServiceGroup[] = ['desarrollo', 'seguridad', 'marketing'];

// Al bajar más de 150px la navbar colapsa a un círculo; vuelve a expandirse al
// subir este umbral (px) o al clickear el círculo (estilo pill de 21st.dev).
const COLLAPSE_AFTER = 150;
const EXPAND_SCROLL_THRESHOLD = 80;

// Ícono lucide por servicio (slug) para el dropdown, tintado por frente.
const SERVICE_ICON: Record<string, LucideIcon> = {
    software: Code,
    ia: Sparkles,
    'apis-escala': Share2,
    pentesting: ShieldAlert,
    soc: Radar,
    auditorias: ClipboardCheck,
    community: MessageSquare,
    publicidad: Megaphone,
};

const GROUP_HEX: Record<ServiceGroup, string> = {
    desarrollo: '#8B5CF6',
    seguridad: '#FF2D78',
    marketing: '#00F0FF',
};

// Física spring para el colapso/expansión de la píldora y el stagger de sus hijos.
const pillVariants: Variants = {
    expanded: {
        y: 0,
        opacity: 1,
        width: 'auto',
        transition: {
            y: { type: 'spring', damping: 18, stiffness: 250 },
            opacity: { duration: 0.3 },
            type: 'spring',
            damping: 20,
            stiffness: 300,
            staggerChildren: 0.06,
            delayChildren: 0.12,
        },
    },
    collapsed: {
        y: 0,
        opacity: 1,
        width: '3rem',
        transition: {
            type: 'spring',
            damping: 22,
            stiffness: 320,
            when: 'afterChildren',
            staggerChildren: 0.04,
            staggerDirection: -1,
        },
    },
};

const itemVariants: Variants = {
    expanded: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', damping: 16 } },
    collapsed: { opacity: 0, x: -14, scale: 0.96, transition: { duration: 0.18 } },
};

const collapsedIconVariants: Variants = {
    expanded: { opacity: 0, scale: 0.8, transition: { duration: 0.18 } },
    collapsed: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 15, stiffness: 300, delay: 0.12 } },
};

export const SiteNav: React.FC<SiteNavProps> = ({ theme, onToggleTheme, onContact }) => {
    const location = useLocation();
    const byGroup = servicesByGroup();
    const reduce = useReducedMotion();

    const [expanded, setExpanded] = useState(true);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [openGroup, setOpenGroup] = useState<ServiceGroup | null>(null); // dropdown desktop
    const [mobileGroup, setMobileGroup] = useState<ServiceGroup | null>(null); // acordeón mobile

    const wrapRef = useRef<HTMLDivElement>(null);
    const lastScrollY = useRef(0);
    const collapseAt = useRef(0);
    const closeTimer = useRef<number | undefined>(undefined);

    // Colapso por dirección de scroll (no colapsa con un menú/sheet abierto).
    const { scrollY } = useScroll();
    useMotionValueEvent(scrollY, 'change', (latest) => {
        if (reduce || sheetOpen || openGroup) return;
        const previous = lastScrollY.current;
        if (expanded && latest > previous && latest > COLLAPSE_AFTER) {
            setExpanded(false);
            collapseAt.current = latest;
        } else if (!expanded && latest < previous && collapseAt.current - latest > EXPAND_SCROLL_THRESHOLD) {
            setExpanded(true);
        }
        lastScrollY.current = latest;
    });

    // Cerrar todo al navegar (ruta o ancla).
    useEffect(() => {
        setOpenGroup(null);
        setMobileGroup(null);
        setSheetOpen(false);
    }, [location.pathname, location.hash]);

    // Escape cierra dropdown / sheet; click afuera cierra el dropdown desktop.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpenGroup(null);
                setSheetOpen(false);
            }
        };
        const onClickOutside = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpenGroup(null);
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('click', onClickOutside);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('click', onClickOutside);
            window.clearTimeout(closeTimer.current);
        };
    }, []);

    // Hover de dropdown con cierre diferido: cruzar el aire pill↔panel no lo cierra.
    const openMenu = (g: ServiceGroup) => {
        window.clearTimeout(closeTimer.current);
        if (expanded) setOpenGroup(g);
    };
    const scheduleClose = () => {
        window.clearTimeout(closeTimer.current);
        closeTimer.current = window.setTimeout(() => setOpenGroup(null), 140);
    };

    const themeLabel = theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
    const groupActive = (g: ServiceGroup) => location.pathname.startsWith(`/${g}`);
    const tab = expanded ? 0 : -1;
    const state = expanded ? 'expanded' : 'collapsed';

    return (
        <>
            <div ref={wrapRef} className="cw-navwrap">
                <motion.nav
                    aria-label="Principal"
                    className={`cw-pill ${expanded ? '' : 'is-collapsed'}`}
                    initial={reduce ? 'expanded' : { y: -70, opacity: 0 }}
                    animate={reduce ? 'expanded' : state}
                    variants={pillVariants}
                    whileHover={!expanded ? { scale: 1.08 } : undefined}
                    whileTap={!expanded ? { scale: 0.95 } : undefined}
                    tabIndex={expanded ? -1 : 0}
                    onClick={() => { if (!expanded) setExpanded(true); }}
                    onKeyDown={(e) => { if (!expanded && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setExpanded(true); } }}
                >
                    <motion.div variants={itemVariants} className="cw-pill-brand">
                        <Link to="/" className="cw-brand" aria-label="CreAPP · Software & Agentic Lab — inicio" tabIndex={tab}>
                            <img src="/CREAPP%20LOGO%20VECTOR.png" alt="" width={17} height={30} />
                            <span className="cw-brand-name">CreAPP</span>
                            <span className="cw-brand-tag">IT SOLUTIONS</span>
                        </Link>
                    </motion.div>

                    <motion.ul variants={itemVariants} className="cw-pill-links cw-nav-desktop" aria-hidden={!expanded}>
                        {GROUP_ORDER.map((g) => (
                            <li
                                key={g}
                                className="cw-group"
                                onMouseEnter={() => openMenu(g)}
                                onMouseLeave={scheduleClose}
                            >
                                <button
                                    type="button"
                                    className={`cw-group-btn ${groupActive(g) ? 'is-active' : ''}`}
                                    aria-expanded={openGroup === g}
                                    aria-haspopup="true"
                                    tabIndex={tab}
                                    onClick={(e) => { e.stopPropagation(); setOpenGroup((cur) => (cur === g ? null : g)); }}
                                    onFocus={() => openMenu(g)}
                                >
                                    {GROUP_LABELS[g]}
                                    <ChevronDown size={14} aria-hidden="true" />
                                </button>
                            </li>
                        ))}
                        <li>
                            <Link to="/#contacto" className="cw-nav-flat" tabIndex={tab} onClick={(e) => e.stopPropagation()}>
                                Contacto
                            </Link>
                        </li>
                    </motion.ul>

                    <motion.button
                        variants={itemVariants}
                        type="button"
                        className="cw-icon-btn cw-theme-btn"
                        tabIndex={tab}
                        onClick={(e) => { e.stopPropagation(); onToggleTheme(); }}
                        aria-label={themeLabel}
                        title={themeLabel}
                    >
                        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                    </motion.button>

                    <motion.button
                        variants={itemVariants}
                        type="button"
                        className="cw-btn cw-btn-primary cw-btn-sm cw-nav-cta"
                        tabIndex={tab}
                        onClick={(e) => { e.stopPropagation(); onContact(); }}
                    >
                        Hablemos
                    </motion.button>

                    <motion.button
                        variants={itemVariants}
                        type="button"
                        className="cw-icon-btn cw-burger"
                        tabIndex={tab}
                        onClick={(e) => { e.stopPropagation(); setSheetOpen((o) => !o); }}
                        aria-expanded={sheetOpen}
                        aria-controls="cw-sheet"
                        aria-label={sheetOpen ? 'Cerrar menú' : 'Abrir menú'}
                    >
                        {sheetOpen ? <X size={18} /> : <Menu size={18} />}
                    </motion.button>

                    {/* Estado colapsado: ícono Menu centrado en el círculo. */}
                    <motion.span
                        className="cw-pill-collapsed"
                        variants={collapsedIconVariants}
                        animate={reduce ? 'expanded' : state}
                        aria-hidden="true"
                    >
                        <Menu size={18} />
                    </motion.span>
                </motion.nav>

                {/* Dropdown: fuera de la píldora (no se recorta con overflow), centrado debajo. */}
                <div
                    className="cw-pill-menu-anchor"
                    onMouseEnter={() => window.clearTimeout(closeTimer.current)}
                    onMouseLeave={scheduleClose}
                >
                    <AnimatePresence>
                        {expanded && openGroup && (
                            <motion.div
                                className="cw-pill-menu"
                                role="menu"
                                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            >
                                {byGroup[openGroup].map((s) => {
                                    const Icon = SERVICE_ICON[s.slug] ?? Code;
                                    return (
                                        <Link
                                            key={s.slug}
                                            to={servicePath(s)}
                                            role="menuitem"
                                            className="cw-menu-item"
                                            aria-current={location.pathname === servicePath(s) ? 'true' : undefined}
                                        >
                                            <span className="cw-menu-ico" aria-hidden="true" style={{ color: GROUP_HEX[openGroup] }}>
                                                <Icon size={18} />
                                            </span>
                                            <span className="cw-menu-txt">
                                                <b>{s.title}</b>
                                                <span className="cw-menu-sub">{s.eyebrow}</span>
                                            </span>
                                        </Link>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <div id="cw-sheet" className={`cw-sheet ${sheetOpen ? 'is-open' : ''}`} aria-hidden={!sheetOpen}>
                {GROUP_ORDER.map((g) => (
                    <div key={g} className="cw-acc">
                        <button
                            type="button"
                            className="cw-acc-head"
                            aria-expanded={mobileGroup === g}
                            tabIndex={sheetOpen ? 0 : -1}
                            onClick={() => setMobileGroup((cur) => (cur === g ? null : g))}
                        >
                            {GROUP_LABELS[g]}
                            <ChevronDown size={18} aria-hidden="true" className={mobileGroup === g ? 'cw-acc-caret is-open' : 'cw-acc-caret'} />
                        </button>
                        <div className="cw-acc-body" hidden={mobileGroup !== g}>
                            {byGroup[g].map((s) => (
                                <Link
                                    key={s.slug}
                                    to={servicePath(s)}
                                    className="cw-acc-item"
                                    tabIndex={sheetOpen ? 0 : -1}
                                >
                                    {s.title}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
                <Link to="/#contacto" className="cw-sheet-link" tabIndex={sheetOpen ? 0 : -1}>Contacto</Link>
                <button
                    type="button"
                    className="cw-btn cw-btn-primary"
                    tabIndex={sheetOpen ? 0 : -1}
                    onClick={() => {
                        setSheetOpen(false);
                        onContact();
                    }}
                >
                    Hablemos
                </button>
            </div>
        </>
    );
};

export default SiteNav;
