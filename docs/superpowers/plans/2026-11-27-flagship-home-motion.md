# Flagship Home Motion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al home un lenguaje de motion scroll-linked (revelados con máscara, parallax, 1 momento pin-scrub firma) consistente, sobre GSAP ScrollTrigger + Lenis ya instalados.

**Architecture:** Un set único de tokens (easings/duraciones/stagger) + 4 primitivas React reusables en `src/components/site/motion/` (MaskReveal, StaggerGroup, ParallaxLayer, PinScrub) montadas sobre gsap/ScrollTrigger (Lenis ya cableado en `SmoothScroll.tsx`). Se aplican al `HomePage.tsx` y sus secciones; el único pin-scrub firma es la Metodología (AgenticLab3D) scrubbeada vía su `MachineApi`. Convive con el `Reveal`/`.is-in` existente sin tocarlo.

**Tech Stack:** React 19 + Vite + TypeScript · gsap@3.14 (ScrollTrigger, SplitText) · lenis@1.3 · three (escenas existentes). Tests: `node --import tsx --test` (node:test) para lógica pura; verificación visual por build + screenshot headless (Chrome + puppeteer-core, patrón ya usado en el repo).

**Spec:** `docs/superpowers/specs/2026-11-27-flagship-home-motion-design.md`

## Global Constraints

- **Scroll-linked, SIN hijack:** nunca `preventDefault` sobre wheel/touch; el contenido scrollea normal; las animaciones se atan al progreso o disparan al entrar.
- **Un solo set de tokens** para todo easing/duración/stagger (consistencia = premium). Valores exactos en `tokens.ts` (Task 1), nadie hardcodea curvas sueltas.
- **`prefers-reduced-motion: reduce`** → cada primitiva muestra su **estado final** sin animación (contenido completo visible); los `PinScrub` no pinean.
- **Touch/mobile:** Lenis ya usa scroll nativo en touch (`SmoothScroll.tsx`); los `PinScrub` **no pinean** en touch (degradan a reveal/parallax). Sin scroll horizontal, gutter 16px.
- **No romper lo existente:** no tocar la clase `.is-in` ni `.cw-gfx*` de `site.css` (disparan animaciones internas). MaskReveal convive; usa sus propias clases/refs.
- **Performance:** sólo transforms GPU (`translate`/`scale`), `will-change` acotado, 1 solo pin, limpiar ScrollTriggers al desmontar, pausar escenas WebGL fuera de viewport (ya lo hacen).
- **Verificación mínima por tarea visual:** `tsc --noEmit` 0 y `vite build` OK; `npm test` verde donde haya lógica pura.

## Review Focus

- **reduced-motion** en cada primitiva: con `reduce`, el contenido debe verse **completo y final** (nunca opacity:0 colgado). → test en Task 1 (helper) + verificación visual en Tasks 3-6.
- **Desmontaje/navegación SPA:** al salir del home (React Router) los ScrollTrigger/pins deben matarse (sin leaks ni "pin-spacer" huérfano). → paso de cleanup verificado en Tasks 6 y 8.
- **Touch:** en touch no debe pinear ni romper el scroll nativo. → verificación en Task 6 (viewport touch).
- **ScrollTrigger.refresh tras layout:** fuentes/imágenes/escenas que cargan tarde cambian alturas → posiciones de trigger desfasadas si no se refresca. → paso de refresh en Task 2 (runtime) y uso en Tasks 7-9.
- **SSR/undefined window:** el repo es Vite SPA (sin SSR), pero las primitivas no deben ejecutar gsap en import-time; sólo en efectos. → patrón fijado en Task 3, revisado en self-review.

---

### Task 1: Motion tokens + curva glide-then-settle (lógica pura, testeada)

**Files:**
- Create: `src/components/site/motion/tokens.ts`
- Test: `src/lib/motionTokens.test.ts`

**Interfaces:**
- Produces:
  - `EASE: { qout: string; cout: string; cin: string; expo: string }` (strings `cubic-bezier(...)` para CSS/gsap).
  - `DUR: { fast: number; base: number; slow: number; cinematic: number }` (segundos: 0.35, 0.6, 0.9, 1.3).
  - `STAGGER: number` (0.08).
  - `glideSettleOffsets(count: number): number[]` — genera `count` offsets (fracción 0..1 de desplazamiento restante) para la entrada "glide-then-settle" del spec: `f(t)=1−1.506·t` para `t<0.47`, luego `f(t)=0.293·e^(−(t−0.47)/0.232)`, con `t = i/(count−1)·1.8`; primer valor ≈1, **último exactamente 0**, monótona decreciente.

