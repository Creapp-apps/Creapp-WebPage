import React, { useEffect, useState } from 'react';
import { Menu, Moon, Sun, X } from 'lucide-react';
import { NAV } from './content';
import type { SiteTheme } from './theme';

interface SiteNavProps {
    theme: SiteTheme;
    onToggleTheme: () => void;
    onContact: () => void;
}

export const SiteNav: React.FC<SiteNavProps> = ({ theme, onToggleTheme, onContact }) => {
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState<string>('');

    // Fondo de la nav + link activo = última sección de la nav que ya pasó la mitad de la
    // pantalla. Así los capítulos de las 6 áreas cuentan como "Servicios".
    useEffect(() => {
        let raf = 0;
        const update = () => {
            raf = 0;
            setScrolled(window.scrollY > 24);
            const mid = window.innerHeight * 0.5;
            let current = '';
            for (const n of NAV) {
                const el = document.querySelector(n.href);
                if (el && el.getBoundingClientRect().top <= mid) current = n.href;
            }
            setActive(current);
        };
        const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(update);
        };
        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const themeLabel = theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';

    return (
        <>
            <header className={`cw-nav ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
                <div className="cw-wrap cw-nav-in">
                    <a href="#top" className="cw-brand" aria-label="CreAPP · IT Solutions — inicio">
                        <img src="/CREAPP%20LOGO%20VECTOR.png" alt="" width={17} height={30} />
                        <span className="cw-brand-name">CreAPP</span>
                        <span className="cw-brand-tag">IT SOLUTIONS</span>
                    </a>

                    <nav aria-label="Principal">
                        <ul className="cw-nav-links">
                            {NAV.map((n) => (
                                <li key={n.href}>
                                    <a href={n.href} aria-current={active === n.href ? 'true' : undefined}>
                                        {n.label}
                                    </a>
                                </li>
                            ))}
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
                        onClick={() => setOpen((o) => !o)}
                        aria-expanded={open}
                        aria-controls="cw-sheet"
                        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
                    >
                        {open ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </header>

            <div id="cw-sheet" className={`cw-sheet ${open ? 'is-open' : ''}`} aria-hidden={!open}>
                {NAV.map((n, i) => (
                    <a
                        key={n.href}
                        href={n.href}
                        className="cw-sheet-link"
                        tabIndex={open ? 0 : -1}
                        onClick={() => setOpen(false)}
                    >
                        {n.label}
                        <span className="cw-mono">0{i + 1}</span>
                    </a>
                ))}
                <button
                    type="button"
                    className="cw-btn cw-btn-primary"
                    tabIndex={open ? 0 : -1}
                    onClick={() => {
                        setOpen(false);
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
