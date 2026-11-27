# Flagship Home — Lenguaje de motion scroll-linked (CreAPP)

Fecha: 2026-11-27 · Estado: **en revisión del usuario** (no construir hasta aprobar)

## Intención y el porqué

El usuario quiere que la web "suba varios escalones de categoría" adoptando el paradigma de
animación de **Motionsites / Embers Foundry**: revelados de texto con máscara, parallax, zoom,
deslizamientos y momentos de "cámara", todo bajo **un criterio de motion global y consistente**
(la consistencia es lo que se siente premium). Objetivo emocional: que el home se sienta
cinematográfico y de alta gama, sin romper que es un **sitio de contenido multipágina**.

## Dirección (aprobada por el usuario)

- **Flagship primero (A):** convertimos el **home** en la pieza cinematográfica de referencia
  (smooth scroll + revelados + parallax + 1–2 momentos *pin-scrub* firma). Sirve de **vara** para
  después bajar el mismo lenguaje al resto de las páginas (fuera de alcance de este doc).
- **Scroll-linked SIN hijack (confirmado):** el contenido scrollea normal; las animaciones se
  **atan al progreso del scroll** o disparan al entrar en viewport. **No** se secuestra la rueda
  (nada de "wheel = cambiar de estado"). Mantiene SEO, teclado, lectores de pantalla.

## Qué tomamos de Embers y qué NO

**Sí (como criterio global):** máscaras de texto (`overflow:hidden` + slide), coreografía
escalonada con timings medidos, parallax/zoom en fondos y heroes, **momentos pin+scrub** (una
sección se "clava" y una animación avanza con el scroll), y **un set único de easings/tiempos**.

**No:** el **video pre-renderizado scrubbeado con WebCodecs** (es para un arco de cámara entre 2
estados fijos; nuestro home tiene muchas secciones reales → no es un mecanismo global; a lo sumo
un recurso para un único momento, fuera de este alcance). Tampoco el **scroll-hijack** de 2
estados.

## Goals

- Un **sistema de motion** reutilizable (tokens + primitivas) montado sobre **GSAP ScrollTrigger +
  Lenis** (ya instalados y cableados en `SmoothScroll.tsx`).
- Aplicarlo **parejo a todo el home** (cada título/sección entra con el mismo lenguaje).
- **1–2 momentos firma** pin-scrub (el "wow") en el home.
- Accesible (`prefers-reduced-motion` → estados finales) y performante (ya corren varias escenas
  WebGL): pausar fuera de viewport, degradar en mobile, no hijack.

## Non-goals

- No tocar las **páginas de servicio** ni otras páginas (ese roll-out es un proyecto aparte).
- No video scrubbeado / WebCodecs. No scroll-hijack.
- No reemplazar el contenido ni el copy del home (sólo su *motion*).
- No rehacer las escenas 3D existentes (hero rocket, AgenticLab3D, TriFront, Ecosystem, orbe).

## Anti-goals (qué sería un fracaso aunque "funcione")

- Que meta **jank / caída de FPS** (ya hay WebGL + Lenis); que el pin "salte" en mobile.
- Que el scroll se sienta "pegajoso" o que el usuario pierda control (over-animation).
- Inconsistencia: cada sección con su propio timing/easing (se pierde el efecto premium).
- Que rompa accesibilidad/SEO o que con reduced-motion quede algo invisible.

## Restricciones

- Stack ya presente: **gsap@3.14 + ScrollTrigger**, **lenis@1.3**, **framer-motion@12**.
  `SmoothScroll.tsx` ya integra Lenis↔ScrollTrigger (gsap.ticker) y **desactiva Lenis en touch**
  (usa scroll nativo). `useSmoothScroll()` expone el contexto.
