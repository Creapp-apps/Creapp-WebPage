# Transiciones de navegación del sitio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al navegar entre páginas del sitio público, el contenido entra con desliz lateral + fade bajo el lenguaje de motion existente, con la navbar fija.

**Architecture:** Un `SiteShell` (layout route de React Router) renderiza el chrome persistente (nav, footer, modal de contacto, theme) y envuelve el `<Outlet/>` en `AnimatePresence mode="wait"` de framer-motion. Home y ServicePage dejan de renderizar su propio chrome y piden el modal por contexto. El desliz es en x (no toca el cálculo vertical de GSAP ScrollTrigger).

**Tech Stack:** React 19 + React Router 6 + framer-motion@12 + GSAP ScrollTrigger + Lenis (todo ya instalado).

**Spec:** `docs/superpowers/specs/2026-11-27-site-page-transitions-design.md`

## Global Constraints

- Valores de motion salen SIEMPRE de `src/components/site/motion/tokens.ts` (`EASE.cout` = `cubic-bezier(.33,1,.68,1)`, `DUR.base` = 0.6). Nadie hardcodea curvas.
- Alcance: SOLO rutas del sitio (`/` y `/:group/:slug`). No tocar admin/portal/propuesta/contrato.
- `prefers-reduced-motion` → sin desliz (solo fade o instantáneo); nada queda invisible.
- Desliz en **x** únicamente (nunca y): preserva las medidas de ScrollTrigger / el pin del home.
- Tests del proyecto corren con `node --test` (archivos `src/lib/*.test.ts`). Componentes/wiring se verifican con `tsc` + `vite build` + preview (no hay harness de componentes).
- Sin push ni deploy (convención del rediseño). Commits locales ok.

## Review Focus

- **reduced-motion:** las variantes no deben tener `x` cuando reduce está activo → cubierto por test en Task 1.
- **Pin del Agentic Lab:** al volver al home tras navegar, el pin-scrub debe seguir midiendo bien → `ScrollTrigger.refresh()` al entrar (Task 2); verificación visual en preview.
- **Reset de scroll:** cada navegación arranca arriba, no a media página → Task 2; preview.
- **Navbar persistente / lazy:** la nav no debe desaparecer ni duplicarse cuando una ruta lazy suspende → Suspense interno en el shell (Task 2); preview.
- **Primera carga de ruta no cacheada:** puede verse el fallback una vez; no debe romper ni dejar pantalla en blanco → Task 2/3; preview.

---

### Task 1: Helper puro de variantes de transición (`pageTransition.ts`)

**Files:**
- Create: `src/components/site/motion/pageTransition.ts`
- Modify: `src/components/site/motion/index.ts` (re-export)
- Test: `src/lib/pageTransition.test.ts`

**Interfaces:**
- Consumes: `DUR`, `EASE` de `./tokens`.
- Produces:
  - `bezier(css: string): [number, number, number, number]` — parsea `'cubic-bezier(a,b,c,d)'`.
  - `PAGE_ENTER_X = 40`, `PAGE_EXIT_X = -24` (px).
  - `pageTransitionVariants(reduced: boolean): { initial; animate; exit }` — objeto de variants de framer-motion. No-reduced: `initial {opacity:0, x:40}`, `animate {opacity:1, x:0, transition:{duration:0.6, ease:[.33,1,.68,1]}}`, `exit {opacity:0, x:-24, transition:{...}}`. Reduced: sin `x`, solo opacity, `duration: DUR.fast`.

- [ ] **Step 1: Write the failing test** en `src/lib/pageTransition.test.ts` (`node:test`):

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bezier, pageTransitionVariants, PAGE_ENTER_X, PAGE_EXIT_X } from '../components/site/motion/pageTransition';
import { EASE, DUR } from '../components/site/motion/tokens';

test('bezier parsea cout a [.33,1,.68,1]', () => {
  assert.deepEqual(bezier(EASE.cout), [0.33, 1, 0.68, 1]);
});

test('variants normales: desliz x + fade con tokens', () => {
  const v = pageTransitionVariants(false);
  assert.equal(v.initial.x, PAGE_ENTER_X);
  assert.equal(v.animate.x, 0);
  assert.equal(v.exit.x, PAGE_EXIT_X);
  assert.equal(v.animate.transition.duration, DUR.base);
  assert.deepEqual(v.animate.transition.ease, [0.33, 1, 0.68, 1]);
});

