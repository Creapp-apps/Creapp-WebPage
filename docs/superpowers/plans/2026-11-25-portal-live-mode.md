# Portal — Modo "campaña en vivo" (P4 / B) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un cliente con `scheduled_posts` pero sin `content_jobs` vea el portal completo (Home + Calendario + Insights) en modo en vivo (read-only), en vez de "Tu campaña se está preparando".

**Architecture:** Solo portal. Nueva policy RLS deja al miembro leer sus `scheduled_posts` por membresía (slug→uuid), sin `content_jobs`. `portalService` arma una **campaña sintética live** cuando hay 0 `content_campaigns` pero sí `scheduled_posts`. El resto (shell/Home/Calendario/Insights de P1–P3) se reusa; Home deriva sus tarjetas del calendario en live. Lógica nueva pura (`buildLiveCampaign`, `liveStats`, `campaignViewState` live) con node:test; servicio/UI por build + humo.

**Tech Stack:** React 18, Supabase, CSS `portal.css`. Tests: `node --import tsx --test src/lib/*.test.ts`.

**Spec:** `docs/superpowers/specs/2026-11-25-portal-live-mode-design.md`

## Global Constraints
- RLS fail-closed; la nueva policy oculta un post solo si su `content_jobs` está explícitamente `client_visible=false` (preserva el gate de P1, habilita live).
- Live mode: `campaignId` que se pasa a Home/Calendario = `null` (NO `'__live__'`), si no `mapScheduledRows` filtra y tira todo.
- Un cliente sin `scheduled_posts` sigue en "preparándose" (no entra en live).
- Lógica testeable en `src/lib/*.test.ts`. UI por build + humo.
- No tocar el motor ni `main.py push` ni el flujo de review (Materalia sigue igual).

## Review Focus
- **Campaña live monta** (campaignViewState trata `live===true` como `'ready'`). → test Task 2.
- **month** derivado del `scheduled_at` más temprano (AR-local). → test Task 2 (`buildLiveCampaign`).
- **Home live** deriva tarjetas del calendario (total/publicadas/próxima), no de `pieces=0`. → test Task 2 (`liveStats`) + Task 4.
- **Cliente sin scheduled_posts** → `[]` (preparándose), no live. → Task 3 (lógica del service).
- **Review con `client_visible=false`** sigue oculto. → Task 1 (verificación manual RLS).

---

### Task 1: Migration RLS — leer `scheduled_posts` por membresía (reemplaza P1)

**Files:**
- Create: `supabase/migrations/20261125140000_scheduled_posts_member_read_by_slug.sql`

- [ ] **Step 1: Escribir la migration**:
```sql
-- Reemplaza la policy de P1 (gate por content_jobs) para habilitar "modo en vivo":
-- el miembro lee SUS scheduled_posts por membresía (slug→uuid), sin depender de
-- content_jobs. Oculta un post solo si su content_jobs está explícitamente
-- client_visible=false (preserva el gate de review de P1). Ver spec §4.1.
drop policy if exists "Members can read own scheduled_posts" on public.scheduled_posts;
create policy "Members can read own scheduled_posts"
  on public.scheduled_posts for select to authenticated
  using (
    public.is_member_of((select id from public.clients where slug = scheduled_posts.client_id))
    and not exists (
      select 1 from public.content_jobs j
      where j.job_id_motor = scheduled_posts.job_id and j.client_visible = false
    )
  );
```
- [ ] **Step 2: Verificar** (manual, SQL Editor): aplicar. Como cliente **stacked** (member): `select count(*) from scheduled_posts` → sus 20. Como cliente de otro tenant → 0. Como equipo → sigue viendo todo. Un post con `content_jobs.client_visible=false` → no lo ve el member. Dejar nota en el PR.
- [ ] **Step 3: Commit** (`feat(rls): cliente lee sus scheduled_posts por membresia (habilita live mode)`).

---

### Task 2: Lógica pura — `buildLiveCampaign`, `liveStats`, `campaignViewState` live

**Files:**
- Create: `src/lib/portalLive.ts`
- Test: `src/lib/portalLive.test.ts`
- Modify: `src/lib/portalTypes.ts` (agregar `live?: boolean` a `PortalCampaign`)
- Modify: `src/lib/portalView.ts` (`campaignViewState`: `live===true` → `'ready'`)
- Modify: `src/lib/portalView.test.ts` (test del caso live)

**Interfaces:**
- Produces:
  - `buildLiveCampaign(client: PortalCampaign['client'], rows: { scheduled_at: string | null }[]): PortalCampaign` — `{ id:'__live__', live:true, title:null, month:<YYYY-MM del scheduled_at más temprano, AR-local>, concept:null, aesthetic:null, client, pieces:[] }`.
  - `liveStats(pieces: { date: Date|null; published: boolean }[], now: Date): { total: number; published: number; next: Date | null }`.

