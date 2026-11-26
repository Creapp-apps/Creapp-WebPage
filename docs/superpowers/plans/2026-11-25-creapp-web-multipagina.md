# CreAPP web multipágina — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Romper la landing de una sola página en una home institucional + 9 páginas de servicio navegadas por una navbar pill con dropdowns.

**Architecture:** Un registro de servicios en TS puro (`services.ts`, testeable con node:test) es la única fuente de la taxonomía: alimenta la nav con dropdowns, las rutas de react-router y la plantilla única `ServicePage`. La home `/` pasa a ser institucional (metodología Agentic Lab + prueba en vivo). Se reutilizan los componentes y tokens ya existentes de `src/components/site/`.

**Tech Stack:** React 19 + Vite + react-router-dom v7 + framer-motion. Tests: `node:test` vía `node --import tsx --test src/lib/*.test.ts` (solo lógica pura; no hay test de componentes y no se agrega framework).

**Spec:** `docs/2026-11-25-rediseno-web-multipagina-design.md`

## Global Constraints

- Estética: dark-refined `#05070F`, acento violeta `#8B5CF6`, un acento por vista; toggle claro se conserva. Reutilizar `site.css`, `Chapter`, `Reveal`.
- Copy grounded en `storage/clients/creapp/institucional/CreAPP-IT-Solutions-Servicios-2026.pdf` + `storage/clients/creapp/client_profile.json` (repo del motor). Nada inventado. es-AR.
- **Prohibido** en todo texto visible: nombres de proveedor LLM (p. ej. "Gemini", "OpenAI", "GPT", "Claude", "Google"), y cualquier precio/moneda (`$`, `USD`, `/mes`, etc.).
- Seguridad **en capacidad**: Pentesting/SOC/Auditorías usan datos sintéticos y llevan etiqueta visible "ejemplo"/"ilustrativo"; nunca implican un SOC corriendo ni hallazgos de clientes reales.
- Interacción real solo en servicios firma (IA, Pentesting); el resto son gráficos animados por scroll.
- No tocar `/admin/*` ni `/portal/*` ni su auth. No commit/deploy: solo preview `rediseno-web` (`npx vite --port 5199 --strictPort`).
- `prefers-reduced-motion` respetado; animaciones pausadas fuera de viewport; dropdowns accesibles por teclado.

## Review Focus

- **Slug desconocido** (`/desarrollo/noexiste`): debe resolver a la home (`/`) o 404 claro, nunca página rota. → Task 1 (helper) + Task 7 (ruta).
- **Link Nosotros/Contacto desde una página de servicio**: navega a `/#ancla` y scrollea tras montar la home, no queda en el tope. → Task 7.
- **Copy con término prohibido o precio** colado en el registro: el guard de test debe fallar. → Task 2.
- **Dropdown en teclado/mobile**: Escape cierra, Tab recorre, tap abre acordeón; no queda abierto al navegar. → Task 3.
- **`reduced-motion`**: gráficos nuevos no animan si el usuario lo pidió. → Task 5.

---

### Task 1: Registro de servicios + helpers (TDD)

**Files:**
- Create: `src/components/site/services.ts`
- Test: `src/lib/siteServices.test.ts`

**Interfaces:**
- Produces:
  - `type ServiceGroup = 'desarrollo' | 'seguridad' | 'marketing'`
  - `interface Service { group: ServiceGroup; slug: string; title: string; eyebrow: string; lead: string; deliverables: string[]; includes: { t: string; d: string }[]; graphicKey: string; interactive: boolean; illustrative?: boolean }`
  - `const SERVICES: Service[]` (9 entradas, copy se llena en Task 2; en Task 1 pueden ir leads/includes vacíos placeholder salvo los campos estructurales)
  - `const GROUP_LABELS: Record<ServiceGroup, string>` → `{ desarrollo: 'Desarrollo', seguridad: 'Seguridad', marketing: 'Marketing & Contenidos' }`
  - `function servicePath(s: Pick<Service,'group'|'slug'>): string` → `/${group}/${slug}`
  - `function getService(group: string, slug: string): Service | undefined`
  - `function servicesByGroup(): Record<ServiceGroup, Service[]>`

Estructura fija (group/slug/title/graphicKey/interactive):

| group | slug | title | graphicKey | interactive |
|---|---|---|---|---|
| desarrollo | software | Software | software | false |
| desarrollo | ia | IA & Machine Learning | ia | true |
| desarrollo | ux-ui | UX/UI & Product Design | design | false |
| desarrollo | apis-escala | APIs & Escala | scale | false |
| seguridad | pentesting | Pentesting | scan | true |
| seguridad | soc | Análisis SOC | soc | false |
| seguridad | auditorias | Auditorías | audit | false |
| marketing | community | Community Management | marketing | false |
| marketing | publicidad | Publicidad & Campañas | ads | false |

