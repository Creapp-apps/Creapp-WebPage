# Fusión Creador de Contenidos → CreAPP — Documento de Diseño

**Fecha:** 2026-11-07
**Estado:** borrador para aprobación (brainstorming cerrado, pre-plan)
**Autor:** Seba + Claude Code

---

## 1. Intención y el porqué

CreAPP es la **agency OS** de la agencia (propuestas firmables, contratos, finanzas, pipeline comercial, proyectos, scraper, telemetría, equipo con roles, auth Supabase + RLS, notificaciones FCM, Resend). Hoy el trabajo de **producción de contenido** (reels, carruseles, historias) vive en un proyecto aparte — "Creador de Contenidos" — un motor Python (FastAPI + Remotion) que se opera desde su propia UI en `localhost:8000`.

El dolor real que se resuelve **no es técnico, es de fricción operativa**: la agencia salta entre dos entornos y no puede cruzar los datos de contenido con el resto de la ficha del cliente (su contrato, su etapa de pipeline, sus finanzas). Además, hoy no existe una forma profesional de **mostrarle al cliente** sus piezas para que las vea y apruebe.

La fusión busca:
1. **Un solo techo** (CreAPP): un dominio, un login, una navegación. No volver a abrir `localhost:8000` como app separada.
2. **Cruce de datos**: que el contenido de un cliente viva en el mismo Supabase que su contrato/propuesta/finanzas. Un cliente = una ficha con todo.
3. **Portal de cliente**: el cliente entra con su cuenta, ve su campaña, reproduce las piezas y **aprueba o pide cambios**.

Decisión de arquitectura confirmada por el usuario: **el render/generación se queda 100% local en la Mac** (aprovecha los recursos técnicos y evita costo de infra); la nube sirve solo para **mirar y aprobar**.

---

## 2. Objetivos / No-objetivos / Anti-objetivos

### Objetivos
- CreAPP como único entorno de trabajo de la agencia, con el **estudio de contenido embebido** adentro (sin reescribir los ~140 endpoints del motor).
- **Puente de sincronización**: cuando una pieza está lista, el usuario la empuja a la nube (R2 + metadata en Supabase) con un botón.
- **Modelo de datos unificado** en Supabase que liga `content_jobs`/`campaigns`/`assets`/`approvals` al cliente existente, con RLS estricta.
- **Portal de cliente** con cuenta real Supabase por cliente, historial de trabajo, reproducción de previews y flujo aprobar / pedir cambios.
- **Vuelta del feedback**: la decisión del cliente se refleja en el panel interno + notificación (FCM ya existe).
- **Migración gradual (strangler-fig)**: arrancar con el estudio embebido vía iframe/túnel y, con el tiempo, reconstruir panel por panel en React nativo sin Big Bang.

### No-objetivos (esta fase)
- Reescribir los ~140 endpoints del motor en React nativo dentro de CreAPP (eso es la evolución a largo plazo, no el arranque).
- Mover el render a la nube / montar un worker de render siempre prendido.
- Que el cliente edite piezas; el cliente solo **ve y aprueba**.
- Rediseñar el motor Python o su pipeline de generación.

### Anti-objetivos (fracaso aunque "funcione")
- Que el usuario siga saltando entre dos entornos → no se resolvió la fricción.
- Que un cliente pueda ver piezas de **otro** cliente (fuga por RLS mal hecha) → inaceptable.
- Duplicar lógica del motor en CreAPP y que las dos copias diverjan.
- Que el cliente vea borradores/placeholders no aprobados por el usuario (el push debe ser explícito, nunca automático).

---

## 3. Restricciones

- **Render local obligatorio**: Remotion necesita Chromium + FFmpeg; Vercel no lo corre (su `api/render-video.js` ya devuelve 501 reconociéndolo). La Mac es el horno.
- **El motor es file-based**: `storage/jobs/<id>/{manifests,renders,audio,assets}`, `storage/clients/<slug>/`, `storage/campaigns/`. Las previews hoy se sirven local vía `/media/{job_id}/...`.
- **CreAPP es Vite + React 19 + TS en Vercel**, Supabase (auth/roles/RLS), con `@remotion/player` ya instalado (puede reproducir composiciones Remotion en el navegador) y patrón client-facing ya probado (`ProposalView`, `ContractView`).
- **Aislamiento por cliente** ya es doctrina del motor (`AGENTS.md` §11): no contaminar assets/métricas entre clientes. La RLS de Supabase debe honrar lo mismo.
- **Los $100/mes de Anthropic** pueden ser suscripción Max (no-API) o créditos de API (Console). Ver §8.
- Preferencias de stack del usuario (memoria/skills): Supabase + React/Vite + Tailwind; copy UI en es-AR.

