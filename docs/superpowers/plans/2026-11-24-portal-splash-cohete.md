# Portal — Splash cohete · Implementation Plan

> Ejecución nativa (executing-plans). Steps con checkbox.

**Goal:** Reemplazar el spinner de carga del portal cliente por una splash de cohete (se arma → despega) que se tiñe fluido al color de la campaña, una vez por sesión, seguida de un reveal escalonado del contenido.

**Spec:** `docs/superpowers/specs/2026-11-24-portal-splash-cohete-design.md`

**Tech:** Vite + React + TS + `portal.css` (vars de tema). SVG inline portado de `desktop/renderer/preflight.html`. Verificación: tsc + build + screenshots de secuencia.

## Global Constraints
- Sin assets ni librerías nuevas; CSS keyframes. Respetar `prefers-reduced-motion`.
- No romper el visor one-by-one ni el theming por campaña.
- Ante cualquier error de la splash, caer al contenido (nunca colgar el ingreso).

## Review Focus
- **Datos ya cacheados / instantáneos** → la splash igual corre el armado mínimo antes de despegar (no despega en 0ms). → Task 2 (gate armado+ready).
- **Datos lentos** → el cohete queda en idle (float+llama) hasta `ready`, sin despegar ni colgar. → Task 2.
- **Campaña vacía o error de datos** → despega igual y revela empty/error. → Task 2.
- **Segunda carga en la sesión** (`splash_seen`) → sin splash completa; carga mínima + contenido. → Task 2.
- **reduced-motion** → sin armado/despegue; tinte aplicado de una + fade simple. → Task 1 (estado estático) + Task 2 (onDone inmediato).

---

### Task 1: Componente `PortalSplash` + CSS

**Files:** Create `src/components/portal/PortalSplash.tsx`; Modify `src/components/portal/portal.css` (keyframes + estilos splash).

**Interfaces:** `PortalSplash(props: { ready: boolean; accent: { color: string; deep: string; bg: string } | null; onDone: () => void })`.
- Renderiza estrellas + cohete SVG (partes: engines, fins, body, nose, window, flame, sparks — portadas del desktop).
- Timeline interno: armado escalonado (~1.2s, clase `.on` a cada parte con stagger) → cuando `ready && armado-mínimo cumplido`, breve beat → `launch` (liftoff ~1.3s) → `onDone()`.
- Tinte: cuando `accent` llega, setea vars `--sp-acc/--sp-deep/--sp-bg` (en el contenedor) con `transition` ~0.9s; el gradiente del cohete, glow y estrellas las consumen → el color glidea a la marca.
- reduced-motion: sin animación; cohete armado estático con el tinte aplicado; `onDone()` tras ~0.6s.

- [ ] Step 1: Implementar `PortalSplash.tsx` con la interfaz y el timeline (estado `phase`, timers con cleanup, `onDone` una sola vez).
- [ ] Step 2: Keyframes/estilos en `portal.css` (stars, pop de partes, float idle, liftoff, flame/flicker, sparks, vars de tinte).
- [ ] Step 3: Verificar `npx tsc --noEmit` (0).
- [ ] Step 4: Commit.

---

### Task 2: Orquestación en `PortalView` + reveal del contenido

**Files:** Modify `src/pages/PortalView.tsx`; Create `src/lib/splashSession.ts` (helper `hasSeenSplash()`, `markSplashSeen()` sobre `sessionStorage`, try/catch); Modify `portal.css` (clases de reveal).

**Interfaces:** Consume `PortalSplash` (Task 1), `themeFor` (para `accent`), `splashSession`.

- [ ] Step 1: `splashSession.ts` — `hasSeenSplash(): boolean` y `markSplashSeen(): void` con key `creapp_portal_splash_seen`, envueltos en try/catch (sin romper en modo privado).
- [ ] Step 2: En `PortalView`: estado `splashDone`; `shouldSplash = !hasSeenSplash()` (una vez). Si `shouldSplash && !splashDone`, renderizar `<PortalSplash ready={campaigns!==undefined} accent={accent} onDone={()=>{ markSplashSeen(); setSplashDone(true); }} />`. `accent` desde `themeFor(campaign.aesthetic, campaign.client.brandColors?.primary)` cuando `campaigns` cargó (si no, null). El resto del flujo (loader seen-path, empty, contenido) queda tras `splashDone`/`!shouldSplash`.
- [ ] Step 3: Reveal — envolver el contenido del visor con una clase (`.reveal`) que dispare slide/fade in escalonado al montar; el contenedor `.portal` ya lleva el tema de campaña (continuidad con el tinte). Clases en `portal.css`.
- [ ] Step 4: Verificar `npx tsc --noEmit` (0) · `npm test` (verde) · `npm run build` (ok).
- [ ] Step 5: Verificación visual — dev, login materalia en sesión limpia; secuencia de screenshots (armado → tinte amarillo → despegue → contenido). Confirmar que en segunda carga de la sesión no corre la splash completa.
- [ ] Step 6: Commit.
