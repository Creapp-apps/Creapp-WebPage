# Cron de publicación a Meta (Instagram/Facebook) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un cron de Vercel, corriendo en este repo, lee la cola
`scheduled_posts` de Supabase (poblada por el motor — ver plan hermano
`cola-publicacion-supabase-motor.md` en el repo "Creador de Contenidos") y
ejecuta las 3 fases (containerizar → confirmar listo → publicar) contra la
Graph API de Meta, sin que ninguna máquina del equipo esté prendida en el
momento de cada publicación.

**Architecture:** una función serverless Node (`api/cron/publish-queue.js`)
disparada por un cron de `vercel.json` cada 15 min. La lógica de Graph API
(crear container, consultar estado, publicar, carrusel padre/hijo) vive en
`src/lib/metaCronService.ts`, como las demás capas de servicio del repo
(`portalService.ts`, `contractService.ts`). El handler orquesta: lee filas
de `scheduled_posts` con el `service_role` de Supabase (mismo patrón que
`api/telemetry-webhook.js`), llama al servicio, actualiza `status`.

**Tech Stack:** TypeScript (`src/lib/`) + JS plano (`api/`, mismo patrón que
el resto de `api/*.js`), `node:test` + `node:assert/strict` (mismo runner
que ya usa el repo — `package.json` → `"test": "node --test src/lib/*.test.ts"`),
`@supabase/supabase-js` ya es dependencia del proyecto.

**Spec:** `docs/superpowers/specs/2026-11-20-publicacion-programada-sin-pc-design.md`
(nota: este archivo no existe todavía en este repo — se copia desde
`Creador de Contenidos/docs/superpowers/specs/2026-11-20-publicacion-programada-sin-pc-design.md`
como parte del Task 1, para que el spec viaje con el plan).

## Global Constraints

- El esquema de `scheduled_posts` es el que define el plan hermano del
  motor (`cola-publicacion-supabase-motor.md`, Task 2) — **no se crea de
  nuevo acá**, es la misma tabla, mismo proyecto Supabase. Si este plan se
  ejecuta antes que el del motor, el Task 1 de acá incluye aplicar esa
  misma migración a mano en el SQL Editor de Supabase.
- Autenticación del cron: header `Authorization: Bearer $CRON_SECRET`
  (patrón estándar de Vercel Cron Jobs) — toda request sin ese header exacto
  devuelve 401 antes de tocar nada.
- Token de Meta: variable de entorno por cliente,
  `META_ACCESS_TOKEN__<client_id>` (ej. `META_ACCESS_TOKEN__dental_ia`), no
  expirable (Approach A del diseño) — nunca se lee de la tabla ni se loguea.
- El container de Instagram expira a las 24h de creado — la Fase 1 solo
  containeriza filas con `scheduled_at` dentro de las próximas ~20h.
- `ig_account_id` viaja en la fila de `scheduled_posts` (no hace falta una
  variable de entorno más por cliente para esto).
- Cliente Supabase server-side: mismo patrón que `api/telemetry-webhook.js`
  (`createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY)`), nunca la `anon key`.

## Review Focus

- Una request al cron sin el header `Authorization` correcto (o con un
  `CRON_SECRET` viejo/vacío) tiene que devolver 401 y no tocar
  `scheduled_posts` ni la Graph API.
- Un container que vuelve `status_code: ERROR` o `EXPIRED` tiene que dejar
  la fila en `status: error` con `error_message` legible, no reintentarse
  en silencio para siempre en cada tick.
- Una fila de `instagram_carousel` con menos de 2 URLs en `media_r2_urls`
  (dato corrupto o carga incompleta) no debe intentar crear un carrusel de
  Meta (que requiere 2+ hijos) — tiene que fallar explícito a `status: error`.
- Dos ticks del cron superpuestos (el anterior todavía corriendo cuando
  arranca el siguiente, si Vercel tarda) no deben publicar la misma fila dos
  veces — la Fase 3 debe tomar la fila por `id` y chequear su `status`
  actual antes de publicar, no operar sobre una lista ya leída al principio
  del tick.