---

## 4. Arquitectura

Tres capas:

```
┌─────────────────────────── TU MAC (privado) ───────────────────────────┐
│  MOTOR: FastAPI (src/web/app.py, ~140 endpoints) + Remotion + storage/  │
│  - Generás/editás/horneás como ahora (yo manejo el pipeline por CLI)    │
│  - Previews locales en /media/{job_id}/...                              │
│                                                                         │
│  [NUEVO] Botón "Enviar al cliente"  ──►  SYNC BRIDGE (push)            │
│      · sube MP4/portadas/carruseles a Cloudflare R2 (cloud_storage.py) │
│      · escribe metadata del job a Supabase (cliente, campaña, estado,  │
│        URLs firmadas, caption)                                          │
│                                                                         │
│  [NUEVO] Cloudflare Tunnel  ──►  publica :8000 bajo estudio.creapp…    │
│      (gateado por auth CreAPP) para que el "Estudio" se vea embebido   │
└─────────────────────────────────────────────────────────────────────────┘
                │ (R2 objetos)          │ (filas Supabase)      │ (túnel HTTPS)
                ▼                        ▼                        ▼
┌─────────────────────────── CreAPP (Vercel) — ÚNICO TECHO ──────────────┐
│  PANEL INTERNO (vos / equipo, rol admin|team)                          │
│   · Tab "Estudio" = iframe al motor vía túnel (editor pesado, sin      │
│     reescritura) → migración gradual a React nativo con el tiempo      │
│   · Vista de contenido nativa: lee Supabase + R2 (jobs, estados,       │
│     approvals), cruzada con contrato/pipeline/finanzas del cliente     │
│                                                                         │
│  PORTAL DE CLIENTE (rol client, RLS)                                   │
│   · Login Supabase propio · historial de trabajo                      │
│   · Reproduce piezas (Remotion Player o MP4 de R2)                    │
│   · Aprobar / Pedir cambios (comentario) por pieza                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Puente de sincronización (push)
- **Disparo explícito**: el usuario aprieta "Enviar al cliente" en el panel (nunca auto-sync; el usuario cura qué ve el cliente — respeta los approval-gates del pipeline).
- **Qué sube a R2**: artefactos finales de `renders/` (MP4, portadas 9:16 y 1:1, slides de carrusel, PDF). Se reutiliza/termina `src/integrations/cloud_storage.py`.
- **Qué va a Supabase**: una fila por job/pieza con `client_id`, `campaign_id`, tipo (reel|carousel|story|cover), estado, URLs (R2, idealmente firmadas o vía dominio R2 público con token), caption/hashtags (ya existe `publish_copy.json`), duración, metadata del manifiesto.
- **Idempotencia**: re-push de una pieza actualiza la fila y reemplaza el objeto R2 (versión/`updated_at`), no duplica.

### 4.2 Modelo de datos (Supabase)
Nuevas tablas (nombres tentativos; el builder ajusta a las convenciones existentes):
- `clients` (**decisión del usuario: tabla canónica nueva**): raíz única de cliente de largo plazo. `id` estable + `slug` (= `storage/clients/<slug>`). Es la FK raíz de todas las tablas de contenido y el ancla del cruce de datos. Hoy CreAPP no tiene entidad cliente única (hay `proposals`, `projects`, `contracts`, `leads`): estas se ligan a `clients` de forma gradual (empezando por lo que el portal necesita), sin bloquear la fusión.
- `content_campaigns`: `id`, `client_id`, `slug`, `title`, `month`, `aesthetic_archetype`, `status`.
- `content_jobs` (piezas): `id`, `campaign_id`, `client_id`, `job_id_motor` (el id del motor), `type`, `title`, `status` (`draft|sent|approved|changes_requested`), `duration`, `caption`, `created_at`, `updated_at`.
- `content_assets`: `id`, `job_id`, `kind` (`mp4|cover_9_16|cover_1_1|slide|pdf`), `r2_key`, `url`, `width`, `height`, `bytes`.
- `content_approvals` (**append-only, varias rondas**): `id`, `job_id`, `client_user_id`, `decision` (`approved|changes_requested`), `comment`, `created_at`. Una fila por decisión → historial de revisiones por pieza. El estado vigente del `content_job` lo marca la última fila.
- `client_members` (**decisión del usuario: varios usuarios por cliente**): `client_id`, `user_id`, `role` (`owner|viewer`). N usuarios por cliente (dueño + marketing, etc.).
- **RLS**: el rol `client` ve solo filas de los `client_id` donde tenga membresía en `client_members`; rol `admin|team` ve todo. Patrón de roles ya existe (`user_profiles_and_roles`, `set_master_admin_creapp`, edge function `manage-team`); se extiende con membresía en vez de un `client_id` plano en `user_profiles`.

### 4.3 Auth y roles
- Se extiende el sistema de roles existente con rol **`client`**; el vínculo usuario↔cliente es la tabla `client_members` (varios usuarios por cliente), no un `client_id` plano.
- **Split de alta de cliente (decisión del usuario):** el desarrollo creativo del cliente (dossier, `slug`, branding, motion pack) se hace **desde el CLI/motor**, como ahora — CreAPP no lo reemplaza. CreAPP se encarga del lado portal: crear el registro en `clients` (con el mismo `slug`), invitar a sus usuarios (Supabase invite, flujo `set-password` ya existe en `App.tsx`) y sumarlos a `client_members`.
- El `storage/clients/<slug>` del motor y el cliente en Supabase se mapean 1:1 por `slug`.

### 4.4 Estudio embebido + túnel (unificación sin reescritura)
- Tab **"Estudio"** dentro del admin de CreAPP que embebe la UI del motor (`index.html`) por iframe.
- La Mac expone `:8000` con **Cloudflare Tunnel** (ya hay `.wrangler` en el repo del motor) bajo un subdominio, protegido por **Cloudflare Access** y/o verificación del token de sesión de CreAPP.
- Resultado: un solo login, un solo dominio; el editor pesado sigue siendo el que ya funciona.
- **Strangler-fig**: con el tiempo, los paneles más usados se reconstruyen nativos en React (consumiendo los endpoints del motor por el túnel) y se retira el iframe de a poco.

### 4.5 Vuelta del feedback
- Cuando el cliente aprueba/pide cambios → fila en `content_approvals` → estado del `content_job` cambia → **notificación FCM** al equipo (dispatcher ya existe) → el usuario ve la decisión en el panel y actúa local (regenera, re-push).
- **Aprobación por pieza, varias rondas, publish manual** (decisión del usuario): "aprobado" **habilita** el publish a Meta (`meta_graph_api.py`), pero lo dispara el usuario; nunca automático. La aprobación es por pieza (no por campaña), con historial de rondas vía `content_approvals`.

---

## 5. Infraestructura y costo

| Pieza | Qué es | Costo aprox. |
|---|---|---|
| Vercel | hosting de CreAPP (ya lo tenés) | plan actual |
| Supabase | auth + DB + RLS (ya lo tenés) | plan actual (free/pro) |
| Cloudflare R2 | storage de artefactos para que el cliente los vea | ~$0.015/GB-mes, egress $0; centavos al mes a esta escala |
| Cloudflare Tunnel + Access | publicar la Mac de forma segura | gratis (Tunnel) / Access free hasta 50 usuarios |
| Tu Mac | horno de render (sin cambio) | $0 extra |

**Conclusión de costo:** la infra extra es esencialmente R2 (centavos) + Tunnel (gratis). No se agrega un worker/VPS. Dependencia operativa: la Mac tiene que estar prendida para *generar* o *re-renderizar*; para **ver** piezas ya pusheadas, el cliente no depende de la Mac (todo está en R2 + Supabase).

---

## 6. Riesgos y mitigaciones
- **Fuga entre clientes (RLS):** tests de RLS obligatorios; el cliente nunca recibe URLs de otro cliente. Preferir URLs firmadas con expiración.
- **iframe + auth cross-origin:** el túnel debe compartir/validar sesión; si el iframe da fricción de cookies, usar Cloudflare Access como gate.
- **Mac apagada:** el portal sigue mostrando lo pusheado; solo se bloquea generar/re-render. Documentar expectativa.
- **Divergencia de datos motor↔Supabase:** la fila Supabase es un **espejo de presentación**, el motor sigue siendo la fuente de verdad del artefacto; el push reconcilia por `job_id_motor`.
- **Seguridad del túnel:** nunca exponer `:8000` abierto; siempre detrás de Access/token.

---

## 7. Fases (resumen; el plan detallado se hace con writing-plans tras aprobación)
1. **Puente de push mínimo**: terminar `cloud_storage.py` (R2) + endpoint/CLI "push pieza" que sube artefactos y escribe Supabase. Probado con 1 pieza real.
2. **Esquema Supabase + RLS** (tablas §4.2) + migración de mapeo `slug`.
3. **Portal de cliente** (rol `client`, login, historial, player, aprobar/pedir cambios) — clonando patrón `ProposalView`.
4. **Vuelta de feedback** (approvals → estado → FCM → panel interno).
5. **Estudio embebido** (Cloudflare Tunnel + tab iframe + Access).
6. **Vista de contenido nativa en el panel** cruzada con la ficha del cliente.
7. **(continuo)** strangler-fig: reconstruir paneles nativos y retirar iframe.

---

## 8. Anthropic / API — fuera de alcance (decisión del usuario, 2026-11-07)

Queda **fuera de alcance de esta fusión**. Todo el procesamiento creativo del pipeline se hace **localmente vía el CLI (Claude Code)** y Gemini 3.6 Flash dentro del motor; no se cablea el SDK `anthropic` ni créditos de API al pipeline. El alta y desarrollo creativo de un cliente nuevo (dossier, branding, motion pack, guiones) también se hace **desde el CLI**, no desde CreAPP.

Si en el futuro se decide meter Claude *dentro* del motor, se retoma como track aparte (requiere créditos de API en console.anthropic.com; los slots `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` ya existen en `config.py`). No es parte de este diseño.

---

## 9. Qué queda a criterio del builder
- Nombres finales de tablas/columnas y si se reusa una entidad cliente existente en Supabase vs crear `clients`.
- Mecanismo exacto de URLs de R2 (firmadas con expiración vs dominio R2 con token) — preferencia: firmadas.
- Forma del gate del iframe (Cloudflare Access vs validación de token de sesión CreAPP) — elegir la de menor fricción de cookies.
- Si el "push" se dispara desde un botón en el iframe del motor (endpoint FastAPI nuevo) o desde el panel nativo de CreAPP llamando al motor por el túnel.
- Estructura de carpetas/servicios en CreAPP para lo nuevo (`lib/contentService.ts`, `pages/client/...`, `components/content/...`).

---

## 9-bis. Decisiones tras builder-check (calls del autor, menores)
- **Playback en el portal = MP4 desde R2** (no `@remotion/player`): las composiciones hand-authored viven en el repo del motor; las piezas ya se rinden a MP4 y se pushean. Evita bundlear el motor en CreAPP.
- **Creación de cliente y `slug`**: CreAPP es la fuente de verdad de la identidad del cliente y asigna el `slug`; el motor asegura `storage/clients/<slug>` en el primer push si no existe.
- **Máquina de estados** `content_job.status`: `draft → sent` (al pushear) → el cliente lo mueve a `approved` o `changes_requested`; un re-push tras `changes_requested` vuelve a `sent`.
- **`cloud_storage.py`**: es cablear, no escribir de cero (465 líneas, R2 + cf CLI ya operativo). Leerlo antes de estimar Fase 1.
- **Aviso al cliente** de material nuevo: vía **Resend** (ya integrado) + estado in-app; FCM queda para el equipo.

> Decisiones del usuario **confirmadas** (tras builder-check): (1) tabla `clients` canónica nueva como raíz; (2) varios usuarios por cliente (`client_members`); (3) aprobación por pieza, varias rondas, publish manual; (4) Anthropic/API fuera de alcance — todo por CLI local (§8); (5) alta creativa de cliente nuevo se hace desde el CLI, CreAPP solo el lado portal. **Sin pendientes de decisión.**

## 10. Gate de aprobación
Nada se construye hasta que apruebes este documento. Tras el OK, el siguiente paso es el **plan** (skill `writing-plans`), no código.
