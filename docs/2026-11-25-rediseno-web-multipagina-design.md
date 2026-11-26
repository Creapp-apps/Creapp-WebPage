# Rediseño web CreAPP — pasaje a multipágina (navbar pill + dropdowns)

**Fecha:** 2026-11-25
**Repo:** `Creapp-apps/Creapp-WebPage` · rama `rediseno-web`
**Precede:** `docs/2026-11-25-rediseno-web-design-spec.md` (single-page). Este doc reestructura esa landing en multipágina.
**Estado:** diseño aprobado por el usuario (A + A1). Pendiente: plan e implementación.

---

## 1. Intención y porqué

El QA manual del usuario sobre la landing de una sola página detectó un problema de UX: al ofrecer tantas áreas y servicios, todo apilado en una sola página verticalmente larguísima cansa y entierra el contenido. La solución es **romper en multipágina**: una home institucional y una página enfocada por cada servicio, navegadas con una **navbar pill con menús dropdown** por grupo.

El posicionamiento de la home sube de nivel: de "CreAPP · IT Solutions" a **"CreAPP · Software & Agentic Lab"**, con énfasis en la **metodología de trabajo** (agentic harnesses, IA-native, productos propios en vivo) como diferencial. IT Solutions sigue siendo la base vendible; el "Agentic Lab" es el filo.

## 2. Objetivos

- Navbar pill fija con 3 grupos desplegables; cada servicio en su propia ruta/página.
- Home `/` 100% institucional: posicionamiento + metodología (agentic harnesses) + prueba en vivo (motor, productos, clientes) + nosotros + contacto.
- Cada página de servicio se sostiene sola: hero + **gráfico interactivo** + entregables reales + CTA. El gráfico es el que "llena" la página (decisión del usuario), no grillas de tarjetas de texto.
- Reutilizar al máximo lo ya construido (componentes de `src/components/site/`, tokens de `site.css`, `Chapter`, `Reveal`, los gráficos de área).

## 3. No-objetivos

- No tocar admin ni portal (`/admin/*`, `/portal/*`) ni su auth.
- No commit ni deploy a producción en esta tanda: se trabaja y se previsualiza en `rediseno-web` (`npx vite --port 5199 --strictPort`), igual que la fase anterior.
- No backend nuevo, no feature flags, no cambios de stack.
- No precio en ninguna página (el sitio ya es sin precio; se mantiene).

## 4. Anti-objetivos (qué sería un fracaso aunque "funcione")

- **Páginas de servicio delgadas y vacías** = el mismo "slop" que el QA vino a matar. Si una página de servicio no tiene gráfico interactivo real + contenido con carne, no se publica.
- Claims inventados o inflados. Todo texto grounded en el PDF institucional aprobado + `client_profile.json`. En particular **Seguridad va en capacidad**: se ofrece el servicio y la capacidad (evaluamos, informamos, remediamos), nunca "operamos un SOC 24/7 con N clientes" ni evidencia que no existe.
- Reintroducir el scroll infinito dentro de cada grupo (por eso se descartó la opción "una página por grupo").

## 5. Restricciones

- **Marca/estética:** dark-refined `#05070F`, acento violeta `#8B5CF6` (magenta `#FF2D78` puntual, cyan datos), un acento por vista, mucho aire, neón prolijo. Toggle claro se conserva.
- **Claims:** grounded (PDF + `client_profile.json`); IA genérica (no nombrar "Google Gemini"); ciber en capacidad; productos propios = prueba sin precio.
- **Accesibilidad/perf:** `prefers-reduced-motion` respetado; animaciones pausadas fuera de viewport; navegación por teclado en los dropdowns; skip-link.
- **Router:** ya existe `react-router-dom` v7 en `App.tsx`. Se suman rutas públicas; no se toca el resto del árbol de rutas.
- **Gotcha embeds (de la fase anterior):** Dental-IA/Curadent/Álvarez mandan `X-Frame-Options: DENY` → en la home se usan loops grabados vía `LiveBrowser`/`Showcase`, no iframes. Se mantiene tal cual.

## 6. Taxonomía (cerrada con el usuario)

| Grupo (pill + dropdown) | Páginas de servicio | Ruta |
|---|---|---|
| **Desarrollo** | Software | `/desarrollo/software` |
| | IA & Machine Learning | `/desarrollo/ia` |
| | UX/UI & Product Design | `/desarrollo/ux-ui` |
| | APIs & Escala | `/desarrollo/apis-escala` |
| **Seguridad** | Pentesting | `/seguridad/pentesting` |
| | Análisis SOC | `/seguridad/soc` |
| | Auditorías | `/seguridad/auditorias` |
| **Marketing & Contenidos** | Community Management | `/marketing/community` |
| | Publicidad & Campañas | `/marketing/publicidad` |