- [ ] **Step 1: Write the failing test** en `src/lib/motionTokens.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EASE, DUR, STAGGER, glideSettleOffsets } from '../components/site/motion/tokens';

test('tokens tienen los valores del spec', () => {
  assert.equal(EASE.qout, 'cubic-bezier(.25,1,.5,1)');
  assert.equal(EASE.cout, 'cubic-bezier(.33,1,.68,1)');
  assert.equal(EASE.cin, 'cubic-bezier(.32,0,.67,0)');
  assert.equal(DUR.base, 0.6);
  assert.equal(STAGGER, 0.08);
});

test('glideSettleOffsets: empieza cerca de 1, termina en 0, monótona', () => {
  const o = glideSettleOffsets(55);
  assert.equal(o.length, 55);
  assert.ok(o[0] > 0.9);
  assert.equal(o[o.length - 1], 0);
  for (let i = 1; i < o.length; i++) assert.ok(o[i] <= o[i - 1] + 1e-9);
});
```

- [ ] **Step 2: Run test — verify it FAILS** · `npm test 2>&1 | grep motionTokens` → FAIL (módulo inexistente).
- [ ] **Step 3: Implement `tokens.ts`** con los valores/funciones de la interfaz. `glideSettleOffsets` clampa a ≥0 y fuerza `out[count-1]=0`.
- [ ] **Step 4: Run test — PASS** · `npm test 2>&1 | tail -4` → 0 fail.
- [ ] **Step 5: Commit** · `git add src/components/site/motion/tokens.ts src/lib/motionTokens.test.ts && git commit -m "feat(motion): tokens + glide-settle curve"`

---

### Task 2: Runtime de motion (reduced-motion, touch, registro ScrollTrigger)

**Files:**
- Create: `src/components/site/motion/runtime.ts`

**Interfaces:**
- Consumes: gsap, `gsap/ScrollTrigger`.
- Produces:
  - Efecto de import: `gsap.registerPlugin(ScrollTrigger)` (idempotente).
  - `prefersReducedMotion(): boolean` (lee `matchMedia`, guard SSR).
  - `isTouch(): boolean` (`ontouchstart`/`maxTouchPoints`).
  - `refreshScrollTriggers(): void` → `ScrollTrigger.refresh()`.
  - `onFontsAndLayoutReady(cb): void` → llama `cb` tras `document.fonts.ready` + 2 rAF (para refrescar triggers cuando cambian alturas).

- [ ] **Step 1: Implement `runtime.ts`** con lo anterior. Nada corre en import salvo `registerPlugin`. Sin `window` en top-level sin guard.
- [ ] **Step 2: Verify** · `npx tsc --noEmit` → 0 errores.
- [ ] **Step 3: Commit** · `git commit -am "feat(motion): runtime helpers (reduced-motion, touch, ST refresh)"`

---

### Task 3: Primitiva `MaskReveal`

**Files:**
- Create: `src/components/site/motion/MaskReveal.tsx`
- Create: `src/components/site/motion/motion.css`

**Interfaces:**
- Consumes: `EASE`, `DUR` (Task 1), `prefersReducedMotion`, runtime (Task 2), gsap/ScrollTrigger.
- Produces: `MaskReveal` componente.
  ```ts
  type MaskRevealProps = {
    children: React.ReactNode;
    as?: keyof JSX.IntrinsicElements;   // default 'div'
    delay?: number;                      // s, default 0
    dur?: number;                        // s, default DUR.slow
    y?: string;                          // from offset, default '100%'
    once?: boolean;                      // default true
    className?: string;
  };
  ```
- Comportamiento: wrapper con `overflow:hidden`; inner con `transform: translateY(y)` → a `0` vía gsap tween disparado por `ScrollTrigger` al entrar (`start: 'top 85%'`). `prefersReducedMotion` → inner en estado final (sin tween). Limpia su ScrollTrigger al desmontar.

- [ ] **Step 1: Implement `MaskReveal.tsx` + clases en `motion.css`** (`.cw-mask{overflow:hidden}` etc.). Usa `useLayoutEffect` + `gsap.context` para scoping y cleanup.
- [ ] **Step 2: Verify build** · `npx tsc --noEmit` 0 · `npx vite build` OK.
- [ ] **Step 3: Visual QA (headless)** — montar temporalmente `MaskReveal` en el hero no hace falta; se valida junto al wireup del hero (Task 7). Marcar OK por build aquí.
- [ ] **Step 4: Commit** · `git commit -am "feat(motion): MaskReveal primitive"`

---

### Task 4: Primitiva `StaggerGroup`

**Files:**
- Create: `src/components/site/motion/StaggerGroup.tsx`

**Interfaces:**
- Consumes: `STAGGER`, `EASE`, `DUR`, runtime.
- Produces: `StaggerGroup`.
  ```ts
  type StaggerGroupProps = {
    children: React.ReactNode;
    step?: number;        // s between items, default STAGGER
    dur?: number;         // s, default DUR.base
    from?: 'up' | 'down'; // default 'up'
    glide?: boolean;      // usa glideSettleOffsets para la entrada, default false
    className?: string;
  };
  ```