`illustrative: true` en los tres de seguridad.

- [ ] **Step 1: Write the failing test** `src/lib/siteServices.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SERVICES, getService, servicePath, servicesByGroup, GROUP_LABELS } from '../components/site/services';

test('9 servicios, slugs únicos por grupo', () => {
  assert.equal(SERVICES.length, 9);
  const keys = SERVICES.map(s => `${s.group}/${s.slug}`);
  assert.equal(new Set(keys).size, 9);
});
test('grupos válidos y labels', () => {
  const groups = new Set(SERVICES.map(s => s.group));
  assert.deepEqual([...groups].sort(), ['desarrollo', 'marketing', 'seguridad']);
  assert.equal(GROUP_LABELS.marketing, 'Marketing & Contenidos');
});
test('servicePath y getService', () => {
  assert.equal(servicePath({ group: 'seguridad', slug: 'soc' }), '/seguridad/soc');
  assert.equal(getService('seguridad', 'soc')?.title, 'Análisis SOC');
  assert.equal(getService('desarrollo', 'noexiste'), undefined);
});
test('seguridad marcada ilustrativa; firma interactivas', () => {
  assert.ok(SERVICES.filter(s => s.group === 'seguridad').every(s => s.illustrative));
  assert.deepEqual(SERVICES.filter(s => s.interactive).map(s => s.slug).sort(), ['ia', 'pentesting']);
});
test('servicesByGroup agrupa 4/3/2', () => {
  const g = servicesByGroup();
  assert.equal(g.desarrollo.length, 4);
  assert.equal(g.seguridad.length, 3);
  assert.equal(g.marketing.length, 2);
});
```

- [ ] **Step 2: Run, verify fails** — `npm test` → FAIL (módulo no existe).
- [ ] **Step 3: Implement `src/components/site/services.ts`** con el tipo, `SERVICES` (tabla de arriba; copy placeholder), `GROUP_LABELS`, `servicePath`, `getService`, `servicesByGroup`. TS puro, sin JSX ni React.
- [ ] **Step 4: Run, verify passes** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat(site): registro de servicios + helpers`.

---

### Task 2: Copy grounded + guards de compliance (TDD)

**Files:**
- Modify: `src/components/site/services.ts` (llenar `eyebrow/lead/deliverables/includes` de los 9)
- Create: `src/components/site/methodology.ts` (constantes de copy de la sección Agentic Lab)
- Test: `src/lib/siteCopyGuards.test.ts`

**Interfaces:**
- Consumes: `SERVICES` (Task 1).
- Produces: `METHODOLOGY` (constante: título, lead, 3–4 puntos `{ t; d }` sobre cómo trabaja el lab — agentic/AI-native/motor propio en producción). Grounded en el PDF + README institucional + `EngineLive` existente.

Fuente de copy por servicio: `AREAS` en `content.ts` (Software/IA/UX-UI directos; APIs&Escala = área "Integración & Escala" reenfocada a APIs REST; los 3 de Seguridad = subs del área ciber; los 2 de Marketing = subs del área marketing) + ampliación propia leyendo el PDF. Sin inventar.

- [ ] **Step 1: Write the failing test** `src/lib/siteCopyGuards.test.ts`

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SERVICES } from '../components/site/services';
import { METHODOLOGY } from '../components/site/methodology';

const FORBIDDEN = /\b(gemini|openai|gpt|claude|google|chatgpt)\b/i;
const PRICE = /(\$|usd|€|\/mes\b|por mes\b|precio)/i;
const texts = (s: typeof SERVICES[number]) => [s.eyebrow, s.lead, ...s.deliverables, ...s.includes.flatMap(i => [i.t, i.d])];

test('ningún servicio nombra proveedor LLM ni precio', () => {
  for (const s of SERVICES) for (const t of texts(s)) {
    assert.ok(!FORBIDDEN.test(t), `prohibido en ${s.slug}: ${t}`);
    assert.ok(!PRICE.test(t), `precio en ${s.slug}: ${t}`);
  }
});
test('todo servicio tiene copy real (no placeholder)', () => {
  for (const s of SERVICES) {
    assert.ok(s.lead.length > 40, `lead corto: ${s.slug}`);
    assert.ok(s.deliverables.length >= 3 && s.includes.length >= 3, `faltan bullets: ${s.slug}`);
  }
});
test('metodología grounded sin proveedor ni precio', () => {
  const all = [METHODOLOGY.title, METHODOLOGY.lead, ...METHODOLOGY.points.flatMap(p => [p.t, p.d])];
  for (const t of all) { assert.ok(!FORBIDDEN.test(t)); assert.ok(!PRICE.test(t)); }
  assert.ok(METHODOLOGY.points.length >= 3);
});
```