Notas:
- **"Integración & Escala" (área 04) se renombra a "APIs & Escala"** y se mueve bajo Desarrollo. El foco narrativo pasa a **diseño y desarrollo de APIs REST**, integraciones y escalado corporativo (arquitectura, CI/CD, observabilidad quedan como soporte del relato de escala).
- La "Ciberseguridad" actual (un área) se abre en las 3 páginas de Seguridad, usando sus subs ya redactados en capacidad como base.
- "Marketing & Contenidos" se abre en 2 páginas usando sus subs ya redactados.

## 7. Enfoques considerados (Approaches)

**Fork 1 — granularidad de "página":**
- **A) Una ruta por servicio (ELEGIDA).** 9 páginas de servicio + home. Mata la página larga, URLs compartibles/SEO, cada página enfocada. Costo: 9 páginas a redactar/diseñar y ~3 gráficos interactivos nuevos.
- B) Una página por grupo (`/desarrollo` con sus 4 adentro). Solo 4 páginas, menos trabajo — pero reintroduce el scroll largo por grupo, el problema que el QA vino a matar. **Descartada** por ir contra el porqué.

**Fork 2 — dónde viven las secciones institucionales (Productos, Clientes, Nosotros, Motor en vivo, Proceso, Contacto):**
- **A1) Home rico (ELEGIDA).** Home `/` = institucional completo con metodología + prueba en vivo + nosotros + contacto. La nav suma links *Nosotros* y *Contacto* que bajan por ancla en la home. Una sola página fuerte de prueba; el resto son servicios.
- A2) Home corto + rutas dedicadas `/nosotros`, `/productos`, `/clientes`, `/contacto`. Más navegable pero más páginas que llenar. **Descartada** por el usuario.

**Decisión: A + A1.**

### 7-bis. Resueltas tras builder-check (2026-11-25)
- **Fuentes de grounding:** `CreAPP-IT-Solutions-Servicios-2026.pdf` + `client_profile.json` viven en el repo del motor (`storage/clients/creapp/institucional/` y `storage/clients/creapp/`). El copy se redacta a partir de ahí. No faltan fuentes.
- **Interacción por página (decisión del usuario):** interacción *real* solo en servicios firma (IA con input, Pentesting/scanner); el resto son gráficos **animados por scroll**, prolijos y sin input. Son ~3 gráficos nuevos (SOC, Auditorías, Publicidad) a nivel animado-por-scroll, no mini-demos manipulables. Consistente con la decisión previa de la landing.
- **Metodología "Agentic Lab":** grounded en el PDF + el motor real en producción (ya mostrado por `EngineLive`). "Motor propio en vivo" es diferencial decidido, no claim nuevo.
- **Compliance Seguridad:** los gráficos de Pentesting/SOC/Auditorías usan **datos sintéticos y llevan etiqueta visible "ejemplo / ilustrativo"** — nunca implican un SOC corriendo ni hallazgos de clientes reales (refuerza "ciber en capacidad").

## 8. Arquitectura decidida

### 8.1 Rutas (nuevas, públicas, en `App.tsx`)
- `/` → `HomePage` (institucional; reemplaza el rol actual de `LandingPage`).
- `/desarrollo/:slug`, `/seguridad/:slug`, `/marketing/:slug` → `ServicePage` (una sola plantilla parametrizada por slug) **o** una ruta explícita por servicio que renderiza `ServicePage` con su data. Se prefiere **rutas explícitas mapeadas a un registro de servicios** para títulos/SEO claros y 404 correcto ante slug inválido (decisión del builder; ver §10).
- `document.title` por ruta (react-router v7; set simple en cada página o un pequeño hook). SmoothScroll (Lenis) hoy solo envuelve `/`; se extiende a las páginas públicas nuevas o se decide por página (ver §10).
- Se conserva todo el árbol `/admin/*` y `/portal/*` sin cambios.

### 8.2 Navbar (reescritura de `SiteNav.tsx`)
- Pill fija, misma estética (`cw-nav`), con: **logo/brand (→ `/`)** · 3 grupos dropdown (Desarrollo / Seguridad / Marketing & Contenidos) · link **Nosotros** (→ `/#nosotros`) · link **Contacto** (→ `/#contacto`) · toggle tema · CTA **"Hablemos"**.
- Dropdowns: hover + focus en desktop, click/tap en mobile. Accesibles (`aria-expanded`, navegación con flechas/Escape, foco atrapado mientras abierto). Cada item del dropdown = `<Link>` de react-router.
- En mobile, el `cw-sheet` existente pasa a **acordeón** por grupo.
- Los links a secciones de la home (`Nosotros`, `Contacto`) desde una página de servicio navegan a `/#ancla` y scrollean al cargar la home.
- La nav deja de depender del scroll-spy por anclas de la landing vieja; el estado activo pasa a derivarse de la ruta actual (`useLocation`).

