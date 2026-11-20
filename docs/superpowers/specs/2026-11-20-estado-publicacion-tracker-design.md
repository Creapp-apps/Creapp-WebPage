# Estado de publicación en el tracker de contenido (solo lectura)

## Intención y por qué

El motor y el cron de Vercel (ver `2026-11-20-publicacion-programada-sin-pc-design.md`)
ya mueven cada pieza aprobada por `scheduled_posts` (`queued → containerizing
→ ready → publishing → published`, o `error`), sin que nadie tenga que mirar
una terminal. Pero hoy nadie ve ese estado desde ningún lado: hay que entrar
a Supabase a mano para saber si una pieza salió bien, se trabó, o falló. El
objetivo de este cambio es que ese estado aparezca, en vivo, en el tracker
de contenido que el equipo ya usa todos los días.

## Goals

- Ver, por pieza, su estado de publicación (`queued | containerizing | ready
  | publishing | published | error`) y, si está en `error`, el mensaje.
- Que se actualice solo (realtime), sin recargar la página.
- Reusar la arquitectura ya existente del tracker (`contentTrackerService.ts`,
  `contentTrackerMapper.ts`, `ContentCampaignsTab` → `PieceStatusRow`), no
  crear una pantalla nueva.

## Non-goals

- Ninguna acción desde esta vista (reintentar, cancelar, forzar estado). Es
  de solo lectura — decisión del usuario, 2026-11-20. Cuando se quiera sumar
  acciones, es un cambio aparte.
- No se toca el motor ni el cron — este cambio vive 100% en el portal
  (lectura de una tabla que ya existe).
- No hay historial ni gráfico de piezas publicadas en el tiempo — solo el
  estado actual de cada una.

## Constraints

- **Mismo proyecto Supabase, tabla ya existe.** `scheduled_posts` la creó el
  plan del motor (`cola-publicacion-supabase-motor.md`, Task 2) sin RLS más
  allá del `service_role` que usan el motor y el cron. Este tracker lee con
  la `anon key` desde el cliente (como el resto de `contentTrackerService.ts`),
  así que hace falta una policy de lectura nueva — no se puede asumir que ya
  es legible desde acá.
- **Clave de join: `client_id` + `job_id`.** `scheduled_posts.job_id` lo
  escribe el motor como `target_post.job_id or f"{campaign_id}_{post_id}"` —
  debería coincidir con `content_jobs.job_id_motor`, que es exactamente el
  campo pensado para esto. **A verificar por quien lo construya:** confirmar
  contra una fila real (aunque sea de prueba) que `scheduled_posts.client_id`
  usa el mismo slug que `content_jobs.client_id` en este proyecto — si
  difieren, el join no trae nada y hay que resolverlo antes de seguir.
- Una pieza puede no tener fila en `scheduled_posts` todavía (no programada) —
  ese caso no muestra badge de publicación, no es un error.
- Seguir el patrón ya establecido del archivo: `for select to authenticated
  using (exists (select 1 from public.user_profiles where id = auth.uid()
  and role in ('admin','vendedor')))` (mismo patrón que `content_jobs` en
  `20261107120000_create_content_foundation.sql:122-132`) — equipo, no
  cliente. Esta vista es operativa/interna, nunca para el cliente final.

## Approaches

Una sola vía razonable: extender el tracker existente (mapper + servicio +
`PieceStatusRow`) en vez de armar una pantalla nueva. El tracker ya modela
exactamente la jerarquía necesaria (cliente → campaña → pieza) y ya tiene el
canal realtime armado; una pantalla aparte duplicaría esa estructura sin
ningún beneficio. No se consideraron alternativas — es la decisión obvia
dado lo que ya existe.

## Diseño

### 1. Migración SQL (`supabase/migrations/<timestamp>_scheduled_posts_rls_realtime.sql`)

Mismo patrón que `20261107120000_create_content_foundation.sql` (RLS +
policy de equipo) y `20261108120000_content_realtime.sql` (alta a la
publicación realtime), aplicado a `scheduled_posts`:

```sql
alter table public.scheduled_posts enable row level security;

drop policy if exists "Team can read scheduled_posts" on public.scheduled_posts;
create policy "Team can read scheduled_posts"
  on public.scheduled_posts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role in ('admin', 'vendedor')
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'scheduled_posts'
  ) then
    alter publication supabase_realtime add table public.scheduled_posts;
  end if;
end $$;
```

(Se aplica a mano en el SQL Editor de Supabase, igual que la migración de la
tabla — no hay forma de correrla desde este entorno.)

### 2. `contentTrackerMapper.ts` / `contentTrackerTypes.ts`

- Nuevo tipo `PublishStatus = 'queued' | 'containerizing' | 'ready' |
  'publishing' | 'published' | 'error'`.
- `TrackerPiece` gana `publishStatus: PublishStatus | null` y
  `publishErrorMessage: string | null` (`null` = sin fila en
  `scheduled_posts`, no programada).
- `mapTracker` recibe un sexto array (`TScheduledPostRow[]`, columnas
  `client_id, job_id, status, error_message`) y arma un `Map` por
  `` `${client_id}:${job_id}` `` para resolverlo en `toPiece`.

### 3. `contentTrackerService.ts`

- `getTrackerOverview`: sumar `sb.from('scheduled_posts').select('client_id,
  job_id, status, error_message')` al `Promise.all` existente.
- `subscribeTracker`: sumar `.on('postgres_changes', { event: '*', schema:
  'public', table: 'scheduled_posts' }, () => onChange())` al canal ya
  existente.

### 4. `PieceStatusRow.tsx`

Un chip más, mismo estilo que el de "Renderizada" (línea 70-73): ícono +
texto, verde progresivo para `containerizing/ready/publishing/published`,
rojo para `error` (con el `error_message` en un `title=""` nativo del
`<span>`, sin componente de tooltip nuevo). No se muestra nada si
`publishStatus` es `null`.

## Qué queda para quien lo construya

- Verificar el join `client_id`/`job_id` contra una fila real antes de dar
  por buena la query (constraint de arriba).
- Nombre de archivo exacto de la migración (timestamp del momento en que se
  aplique, siguiendo la convención `YYYYMMDDHHMMSS_descripcion.sql` ya usada
  en `supabase/migrations/`).
- Mapeo de texto visible para cada estado (ej. `queued` → "Programada",
  `containerizing` → "Preparando", etc.) — libre, mientras seguSo el estilo
  conciso ya usado en `STATUS_LABEL`/`STAGE_LABEL` de este mismo archivo.
