# Portal — Visor de piezas tipo reel · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar los rieles de tarjetas 9:16 del portal del cliente por un visor centrado tipo reel que muestra una pieza a la vez, con progreso, navegación y auto-avance.

**Architecture:** Lógica pura de la cola de revisión en `src/lib` (testeable con `node --test`). Un componente presentacional `PieceReview` reutiliza el media/meta/decisión que hoy vive en `PiecePlayer` (modal) pero centrado y sin modal. `PortalView` posee el índice actual y el auto-avance usando la lógica pura; `PortalPreview` (vista admin) usa el mismo visor en modo `readOnly`.

**Tech Stack:** Vite + React + TypeScript + Tailwind + `portal.css` (vars de tema). Tests: `node --import tsx --test src/lib/*.test.ts`. UI: verificación por `tsc --noEmit`, `npm run build` y screenshot con agent-browser.

**Spec:** `docs/superpowers/specs/2026-11-24-portal-reel-viewer-design.md`

## Global Constraints
- Estética y colores salen de las vars de `portal.css` (tema por campaña); no hardcodear colores de marca.
- Accesibilidad: teclado `Esc` (cerrar hilo/volver), `←`/`→` (anterior/siguiente); respetar `prefers-reduced-motion` (sin animación de avance si está activo).
- No romper `submitDecision` (aprobar/pedir cambios), `PieceThread` (conversación), ni la RLS.
- Carruseles usan láminas (`piece.slides`) con ‹ › y contador; reels/historias usan `PortalVideo` con `piece.mediaUrl` + `piece.coverUrl`.
- Responsive: desktop = media centrada con meta/acciones alrededor; ≤760px = media ancho completo con meta/acciones debajo.
- El orden de la cola es `reel → carousel → story`, aplanado (sin secciones por tipo).

## Review Focus
- **Todas decididas al entrar**: la cola arranca mostrando el estado "Revisaste todo" con el resumen correcto, no una pieza en blanco. → Task 1 (`firstPendingIndex` devuelve 0; `reviewSummary` cuenta) + Task 2 (render done-state cuando no hay pendientes).
- **Una sola pieza (N=1)**: sin anterior/siguiente fuera de rango; progreso con una sola barra. → Task 1 (`nextPendingIndex` devuelve null) + Task 2 (flechas deshabilitadas en los bordes).
- **`changes_requested` cuenta como decidida**: el auto-avance la saltea y el resumen la cuenta aparte de pendientes. → Task 1 (`nextPendingIndex`/`reviewSummary` tratan 'sent' como único pendiente).
- **Carrusel en el visor**: navega láminas, no intenta reproducir video. → Task 2 (ramo de media por `piece.slides`).
- **Pieza sin media (ni `mediaUrl` ni `slides`)**: el visor no rompe; cae a `coverUrl` o placeholder. → Task 2 (fallback de media).

---

### Task 1: Lógica de la cola de revisión

**Files:**
- Create: `src/lib/reviewQueue.ts`
- Test: `src/lib/reviewQueue.test.ts`

**Interfaces:**
- Consumes: `PortalPiece` de `./portalTypes` (campos `type`, `status`).
- Produces:
  - `orderReview<T extends { type: PortalPiece['type'] }>(pieces: T[]): T[]` — orden estable `reel → carousel → story`.
  - `firstPendingIndex(pieces: Pick<PortalPiece,'status'>[]): number` — índice de la primera `status === 'sent'`; `0` si no hay ninguna.
  - `nextPendingIndex(pieces: Pick<PortalPiece,'status'>[], from: number): number | null` — próxima `'sent'` buscando `from+1..end` y luego `0..from-1`; `null` si no queda ninguna.
  - `reviewSummary(pieces: Pick<PortalPiece,'status'>[]): { total: number; approved: number; changes: number; pending: number }`.

- [ ] **Step 1: Write the failing tests** en `src/lib/reviewQueue.test.ts`:

```ts
// orderReview: reel, carousel, story — estable
assert.deepEqual(orderReview([{type:'story'},{type:'reel'},{type:'carousel'},{type:'reel'}]).map(p=>p.type),
  ['reel','reel','carousel','story']);
// firstPendingIndex: primera 'sent'
assert.equal(firstPendingIndex([{status:'approved'},{status:'sent'},{status:'sent'}]), 1);
// firstPendingIndex: ninguna pendiente -> 0
assert.equal(firstPendingIndex([{status:'approved'},{status:'changes_requested'}]), 0);
// nextPendingIndex: hacia adelante
assert.equal(nextPendingIndex([{status:'approved'},{status:'sent'},{status:'sent'}], 1), 2);
// nextPendingIndex: envuelve hacia atrás
assert.equal(nextPendingIndex([{status:'sent'},{status:'approved'},{status:'approved'}], 0), null);
assert.equal(nextPendingIndex([{status:'sent'},{status:'approved'},{status:'sent'}], 2), 0);
// nextPendingIndex: nada pendiente -> null
assert.equal(nextPendingIndex([{status:'approved'},{status:'changes_requested'}], 0), null);
// reviewSummary
assert.deepEqual(reviewSummary([{status:'approved'},{status:'sent'},{status:'changes_requested'}]),
  { total:3, approved:1, changes:1, pending:1 });
```

