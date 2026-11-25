# Portal del cliente — Shell con sidebar + Calendario de campaña (P1)

Fecha: 2026-11-25
Estado: diseño, pendiente de aprobación
Repo: `creapp---fintech-innovation-hub` (Vite + React SPA, no Next.js)

> Este es **P1**. Insights/Estadísticas es un proyecto aparte (**P2**) con una
> dependencia externa real (permiso Meta + token por cliente) y se diseña
> después. Acá solo se deja el ítem de nav "Insights" presente y **bloqueado**.

---

## 1. Intención y por qué

Hoy el portal del cliente (`/portal`, `PortalView`) es **una sola pantalla de
revisión**: el cliente aprueba o pide cambios pieza por pieza. No hay navegación,
ni forma de ver qué se publica y cuándo.

El objetivo es convertir el portal en un **espacio con secciones** y sumarle un
**calendario de la campaña** que el cliente mira como una maquinaria andando: ve
el plan del mes que quedó armado al aprobar el pre-flight y lanzar, y a medida
que pasan los días los casilleros ya consumidos se "gastan" visualmente
(blur), mientras los que vienen se ven nítidos. Cada casillero abre la pieza en
un player embebido.

El **por qué** (dicho por el usuario): darle al cliente sensación de valor y de
transparencia — "mirá tu campaña desarrollarse en tiempo real", con acceso a
cada pieza. Es retención y percepción de servicio premium.

## 2. Goals / Non-goals / Anti-goals

**Goals**
- Shell de portal con **sidebar colapsable** estética CreAPP (íconos `lucide`,
  glows/hover violeta→magenta de la marca), que envuelve las secciones.
- Sección **Calendario**: grilla del mes de la campaña alimentada por
  `scheduled_posts` del cliente, en vivo (realtime).
- Regla de **blur temporal**: casilleros de días ya pasados/publicados se
  muestran "gastados" (blur + velo), los futuros nítidos; hoy = borde vivo.
- **Player embebido** al abrir un casillero (reel mp4 / carrusel / story),
  con caption y, si ya se publicó, link "Ver en Instagram" (`permalink`).
- El flujo de **revisión actual se preserva** intacto, movido a una sección
  dentro del shell.

**Non-goals**
- No se construye Insights (es P2). Solo queda el ítem de nav bloqueado.
- No se toca el tablero admin **Lanzamientos** ni su `launchesService`.
- No se cambia la lógica de aprobación/decisión (`submitDecision`, review queue).
- El calendario del cliente es **solo lectura**: no reprograma ni arrastra.

**Anti-goals (fracaso aunque "funcione")**
- Que un cliente vea `scheduled_posts` de **otro** cliente (fuga RLS).
- Que un casillero blurreado **no se pueda abrir** (el blur es cosmético, no un
  candado).
- Vender "tiempo real" y que en realidad esté stale/mintiendo. Si cae a polling,
  se comunica honesto ("actualizado hace N").

## 3. Constraints

- Stack: **Vite + React + react-router-dom** (SPA). No Next.js, no server
  components. Routing en `src/App.tsx`.
- Datos: **Supabase directo desde el cliente bajo RLS** (`getSupabase()`), igual
  que `portalService.getMyCampaigns()`.
- El portal está **tematizado por cliente** (`portal.css` + `portalThemes.ts`:
  navy/wood por defecto = `executive_wealth`, se sobreescribe por campaña). El
  **chrome CreAPP** (sidebar, badge agencia) usa el gradiente de marca
  violeta→magenta (`.creapp`, `#b06cff → #ff5ea8`). Regla: **sidebar = identidad
  CreAPP; contenido = tema del cliente.**
- **No hay shadcn completo** en el repo (`components/ui` son piezas de
  landing/marketing). El sidebar se construye con el mismo sistema de tokens de
  `portal.css`, con *look* shadcn (superficies, bordes finos, glows) pero sin
  sumar la librería shadcn.
- `scheduled_posts` ya está en la publication `supabase_realtime`
  (`20261120204457_scheduled_posts_rls_realtime.sql`). Realtime respeta RLS.