- [ ] **Step 1: Escribir tests** `portalLive.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLiveCampaign, liveStats } from './portalLive';

const client = { name: 'Stacked', logoUrl: null, brandColors: null };

test('buildLiveCampaign: live, pieces vacío, month del más temprano (AR)', () => {
  const c = buildLiveCampaign(client, [{ scheduled_at: '2026-11-30T12:00:00Z' }, { scheduled_at: '2026-11-23T14:00:00Z' }]);
  assert.equal(c.live, true);
  assert.equal(c.id, '__live__');
  assert.deepEqual(c.pieces, []);
  assert.equal(c.month, '2026-11');
  assert.equal(c.client.name, 'Stacked');
});

test('buildLiveCampaign: sin fechas → month null', () => {
  assert.equal(buildLiveCampaign(client, [{ scheduled_at: null }]).month, null);
});

test('liveStats: total, publicadas, próxima', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  const p = [
    { date: new Date('2026-11-23T12:00:00Z'), published: true },
    { date: new Date('2026-11-28T12:00:00Z'), published: false },
    { date: new Date('2026-11-30T12:00:00Z'), published: false },
  ];
  const s = liveStats(p, now);
  assert.equal(s.total, 3);
  assert.equal(s.published, 1);
  assert.equal(s.next?.toISOString(), '2026-11-28T12:00:00.000Z');
});
```
Y en `portalView.test.ts` sumar: `campaignViewState({ live:true, pieces:[] })` → `'ready'`.

- [ ] **Step 2: Correr y ver fallar** (`node --import tsx --test src/lib/portalLive.test.ts src/lib/portalView.test.ts`).
- [ ] **Step 3: Implementar**:
  - `portalLive.ts`: `buildLiveCampaign` (month = `toLocalDayKey(earliest).slice(0,7)` de `calendarMapper`, o null sin fechas); `liveStats` (reusa `nextPublication` de `portalHome`).
  - `portalTypes.ts`: `live?: boolean` en `PortalCampaign`.
  - `portalView.ts` `campaignViewState`: si `campaign?.live` → `'ready'` antes del check de `pieces.length===0`.
- [ ] **Step 4: Correr y ver pasar** + suite completa verde.
- [ ] **Step 5: Commit** (`feat(portal-live): buildLiveCampaign/liveStats + campaignViewState live (puro + tests)`).

---

### Task 3: `portalService` — campaña sintética en vivo

**Files:**
- Modify: `src/lib/portalService.ts`

**Interfaces:** Consumes `buildLiveCampaign` (T2). `getMyCampaigns()` sin cambio de firma.

- [ ] **Step 1: Implementar** en `getMyCampaigns()`: si hay `client` pero `content_campaigns` = 0, consultar `scheduled_posts` del cliente (`select('scheduled_at').limit(1..N)`); si hay ≥1 fila → devolver `[buildLiveCampaign(client, rows)]`; si 0 → `[]` (igual que hoy). El `client` ya se lee de `client_public`.
- [ ] **Step 2: Verificar build** — `npm run build` compila.
- [ ] **Step 3: Commit** (`feat(portal-live): campaña sintética en vivo cuando hay scheduled_posts sin content_jobs`).

---

### Task 4: UI — gating live, Home live, Revisión oculta

**Files:**
- Modify: `src/pages/PortalView.tsx`
- Modify: `src/components/portal/PortalShell.tsx` (prop `hideReview?: boolean`)
- Modify: `src/components/portal/PortalHome.tsx` (tarjetas/rail en live desde el calendario)
- Modify: `src/components/portal/PortalReviewSection.tsx` (nota honesta si `pieces=0`)
- Modify: `src/components/portal/portal.css` (si hace falta)

**Interfaces:** Consumes `campaign.live`, `liveStats` (T2).

- [ ] **Step 1: `PortalView`**: `const live = !!campaign?.live;`
  - `campaignId` a Home/Calendario = `live ? null : campaign.id`.
  - `PortalShell ... hideReview={live}`; si `active==='revision'` y `live` → forzar `active='campania'` (o render nota).
  - Default `active` sigue `'revision'`; en live, iniciar en `'campania'`.
- [ ] **Step 2: `PortalShell`**: prop `hideReview`; si true, sacar el ítem Revisión del `NAV` render (Home/Calendario/Insights quedan).
- [ ] **Step 3: `PortalHome`**: si `campaign.live`, derivar tarjetas de `liveStats(cal, now)`: **Publicaciones** (total), **Publicadas**, **Próxima**; ocultar "aprobadas/esperan". El rail "Tus piezas" en live usa las piezas del calendario (portadas) → click al **Calendario**; atajos sin Revisión. Si no live, igual que hoy.
- [ ] **Step 4: `PortalReviewSection`**: si `pieces.length===0`, render nota "Tu campaña ya está publicada — no hay piezas para revisar acá" en vez de `PieceReview`.
- [ ] **Step 5: Verificar build + suite** — `npm run build`; `node --import tsx --test src/lib/*.test.ts` verde.
- [ ] **Step 6: Humo** (Review Focus): stacked (live) → monta shell, Home con tarjetas del calendario, Calendario con las 20, Insights; Revisión no aparece. Materalia (review) → igual que antes.
- [ ] **Step 7: Commit** (`feat(portal-live): gating live en PortalView + Home live + Revision oculta`).

---

## Notas de ejecución
- Worktree/branch nuevo desde `main` (trae P1–P3 + polish).
- Orden 1→4. Task 1 (RLS) verificación manual en Supabase.
- Precondición ya verificada: stacked tiene `clients` row + usuario miembro (`client_members`).
