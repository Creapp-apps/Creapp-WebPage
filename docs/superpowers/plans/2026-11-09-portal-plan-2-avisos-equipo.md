# Portal — Plan 2: Avisos al equipo (cliente aprueba / pide cambios) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando un cliente aprueba o pide cambios en una pieza desde su portal, el equipo recibe un aviso persistente y en vivo (centro de notificaciones in-app), sin depender del browser del cliente.

**Architecture:** Un trigger `AFTER INSERT` en `content_approvals` (security-definer) arma el texto es-AR juntando cliente + pieza + decisión y lo inserta en `app_notifications` apuntando al equipo. El centro del front (`NotificationContext`) suma una suscripción Supabase Realtime a `app_notifications` (hoy solo escucha dispatches en memoria + FCM), para que el aviso aparezca en la campanita sin refrescar y en cualquier browser del equipo. FCM push queda best-effort (endpoint legacy), fuera de alcance.

**Tech Stack:** Supabase (plpgsql trigger security-definer, Realtime), React 19 + TS + `@supabase/supabase-js` (anon + RLS + Realtime).

**Spec:** `docs/superpowers/specs/2026-11-09-portal-onboarding-avisos-historias-design.md` (Parte 2 + §9).

## Global Constraints

- Front: solo `anon` + RLS; `service_role` nunca en el cliente. El trigger es security-definer (corre en la DB).
- Copy 100% es-AR (voseo).
- `git add` SOLO los archivos de cada task (hay WIP ajeno en el working tree; NUNCA `git add -A`).
- Migraciones idempotentes; su aplicación se difiere al usuario en el SQL Editor.
- No romper el centro de notificaciones existente (dispatches en memoria + FCM foreground siguen funcionando).
- `app_notifications` columnas: `id, type, title, body, url, target_role ('all'|'admin'|'sales'), target_user_id, read_by jsonb, metadata jsonb, created_at`. RLS: lee quien matchea `target_role='all'` o su rol o su `target_user_id`.

## Review Focus

- **Fuga a clientes:** `target_role='all'` lo puede leer un `client` por RLS. El aviso debe apuntar al EQUIPO (admin + sales), nunca `'all'`, para no filtrar la actividad de un cliente a otro. → Task 1.
- **Pieza o cliente nulos en el trigger:** un `content_approvals` cuyo job/cliente no resuelva no debe romper el insert del approval. El trigger nunca falla la transacción del approval. → Task 1.
- **Doble suscripción / leak de canal:** la suscripción Realtime se limpia al desmontar y no duplica canales en re-render. → Task 2.
- **Dedupe con FCM:** si llega el mismo evento por Realtime y por FCM, no se muestran dos veces (dedupe por una clave estable, ej. el id de la fila). → Task 2.
- **Comentario largo / sin comentario:** "pidió cambios" sin comentario muestra solo el estado; con comentario lo incluye sin romper el layout. → Task 1 (texto) / Task 2 (render reusa el item existente).

---

### Task 1: Migración — trigger de aviso + realtime en `app_notifications`

**Files:**
- Create: `supabase/migrations/20261109140000_notify_team_on_approval.sql`

**Interfaces:**
- Produces: al insertarse una fila en `content_approvals`, se insertan filas en `app_notifications` dirigidas al equipo (una con `target_role='admin'` y otra con `target_role='sales'`, para cubrir admin y vendedor sin usar `'all'`). `type` = `content_approved` | `content_changes_requested`. `metadata` lleva `{ job_id, client_id, decision }`. `app_notifications` queda en la publicación `supabase_realtime`.