- Disciplina RLS vigente (auditoría 2026-11-24, incidente Materalia): toda policy
  nueva **fail-closed** y de **mínimo privilegio**.

## 4. Approaches considerados

Todas comparten el shell + sidebar (lo pidió el usuario). El fork real era **cómo
se alimenta el calendario**:

- **A — Realtime directo con RLS nueva scopeada al cliente (ELEGIDA).**
  Se agrega una policy SELECT de miembro sobre `scheduled_posts`
  (`is_member_of(client_id)`), espejo de `content_visibility_rls`. Un
  `clientCalendarService.ts` lee las filas del cliente y se suscribe a los
  cambios (espejo de `subscribeLaunches`). El casillero cambia a "Publicado"
  **solo cuando la pieza se publica de verdad**. La plomería realtime ya existe y
  está probada; el costo es **una** policy bien escrita. Es coherente con todo el
  portal (Supabase-directo-bajo-RLS) y da "tiempo real" honesto.

- **B — Polling cada ~60s (sin tocar realtime).** Un service refresca la grilla
  cada minuto. El **blur por días es reloj del cliente** (no necesita server), así
  que la sensación de progreso corre igual; lo único con hasta 60s de delay es una
  pieza recién publicada. Más simple, pero menos "vivo". Queda como **fallback**
  si la policy del realm cliente se complica.

- **C — Híbrido (carga + polling suave ahora, realtime v2).** Descartada: no
  ahorra trabajo real frente a A (la policy hay que escribirla igual) y entrega
  menos.

**Elegida: A**, confirmada por el usuario ("vamos con A a fondo").

## 5. El "cómo" decidido

### 5.1 Backend — policy RLS (lo único de DB)

