import { useCallback, useEffect, useState } from 'react';

export type SiteTheme = 'dark' | 'light';
const KEY = 'creapp_site_theme';

function readStored(): SiteTheme {
    try {
        const v = localStorage.getItem(KEY);
        if (v === 'light' || v === 'dark') return v;
    } catch { /* storage bloqueado: default */ }
    return 'dark';
}

/**
 * Tema del sitio público. Marca <html data-site data-theme="…"> mientras la landing
 * está montada y lo limpia al salir (admin y portal no heredan nada).
 */
export function useSiteTheme() {
    const [theme, setTheme] = useState<SiteTheme>(readStored);

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-site', '');
        return () => {
            root.removeAttribute('data-site');
            root.removeAttribute('data-theme');
        };
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem(KEY, theme); } catch { /* noop */ }
    }, [theme]);

    const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
    return { theme, toggle };
}

/** Lee un token CSS ya resuelto (para canvas). */
export function readToken(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Avisa cuando cambia el tema, para que los canvas recoloreen. */
export function onThemeChange(cb: () => void): () => void {
    const mo = new MutationObserver(cb);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
}