- `META_ACCESS_TOKEN__<client_id>` ausente para el cliente de una fila
  pendiente tiene que loguearse como error claro en esa fila (`status:
  error`, `error_message` menciona la variable de entorno faltante), no
  tirar abajo todo el tick para las demás filas de otros clientes.

---

### Task 1: Traer el spec y preparar la tabla

**Files:**
- Create: `docs/superpowers/specs/2026-11-20-publicacion-programada-sin-pc-design.md`
  (copia textual del spec aprobado en el repo del motor)

- [ ] **Step 1: Copiar el spec aprobado a este repo**

```bash
mkdir -p docs/superpowers/specs
cp "/Users/sebamaza/Desktop/PROYECTOS DEV/Creador de Contenidos/docs/superpowers/specs/2026-11-20-publicacion-programada-sin-pc-design.md" \
   docs/superpowers/specs/2026-11-20-publicacion-programada-sin-pc-design.md
```

- [ ] **Step 2: Si la tabla `scheduled_posts` todavía no existe en Supabase
  (confirmar vía SQL Editor: `select * from scheduled_posts limit 1;`),
  aplicar a mano la migración del Task 2 del plan hermano
  (`cola-publicacion-supabase-motor.md`)**

Verificación: `select * from scheduled_posts limit 1;` no tira
`relation "scheduled_posts" does not exist`.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-11-20-publicacion-programada-sin-pc-design.md
git commit -m "docs: traer spec de publicación programada sin PC"
```

---

### Task 2: `metaCronService` — container simple (reel / story) y estado

**Files:**
- Create: `src/lib/metaCronService.ts`
- Test: `src/lib/metaCronService.test.ts`

**Interfaces:**
- Produces:
  - `createMediaContainer(params: { igAccountId: string, accessToken: string,
    mediaType: 'VIDEO' | 'REELS' | 'STORIES' | 'IMAGE', mediaUrl: string,
    caption?: string }): Promise<string>` — POST a
    `https://graph.facebook.com/v21.0/{igAccountId}/media`, devuelve el
    `id` del container. Tira si la respuesta no es `ok` (incluye el body de
    error de Meta en el mensaje).
  - `getContainerStatus(params: { containerId: string, accessToken: string }):
    Promise<'IN_PROGRESS' | 'FINISHED' | 'ERROR' | 'EXPIRED' | 'PUBLISHED'>`
    — GET a `https://graph.facebook.com/v21.0/{containerId}?fields=status_code`.
  - `publishContainer(params: { igAccountId: string, accessToken: string,
    containerId: string }): Promise<string>` — POST a
    `https://graph.facebook.com/v21.0/{igAccountId}/media_publish`, devuelve
    el `id` (media_id) publicado.
- Consumes: `globalThis.fetch` (global, sin wrapper — mismo patrón que
  `emailService.test.ts`, que mockea `globalThis.fetch` directo).

- [ ] **Step 1: Escribir los tests (mock de `globalThis.fetch`, mismo patrón
  que `src/lib/emailService.test.ts`)**

```typescript
// src/lib/metaCronService.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMediaContainer, getContainerStatus, publishContainer } from './metaCronService.ts';

test('createMediaContainer hace POST con media_type y devuelve el id', async () => {
  const original = globalThis.fetch;
  const calls: any[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, json: async () => ({ id: 'container_123' }) } as any;
  }) as any;
  try {
    const id = await createMediaContainer({
      igAccountId: '1784140000', accessToken: 'tok',
      mediaType: 'REELS', mediaUrl: 'https://pub.r2.dev/a.mp4', caption: 'hola',
    });
    assert.equal(id, 'container_123');
    assert.match(calls[0].url, /\/1784140000\/media$/);
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.media_type, 'REELS');
    assert.equal(body.video_url, 'https://pub.r2.dev/a.mp4');
  } finally {
    globalThis.fetch = original;
  }
});

test('createMediaContainer tira error legible si Meta responde error', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: false, status: 400,
    json: async () => ({ error: { message: 'Invalid video_url' } }),
  })) as any;
  try {
    await assert.rejects(
      () => createMediaContainer({ igAccountId: 'x', accessToken: 't', mediaType: 'REELS', mediaUrl: 'bad' }),
      /Invalid video_url/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('getContainerStatus devuelve status_code', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: true, status: 200, json: async () => ({ status_code: 'FINISHED' }),
  })) as any;
  try {
    const s = await getContainerStatus({ containerId: 'c1', accessToken: 't' });
    assert.equal(s, 'FINISHED');
  } finally {
    globalThis.fetch = original;
  }
});

test('publishContainer hace POST a media_publish con creation_id', async () => {
  const original = globalThis.fetch;
  const calls: any[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, json: async () => ({ id: 'media_999' }) } as any;
  }) as any;
  try {
    const mediaId = await publishContainer({ igAccountId: '178', accessToken: 't', containerId: 'c1' });
    assert.equal(mediaId, 'media_999');
    assert.match(calls[0].url, /\/178\/media_publish$/);
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.creation_id, 'c1');
  } finally {
    globalThis.fetch = original;
  }
});
```

