# Portal — Home con valor + Sidebar tematizado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El sidebar se tiñe con el branding del cliente (con logo del cliente arriba, CreAPP al pie) y tiene toggle de expandir siempre visible; el home ("Campaña") pasa de un hero vacío a un resumen con valor (estado + próximas publicaciones + rail + atajos).

**Architecture:** Solo UI, reusa datos existentes (campaña de `portalService`, publicaciones de `calendarService` P1) y el theming existente (`usePortalTheme` ya pinta `.portal` con el tema del cliente; el sidebar pasa a usar esas vars). Sin endpoints/migraciones/RLS. Lógica nueva testeable mínima (`nextPublication`) con node:test; sidebar/home por build + humo.

**Tech Stack:** React 18, lucide, CSS `portal.css` (vars de `portalThemes`). Tests: `node --import tsx --test src/lib/*.test.ts`.

**Spec:** `docs/superpowers/specs/2026-11-25-portal-home-y-sidebar-branding-design.md`

## Global Constraints
- Reusar el theming existente: el sidebar usa las vars del tema (`--bg/--navy/--navy2/--ink/--muted/--line/--wood`), no colores CreAPP fijos.
- Logo del cliente = mark superior del sidebar; CreAPP = `AgencyBadge` al pie (ya está). No confundir de quién es el portal.
- Contraste a salvo al tematizar (usar `--ink/--muted` del tema; derivar superficie del sidebar de `--bg` con `color-mix`).
- Lógica testeable en `src/lib/*.test.ts` (node:test). UI por build + humo.
- No tocar login/auth ni Calendario/Revisión/Insights (más allá de que el sidebar los tiñe).

## Review Focus
- **Campaña sin publicaciones programadas** → `nextPublication` null → tarjeta "en revisión" + "Próximas" vacías con estado honesto, no crash. → test Task 1 + Task 3.
- **Próximas publicaciones**: solo futuras, ordenadas ascendente, top N. → test Task 1.
- **Cliente sin logo** → fallback a inicial sobre el acento del tema (no violeta). → Task 2 (humo).
- **Sidebar en tema claro** (minimal_clean) → contraste legible. → Task 2 (humo).
- **Rail y atajos** navegan a la sección correcta. → Task 3/4 (humo).

---

### Task 1: Lógica pura del home — `nextPublication`

**Files:**
- Create: `src/lib/portalHome.ts`
- Test: `src/lib/portalHome.test.ts`

**Interfaces:**
- Produces: `nextPublication<T extends { date: Date | null }>(items: T[], now: Date): T | null` — el ítem con la fecha futura más cercana (`date > now`), o null.
  - `upcomingPublications<T extends { date: Date | null }>(items: T[], now: Date, limit?: number): T[]` — las futuras ordenadas asc, hasta `limit` (default 3).

- [ ] **Step 1: Escribir los tests** `src/lib/portalHome.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextPublication, upcomingPublications } from './portalHome';

const now = new Date('2026-11-25T12:00:00Z');
const mk = (iso: string | null) => ({ date: iso ? new Date(iso) : null, id: iso });

test('nextPublication: la futura más cercana, ignora pasadas y null', () => {
  const items = [mk('2026-11-20T12:00:00Z'), mk('2026-11-30T12:00:00Z'), mk('2026-11-28T12:00:00Z'), mk(null)];
  assert.equal(nextPublication(items, now)?.id, '2026-11-28T12:00:00Z');
});

test('nextPublication: sin futuras → null', () => {
  assert.equal(nextPublication([mk('2026-11-20T12:00:00Z'), mk(null)], now), null);
});

test('upcomingPublications: solo futuras, asc, top N', () => {
  const items = [mk('2026-12-05T12:00:00Z'), mk('2026-11-20T12:00:00Z'), mk('2026-11-28T12:00:00Z'), mk('2026-11-30T12:00:00Z')];
  const out = upcomingPublications(items, now, 2);
  assert.deepEqual(out.map((x) => x.id), ['2026-11-28T12:00:00Z', '2026-11-30T12:00:00Z']);
});
```

- [ ] **Step 2: Correr y ver fallar** — `node --import tsx --test src/lib/portalHome.test.ts` → FAIL.
- [ ] **Step 3: Implementar** `portalHome.ts` (filtrar `date && date>now`, ordenar asc por `date`, `[0]` / `slice(0,limit)`).
- [ ] **Step 4: Correr y ver pasar** → PASS; y suite completa verde.
- [ ] **Step 5: Commit** (`git add src/lib/portalHome.ts src/lib/portalHome.test.ts && git commit -m "feat(portal-home): nextPublication/upcomingPublications (puro + tests)"`).

---

### Task 2: Sidebar — toggle siempre visible + theming por cliente + logo del cliente

**Files:**
- Modify: `src/components/portal/PortalShell.tsx`
- Modify: `src/components/portal/portal.css` (`.psb-*`)

**Interfaces:**
- Consumes: `BrandMarkView` (`@/components/portal/CampaignHero`) para el logo.
- Produces: `PortalShell` acepta prop nueva `brand?: PortalCampaign['client']` (para el mark superior).

