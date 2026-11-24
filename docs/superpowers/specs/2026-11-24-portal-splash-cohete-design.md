# Portal — Splash screen de cohete con tinte al branding del cliente

Fecha: 2026-11-24 · Estado: propuesto (pendiente de aprobación)

## Intención y porqué
La pantalla de carga del portal del cliente es hoy un spinner plano ("Preparando tu campaña…"). Debe convertirse en una **splash screen de alto impacto**, coherente con el concepto que ya usa la suite desktop (`desktop/renderer/preflight.html`): un **cohete que se arma por partes** y **despega**. Durante la splash, toda la pantalla se **tiñe de forma fluida y progresiva hacia el color de branding de la campaña** del cliente; cuando el cohete despega, se revela el contenido del portal con una aparición animada y organizada (slide/fade in escalonado).

## Objetivos
- **Cohete que se arma**: partes entran escalonadas (motores → aletas → cuerpo → nariz → ventana) con pop elástico, llama que titila, chispas, estrellas de fondo. Se reusa el SVG y las keyframes ya probadas del desktop.
- **Tinte progresivo al color de la campaña**: la splash arranca en el violeta/magenta CreAPP y, a medida que avanza, se tiñe fluido (sin saltos) hacia el acento de la campaña (Materalia → amarillo sobre navy). El color objetivo se conoce cuando `getMyCampaigns()` resuelve; desde ese instante el tinte glidea (~0.8–1.0s) hasta el despegue.
- **Despegue de alto impacto**: el cohete despega (sube, acelera la llama, se desvanece) **gated** por *armado mínimo cumplido* **y** *datos listos*.
- **Reveal escalonado**: al terminar el despegue, el contenido del visor aparece con slide/fade in organizado.
- **Una vez por sesión**: la splash completa corre en el primer ingreso de la sesión (sessionStorage); en refrescos posteriores de la misma sesión se muestra una carga mínima (sin despegue) para no cansar. En una sesión nueva vuelve a correr.
- Respeta `prefers-reduced-motion` (sin animación: estado estático + fade simple).

## No-objetivos
- No es el preflight del desktop (no hay checklist de componentes; eso es dev).
- No cambia el flujo de datos, auth, ni el visor one-by-one ya hecho.
- No bloquea el ingreso si la animación falla: ante cualquier error de la splash, cae al contenido.

## Enfoque
Portar el cohete SVG + animaciones del desktop a un componente del portal y orquestarlo con la carga de datos.

**Fases (timeline):**
1. **Armado** (~1.2s, siempre): las partes del cohete entran escalonadas sobre el fondo CreAPP; estrellas titilando; texto "Preparando tu campaña…".
2. **Datos listos → inicia el tinte**: cuando `getMyCampaigns()` resuelve, se setea el acento de campaña en vars CSS con `transition` larga → el acento del cohete (`gAcc`), el glow y las estrellas **glidean** al color de marca. Si los datos llegan antes del fin del armado, el tinte igual corre su duración; si tardan, el cohete queda "cargando" (idle float + llama) hasta que lleguen.
3. **Despegue** (~1.3s): cuando armado-mínimo **y** datos-listos, el cohete hace `liftoff` (sube ~120vh, escala, se desvanece; llama intensa); la pantalla queda teñida al color de campaña.
4. **Reveal** (~0.6s): se desmonta la splash y entra el contenido del visor con stagger (slide/fade in).

**Dónde:**
- `src/components/portal/PortalSplash.tsx` (nuevo): el cohete + fases + tinte. Props: `ready: boolean` (datos cargados), `accent?: { color; deep; bg } | null` (color de campaña una vez conocido), `onDone: () => void` (al terminar el despegue). Maneja su propio timeline y respeta reduced-motion.
- `src/pages/PortalView.tsx`: orquesta — mientras `campaigns === undefined` (o no se cumplió el mínimo) muestra `PortalSplash`; le pasa `ready` y `accent` (de `usePortalTheme`/`themeFor`); cuando la splash llama `onDone`, renderiza el contenido. Reemplaza el uso actual de `PortalLoader` en la vista cliente.
- `src/components/portal/portal.css`: keyframes y estilos de la splash + clases de reveal del contenido.
- `PortalLoader.tsx`: se mantiene para Suspense/guard (cargas sin contexto de campaña) y como fallback de reduced-motion; la splash completa es solo la del portal cliente.
- Guardado "una vez por sesión": `sessionStorage['creapp_portal_splash_seen']`. Si ya está, PortalView salta la splash completa (carga mínima + reveal), igual siempre en el primer ingreso de la sesión.

## Decisiones (mis llamadas, corregibles)
- El tinte usa el acento de campaña (`themeFor(...).accent` y `accentDeep`) + el `bg`/glow; CreAPP violeta como punto de partida. Transición CSS ~0.9s para que el fade se sienta durante el desarrollo de la splash, no como un switch.
- Armado mínimo ~1.2s para que el cohete se "sienta" antes de poder despegar aunque los datos ya estén.
- El reveal del contenido se tiñe ya con el tema de campaña (continuidad con el tinte de la splash).
- Si la campaña está vacía (sin piezas) o hay error de datos, la splash igual despega y revela el estado correspondiente (empty / error), no se cuelga.
- Reduced-motion: sin armado/despegue; fondo estático con el tinte aplicado de una y fade simple del contenido.

## Restricciones
- Vite + React + TS + `portal.css` (vars de tema). SVG inline puro (sin assets nuevos). Sin librerías de animación nuevas (CSS keyframes, como el desktop).
- No romper el visor one-by-one ni el theming por campaña ya deployados.

## Qué queda al builder
- Estructura exacta del timeline (timers vs eventos de animación), el reparto de clases de reveal en el contenido del visor, y el ajuste fino de duraciones/easing para que el fade de color se perciba fluido durante toda la splash.