- [ ] **Step 1: Escribir la migración** (idempotente):
  - Función `public.notify_team_on_content_approval()` security-definer: desde `NEW` (content_approvals: `job_id, client_user_id, decision, comment`), resolver pieza (`content_jobs.title`, `content_jobs.client_id`) y marca (`clients.name`) con SELECTs; si algo no resuelve, usar fallbacks ("una pieza" / "un cliente") y nunca lanzar (envolver en `begin ... exception when others then return NEW; end`). Construir `title`/`body` es-AR: aprobado → body "«{marca}» aprobó «{pieza}»."; changes_requested → "«{marca}» pidió cambios en «{pieza}»" + (si hay comment) " — {comment}". `type` según decisión. `url` = '/admin?tab=content_campaigns'. Insertar DOS filas en `app_notifications` (`target_role='admin'` y `'sales'`) con ese contenido y `metadata = jsonb_build_object('job_id', NEW.job_id, 'client_id', <client_id>, 'decision', NEW.decision)`.
  - Trigger `after insert on public.content_approvals for each row execute function public.notify_team_on_content_approval()` (drop-if-exists antes).
  - Agregar `app_notifications` a la publicación realtime idempotente: `do $$ begin if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='app_notifications') then alter publication supabase_realtime add table public.app_notifications; end if; end $$;`.
- [ ] **Step 2: Verificar (SQL, diferido al usuario)** — tras aplicar: insertar un `content_approvals` de prueba y confirmar 2 filas nuevas en `app_notifications` con el texto correcto; `select ... from pg_publication_tables ... tablename='app_notifications'` devuelve 1 fila. Documentar estos pasos; NO ejecutarlos (aplicación diferida al usuario).
- [ ] **Step 3: Commit** (solo el archivo de la migración).

---

### Task 2: Suscripción Realtime del centro a `app_notifications`

**Files:**
- Create: `src/lib/notificationRealtimeMapper.ts`, `src/lib/notificationRealtimeMapper.test.ts`
- Modify: `src/context/NotificationContext.tsx`

**Interfaces:**
- Consumes: filas de `app_notifications` (Task 1) vía Realtime.
- Produces:
  - `mapDbNotification(row): NotificationItem` (PURO) — mapea una fila de `app_notifications` (`id, type, title, body, url, metadata, created_at`) al `NotificationItem` que ya usa el centro (reusar el shape existente del context: id estable derivado del row id, `read:false`, `createdAt`, title/body/url/type). Un `dbNotifId(rowId)` estable para dedupe.
  - En `NotificationContext`: un `useEffect` nuevo que, con `user` presente, se suscribe por Supabase Realtime a `INSERT` en `public.app_notifications` (RLS ya filtra por rol/usuario), mapea con `mapDbNotification` y lo agrega con la MISMA lógica que `addNotification` (toast + chime + lista), **dedupeando** por el id estable para no duplicar con FCM; limpia el canal al desmontar. (Carga inicial opcional de no-leídas: si es barato, un `select` de las últimas N dirigidas al usuario; si no, dejar solo el live y anotarlo.)

- [ ] **Step 1: Escribir el test que falla** — `notificationRealtimeMapper.test.ts` (node:test): `mapDbNotification` con una fila `content_changes_requested` (con body y comentario) y una `content_approved` → produce el `NotificationItem` correcto (type/title/body/url mapeados, `read:false`, id estable y determinista a partir del row id). Incluir que dos llamadas con el mismo row id dan el mismo `id` (para dedupe).
- [ ] **Step 2: Correr y verificar que falla** — `npm test`.
- [ ] **Step 3: Implementar** `notificationRealtimeMapper.ts` (puro) + el `useEffect` de suscripción en `NotificationContext.tsx` (dedupe por id estable; cleanup del canal).
- [ ] **Step 4: Correr tests** — `npm test` verde. `npm run build` verde.
- [ ] **Step 5: Commit** (solo tus archivos).

---

## Notas de handoff

- **Prerrequisito del usuario:** aplicar la migración de Task 1 en el SQL Editor (incluye sumar `app_notifications` a la publicación `supabase_realtime`). El trigger corre en la DB; no requiere deploy de edge function.
- **FCM push cross-browser** queda best-effort (endpoint legacy); el canal confiable es el centro in-app + Realtime (este plan).
- **Prueba real (tras aplicar):** desde el portal, con un cliente, aprobar/pedir cambios una pieza y ver el aviso aparecer en la campanita del equipo en otro browser/sesión sin refrescar.
- **Siguiente (no en este plan):** Parte 3 (avisos al cliente agrupados + multi-campaña), Parte 4 (historias).