> **Corrección post builder-check (resuelve #1 y #2 juntas).**
> `scheduled_posts.client_id` es el **SLUG** (texto), no el uuid de `clients.id`
> (ver `launchesMapper.ts`: "scheduled_posts.client_id es el SLUG"). Y
> `public.is_member_of(uuid)` toma un **uuid**. Por eso **no** se gatea por
> `scheduled_posts.client_id` directo (tiraría error de cast o nunca matchearía).
> En cambio se gatea **a través de `content_jobs`**, donde `client_id` ya es uuid
> y existe `client_visible` — que además es la invariante del portal (el cliente
> solo ve piezas `client_visible = true`). Join:
> `scheduled_posts.job_id = content_jobs.job_id_motor`.

Nueva migration `supabase/migrations/2026112X_scheduled_posts_member_read.sql`:

```sql
drop policy if exists "Members can read own scheduled_posts" on public.scheduled_posts;
create policy "Members can read own scheduled_posts"
  on public.scheduled_posts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.content_jobs j
      where j.job_id_motor = scheduled_posts.job_id
        and public.is_member_of(j.client_id)
        and j.client_visible = true
    )
  );
```

- Mantiene intacta la policy de equipo existente ("Team can read scheduled_posts").
- `scheduled_posts` ya tiene RLS enabled y ya está en la publication realtime →
  no hace falta nada más de DB.
- **Fail-closed**: una fila sin `content_jobs` match (huérfana) o con
  `client_visible = false` **no** la ve el cliente. Correcto.
- **Perf**: conviene índice sobre `content_jobs.job_id_motor` (verificar; el join
  de `launchesMapper` ya lo usa). Si no existe, agregarlo en la misma migration.
- **Columnas seguras**: el service del cliente proyecta explícitamente
  `id, client_id, job_id, status, scheduled_at, cover_r2_url, media_r2_urls,
  caption, platform, permalink, published_media_id, updated_at`.
  **No** selecciona `error_message` ni `raw`/internos. (La policy filtra filas; el
  service limita columnas — doble capa.)

### 5.2 Datos — `clientCalendarService.ts`

Espejo reducido de `launchesService`:
- `getMyScheduledPosts(): Promise<CalendarPiece[]>` — `select(<columnas seguras>)`
  de `scheduled_posts` (RLS ya lo scopea al cliente), ordenado por `scheduled_at`.
- `subscribeMyCalendar(onChange): () => void` — `postgres_changes` sobre
  `scheduled_posts` (patrón de `subscribeLaunches`).
- Mapper `calendarMapper.ts` → `CalendarPiece`:
  `{ id, jobIdMotor, date (Date local), status, platform, type ('reel'|'carousel'|'story' derivado de platform), coverUrl, mediaUrls, caption, permalink, published }`.
- **Media/cover**: preferir las columnas de la fila (`cover_r2_url`,
  `media_r2_urls`). *Fallback* si vienen null: join `content_jobs` por
  `job_id_motor` → `content_assets` (gotcha ya resuelto en `launchesMapper`:
  `scheduled_posts.job_id = content_jobs.job_id_motor`;
  `content_assets.job_id = content_jobs.id`).
- **Timezone**: `scheduled_at` es UTC; se renderiza en **hora local del cliente**
  (AR). El cálculo de "día" para el blur usa la fecha local.
- **Scoping por campaña (resuelve #3 del builder-check).** `scheduled_posts` no
  tiene `campaign_id`; se obtiene por `job_id (job_id_motor) → content_jobs →
  campaign_id`. El join a `content_jobs` ya se hace igual (gate/media), y
  `content_jobs` trae `campaign_id`. **Decisión:** el calendario **sigue al
  switcher de campaña del shell** (como ya hace `PortalView` para clientes con ≥2
  campañas) y muestra el mes de esa campaña. `CalendarPiece` lleva `campaignId`.
  Navegación prev/next = entre los meses que tienen piezas de **esa** campaña. Un
  cliente con una sola campaña (la mayoría) ve directamente su mes.

### 5.3 Shell + sidebar — `PortalShell.tsx`

- Layout: sidebar fijo a la izquierda + área de contenido (el contenido conserva
  el tema del cliente vía `usePortalTheme`).
- **Colapsable**: expandido ~230px con labels; colapsado ~64px solo íconos.
  Estado persistido en `localStorage` (envuelto en try/catch). En mobile → drawer
  off-canvas con overlay.
- **Ítems (lucide):**
  - Campaña — `Sparkles` (resumen: hero/identidad/concepto actuales).
  - Revisión — `ClipboardCheck` (el flujo de aprobar actual; badge con count de
    pendientes).
  - Calendario — `CalendarDays`.
  - Insights — `BarChart3`, **bloqueado** (ícono `Lock` + tooltip "Muy pronto").
  - Footer: cerrar sesión (`LogOut`) + `AgencyBadge` CreAPP.
- **Chrome CreAPP**: ítem activo con barra-glow izquierda y `box-shadow` violeta
  suave; hover con elevación sutil; el gradiente violeta→magenta solo en acentos
  del chrome, nunca recoloreando el contenido del cliente.
- Navegación entre secciones: estado local en el shell (no hace falta sub-ruteo;
  se puede reflejar en query param `?view=calendario` para deep-link, opcional).

### 5.4 Calendario — `CampaignCalendar.tsx`

- Grilla mensual del **mes de la campaña** (default: mes actual / el de la
  campaña activa). Header con mes + navegación prev/next entre meses con piezas.
- Cada día: celda. Días con pieza(s) muestran **miniatura de portada**
  (`coverUrl`) + ícono de plataforma + hora local.
  - **Futuro** (`date > now`): celda **nítida**, etiqueta "Programado · HH:mm".
    Click → peek (player si hay media; si no, portada + caption).
  - **Publicada** (`status === 'published'`): portada con **blur + velo** y check
    "Publicado". Click → **abre igual** el player completo + caption + "Ver en
    Instagram" (`permalink`) si existe. Éste es el casillero "gastado".
  - **Hoy**: borde vivo (acento CreAPP), sin blur — el "filo" de la campaña.
- **Regla de blur = PUBLICADO, no solo tiempo (resuelve #4 del builder-check /
  anti-goal "no mentir").** El blur/"gastado" lo dispara `status === 'published'`,
  **no** el mero paso del día. En el caso normal coinciden (el cron publica en
  horario → el día pasa y la pieza queda publicada → se gasta sola, que es
  justo el efecto buscado). Pero si una pieza **ya pasó su hora y NO se publicó**
  (`queued`/`ready`/`error`/trabada): **no** se finge "Publicado" ni se blurrea;
  se muestra en un estado neutro honesto **"En proceso"** (sin velo, sin check, sin
  detalle de error — eso vive en el admin). El tick del reloj (~60s) solo mueve el
  marcador de "hoy" y el futuro→presente; **no** gasta celdas por sí mismo.
- **Player embebido**: reutiliza **`PortalVideo`** (toma `src` + `poster`, solo
  lectura — más limpio que `PiecePlayer`, que está acoplado a `PortalPiece` y a los
  callbacks de decisión). Reel/story = mp4 (`mediaUrls[0]`); carrusel = slides
  (`mediaUrls`).
- **Estados**:
  - Sin `scheduled_posts` aún → empty state "Tu campaña todavía no se lanzó.
    Cuando la aprobemos y la pongamos en marcha, vas a ver acá el calendario."
  - Error de carga → mensaje suave + reintento.
  - Fila `error`/trabada con hora ya pasada: estado neutro **"En proceso"** (ver
    regla de blur arriba), sin exponer el detalle del error (vive en el admin).

### 5.5 Integración en routing

- `PortalView` se refactoriza para montar `PortalShell` y renderizar la sección
  activa. Las secciones "Campaña" y "Revisión" salen del contenido actual de
  `PortalView` (se extrae el review flow a `PortalReviewSection`, sin cambiar su
  lógica). El guardado/decisión sigue igual.
- Ruta `/portal` sin cambios (sigue bajo `PortalBoot`/`PortalGuard`).

## 6. Qué queda a criterio del builder

- Markup/CSS exactos del sidebar y la grilla dentro del sistema de tokens de
  `portal.css` (clases nuevas con prefijo `.portal`), respetando look shadcn sin
  sumar la librería.
- Breakpoint exacto del drawer mobile y anchos colapsado/expandido afinados.
- Derivación `platform → type` y qué ícono de plataforma usar por tipo.
- Si "Campaña" y "Revisión" son dos ítems o se fusionan (el builder puede
  proponer, pero por default: dos ítems).
- Tests: unit del mapper (UTC→local, blur past/future/hoy, fallback de media) y
  del `calendarMapper`; smoke del render del calendario con fixtures. La policy
  RLS se verifica con el patrón de auditoría RLS en vivo ya documentado.

## 7. Riesgos

- **Realtime + RLS**: si al probar, la suscripción del realm cliente no entrega
  cambios bajo la nueva policy, se cae a **B (polling 60s)** sin rediseñar UI (el
  service expone la misma interfaz; solo cambia la fuente de refresh).
- **Media faltante** en filas viejas de `scheduled_posts`: cubierto por el
  fallback de join a `content_assets`.

## 8. Resoluciones del builder-check (decisiones mías, para que las revises)

1. **`scheduled_posts.client_id` es slug, no uuid** → la policy se reescribió para
   gatear **a través de `content_jobs`** (uuid + `client_visible`). Resuelve el
   bug de la policy y, de paso, la invariante de visibilidad. (§5.1)
2. **Gate por `client_visible = true`**: sí, el calendario respeta la misma
   invariante que el resto del portal (cliente solo ve piezas publicadas a él).
   (§5.1)
3. **Scoping por campaña**: el calendario **sigue al switcher** del shell y muestra
   el mes de la campaña activa (coherente con `PortalView` actual). (§5.2)
4. **Blur = publicado, no solo tiempo**: una pieza que pasó su hora pero no se
   publicó se muestra "En proceso" (honesto), nunca falsa "Publicado". (§5.4)
5. **Player**: se usa `PortalVideo` (solo lectura), no `PiecePlayer`. (§5.4)