- [ ] **Step 2: Correr los tests, confirmar que fallan**

Run: `node --test src/lib/metaCronService.test.ts`
Expected: FAIL (el módulo `./metaCronService.ts` no existe)

- [ ] **Step 3: Implementar `createMediaContainer`, `getContainerStatus`,
  `publishContainer` en `src/lib/metaCronService.ts`**

`mediaType === 'IMAGE'` usa el campo `image_url` en el body del POST a
`/media`; cualquier otro valor usa `video_url`. Base URL de Graph API:
`https://graph.facebook.com/v21.0`. Cada función arma el `access_token`
como query param o como campo del body `x-www-form-urlencoded` (Meta acepta
ambos; usar `URLSearchParams` para el body, consistente con cómo
`fetch` + `URLSearchParams` ya se usa en otros `api/*.js` del repo si
aplica, o `JSON.stringify` si Meta acepta JSON — confirmar contra el error
real del primer test manual contra la API si hiciera falta; para los tests
unitarios de este Task alcanza con que el body sea parseable con
`JSON.parse`, como están escritos arriba).

- [ ] **Step 4: Correr los tests, confirmar que pasan**

Run: `node --test src/lib/metaCronService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/metaCronService.ts src/lib/metaCronService.test.ts
git commit -m "feat: metaCronService con container simple, estado y publish"
```

---

### Task 3: `metaCronService` — carrusel (padre/hijo)

**Files:**
- Modify: `src/lib/metaCronService.ts`
- Test: `src/lib/metaCronService.test.ts` (agregar casos)

**Interfaces:**
- Consumes: `createMediaContainer` (Task 2, con `isCarouselItem: true` para
  los hijos).
- Produces: `createCarouselContainer(params: { igAccountId: string,
  accessToken: string, mediaUrls: string[], caption?: string }):
  Promise<{ parentId: string, childIds: string[] }>`. Tira
  `Error('Un carrusel necesita 2 o más imágenes')` si `mediaUrls.length < 2`
  (Review Focus).

- [ ] **Step 1: Escribir los tests**

```typescript
test('createCarouselContainer crea hijos y luego el padre', async () => {
  const original = globalThis.fetch;
  const calls: any[] = [];
  let n = 0;
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push({ url: String(url), init });
    n += 1;
    if (n <= 2) return { ok: true, status: 200, json: async () => ({ id: `child_${n}` }) } as any;
    return { ok: true, status: 200, json: async () => ({ id: 'parent_1' }) } as any;
  }) as any;
  try {
    const { parentId, childIds } = await createCarouselContainer({
      igAccountId: '178', accessToken: 't',
      mediaUrls: ['https://pub.r2.dev/1.png', 'https://pub.r2.dev/2.png'],
      caption: 'hola',
    });
    assert.equal(parentId, 'parent_1');
    assert.deepEqual(childIds, ['child_1', 'child_2']);
    assert.equal(calls.length, 3);
    const parentBody = JSON.parse(calls[2].init.body);
    assert.equal(parentBody.media_type, 'CAROUSEL');
    assert.deepEqual(parentBody.children, ['child_1', 'child_2']);
  } finally {
    globalThis.fetch = original;
  }
});

test('createCarouselContainer rechaza menos de 2 imágenes', async () => {
  await assert.rejects(
    () => createCarouselContainer({ igAccountId: 'x', accessToken: 't', mediaUrls: ['one.png'] }),
    /2 o más imágenes/,
  );
});
```