- [ ] **Step 1: Toggle siempre visible**: quitar la regla CSS `.pshell.collapsed .psb-collapse{display:none}` y asegurar que el botón quede accesible en colapsado (ícono `PanelLeft` = expandir). En colapsado, ubicarlo centrado bajo el mark.
- [ ] **Step 2: Theming del sidebar**: en `.psb` y `.psb-*`, reemplazar los colores fijos (`#0b1020`, `#090c17`, violetas `#b06cff/#ff5ea8`) por vars del tema: superficie = `color-mix(in srgb, var(--bg) 85%, #000)` (un paso del fondo del cliente) con `border-color: var(--line)`; ítem activo = `rgba(var(--wood-rgb),…)` + glow del acento; hover = `var(--navy2)`; textos `--ink`/`--muted`; badge de pendientes = acento del tema. El gradiente violeta solo queda, si acaso, en el `AgencyBadge` de CreAPP (chrome de agencia), no en la navegación.
- [ ] **Step 3: Mark superior = logo del cliente**: reemplazar el `psb-mark` "C" por `<BrandMarkView client={brand} />` cuando `brand` existe; fallback a la inicial sobre el acento del tema. (El CreAPP se mantiene al pie con `AgencyBadge`.)
- [ ] **Step 4: Verificar build** — `npm run build` compila.
- [ ] **Step 5: Humo** (Review Focus): colapsar/expandir anda; con Materalia el sidebar es navy+amarillo; con un tema claro el texto se lee; cliente sin logo → inicial sobre acento.
- [ ] **Step 6: Commit** (`PortalShell.tsx` + `portal.css`; `feat(portal): sidebar tematizado por cliente + toggle siempre visible + logo del cliente`).

---

### Task 3: `PortalHome` — resumen con valor

**Files:**
- Create: `src/components/portal/PortalHome.tsx`
- Modify: `src/components/portal/portal.css` (`.home-*`)

**Interfaces:**
- Consumes: `getMyCalendarPieces` (`@/lib/calendarService`), `nextPublication`/`upcomingPublications` (Task 1), `toLocalDayKey`/`CalendarPiece` (P1), `BrandMarkView`, `progressSummary` (`@/lib/portalView`), `PortalSection`.
- Produces: `PortalHome({ campaign, campaignId, onNavigate, pendingCount }: { campaign: PortalCampaign; campaignId: string | null; onNavigate: (s: PortalSection) => void; pendingCount: number })`.

- [ ] **Step 1: Implementar** según spec §5.2:
  - Header compacto: `BrandMarkView` + `<marca> · Campaña de <mes>` + concepto (si hay).
  - Tarjetas de estado: total piezas, aprobadas, pendientes (`progressSummary(campaign.pieces)`), y "próxima publicación" = fecha de `nextPublication(pieces, now)`; si null → "en revisión" honesto.
  - Próximas publicaciones: `getMyCalendarPieces(campaignId)` → `upcomingPublications(…, 3)` con fecha + portada; click → `onNavigate('calendario')`. Si vacío → nota honesta.
  - Rail de piezas: portadas de `campaign.pieces`; click → `onNavigate('revision')`.
  - Atajos: botones → Revisión / Calendario / Insights.
  - Acentos y tipografía del tema del cliente; estados de carga/empty suaves.
- [ ] **Step 2: Verificar build** — `npm run build` compila.
- [ ] **Step 3: Humo**: Materalia con/ sin publicaciones programadas; rail y atajos navegan.
- [ ] **Step 4: Commit** (`PortalHome.tsx` + `portal.css`; `feat(portal-home): resumen con estado, proximas publicaciones, rail y atajos`).

---

### Task 4: Wire en `PortalView`

**Files:**
- Modify: `src/pages/PortalView.tsx`

**Interfaces:**
- Consumes: `PortalHome` (Task 3), `PortalShell.brand` (Task 2).
- Produces: `active === 'campania'` renderiza `PortalHome`; `PortalShell` recibe `brand={campaign.client}`.

- [ ] **Step 1: Reemplazar** en la sección `campania` el `<CampaignHero campaign={campaign} />` por `<PortalHome campaign={campaign} campaignId={campaign.id} onNavigate={setActive} pendingCount={pendingCount} />`.
- [ ] **Step 2: Pasar** `brand={campaign.client}` a `PortalShell`.
- [ ] **Step 3: Verificar build + suite** — `npm run build` compila; `node --import tsx --test src/lib/*.test.ts` verde.
- [ ] **Step 4: Humo end-to-end**: home muestra el resumen; sidebar tematizado con logo del cliente y CreAPP al pie; secciones andan.
- [ ] **Step 5: Commit** (`PortalView.tsx`; `feat(portal): monta PortalHome + pasa marca del cliente al shell`).

---

## Notas de ejecución
- Worktree/branch nuevo desde `main` (ya trae P1+P2).
- Orden 1→4 (logic → sidebar → home → wire). Tasks 2 y 3 son independientes; 4 cablea.