- Comportamiento: anima los **hijos directos** (`opacity 0→1`, `translateY(±24px|glide)→0`) escalonados al entrar (ScrollTrigger). `glide` usa la curva de Task 1 para las cards de Clientes. reduced-motion → estado final. Cleanup al desmontar.

- [ ] **Step 1: Implement `StaggerGroup.tsx`.**
- [ ] **Step 2: Verify** · `tsc` 0 · `vite build` OK.
- [ ] **Step 3: Commit** · `git commit -am "feat(motion): StaggerGroup primitive"`

---

### Task 5: Primitiva `ParallaxLayer`

**Files:**
- Create: `src/components/site/motion/ParallaxLayer.tsx`

**Interfaces:**
- Consumes: runtime, gsap/ScrollTrigger.
- Produces: `ParallaxLayer`.
  ```ts
  type ParallaxLayerProps = {
    children: React.ReactNode;
    speed?: number;    // -1..1; desplaz. relativo al scroll del contenedor, default 0.15
    scale?: number;    // escala extra al atravesar viewport, default 0 (none)
    className?: string;
  };
  ```
- Comportamiento: `y` (y opcional `scale`) atados al progreso de scroll de su sección con `scrub: true`. reduced-motion → sin transform. Cleanup al desmontar.

- [ ] **Step 1: Implement `ParallaxLayer.tsx`.**
- [ ] **Step 2: Verify** · `tsc` 0 · `vite build` OK.
- [ ] **Step 3: Commit** · `git commit -am "feat(motion): ParallaxLayer primitive"`

---

### Task 6: Primitiva `PinScrub`

**Files:**
- Create: `src/components/site/motion/PinScrub.tsx`

**Interfaces:**
- Consumes: runtime, `isTouch`, `prefersReducedMotion`, gsap/ScrollTrigger.
- Produces: `PinScrub`.
  ```ts
  type PinScrubProps = {
    children: React.ReactNode;
    length?: number;              // múltiplo de viewport que dura el pin, default 1.4
    onProgress?: (p: number) => void; // 0..1 durante el scrub
    className?: string;
  };
  ```
- Comportamiento: en desktop no-touch y sin reduced-motion, pinea el contenedor y llama `onProgress(0..1)` con `scrub`. En **touch o reduced-motion NO pinea** (renderiza children normal, llama `onProgress(1)` una vez al entrar). Mata el ScrollTrigger (y su pin-spacer) al desmontar.

- [ ] **Step 1: Implement `PinScrub.tsx`** + barrel `src/components/site/motion/index.ts` que reexporta las 4 primitivas y los tokens.
- [ ] **Step 2: Verify** · `tsc` 0 · `vite build` OK.
- [ ] **Step 3: Verify cleanup/touch (headless)** — script puppeteer: cargar `/`, confirmar que con viewport desktop existe `.gsap-pin-spacer` cuando el pin está activo y que al navegar a otra ruta y volver no se duplica; con `hasTouch:true` NO hay pin-spacer. Documentar resultado.
- [ ] **Step 4: Commit** · `git commit -am "feat(motion): PinScrub primitive + barrel"`

---

### Task 7: Wireup del Hero (MaskReveal copy + SplitText H1 + parallax)

**Files:**
- Modify: `src/pages/HomePage.tsx` (bloque `cw-hero`)
- Modify: `src/components/site/RocketHero.tsx` (sólo si hace falta exponer un wrapper para parallax; preferible envolver desde HomePage)

**Interfaces:**
- Consumes: `MaskReveal`, `ParallaxLayer`, `EASE/DUR` (Task 1), gsap `SplitText`.

- [ ] **Step 1:** Reemplazar los `Reveal` del hero por `MaskReveal` escalonado: eyebrow (delay 0) → H1 **línea por línea** con `SplitText(type:'lines')` (delay por línea con `STAGGER`) → remate → lead → CTAs. Mantener el markup/copy; sólo cambia el envoltorio de motion.
- [ ] **Step 2:** Envolver el copy y el `.cw-hero-orb` (cohete) en `ParallaxLayer` con `speed` distinto (copy más lento que el cohete) para profundidad; opcional un glow de fondo con `speed` mayor.
- [ ] **Step 3: Verify** · `tsc` 0 · `vite build` OK · `npm test` verde.
- [ ] **Step 4: Visual QA (headless)** — screenshot del hero tras load (copy revelado, cohete armado) y tras un scroll corto (parallax: copy y cohete desfasados). Confirmar nada tapado ni cortado.
- [ ] **Step 5: Commit** · `git commit -am "feat(home): hero mask-reveal + parallax"`

---

