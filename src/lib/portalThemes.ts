// Theming del INTERIOR del portal por campaña.
// Cada campaña trae su aesthetic_archetype (campaign.aesthetic) y la marca del
// cliente (brandColors). El portal se repinta según el archetype (look curado,
// contraste a salvo) y toma el acento de la marca sólo si es legible sobre el fondo.
//
// Regla: el archetype manda el FONDO y la tipografía (nunca se rompe el contraste);
// la marca del cliente sólo tiñe el ACENTO (botones, bordes, highlights) + logo.
// El login/auth NO se tematiza (ver authShell.tsx): es la puerta fija de CreAPP.

export interface PortalTheme {
  /** Clave del archetype; también va como data-theme para el CSS. */
  key: string;
  bg: string;        // fondo más profundo
  navy: string;      // superficie base
  navy2: string;     // superficie elevada
  ink: string;       // texto principal
  muted: string;     // texto secundario
  line: string;      // bordes/divisores
  accent: string;    // acento de marca (botones, highlights)
  accentDeep: string;
  accentLight: string;
  accentInk: string; // texto SOBRE el acento (contraste garantizado)
  fontDisplay: string; // familia para titulares
  fwDisplay: number;   // peso de los titulares (algunas familias sólo tienen 400)
}

// ok/warn son constantes en todos los temas: el verde = aprobado y el ámbar =
// en revisión deben significar lo mismo para cualquier cliente.
export const STATUS = { ok: '#4ADE80', warn: '#F5C451' } as const;

// executive_wealth === el look editorial navy/oro actual, idéntico al que ya ven
// los clientes en vivo. Es también la base de la que parte portal.css.
const executive_wealth: PortalTheme = {
  key: 'executive_wealth',
  bg: '#04101f', navy: '#071a33', navy2: '#0c2b4f',
  ink: '#e9eef6', muted: '#8aa0bd', line: 'rgba(255,255,255,.08)',
  accent: '#C08457', accentDeep: '#9A5B34', accentLight: '#e4b483', accentInk: '#F4F1EA',
  fontDisplay: 'Fraunces', fwDisplay: 500,
};

const cyber_hud: PortalTheme = {
  key: 'cyber_hud',
  bg: '#050510', navy: '#0a0a18', navy2: '#12122a',
  ink: '#e9ecff', muted: '#8a90b5', line: 'rgba(0,245,212,.16)',
  accent: '#00F5D4', accentDeep: '#10B981', accentLight: '#7CFFE9', accentInk: '#04120f',
  fontDisplay: 'Space Grotesk', fwDisplay: 500,
};

const cinematic_broll: PortalTheme = {
  key: 'cinematic_broll',
  bg: '#0b0f14', navy: '#121820', navy2: '#1a222c',
  ink: '#f3f6fa', muted: '#9fb0c0', line: 'rgba(255,255,255,.10)',
  accent: '#38BDF8', accentDeep: '#0EA5B7', accentLight: '#7DD3FC', accentInk: '#06202a',
  fontDisplay: 'Outfit', fwDisplay: 500,
};

// Materalia y todo corralón/industrial: colorblock navy + amarillo obra.
const bold_colorblock_editorial: PortalTheme = {
  key: 'bold_colorblock_editorial',
  bg: '#0E2A6E', navy: '#16388C', navy2: '#1B43A8',
  ink: '#FFFFFF', muted: '#B9C6E6', line: 'rgba(255,255,255,.14)',
  accent: '#FFD60A', accentDeep: '#E6B800', accentLight: '#FFE66B', accentInk: '#0B1B47',
  fontDisplay: 'Archivo', fwDisplay: 800,
};

const creator_lifestyle: PortalTheme = {
  key: 'creator_lifestyle',
  bg: '#14100f', navy: '#1d1817', navy2: '#271f1c',
  ink: '#f5efe9', muted: '#b7a79a', line: 'rgba(255,255,255,.10)',
  accent: '#E8B4A0', accentDeep: '#C98A72', accentLight: '#F6D3C4', accentInk: '#241a14',
  fontDisplay: 'Fraunces', fwDisplay: 500,
};

const minimal_clean: PortalTheme = {
  key: 'minimal_clean',
  bg: '#0c0c0d', navy: '#151517', navy2: '#1d1d20',
  ink: '#f4f4f5', muted: '#a1a1aa', line: 'rgba(255,255,255,.10)',
  accent: '#E4E4E7', accentDeep: '#A1A1AA', accentLight: '#FAFAFA', accentInk: '#0c0c0d',
  fontDisplay: 'Outfit', fwDisplay: 500,
};

// Default === CreAPP (violeta/negro). Cae acá todo cliente/campaña sin archetype.
const creapp_default: PortalTheme = {
  key: 'default',
  bg: '#070709', navy: '#111118', navy2: '#16162a',
  ink: '#ffffff', muted: '#94a3b8', line: 'rgba(255,255,255,.12)',
  accent: '#A855F7', accentDeep: '#7C3AED', accentLight: '#C084FC', accentInk: '#0a0614',
  fontDisplay: 'Outfit', fwDisplay: 500,
};