- [ ] **Step 2: Correr los tests, confirmar que fallan**

Run: `node --test src/lib/metaCronService.test.ts`
Expected: FAIL (`createCarouselContainer` no existe)

- [ ] **Step 3: Implementar `createCarouselContainer`**

Valida `mediaUrls.length >= 2` primero. Crea un container hijo por cada URL
llamando `createMediaContainer` con `mediaType: 'IMAGE'` y un campo extra
`is_carousel_item: true` en el body (extender `createMediaContainer` para
aceptar ese flag opcional, sin romper los call-sites del Task 2). Junta los
`childIds`, arma el container padre con `POST /{igAccountId}/media` con
`media_type: 'CAROUSEL'` y `children: childIds`.

- [ ] **Step 4: Correr los tests, confirmar que pasan**

Run: `node --test src/lib/metaCronService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/metaCronService.ts src/lib/metaCronService.test.ts
git commit -m "feat: metaCronService.createCarouselContainer (padre/hijo)"
```

---

### Task 4: `api/cron/publish-queue.js` — autenticación y Fase 1 (containerizar)

**Files:**
- Create: `api/cron/publish-queue.js`
- Test: `src/lib/publishQueuePhases.test.ts` (la lógica de selección/armado
  de filas se extrae a funciones puras testeables; el handler HTTP queda
  fino)
- Create: `src/lib/publishQueuePhases.ts`

**Interfaces:**
- Consumes: `createMediaContainer`, `createCarouselContainer` (Tasks 2-3).
- Produces:
  - Tipo `ScheduledPostRow` en `src/lib/publishQueuePhases.ts` — refleja 1:1
    las columnas de la tabla `scheduled_posts` definida en el plan hermano
    (`cola-publicacion-supabase-motor.md`, Task 2):
    ```typescript
    export interface ScheduledPostRow {
      id: string;
      client_id: string;
      job_id: string;
      ig_account_id: string;
      platform: 'instagram_reel' | 'instagram_carousel' | 'instagram_story' | 'facebook_reel' | 'facebook_feed';
      media_r2_urls: string[];
      cover_r2_url: string | null;
      caption: string | null;
      scheduled_at: string;
      status: 'queued' | 'containerizing' | 'ready' | 'publishing' | 'published' | 'error';
      container_id: string | null;
      child_container_ids: string[] | null;
      published_media_id: string | null;
      error_message: string | null;
    }
    ```
  - `resolveClientToken(clientId: string, env: Record<string, string | undefined>): string`
    — devuelve `env['META_ACCESS_TOKEN__' + clientId]`; tira
    `Error('Falta META_ACCESS_TOKEN__' + clientId)` si no está seteada o es
    string vacío (Review Focus: una fila con token faltante no debe tirar
    abajo el tick entero, así que esta función se llama con un try/catch por
    fila dentro del handler, nunca una vez para todas).
  - `selectRowsToContainerize(rows: ScheduledPostRow[], now: Date):
    ScheduledPostRow[]` en `src/lib/publishQueuePhases.ts` — filtra
    `status === 'queued'` y `scheduled_at` dentro de las próximas 20h desde
    `now` (Review Focus de "no containerizar con semanas de antelación" ya
    lo filtra la query a Supabase en el handler, pero esta función queda
    como segunda barrera testeable sin red).
  - `containerizeRow(row: ScheduledPostRow, accessToken: string):
    Promise<{ containerId?: string, childContainerIds?: string[],
    error?: string }>` — rama por `row.platform`: `instagram_carousel` usa
    `createCarouselContainer` con `row.media_r2_urls` (si
    `media_r2_urls.length < 2`, devuelve `{ error: 'Un carrusel necesita 2 o
    más imágenes' }` sin llamar a Meta — Review Focus); cualquier otro
    `platform` usa `createMediaContainer` con `mediaType` derivado
    (`instagram_reel`→`REELS`, `instagram_story`→`STORIES`,
    `facebook_reel`/`facebook_feed` quedan fuera de esta función, ver nota
    de alcance abajo) y `row.media_r2_urls[0]`.