### Task 8: Momento firma #1 — Agentic Lab `PinScrub` (scrub de la escena 3D)

**Files:**
- Modify: `src/pages/HomePage.tsx` (envolver `<Methodology/>` o su contenedor con `PinScrub`)
- Modify: `src/components/site/MethodologySection.tsx` y/o `src/components/site/AgenticLab3D.tsx` (consumir `onProgress`)

**Interfaces:**
- Consumes: `PinScrub` (Task 6). `AgenticLab3D` expone una `MachineApi` en `window` (modos assembled/cutaway/stations/order, cámaras, `#journey-progress`).

- [ ] **Step 1:** Envolver la sección de Metodología en `PinScrub` (`length` ~1.4). Mapear `onProgress(p)` → avance de la escena (p.ej. `window.<MachineApi>` seteando `#journey-progress`/modo según `p`), de "arma/cutaway" a "stations/order". Si la API no cubre todo el rango, scrubbear reveals de los pasos del lab como complemento.
- [ ] **Step 2:** Reduced-motion/touch → sin pin (la sección se ve completa; `onProgress(1)` deja la escena en su estado final legible).
- [ ] **Step 3: Verify** · `tsc` 0 · `vite build` OK.
- [ ] **Step 4: Visual QA (headless)** — con WebGL (flags swiftshader): scrollear por la sección y capturar 3 frames (progress ~0, ~0.5, ~1) confirmando que la escena avanza; confirmar que la sección siguiente no se solapa con el pin-spacer; con viewport touch, sin pin y escena final visible.
- [ ] **Step 5: Commit** · `git commit -am "feat(home): Agentic Lab pin-scrub signature moment"`

---

### Task 9: Wireup del resto de secciones (reveals + parallax con tokens)

**Files:**
- Modify: `src/pages/HomePage.tsx` (servicios, engine, process, clientes, contacto)
- Modify (si hace falta envolver títulos): componentes de esas secciones.

**Interfaces:** Consumes `MaskReveal`, `StaggerGroup`, `ParallaxLayer`.

- [ ] **Step 1:** Títulos de cada sección (servicios "tres frentes", EngineLive, Process, Clientes, Contacto) con `MaskReveal`. No tocar `.is-in`/`.cw-gfx`.
- [ ] **Step 2:** Servicios: orbe `EcosystemOrbital` en `ParallaxLayer` sutil; los 3 frentes con `StaggerGroup`. Clientes: cards de `ClientShowcase` con `StaggerGroup glide`. Process/EngineLive: reveal + parallax, **sin pin**.
- [ ] **Step 3: Verify** · `tsc` 0 · `vite build` OK · `npm test` verde.
- [ ] **Step 4: Visual QA (headless)** — recorrer el home (desktop) capturando cada sección al entrar; confirmar que todo revela, nada queda invisible, sin solapes.
- [ ] **Step 5: Commit** · `git commit -am "feat(home): section reveals + parallax across the home"`

---

### Task 10: Verificación integral (reduced-motion, mobile, perf, navegación)

**Files:** (ninguno nuevo; ajustes puntuales si algo falla)

- [ ] **Step 1: reduced-motion** — headless con `prefers-reduced-motion: reduce` (override matchMedia): cargar `/`, confirmar que **todo el contenido del home se ve completo** (hero copy, títulos, cards, lab) sin pin ni elementos en opacity:0.
- [ ] **Step 2: mobile/touch** — viewport 390px `hasTouch:true`: scroll nativo OK, sin pin, sin scroll horizontal, sin solapes.
- [ ] **Step 3: navegación SPA** — ir a una página de servicio y volver al home; confirmar que no quedan ScrollTriggers/pin-spacers duplicados (contar `ScrollTrigger.getAll()` vía consola, o pin-spacers en DOM).
- [ ] **Step 4: suite** — `npx tsc --noEmit` 0 · `npm test` verde · `npx vite build` OK.
- [ ] **Step 5: Commit** · `git commit -am "chore(home): flagship motion QA + fixes"`

---

## Notas de self-review

- **Cobertura del spec:** tokens+primitivas (Tasks 1-6) ↔ "sistema de motion"; hero (7), Agentic Lab pin (8), resto (9) ↔ "coreografía"; reduced-motion/mobile/perf/navegación (10) ↔ "accesibilidad/perf". El único pin = Task 8 (decisión del usuario, 1 pin). ✓
- **Convivencia con `.is-in`/`.cw-gfx`:** fijada en Global Constraints y Task 9 Step 1. ✓
- **Tests:** lógica pura testeada (Task 1); lo visual se verifica por tsc/build + screenshot headless (el repo no tiene DOM test-env; no se inventa uno). ✓
- **Proporción:** el plan documenta decisiones (archivos, firmas, props, valores del spec); los cuerpos de los componentes los escribe el implementador. ✓
