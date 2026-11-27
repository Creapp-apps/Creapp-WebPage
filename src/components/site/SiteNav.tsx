import React, { useEffect, useRef, useState } from 'react';
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

export const SiteNav: React.FC<SiteNavProps> = ({ theme, onToggleTheme, onContact }) => {
    const location = useLocation();
    const byGroup = servicesByGroup();
    const [scrolled, setScrolled] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [openGroup, setOpenGroup] = useState<ServiceGroup | null>(null); // desktop dropdown
    const [mobileGroup, setMobileGroup] = useState<ServiceGroup | null>(null); // mobile accordion
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

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
            if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
        };
        window.addEventListener('keydown', onKey);
        window.addEventListener('click', onClickOutside);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('click', onClickOutside);
        };
    }, []);

    const themeLabel = theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
    const groupActive = (g: ServiceGroup) => location.pathname.startsWith(`/${g}`);

    return (
        <>
            <header ref={navRef} className={`cw-nav ${scrolled ? 'is-scrolled' : ''} ${sheetOpen ? 'is-open' : ''}`}>
                <div className="cw-wrap cw-nav-in">
                    <Link to="/" className="cw-brand" aria-label="CreAPP · Software & Agentic Lab — inicio">
                        <img src="/CREAPP%20LOGO%20VECTOR.png" alt="" width={17} height={30} />
                        <span className="cw-brand-name">CreAPP</span>
                        <span className="cw-brand-tag">IT SOLUTIONS</span>
                    </Link>

                    <nav aria-label="Principal" className="cw-nav-desktop">
                        <ul className="cw-nav-links">
                            {GROUP_ORDER.map((g) => (
                                <li
                                    key={g}
                                    className="cw-group"
                                    onMouseEnter={() => setOpenGroup(g)}
                                    onMouseLeave={() => setOpenGroup((cur) => (cur === g ? null : cur))}
                                >
                                    <button
                                        type="button"
                                        className={`cw-group-btn ${groupActive(g) ? 'is-active' : ''}`}
                                        aria-expanded={openGroup === g}
                                        aria-haspopup="true"
                                        onClick={() => setOpenGroup((cur) => (cur === g ? null : g))}
                                        onFocus={() => setOpenGroup(g)}
                                    >
                                        {GROUP_LABELS[g]}
                                        <ChevronDown size={14} aria-hidden="true" />
                                    </button>
                                    <div className="cw-menu" role="menu" hidden={openGroup !== g}>
                                        {byGroup[g].map((s) => {
                                            const Icon = SERVICE_ICON[s.slug] ?? Code;
                                            return (
                                                <Link
                                                    key={s.slug}
                                                    to={servicePath(s)}
                                                    role="menuitem"
                                                    className="cw-menu-item"
                                                    aria-current={location.pathname === servicePath(s) ? 'true' : undefined}
                                                >
                                                    <span
                                                        className="cw-menu-ico"
                                                        aria-hidden="true"
                                                        style={{ color: GROUP_HEX[g] }}
                                                    >
                                                        <Icon size={18} />
                                                    </span>
                                                    <span className="cw-menu-txt">
                                                        <b>{s.title}</b>
                                                        <span className="cw-menu-sub">{s.eyebrow}</span>
                                                    </span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </li>
                            ))}
                            <li>
                                <Link to="/#contacto" className="cw-nav-flat">Contacto</Link>
                            </li>
                        </ul>
                    </nav>

                    <button
                        type="button"
                        className="cw-icon-btn cw-theme-btn"
                        onClick={onToggleTheme}
                        aria-label={themeLabel}
                        title={themeLabel}
                    >
                        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                    </button>

                    <button type="button" className="cw-btn cw-btn-primary cw-btn-sm cw-nav-cta" onClick={onContact}>
                        Hablemos
                    </button>

                    <button
                        type="button"
                        className="cw-icon-btn cw-burger"
                        onClick={() => setSheetOpen((o) => !o)}
                        aria-expanded={sheetOpen}
                        aria-controls="cw-sheet"
                        aria-label={sheetOpen ? 'Cerrar menú' : 'Abrir menú'}
                    >
                        {sheetOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </header>

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