**Nota de alcance:** este plan cubre `instagram_reel`, `instagram_carousel`
e `instagram_story` (los tres casos que ya tiene resuelto el diseño). El
camino nativo opcional de Facebook (`scheduled_publish_time` en
`/video_reels`, sección 5 del spec) queda fuera — se suma como plan aparte
si se decide usarlo.

- [ ] **Step 1: Escribir los tests de `publishQueuePhases.ts`**

```typescript
// src/lib/publishQueuePhases.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRowsToContainerize, containerizeRow, resolveClientToken } from './publishQueuePhases.ts';

test('selectRowsToContainerize excluye filas que no están queued', () => {
  const now = new Date('2026-12-01T00:00:00Z');
  const rows = [
    { id: '1', status: 'queued', scheduled_at: '2026-12-01T10:00:00Z' },
    { id: '2', status: 'published', scheduled_at: '2026-12-01T10:00:00Z' },
  ] as any;
  const out = selectRowsToContainerize(rows, now);
  assert.deepEqual(out.map((r: any) => r.id), ['1']);
});

test('selectRowsToContainerize excluye filas a más de 20h', () => {
  const now = new Date('2026-12-01T00:00:00Z');
  const rows = [
    { id: '1', status: 'queued', scheduled_at: '2026-12-03T10:00:00Z' },
  ] as any;
  assert.deepEqual(selectRowsToContainerize(rows, now), []);
});

test('containerizeRow rechaza carrusel con menos de 2 urls sin llamar a Meta', async () => {
  const original = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => { called = true; return { ok: true, json: async () => ({}) }; }) as any;
  try {
    const res = await containerizeRow(
      { platform: 'instagram_carousel', media_r2_urls: ['a.png'] } as any, 'tok',
    );
    assert.equal(called, false);
    assert.match(res.error!, /2 o más imágenes/);
  } finally {
    globalThis.fetch = original;
  }
});

test('resolveClientToken tira error claro si falta la variable de entorno', () => {
  assert.throws(
    () => resolveClientToken('dental_ia', {}),
    /META_ACCESS_TOKEN__dental_ia/,
  );
});

test('resolveClientToken devuelve el valor si está seteada', () => {
  const env = { META_ACCESS_TOKEN__dental_ia: 'tok123' };
  assert.equal(resolveClientToken('dental_ia', env), 'tok123');
});

test('containerizeRow arma un reel con mediaType REELS', async () => {
  const original = globalThis.fetch;
  const calls: any[] = [];
  globalThis.fetch = (async (url: any, init: any) => {
    calls.push(init);
    return { ok: true, status: 200, json: async () => ({ id: 'c1' }) };
  }) as any;
  try {
    const res = await containerizeRow(
      { platform: 'instagram_reel', media_r2_urls: ['a.mp4'], ig_account_id: '178', caption: 'hi' } as any,
      'tok',
    );
    assert.equal(res.containerId, 'c1');
    assert.equal(JSON.parse(calls[0].body).media_type, 'REELS');
  } finally {
    globalThis.fetch = original;
  }
});
```

- [ ] **Step 2: Correr los tests, confirmar que fallan**