- Secciones reales del home (confirmadas en código): **Hero** (RocketHero, WebGL) · **Metodología**
  (AgenticLab3D, WebGL) · **Servicios** (EcosystemOrbital, **DOM/CSS**, no WebGL) · **EngineLive**
  (terminal xterm) · **Process** (reveal plano, **sin pin**) · **Clientes** · **Contacto** · Footer.
  → **Sólo 2 escenas WebGL/three** (RocketHero, AgenticLab3D): hay más headroom de perf del que se
  asumía. `TriFrontPavilion3D` y la galaxy `Ecosystem` existen como componentes pero **NO** se
  importan en el home. El motion nuevo **convive**, no reemplaza.
- `SmoothScroll`/Lenis **ya envuelve** el home (`LandingSmoothScrollWrapper`, `isSitePath('/')`): no
  hay que cablear nada. Verificado por el revisor.

## Aproximaciones consideradas

1. **GSAP ScrollTrigger + Lenis** (backbone). ✅ **Elegida.** Es el estándar pro de Motionsites:
   pin, scrub, parallax y timelines ligados a scroll. Ya está instalado y parcialmente cableado.
   Para revelados simples de componentes podemos usar framer-motion donde sea más cómodo, pero el
   **timing/easing sale siempre del set único** para no romper consistencia.
2. framer-motion `useScroll`/`useTransform` solo. Cómodo para reveals/parallax, **flojo para pin y
   scrubbing** de timelines complejos. Descartado como backbone (se usaría a lo sumo puntual).
3. CSS scroll-driven animations (`scroll-timeline`). Moderno pero **sin pin** y con soporte
   despareja. Descartado.

## El sistema de motion (tokens + primitivas)

**Tokens (fuente única, TS + CSS vars)** — un solo lugar, usado por todo:
- Easings: `QOUT = cubic-bezier(.25,1,.5,1)`, `COUT = cubic-bezier(.33,1,.68,1)`,
  `CIN = cubic-bezier(.32,0,.67,0)`, `EXPO = cubic-bezier(.16,1,.3,1)`.
- Duraciones: `r"fast" .35s`, `"base" .6s`, `"slow" .9s`, `"cinematic" 1.3s`.
- Stagger: `.08s` base por ítem.
- Curva "glide-then-settle" para entradas desde abajo (la del section-2-in de Embers), como helper.

**Primitivas reutilizables** (nuevas, en `src/components/site/motion/`):
- `MaskReveal` — título/bloque que entra deslizándose desde detrás de un borde recortado
  (`overflow:hidden` en el wrapper, `translateY(100%→0)` en el inner). Dispara al entrar (o sale al
  irse, para heroes). Upgrade directo de `Reveal` (mismo rol, más rico).
- `StaggerGroup` — hijos entran escalonados con el token de stagger.
- `ParallaxLayer` — `y` (o `scale`) atados al progreso del scroll de su contenedor (profundidad).
- `PinScrub` — envuelve una sección: la **clava** (pin) y entrega `progress 0→1` para animar una
  escena mientras scrolleás. En **mobile/touch no pinea** (degrada a reveal/parallax suave).

Todas respetan `prefers-reduced-motion` (→ estado final visible, sin animación) y pausan fuera de
viewport. `ScrollTrigger.refresh()` tras cambios de layout (fuentes, imágenes).

## Coreografía del home (sección por sección)

1. **Hero** — al cargar, el copy entra con **MaskReveal** escalonado (eyebrow → H1 línea por línea
   → remate → lead → CTAs) con timings del set; el **cohete se ensambla** (ya hecho). Al scrollear:
   **parallax** — el copy sube un poco más lento, el canvas del cohete deriva/escala sutil, un glow
   de fondo parallaxea. Al salir del hero, el copy sale con máscara (mirror).
2. **Metodología · Agentic Lab — MOMENTO FIRMA #1 (PinScrub).** La sección se clava y la escena 3D
   del lab **avanza con el scroll** (se "arma"/se encienden los pasos según `progress`). Es el
   principal "wow". `AgenticLab3D` expone una `MachineApi` en `window` (modos assembled/cutaway/
   stations/order, cámaras y un `#journey-progress`) → **se puede scrubbear la escena 3D real** con
   el progreso del pin, no sólo reveals. (Builder decide el mapeo progress→modos.)