export const PORTAL_THEMES: Record<string, PortalTheme> = {
  executive_wealth,
  cyber_hud,
  cinematic_broll,
  bold_colorblock_editorial,
  creator_lifestyle,
  minimal_clean,
  default: creapp_default,
};

// Fuentes que cada tema necesita además de las ya cargadas en index.html.
// (Fraunces, Outfit, Space Grotesk, Inter ya están; Archivo Black no.)
export const THEME_EXTRA_FONTS: Record<string, string> = {
  bold_colorblock_editorial: 'Archivo:wght@500;600;800',
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function norm(hex: string): string | null {
  const h = hex.trim();
  if (!HEX.test(h)) return null;
  if (h.length === 4) return '#' + h.slice(1).split('').map((c) => c + c).join('');
  return h.toLowerCase();
}

/** Luminancia relativa WCAG (0 = negro, 1 = blanco). */
export function luminance(hex: string): number {
  const h = norm(hex);
  if (!h) return 0;
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(h.slice(1 + i, 3 + i), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** "#rrggbb" → "r,g,b" para usar en rgba(var(--wood-rgb),alpha). */
export function hexToRgb(hex: string): string {
  const h = norm(hex);
  if (!h) return '192,132,87';
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  const hi = Math.max(la, lb), lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** Texto legible (blanco o casi-negro) sobre un fondo dado. */
export function inkOn(bg: string): string {
  return contrastRatio('#ffffff', bg) >= contrastRatio('#0b0b0f', bg) ? '#ffffff' : '#0b0b0f';
}

/**
 * Acento del cliente sólo si es legible sobre el fondo del tema.
 * Si el primario de marca no contrasta (ratio < 2.2 vs bg), se conserva el
 * acento curado del archetype: nunca un acento invisible.
 */
export function pickAccent(theme: PortalTheme, brandPrimary?: string | null): { accent: string; accentInk: string } {
  const c = brandPrimary ? norm(brandPrimary) : null;
  if (c && contrastRatio(c, theme.bg) >= 2.2) {
    return { accent: c, accentInk: inkOn(c) };
  }
  return { accent: theme.accent, accentInk: theme.accentInk };
}

// Fuentes de marca que no son Google Fonts (vienen de Fontshare).
const FONTSHARE: Record<string, string> = {
  'cabinet grotesk': 'cabinet-grotesk', 'general sans': 'general-sans',
  'clash display': 'clash-display', 'clash grotesk': 'clash-grotesk',
  'satoshi': 'satoshi', 'switzer': 'switzer', 'bespoke serif': 'bespoke-serif',
};

/** URL del stylesheet para cargar una fuente de marca (Fontshare si corresponde,
 *  si no Google Fonts). Devuelve null si no hay fuente. */
export function fontStylesheetHref(name: string | null | undefined): string | null {
  const n = (name ?? '').trim();
  if (!n) return null;
  const slug = FONTSHARE[n.toLowerCase()];
  if (slug) return `https://api.fontshare.com/v2/css?f[]=${slug}@400,500,700,800&display=swap`;
  return `https://fonts.googleapis.com/css2?family=${n.replace(/ /g, '+')}:wght@400;500;700;800&display=swap`;
}

/** Resuelve el tema de una campaña por su archetype + marca del cliente.
 *  `brandFont`: la tipografía de marca del cliente; si existe, manda sobre la del
 *  archetype (el portal usa la MISMA fuente que las piezas). */
export function themeFor(
  aesthetic: string | null | undefined,
  brandPrimary?: string | null,
  brandFont?: string | null,
): PortalTheme {
  const base = (aesthetic && PORTAL_THEMES[aesthetic]) || PORTAL_THEMES.default;
  const { accent, accentInk } = pickAccent(base, brandPrimary);
  const bf = (brandFont ?? '').trim();
  return { ...base, accent, accentInk, fontDisplay: bf || base.fontDisplay };
}

/** Vars CSS para inyectar en el contenedor .portal (style={{...}}). */
export function themeVars(t: PortalTheme): Record<string, string> {
  return {
    '--bg': t.bg,
    '--navy': t.navy,
    '--navy2': t.navy2,
    '--ink': t.ink,
    '--muted': t.muted,
    '--line': t.line,
    '--wood': t.accent,
    '--wood-rgb': hexToRgb(t.accent),
    '--wood-deep': t.accentDeep,
    '--wood-light': t.accentLight,
    '--cream': t.accentInk,
    '--ok': STATUS.ok,
    '--warn': STATUS.warn,
    '--font-display': `'${t.fontDisplay}'`,
    '--fw-display': String(t.fwDisplay),
  };
}