Run: `node --test src/lib/publishQueuePhases.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementar `ScheduledPostRow`, `resolveClientToken`,
  `selectRowsToContainerize` y `containerizeRow` en
  `src/lib/publishQueuePhases.ts`**

- [ ] **Step 4: Correr los tests, confirmar que pasan**

Run: `node --test src/lib/publishQueuePhases.test.ts`
Expected: PASS

- [ ] **Step 5: Implementar el handler `api/cron/publish-queue.js`**

Mismo esqueleto de cabeceras/método que `api/telemetry-webhook.js`, más la
verificación de `Authorization: Bearer ${process.env.CRON_SECRET}` al
principio (401 si no matchea exacto — Review Focus). Lee de Supabase
(`service_role`) las filas `status=queued` con `scheduled_at` entre ahora y
+20h. Para cada una, dentro de un try/catch propio: resuelve el token con
`resolveClientToken(row.client_id, process.env)` y llama `containerizeRow`
con ese token. Si `resolveClientToken` tira (token faltante) o
`containerizeRow` devuelve `{ error }`, esa fila pasa a `status: 'error'` +
`error_message` (el mensaje del error de `resolveClientToken` ya menciona
la variable faltante), y el loop sigue con las demás filas (Review Focus —
no tirar abajo el tick entero). Si `containerizeRow` devuelve
`containerId`, la fila pasa a `status: 'containerizing'` + `container_id`
(+ `child_container_ids` si vino).

- [ ] **Step 6: Verificación manual del handler (sin tests automáticos de
  handler HTTP en este repo — mismo criterio que el resto de `api/*.js`,
  que tampoco los tiene)**

Run: `vercel dev` en otra terminal, después:
```bash
curl -i -X GET http://localhost:3000/api/cron/publish-queue
curl -i -X GET http://localhost:3000/api/cron/publish-queue -H "Authorization: Bearer $CRON_SECRET"
```
Expected: la primera devuelve 401; la segunda, con una fila `queued` de
prueba insertada a mano en Supabase, la deja en `containerizing` con
`container_id` seteado (confirmar con `select * from scheduled_posts where
id = '...';`).

- [ ] **Step 7: Commit**

```bash
git add api/cron/publish-queue.js src/lib/publishQueuePhases.ts src/lib/publishQueuePhases.test.ts
git commit -m "feat: fase 1 del cron de publicación (containerizar)"
```

---

### Task 5: Fase 2 (confirmar listo) y Fase 3 (publicar)

**Files:**
- Modify: `api/cron/publish-queue.js`
- Modify: `src/lib/publishQueuePhases.ts`
- Test: `src/lib/publishQueuePhases.test.ts` (agregar casos)

**Interfaces:**
- Consumes: `getContainerStatus`, `publishContainer` (Task 2).
- Produces:
  - `classifyContainerStatus(statusCode: string): 'ready' | 'still_waiting' | 'error'`
    en `publishQueuePhases.ts` — `FINISHED`→`ready`;
    `ERROR`|`EXPIRED`→`error`; cualquier otro (`IN_PROGRESS`, etc.)→`still_waiting`.
  - `selectRowsReadyToPublish(rows: ScheduledPostRow[], now: Date):
    ScheduledPostRow[]` — filtra `status === 'ready'` y
    `new Date(row.scheduled_at) <= now`.
  - `shouldPublish(freshRow: ScheduledPostRow): boolean` — `true` solo si
    `freshRow.status === 'ready'`. Existe para que el handler relea la fila
    por `id` justo antes de publicar y la chequee con esta función (Review
    Focus: dos ticks solapados no publican la misma fila dos veces — el
    segundo tick la relee, ve `status: 'publishing'` o `'published'` puesto
    por el primero, y `shouldPublish` da `false`).

- [ ] **Step 1: Escribir los tests de las dos funciones nuevas**

```typescript
import { classifyContainerStatus, selectRowsReadyToPublish, shouldPublish } from './publishQueuePhases.ts';

test('classifyContainerStatus mapea FINISHED/ERROR/EXPIRED/otros', () => {
  assert.equal(classifyContainerStatus('FINISHED'), 'ready');
  assert.equal(classifyContainerStatus('ERROR'), 'error');
  assert.equal(classifyContainerStatus('EXPIRED'), 'error');
  assert.equal(classifyContainerStatus('IN_PROGRESS'), 'still_waiting');
});

test('selectRowsReadyToPublish filtra por status ready y horario cumplido', () => {
  const now = new Date('2026-12-01T19:00:00Z');
  const rows = [
    { id: '1', status: 'ready', scheduled_at: '2026-12-01T18:00:00Z' },
    { id: '2', status: 'ready', scheduled_at: '2026-12-01T20:00:00Z' },
    { id: '3', status: 'containerizing', scheduled_at: '2026-12-01T18:00:00Z' },
  ] as any;
  assert.deepEqual(selectRowsReadyToPublish(rows, now).map((r: any) => r.id), ['1']);
});

test('shouldPublish es false si la fila releída ya no está ready (tick solapado)', () => {
  assert.equal(shouldPublish({ status: 'ready' } as any), true);
  assert.equal(shouldPublish({ status: 'publishing' } as any), false);
  assert.equal(shouldPublish({ status: 'published' } as any), false);
});
```

- [ ] **Step 2: Correr los tests, confirmar que fallan**

Run: `node --test src/lib/publishQueuePhases.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementar `classifyContainerStatus`, `selectRowsReadyToPublish`
  y `shouldPublish`**

- [ ] **Step 4: Correr los tests, confirmar que pasan**

Run: `node --test src/lib/publishQueuePhases.test.ts`
Expected: PASS

- [ ] **Step 5: Sumar las Fases 2 y 3 al handler `api/cron/publish-queue.js`**

Fase 2: para filas `status='containerizing'`, dentro del mismo try/catch
por fila que la Fase 1 (resolviendo el token con `resolveClientToken` de
nuevo — no se persiste el token entre fases), llama `getContainerStatus`
con `container_id` y clasifica con `classifyContainerStatus`; `ready`→
`status: 'ready'`; `error`→`status: 'error'` + `error_message` con el
`status_code` crudo de Meta.

Fase 3: para filas que pasan `selectRowsReadyToPublish`, antes de publicar
**vuelve a leer la fila por `id`** desde Supabase y la pasa por
`shouldPublish` (Review Focus: evita publicar dos veces si un tick anterior
se solapó y ya la dejó en `publishing`/`published`). Si `shouldPublish` da
`true`: `status: 'publishing'` (update inmediato, para que un tick solapado
la vea y la salte), resuelve el token con `resolveClientToken(row.client_id,
process.env)` dentro de un try/catch por fila, llama `publishContainer`, y
al volver, `status: 'published'` + `published_media_id`.

- [ ] **Step 6: Verificación manual de punta a punta**

Insertar a mano en Supabase una fila `queued` con `scheduled_at` = ahora +
2 minutos y un `media_r2_urls` real (una imagen de prueba pública). Correr
el cron a mano (`curl` con el header, como en el Task 4) dos o tres veces
seguidas simulando los ticks de 15 min. Confirmar en la tabla que la fila
avanza `queued → containerizing → ready → publishing → published` y que
`published_media_id` corresponde a un post real en la cuenta de prueba.

- [ ] **Step 7: Commit**

```bash
git add api/cron/publish-queue.js src/lib/publishQueuePhases.ts src/lib/publishQueuePhases.test.ts
git commit -m "feat: fases 2 y 3 del cron (confirmar listo y publicar)"
```

---

### Task 6: `vercel.json` — registrar el cron

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Agregar la entrada de cron**

```json
{
  "crons": [
    {
      "path": "/api/cron/publish-queue",
      "schedule": "*/15 * * * *"
    }
  ]
}
```
(sumar al JSON existente, sin tocar el array `rewrites` ya presente).

- [ ] **Step 2: Verificación**

Run: `cat vercel.json | python3 -m json.tool` (o `node -e
"JSON.parse(require('fs').readFileSync('vercel.json'))"`)
Expected: no tira error de parseo; el cron solo corre en producción según
la doc de Vercel Cron Jobs, así que esta verificación es solo de sintaxis,
no de ejecución real hasta el próximo deploy a producción.

- [ ] **Step 3: Documentar las variables de entorno nuevas que hay que
  cargar en el dashboard de Vercel (no van en `.env.example` porque son
  secretas y por cliente) — agregar una línea en `.env.example` como
  comentario, no como valor**

```bash
# CRON_SECRET=... (Vercel Cron Jobs, ver docs/superpowers/specs/2026-11-20-publicacion-programada-sin-pc-design.md)
# META_ACCESS_TOKEN__<client_id>=... (uno por cliente conectado, token no-expirable — ver runbook del spec)
```

- [ ] **Step 4: Commit**

```bash
git add vercel.json .env.example
git commit -m "feat: registrar cron de publicación en vercel.json"
```