- [ ] **Step 2: Run tests, verify fail** — `npx tsx --test src/lib/reviewQueue.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3: Implement** las 4 funciones en `src/lib/reviewQueue.ts` con las firmas de Interfaces. `orderReview` usa un índice por `ORDER = ['reel','carousel','story']` y `sort` estable; `'sent'` es el único estado pendiente.
- [ ] **Step 4: Run tests, verify pass.**
- [ ] **Step 5: Commit** — `git add src/lib/reviewQueue.ts src/lib/reviewQueue.test.ts && git commit -m "feat(portal): lógica de cola de revisión one-by-one"`

---

### Task 2: Visor `PieceReview` + wiring en `PortalView`

**Files:**
- Create: `src/components/portal/PieceReview.tsx`
- Modify: `src/pages/PortalView.tsx` (reemplaza el bloque de rieles por el visor; agrega estado de índice y auto-avance)
- Modify: `src/components/portal/portal.css` (estilos del visor; los de `.rail`/`.card` quedan sin uso)

**Interfaces:**
- Consumes: Task 1 (`orderReview`, `firstPendingIndex`, `nextPendingIndex`, `reviewSummary`); `PortalVideo`, `PieceThread`, `typeMeta`; el `decide(id, decision, comment)` que ya existe en `PortalView`.
- Produces: componente
  `PieceReview(props: { pieces: PortalPiece[]; index: number; onIndex: (i:number)=>void; busy: boolean; error?: string|null; readOnly?: boolean; onApprove: ()=>void; onSendChanges: (comment:string)=>void; onApproveRemaining: ()=>void })`.
  - Progreso: barras tipo stories (una por pieza; la actual activa; las anteriores llenas); clic en una barra = `onIndex`.
  - Media: `piece.mediaUrl` → `PortalVideo`; si no, `piece.slides.length` → láminas con ‹ › y contador; si no, `piece.coverUrl`; si no, placeholder. (Mismo ramo que `PiecePlayer` hoy.)
  - Meta: tipo (`typeMeta().singular`), título, caption, descripción, hashtags.
  - Acciones (si `!readOnly` y `status==='sent'`): Aprobar / Pedir cambios (con textarea de comentario, igual que `PiecePlayer`). Si `status==='approved'`: "✓ Aprobada por vos". Si `readOnly`: nota de vista previa, sin disparar decisiones.
  - Navegación: ‹ anterior · siguiente › (deshabilitadas en los bordes); teclado `←`/`→`.
  - Hilo: `PieceThread` (modo client) si `!readOnly`.
  - Estado "Revisaste todo": cuando no quedan pendientes (`nextPendingIndex` null y la actual ya está decidida), muestra resumen (`reviewSummary`) + atajo chico **"Aprobar las que falten"** → `onApproveRemaining` (oculto si `pending===0` o `readOnly`).

- [ ] **Step 1: Implementar `PieceReview.tsx`** con la interfaz de arriba, reutilizando el markup de media/meta/decisión de `PiecePlayer` (sin el wrapper `.modal/.sheet`; usa clases nuevas del visor). Sin estado de índice propio (lo maneja el padre).
- [ ] **Step 2: Wire en `PortalView`**: estado `const [idx, setIdx] = useState(0)`; `const pieces = orderReview(campaign.pieces)`; inicializar `idx` en `firstPendingIndex(pieces)` al cargar la campaña (efecto o `useMemo` + guardia). Tras `decide()` exitoso, `setIdx(nextPendingIndex(pieces, idx) ?? idx)`. Reemplazar el render de `groups.map(PieceRail...)` y la barra "Aprobar pendientes" por `<PieceReview pieces={pieces} index={idx} onIndex={setIdx} busy={...} error={...} onApprove={()=>decide(pieces[idx].id,'approved')} onSendChanges={(c)=>decide(pieces[idx].id,'changes_requested',c)} onApproveRemaining={approvePending} />`. Mantener header (logo/switch/cerrar sesión), tema (`data-theme`/`themeStyle`) y estados loading/empty.
- [ ] **Step 3: Estilos** en `portal.css`: contenedor centrado del visor, media con alto máx ~70vh, barras de progreso, flechas, acciones, done-state; responsive ≤760px (media full width, meta/acciones debajo). Usar vars de tema; sin colores hardcodeados.
- [ ] **Step 4: Verificar** — `npx tsc --noEmit` (0 errores) · `npm test` (lib verde) · `npm run build` (ok).
- [ ] **Step 5: Verificación visual** — `npm run dev`, login como materalia, screenshot del visor (pieza centrada, progreso, botones) en desktop y a 390px de ancho. Confirmar tema navy+amarillo y que no quedan rieles.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(portal): visor de piezas tipo reel one-by-one (reemplaza rieles)"`

---

### Task 3: Paridad en la vista admin (`PortalPreview`)

**Files:**
- Modify: `src/pages/admin/PortalPreview.tsx` (usa `PieceReview` en `readOnly` en vez de los rieles)

**Interfaces:**
- Consumes: `PieceReview` (Task 2) en modo `readOnly`; `orderReview`/`firstPendingIndex` (Task 1).

- [ ] **Step 1: Reemplazar** el render de `groups.map(PieceRail...)` por `<PieceReview pieces={orderReview(campaign.pieces)} index={idx} onIndex={setIdx} readOnly busy={false} onApprove={noop} onSendChanges={noop} onApproveRemaining={noop} />` con estado `idx` local (inicial `firstPendingIndex`). Mantener el banner "Vista previa del equipo" y el tema inyectado.
- [ ] **Step 2: Verificar** — `npx tsc --noEmit` (0) · `npm run build` (ok).
- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat(portal-admin): preview usa el visor one-by-one (paridad con el cliente)"`

---

## Notas de cierre
- `PieceCard.tsx` / `PieceRail.tsx` quedan sin uso tras Task 2/3. Removerlos es opcional (el builder decide); si se dejan, no se importan desde ninguna vista.
- Patrones nuevos de UI descubiertos (si los hay) se documentan al cerrar, por convención del repo.