### 8.3 Plantilla de página de servicio (`ServicePage`)
Estructura por página (reusa `SiteNav`, `Chapter`/`Reveal`, `site.css`, footer):
1. **Hero del servicio:** eyebrow = grupo (ej. "Desarrollo /"), título del servicio, lead.
2. **Gráfico interactivo** (el que llena la página). Mapeo de reutilización:
   | Servicio | Gráfico | Origen |
   |---|---|---|
   | Software | `SoftwareGraphic` | existe |
   | IA & ML | `AgentDemo` (interactivo) | existe |
   | UX/UI | `DesignGraphic` | existe |
   | APIs & Escala | `ScaleGraphic` | existe (reenfocar a APIs REST) |
   | Pentesting | `ScanDemo` (interactivo, scanner) | existe |
   | Análisis SOC | **nuevo** | a construir |
   | Auditorías | **nuevo** | a construir |
   | Community Management | `MarketingGraphic` | existe |
   | Publicidad & Campañas | **nuevo** | a construir |
   → ~3 gráficos interactivos nuevos (SOC, Auditorías, Publicidad), el resto se recicla/reenfoca.
3. **Entregables** (lista real, de `content.ts`).
4. **Qué incluye / cómo lo hacemos** (los `subs` existentes reconvertidos a contenido de página, sin grilla de tarjetas pesada: se favorece el gráfico + texto de apoyo).
5. **CTA** a contacto (abre `ContactModal` o va a `/#contacto`).
6. Footer.

### 8.4 Home institucional (`HomePage`, A1)
Reusa casi todo lo de la `LandingPage` actual **menos** los 6 capítulos de área (que migran a páginas), **más** un bloque nuevo de metodología:
- **Hero** reframeado: "CreAPP · Software & Agentic Lab", hook actual conservado ("El software y la IA que tu negocio necesita. Y te los mostramos funcionando.").
- **Metodología / Agentic Harnesses (NUEVO):** sección que explica cómo trabaja el lab — IA-native, agentic harnesses, motor propio en producción. Es el diferencial de la home. Copy grounded (sin nombrar proveedores de LLM).
- **Índice de servicios:** reemplaza el `cw-index` de anclas por tarjetas/enlaces a las 9 rutas de servicio, agrupadas por los 3 grupos.
- **Motor en vivo** (`EngineLive`), **Proceso** (`Process`), **Productos** (`ProductShowcase`), **Clientes** (`ClientShowcase` con loops/embeds), **Nosotros** (`#nosotros`, team), **Contacto** (`#contacto`). Todo ya existe.

### 8.5 `content.ts`
- Se agrega un **registro de servicios** (9 entradas) con: grupo, slug, título, lead, entregables, "qué incluye", y referencia al gráfico. Se deriva de `AREAS` existente (Software/IA/UX/UI/APIs&Escala directos; Ciber → 3; Marketing → 2) + copy nuevo que redacto yo, grounded.
- `NAV` se reemplaza por una estructura de grupos+items para la nav con dropdowns.
- `AREAS` se conserva como fuente de copy o se refactoriza hacia el nuevo registro (decisión del builder).

## 9. Contenido (lo redacto yo)

El usuario delega la redacción. Reglas: grounded en el PDF institucional aprobado y `client_profile.json`; nada inventado; Seguridad en capacidad; es-AR; sin precio. Las páginas se "llenan" con el gráfico interactivo + lead + entregables + "qué incluye", no con muros de texto. Las 5 páginas sin contenido 1:1 hoy (Pentesting, SOC, Auditorías, Community, Publicidad) se derivan de los `subs` ya redactados del área madre + ampliación mía.

## 10. Qué queda a criterio del builder

- Rutas explícitas por servicio vs. `:slug` con registro (se recomienda registro + rutas explícitas o `:grupo/:slug` validado contra el registro, con 404 ante slug desconocido).
- Si `SmoothScroll` (Lenis) envuelve las páginas de servicio o solo la home.
- Mecanismo de `document.title`/meta por ruta (hook propio simple; no se agrega dependencia).
- Si `AREAS` se refactoriza al nuevo registro de servicios o coexiste como fuente.
- Forma visual exacta de los 3 gráficos nuevos (SOC, Auditorías, Publicidad), respetando No-Card / un acento por vista / reduced-motion.
- Patrón de acordeón mobile de la nav.

## 11. Pendientes heredados (no bloquean esta tanda)
Loops Dental-IA/Trazapp, roles reales Seba/Facu, citas de clientes con `quoteConfirmed`, decisión final de mobile — siguen igual que en el spec previo.
