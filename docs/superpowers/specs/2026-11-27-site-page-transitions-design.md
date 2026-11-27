# Transiciones de navegación del sitio — desliz lateral + fade (CreAPP)

Fecha: 2026-11-27 · Estado: **en revisión del usuario** (no construir hasta aprobar)

## Intención y el porqué

Hoy el cambio de página en el sitio público es un corte seco: el contenido de la ruta nueva
aparece de golpe, recto y lineal. El usuario quiere que se sienta de alta gama: al navegar, el
contenido entra con **desliz lateral fluido + fade-in**, con el mismo criterio de motion que ya
rige el home (consistencia = premium).

## Alcance (decidido con el usuario)

- **Solo el sitio público:** `/` (Home) + `/:group/:slug` (las 9 páginas de servicio). Comparten
  estética, Lenis y cursor.
- **Fuera de alcance:** `/propuesta`, `/contrato`, `/admin/*`, `/portal/*` (realms con loaders,
  guards y boot propios; una capa de transición encima los pondría en riesgo). Siguen con cambio
  instantáneo.

## Goals

- Transición de ruta **consistente** en todo el sitio: salida de la página actual + entrada de la
  nueva con desliz lateral (x) + fade, usando los **tokens de motion existentes** (easing COUT,
  duración base).
- **Navbar persistente:** la barra (`SiteNav`) queda fija; sólo transiciona el contenido debajo.
- Accesible (`prefers-reduced-motion` → fade simple, sin desliz) y sin romper el scroll ni el
  pin-scrub de GSAP del home.

## Non-goals / Anti-goals

- No tocar admin/portal/propuesta/contrato.
- **Anti-goal:** que la transición descoloque el pin del Agentic Lab, deje el scroll a mitad de
  página, o parpadee el fallback de carga en cada navegación.
- No reemplazar las animaciones intra-página ya hechas (reveals/parallax); esto es **entre**
  páginas, convive con aquello.

## Restricciones / hallazgos

- Rutas del sitio son `React.lazy` + `Suspense`. La **primera** visita a una ruta no cacheada puede
  mostrar el fallback brevemente antes de animar; después queda en caché. Aceptable.
- `SmoothScroll`/Lenis envuelve sólo el sitio (`LandingSmoothScrollWrapper`, `isSitePath`).
- **Clave:** la transición desliza en **x** (lateral). El cálculo de GSAP ScrollTrigger es sobre el
  eje **y**; un translate en x **no** altera sus medidas verticales. Por eso el desliz lateral es
  seguro para el pin del home. Igual se llama `ScrollTrigger.refresh()` al entrar, por fuentes/layout.
- Hoy Home y ServicePage renderizan **cada uno** su `SiteNav`, skip-link, `footer` y `ContactModal`,
  y manejan `theme` + `contactOpen` localmente. Para navbar persistente hay que subir ese chrome a
  un shell común.

## Aproximaciones consideradas

1. **framer-motion `AnimatePresence` + layout route con `Outlet`.** ✅ **Elegida.** framer-motion@12
   ya está instalado. `mode="wait"` (sale una, entra la otra: nunca dos páginas montadas a la vez →
   un solo set de ScrollTriggers, cero conflicto). Control fino de variantes + integración directa
   con reduced-motion. Es el estándar para transiciones de ruta en React Router SPA.
2. **View Transitions API nativa** (`document.startViewTransition` / `unstable_viewTransition` de
   React Router). Descartada: menos control sobre la curva, soporte despar­ejo, y pelea con Lenis y
   con los transforms de GSAP (snapshotea el DOM).
3. **CSS puro keyed por ruta.** Descartada: difícil coordinar salida+entrada y el reset de scroll
   sin AnimatePresence.

## Diseño (el cómo decidido)

**Shell persistente del sitio** — nuevo `src/components/site/SiteShell.tsx`:
- Renderiza una sola vez: skip-link, `SiteNav` (con `theme`/toggle), `footer`, `ContactModal`.
- Provee `openContact()` y `theme` por **contexto** (`SiteChromeContext`) para que el contenido de
  cada página dispare el modal sin renderizar su propio chrome.
- Envuelve el contenido en `AnimatePresence mode="wait"` con un `motion.div` **keyed por
  `location.pathname`** que contiene el `useOutlet()` snapshot.

**Ruteo (`App.tsx`):** las dos rutas del sitio pasan a colgar de una **layout route**:
`<Route element={<SiteShell/>}>` con `<Route path="/" .../>` y `<Route path="/:group/:slug" .../>`
como hijas (usan `<Outlet/>`). El resto de rutas queda igual.

**Variantes de transición** (de los tokens):
- `initial: { opacity: 0, x: 40 }` → `animate: { opacity: 1, x: 0 }` → `exit: { opacity: 0, x: -24 }`.
- `transition: { duration: DUR.base, ease: COUT }`. Desliz lateral natural + fade.
- **reduced-motion:** sin x, sólo fade (o instantáneo); se detecta con `useReducedMotion()`.

**Scroll + GSAP al entrar** (en el shell, al cambiar pathname / `onAnimationComplete` del enter):
`window.scrollTo(0,0)` + `lenis?.scrollTo(0,{immediate:true})` (lenis puede ser null → fallback al
window) + `ScrollTrigger.refresh()`.

**Páginas** (`HomePage.tsx`, `ServicePage.tsx`): se les quita nav/skip/footer/ContactModal y el
estado local de theme/contact; pasan a renderizar sólo su `<main>` y a usar `openContact` del
contexto. El resto de su contenido y efectos (hero SplitText, reveals, parallax) queda intacto.

## Archivos que toca

- **Nuevo:** `src/components/site/SiteShell.tsx` (+ contexto de chrome).
- `src/App.tsx` — layout route para el sitio.
- `src/pages/HomePage.tsx` — quitar chrome, usar contexto.
- `src/components/site/ServicePage.tsx` — quitar chrome, usar contexto.
- Quizá un `src/components/site/motion/` export para variantes de ruta (reuso de tokens).

## Qué queda a criterio del builder

- Valor fino del desliz (x: 32–48) y la duración exacta buscando el "feel", dentro de los tokens.
- Si el reset de scroll va en `onExitComplete` o al montar la nueva ruta.
- Si el `Suspense` del lazy va dentro o fuera del `motion.div` (adentro = el fallback también
  fundea; preferido).

## Verificación

- `tsc` 0, `vite build` OK, `node --test` verde.
- Preview `:5199`: navegar Home ↔ varias páginas de servicio, ida y vuelta, desktop y mobile. La
  barra queda fija; el contenido desliza y fundea parejo; el scroll arranca arriba; el pin del
  Agentic Lab sigue funcionando al volver al home; con reduced-motion no hay desliz y todo es
  legible; sin flash del fallback salvo primera carga de una ruta.
