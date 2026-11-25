import { useEffect, useMemo } from 'react';
import type React from 'react';
import type { PortalCampaign } from '@/lib/portalTypes';
import { themeFor, themeVars, THEME_EXTRA_FONTS, fontStylesheetHref } from '@/lib/portalThemes';

// Tema del interior del portal según la campaña: archetype (fondo + fuente) +
// acento de marca si contrasta. Devuelve las vars CSS para el contenedor .portal
// y carga la fuente extra del tema (ej. Archivo Black para Materalia) si hace falta.
export function usePortalTheme(
  campaign: Pick<PortalCampaign, 'aesthetic' | 'client'> | null | undefined,
): { style: React.CSSProperties; dataTheme: string } {
  const aesthetic = campaign?.aesthetic ?? null;
  const brandPrimary = campaign?.client?.brandColors?.primary ?? null;
  const brandFont = campaign?.client?.brandFont ?? null;
  const theme = useMemo(() => themeFor(aesthetic, brandPrimary, brandFont), [aesthetic, brandPrimary, brandFont]);

  useEffect(() => {
    const fam = THEME_EXTRA_FONTS[theme.key];
    if (!fam) return;
    const id = `portal-font-${fam}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fam}&display=swap`;
    document.head.appendChild(link);
  }, [theme.key]);

  // Carga la fuente de marca del cliente (Fontshare o Google) para los titulares.
  useEffect(() => {
    const href = fontStylesheetHref(brandFont);
    if (!href) return;
    const id = `portal-brandfont-${brandFont}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [brandFont]);

  return { style: themeVars(theme) as React.CSSProperties, dataTheme: theme.key };
}