- [ ] **Step 2: Run, verify fails** — `npm test` → FAIL (copy placeholder corto / `methodology` no existe).
- [ ] **Step 3: Leer fuentes y escribir copy.** Leer el PDF (`storage/clients/creapp/institucional/CreAPP-IT-Solutions-Servicios-2026.pdf`) y `client_profile.json` del repo del motor. Completar los 9 servicios y crear `METHODOLOGY`. Respetar Global Constraints.
- [ ] **Step 4: Run, verify passes** — `npm test` → PASS.
- [ ] **Step 5: Commit** — `feat(site): copy grounded de servicios + metodología`.

---

### Task 3: Navbar pill con dropdowns, route-based

**Files:**
- Modify: `src/components/site/SiteNav.tsx`
- Modify: `src/components/site/site.css` (estilos de dropdown/acordeón)

**Interfaces:**
- Consumes: `SERVICES`, `GROUP_LABELS`, `servicePath`, `servicesByGroup` (Task 1).
- Produces: `<SiteNav theme onToggleTheme onContact />` (misma firma; ahora usa react-router `Link`/`NavLink`).

Comportamiento: brand → `/`; 3 grupos dropdown (hover+focus desktop, click mobile) que listan sus servicios como `Link`; links `Nosotros` (`/#nosotros`) y `Contacto` (`/#contacto`); toggle tema; CTA "Hablemos". Estado activo por `useLocation`, no por scroll-spy. Dropdown accesible: `aria-expanded`, Escape cierra, Tab recorre, cierra al navegar. Mobile: `cw-sheet` como acordeón por grupo.

- [ ] **Step 1:** Reescribir `SiteNav.tsx` con la estructura de arriba, mapeando `servicesByGroup()`.
- [ ] **Step 2:** Estilos de dropdown (desktop) y acordeón (mobile) en `site.css`, dentro de los tokens existentes.
- [ ] **Step 3: Verify** — `npx tsc --noEmit` pasa; en preview (`:5199`) los 3 dropdowns abren, navegan, cierran con Escape/al navegar, y funcionan en viewport angosto.
- [ ] **Step 4: Commit** — `feat(site): navbar pill con dropdowns por ruta`.

---

### Task 4: Plantilla `ServicePage` + mapeo de gráficos reusados

**Files:**
- Create: `src/components/site/ServicePage.tsx`

**Interfaces:**
- Consumes: `getService` (Task 1); `ContactModal`, `Chapter`/`Reveal`, `SiteNav`, footer (existentes); `AgentDemo`, `ScanDemo`, `SoftwareGraphic`, `DesignGraphic`, `ScaleGraphic`, `MarketingGraphic` (existentes).
- Produces: `<ServicePage group={ServiceGroup} slug={string} />` que resuelve el servicio por `getService`; si no existe, `<Navigate to="/" replace />`.

Layout por página (reusa tokens): `SiteNav` + hero (eyebrow = `GROUP_LABELS[group]`, title, lead) + gráfico (mapa `graphicKey`→componente; incluye los 3 nuevos de Task 5) + entregables + "qué incluye" (`includes`, sin grilla pesada) + CTA contacto + footer. `document.title` = `${service.title} · CreAPP`.

Mapa de gráficos (string→componente): `software→SoftwareGraphic, ia→AgentDemo, design→DesignGraphic, scale→ScaleGraphic, scan→ScanDemo, marketing→MarketingGraphic, soc→SocGraphic, audit→AuditGraphic, ads→AdsGraphic`.

- [ ] **Step 1:** Implementar `ServicePage.tsx` con el mapa y el layout (puede referenciar los 3 nuevos aún no creados; se completan en Task 5 antes de verificar).
- [ ] **Step 2: Verify** — tras Task 5, `npx tsc --noEmit` pasa; en preview una ruta reusada (`/desarrollo/software`) renderiza completa.
- [ ] **Step 3: Commit** — `feat(site): plantilla ServicePage`.

---

### Task 5: Tres gráficos nuevos animados (SOC, Auditorías, Publicidad)

**Files:**
- Create: `src/components/site/SecurityGraphics.tsx` (`SocGraphic`, `AuditGraphic`)
- Modify: `src/components/site/AreaGraphics.tsx` (agregar `AdsGraphic`)

**Interfaces:**
- Produces: `SocGraphic`, `AuditGraphic`, `AdsGraphic` (`React.FC`), consumidos por el mapa de Task 4.

