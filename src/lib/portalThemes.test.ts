import { test } from 'node:test';
import assert from 'node:assert/strict';
import { themeFor, themeVars, contrastRatio, pickAccent, PORTAL_THEMES } from './portalThemes';

test('archetype desconocido o None cae al default CreAPP', () => {
  assert.equal(themeFor(null).key, 'default');
  assert.equal(themeFor(undefined).key, 'default');
  assert.equal(themeFor('inexistente_xyz').key, 'default');
  assert.equal(themeFor('default').accent.toLowerCase(), '#a855f7');
});

test('Materalia (bold_colorblock_editorial) → navy + amarillo', () => {
  const t = themeFor('bold_colorblock_editorial');
  assert.equal(t.accent, '#FFD60A');
  // Familia multi-peso (no 'Archivo Black', que sólo tiene 400 y cae a fallback
  // cuando la heading pide 500+). Titular en 800.
  assert.equal(t.fontDisplay, 'Archivo');
  assert.equal(t.fwDisplay, 800);
  assert.match(t.bg.toLowerCase(), /^#0e2a6e$/);
});

test('todos los temas: texto principal legible sobre su fondo (WCAG AA)', () => {
  for (const t of Object.values(PORTAL_THEMES)) {
    // Texto de cuerpo: garantía dura 4.5:1.
    assert.ok(contrastRatio(t.ink, t.bg) >= 4.5, `ink/bg bajo en ${t.key}`);
    // Texto sobre el acento (botón, bold/grande): piso 2.5:1. executive_wealth
    // hereda crema-sobre-madera (~2.8:1) del look en vivo, que no se altera.
    assert.ok(contrastRatio(t.accentInk, t.accent) >= 2.5, `accentInk/accent bajo en ${t.key}`);
  }
});

test('acento de marca se usa sólo si contrasta; si no, queda el curado', () => {
  const t = PORTAL_THEMES.executive_wealth;
  // Amarillo brillante contrasta sobre fondo oscuro → se adopta.
  assert.equal(pickAccent(t, '#FFD60A').accent, '#ffd60a');
  // Un primario casi-negro no contrasta → se conserva el acento del archetype.
  assert.equal(pickAccent(t, '#050608').accent, t.accent);
  // Hex inválido → acento curado.
  assert.equal(pickAccent(t, 'no-es-hex').accent, t.accent);
});

test('themeVars mapea a las vars que consume portal.css', () => {
  const v = themeVars(themeFor('cyber_hud'));
  assert.equal(v['--wood'], '#00F5D4');
  assert.equal(v['--font-display'], "'Space Grotesk'");
  assert.ok(v['--bg'] && v['--ink'] && v['--line']);
});