3. **Servicios "tres frentes" (EcosystemOrbital)** — título con MaskReveal; el orbe hace
   parallax/scale sutil al entrar; los 3 frentes revelan con StaggerGroup.
4. **EngineLive / Process** — reveals + parallax con los tokens. Aclaración del revisor: el
   `Process` del home es **reveal plano, SIN pin** (el pin-scrub "cohete que asciende",
   `RocketProcess`, vive en `components/landing/` y **no está** en el home). Default: Process =
   reveal + parallax, **sin pin**.
5. **Clientes (ClientShowcase)** — las cards suben con la curva **glide-then-settle** en
   StaggerGroup; parallax leve.
6. **Contacto + Footer** — reveal final consistente.
- **Global:** todo título usa MaskReveal; fondos/acentos parallaxean; **un solo** easing/timing.
- Opcional sutil: barra fina de **progreso de scroll** arriba (si no recarga perf).

**Momentos firma — DECIDIDO (usuario, 2026-11-27): 1 pin.** El flagship lleva **un solo** pin-scrub
firma: **Agentic Lab (#1)**. Todo el resto del home es reveal + parallax con los tokens. El "cohete
que asciende con el scroll" (`RocketProcess`) queda como **fast-follow** opcional (no en este
alcance). La galaxy de "nosotros" no se agrega (sería sumar contenido → non-goal).

## Accesibilidad, performance y mobile

- `prefers-reduced-motion: reduce` → sin reveals/parallax/pin; todo en su **estado final**; el
  contenido se ve completo. Las escenas WebGL ya congelan en reduced-motion.
- **Mobile/touch:** Lenis ya usa scroll nativo; los `PinScrub` **no pinean** (degradan a reveal).
  Parallax reducido. Sin horizontal-scroll, gutter 16px.
- **Performance:** transforms GPU (`translate`/`scale`, `will-change` acotado), `scrub` con smooth
  bajo, pausar escenas WebGL fuera de viewport (ya lo hacen), no más de 2 pins, limpiar
  ScrollTriggers al desmontar. Medir FPS con todo encendido.

## Qué queda a criterio del builder

- Los valores finos de cada parallax/stagger/scrub buscando el "feel" (dentro del set de tokens).
- Si el Agentic Lab se scrubea sobre su escena 3D o sobre una secuencia de reveals de sus pasos.
- Si se adopta el 2º pin (galaxy "nosotros") o se deja en reveal+parallax para cuidar perf.
- Refactor eventual de `Reveal` (Chapter.tsx) sobre `MaskReveal` (o convivencia).
- Ubicación: `src/components/site/motion/` (tokens + primitivas); wiring en `HomePage.tsx` y sus
  secciones.

## Resuelto en revisión (calls del builder)

- **No romper lo que anda:** la clase `.is-in` (del `Reveal`/IntersectionObserver actual) no sólo
  hace reveals simples — dispara toda una librería de animaciones internas en `site.css`
  (`.cw-gfx.is-in …`: acta/cohete, brain-chip, schematic, etc.). Por eso `MaskReveal` **convive** y
  **no toca** `.is-in` ni los `.cw-gfx`; se usa para títulos/secciones nuevos. Cero regresión.
- **Split del H1 del hero:** gsap@3.14 incluye **SplitText** → se usa para el revelado línea por
  línea, sin dependencia extra.

## Verificación

- `tsc` 0, `vite build` OK, `npm test` verde.
- QA de performance (FPS con todas las escenas) y de **reduced-motion** (todo visible, sin pin).
- Revisión del usuario en preview `:5199`: hero → cada sección, en desktop y mobile, sin jank ni
  solapes, de 320px a 2560px.