Estilo igual a los gráficos existentes (No-Card, un acento, SVG/CSS, sin `filter: drop-shadow` en SVG). Animados por scroll (no input). `SocGraphic`/`AuditGraphic` muestran **datos sintéticos con etiqueta visible "ejemplo"/"ilustrativo"**. Todos respetan `prefers-reduced-motion` (sin animación si está activo), siguiendo el patrón de los gráficos actuales.

- [ ] **Step 1:** Implementar los 3 componentes siguiendo el patrón de `AreaGraphics.tsx`/`ScanDemo.tsx`.
- [ ] **Step 2: Verify** — `npx tsc --noEmit` pasa; en preview las 3 rutas (`/seguridad/soc`, `/seguridad/auditorias`, `/marketing/publicidad`) muestran su gráfico con la etiqueta ilustrativa donde corresponde y no animan bajo `reduced-motion`.
- [ ] **Step 3: Commit** — `feat(site): gráficos SOC, Auditorías y Publicidad`.

---

### Task 6: Home institucional + sección Metodología

**Files:**
- Create: `src/pages/HomePage.tsx`
- Create: `src/components/site/Methodology.tsx`

**Interfaces:**
- Consumes: `METHODOLOGY` (Task 2); `servicesByGroup`, `servicePath`, `GROUP_LABELS` (Task 1); `SiteNav`, `Orb`, `EngineLive`, `Process`, `ProductShowcase`, `ClientShowcase`, `ContactForm`, `Chapter`/`Reveal` (existentes).
- Produces: `<HomePage />` (default export), `<Methodology />`.

`HomePage` = la `LandingPage` actual **sin** los 6 capítulos de área, **con**: hero reframeado ("CreAPP · Software & Agentic Lab", hook conservado) → `<Methodology />` (nueva, renderiza `METHODOLOGY`) → índice de servicios (tarjetas/links a las 9 rutas vía `servicesByGroup()`, reemplaza el `cw-index` de anclas) → `EngineLive` → `Process` → `ProductShowcase` (`#productos`) → Nosotros (`#nosotros`) → `ClientShowcase` (`#clientes`) → Contacto (`#contacto`) → footer. Al montar, si `location.hash`, scrollear al ancla.

- [ ] **Step 1:** Crear `Methodology.tsx` (sección sobre `METHODOLOGY`, tokens existentes).
- [ ] **Step 2:** Crear `HomePage.tsx` reutilizando el markup de `LandingPage` menos los capítulos de área, con el índice de servicios y el scroll-to-hash al montar.
- [ ] **Step 3: Verify** — `npx tsc --noEmit` pasa; en preview `/` muestra la home institucional completa y el índice linkea a las rutas de servicio.
- [ ] **Step 4: Commit** — `feat(site): home institucional + sección metodología`.

---

### Task 7: Cablear rutas en App.tsx (end-to-end)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/LandingPage.tsx` (dejar de usarse en `/`; borrar el archivo si no lo referencia nada más)

**Interfaces:**
- Consumes: `HomePage` (Task 6), `ServicePage` (Task 4), `SERVICES` (Task 1).

Repuntar `/` → `HomePage`. Generar las rutas de servicio desde `SERVICES`: `<Route path="/:group/:slug" element={<ServicePageRoute/>} />` donde `ServicePageRoute` lee `useParams`, resuelve `getService`, y si no existe `<Navigate to="/" replace />`. Mantener `SmoothScroll`/`CursorRestorer` cubriendo también las páginas públicas nuevas (hoy solo `/`): extender `isLanding` a las rutas de servicio o envolver el grupo público. No tocar `/admin/*` ni `/portal/*`.

- [ ] **Step 1:** Modificar `App.tsx`: repuntar `/`, agregar la ruta dinámica de servicio, extender SmoothScroll/cursor a las públicas.
- [ ] **Step 2: Verify** — `npm test` (lógica) y `npx tsc --noEmit` pasan; en preview: nav → cada uno de los 9 servicios carga; `/desarrollo/noexiste` redirige a `/`; Nosotros/Contacto desde una página de servicio bajan al ancla de la home; `/admin` y `/portal/login` siguen intactos.
- [ ] **Step 3: Commit** — `feat(site): multipágina cableada (home + 9 servicios)`.

---

## Notas de ejecución
- Correr todo en la rama `rediseno-web`. Sin commit a `main`, sin deploy.
- El PDF/`client_profile.json` están en el repo del motor (`/Users/sebamaza/Desktop/PROYECTOS DEV/Creador de Contenidos/storage/clients/creapp/`), no en este repo; leerlos desde ahí para Task 2.
- Pendientes heredados (loops Dental-IA/Trazapp, roles Seba/Facu, citas de clientes, decisión mobile) no entran en esta tanda.