test('variants reduced-motion: sin x, solo fade', () => {
  const v = pageTransitionVariants(true);
  assert.equal(v.initial.x, undefined);
  assert.equal(v.exit.x, undefined);
  assert.equal(v.initial.opacity, 0);
});
```

- [ ] **Step 2: Run test, verify fail** — `npx tsx --test src/lib/pageTransition.test.ts` (o `npm test`). Expected: FAIL (module no existe).
- [ ] **Step 3: Implement** `pageTransition.ts` con las firmas de arriba; `bezier` hace `css.match(/cubic-bezier\(([^)]+)\)/)` → split/Number. Re-export desde `index.ts`.
- [ ] **Step 4: Run test, verify pass.**
- [ ] **Step 5: Commit** — `feat(motion): page-transition variants (slide+fade, reduced-motion)`.

---

### Task 2: `SiteShell` — chrome persistente + AnimatePresence

**Files:**
- Create: `src/components/site/SiteShell.tsx`

**Interfaces:**
- Consumes: `pageTransitionVariants`, `prefersReducedMotion`/`refreshScrollTriggers` de `./motion`; `useSiteTheme` de `./theme`; `SiteNav`; `ContactModal` de `../ui/ContactModal`; `Outlet`, `useLocation`, `useOutlet` de `react-router-dom`; `AnimatePresence`, `motion`, `useReducedMotion` de `framer-motion`.
- Produces:
  - `SiteChromeContext` + `useSiteChrome(): { openContact: () => void }`.
  - `SiteShell` (default export) — componente de layout route.

- [ ] **Step 1: Implement `SiteShell`**:
  - Estado `contactOpen`; `openContact = () => setContactOpen(true)`; `useSiteTheme()` para theme/toggle.
  - Render: `<div className="cw" id="top">` → skip-link `<a href="#contenido" className="cw-skip">` → `<SiteNav theme onToggleTheme={toggle} onContact={openContact} />` → **Suspense interno** `<Suspense fallback={<div className="cw-route-fallback" />}>` envolviendo `<AnimatePresence mode="wait" onExitComplete={resetScroll}>` con un `<motion.div key={location.pathname} {...variants}>` que contiene el `useOutlet()` snapshot → `<footer className="cw-footer">…</footer>` (mover el markup del footer acá, idéntico al actual) → `<ContactModal isOpen={contactOpen} onClose=…/>`.
  - `variants = pageTransitionVariants(useReducedMotion() ?? prefersReducedMotion())`; aplicar como `initial/animate/exit`.
  - `resetScroll`: `window.scrollTo(0,0)`; intentar lenis si está disponible; `refreshScrollTriggers()`. También `onAnimationComplete` del `motion.div` → `refreshScrollTriggers()`.
  - Envolver todo en `<SiteChromeContext.Provider value={{ openContact }}>`.
- [ ] **Step 2: tsc** — `npx tsc --noEmit`. Expected: 0 (puede fallar hasta que Task 3 consuma el contexto; si hay error solo por imports no usados, resolver acá).
- [ ] **Step 3: Commit** — `feat(site): SiteShell con chrome persistente + AnimatePresence de ruta`.

---

### Task 3: Cablear layout route y sacar el chrome de las páginas

**Files:**
- Modify: `src/App.tsx` (import NO-lazy de `SiteShell`; layout route)
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/components/site/ServicePage.tsx`

**Interfaces:**
- Consumes: `SiteShell`, `useSiteChrome` de `../components/site/SiteShell`.

- [ ] **Step 1: `App.tsx`** — importar `SiteShell` directo (no `React.lazy`). Reemplazar las dos rutas del sitio por una layout route:
  ```tsx
  <Route element={<SiteShell />}>
    <Route path="/" element={<HomePage />} />
    <Route path="/:group/:slug" element={<ServicePageRoute />} />
  </Route>
  ```
  El resto de `<Routes>` queda igual. `HomePage`/`ServicePage` siguen lazy.
- [ ] **Step 2: `HomePage.tsx`** — quitar: skip-link, `<SiteNav>`, `<footer>`, `<ContactModal>`, estado `contactOpen`, `useSiteTheme`. Reemplazar el `return` para renderizar SOLO `<main id="contenido">…</main>` (sin el wrapper `cw`/`#top`, que ahora vive en el shell). `openContact` sale de `useSiteChrome()`. Conservar intactos hero refs/efectos (SplitText, parallax) y el `useEffect` de hash-scroll.
- [ ] **Step 3: `ServicePage.tsx`** — igual: quitar skip/nav/footer/modal/theme/contactOpen; `return` solo `<main id="contenido">…</main>`; `onContact` → `useSiteChrome().openContact`. Mantener el early-return `<Navigate to="/" />` si no hay service.
- [ ] **Step 4: Verify** — `npx tsc --noEmit` (0) · `npx vite build` (OK) · `npm test` (183/183 + los 3 de Task 1).
- [ ] **Step 5: Commit** — `feat(site): transiciones de ruta con desliz+fade y navbar persistente`.

---

### Task 4: QA visual en preview (gate del usuario)

- [ ] Preview `:5199` (ya corre con HMR). Verificar, desktop y mobile 320–2560px:
  - Home ↔ servicios, ida y vuelta: contenido desliza desde la derecha + fade; la barra queda fija.
  - El scroll arranca arriba en cada navegación.
  - Al volver al home, el pin del Agentic Lab sigue andando.
  - Con reduced-motion (Ajustes macOS): sin desliz, todo legible.
  - Sin doble navbar ni pantalla en blanco; el fallback a lo sumo parpadea en la primera visita a una ruta.
