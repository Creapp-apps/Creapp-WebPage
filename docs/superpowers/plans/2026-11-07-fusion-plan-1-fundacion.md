# Fusión Creador→CreAPP — Plan 1: Fundación (esquema + puente de push) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que una pieza ya renderizada en la Mac viaje con un comando — `python main.py push <job_id>` — a Cloudflare R2 y quede registrada (cliente, campaña, pieza, assets) en Supabase, lista para que una capa de lectura la consulte.

**Architecture:** El motor reutiliza `CloudStorageManager.upload_job_assets()` (ya operativo, sube reel/carrusel a R2 y devuelve URLs) y le agrega una escritura a Supabase vía REST/PostgREST con `service_role` (sin SDK nuevo; `httpx` ya es dependencia). Supabase gana las tablas raíz (`clients`, `content_campaigns`, `content_jobs`, `content_assets`) con RLS. La lectura del cliente (portal) y el botón "Enviar al cliente" son planes posteriores; este plan deja el backend probado de punta a punta por CLI.

**Tech Stack:** Python 3.11+ (motor: `typer`, `httpx`, `boto3`/`cf` CLI, `pydantic-settings`), Supabase/PostgreSQL (migraciones SQL en `supabase/migrations/`), Cloudflare R2.

**Spec:** `docs/superpowers/plans/../specs/2026-11-07-fusion-creador-creapp-design.md` (repo CreAPP).

## Global Constraints

- **Dos repos:** motor en `/Users/sebamaza/Desktop/PROYECTOS DEV/Creador de Contenidos` (Python, NO es git repo); CreAPP en `/Users/sebamaza/Desktop/CREAPP/creapp---fintech-innovation-hub` (git). Las migraciones SQL van al repo CreAPP; el código Python al motor.
- **`service_role` solo en el motor** (`.env` de la Mac). Jamás en el frontend, ni en `VITE_*`, ni commiteado. El frontend usa `anon` + RLS.
- **Mapeo 1:1 por `slug`:** `clients.slug` == `storage/clients/<slug>` del motor. CreAPP es dueña de la identidad del cliente; el `slug` es la clave de unión.
- **Idempotencia:** re-pushear un job hace upsert (no duplica) y reemplaza sus `content_assets`.
- **Sin auto-publish:** este plan no publica a Meta. Estado de pieza al pushear = `sent`.
- **R2 ya configurado** en `CloudStorageManager` (defaults de cuenta/bucket/dominio `pub-...r2.dev` + fallback `cf` CLI). No cablear credenciales R2 nuevas salvo que falle `test_connection()`.
- Copy/labels en es-AR.

## Review Focus

- **Carrusel vs reel:** `upload_job_assets` devuelve formas distintas (`video_url`+`cover_url` vs `slides_urls`+`pdf_url`). El mapeo a `content_assets` debe cubrir ambas. → test en Task 3.
- **Re-push (idempotencia):** segundo push del mismo `job_id_motor` no debe duplicar filas ni dejar assets viejos. → test en Task 3.
- **`client_id` ausente:** `upload_job_assets` cae a `"general"`; igual debe crearse/upsertear una fila `clients` con `slug='general'` y colgar todo de ahí. → test en Task 3.
- **Fallo de R2 / job sin renders:** si la subida falla o no hay artefactos, NO escribir filas parciales en Supabase; error claro y salida no-cero. → test en Task 3.
- **Supabase no configurado:** sin `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, `push` falla temprano con mensaje accionable, sin tocar R2. → test en Task 2.

---

### Task 1: Migración Supabase — tablas raíz + RLS

**Files:**
- Create: `supabase/migrations/20261107120000_create_content_foundation.sql` (repo CreAPP)

**Interfaces:**
- Produces (contrato de datos que consume Task 3 y los planes siguientes):
  - `public.clients(id uuid pk, slug text unique not null, name text not null, niche text, created_at timestamptz, updated_at timestamptz)`
  - `public.content_campaigns(id uuid pk, client_id uuid fk→clients, slug text not null, title text, month text, aesthetic_archetype text, status text default 'draft', created_at, updated_at, unique(client_id, slug))`
  - `public.content_jobs(id uuid pk, campaign_id uuid fk→content_campaigns, client_id uuid fk→clients, job_id_motor text unique not null, type text not null, title text, status text not null default 'sent', duration numeric, caption text, created_at, updated_at)`
  - `public.content_assets(id uuid pk, job_id uuid fk→content_jobs, kind text not null, url text not null, r2_key text, width int, height int, bytes bigint, created_at)`

- [ ] **Step 1: Escribir la migración**

DDL exacto (valores fijados por el spec). Seguir el estilo de `20260929180000_create_user_profiles_and_roles.sql`: `create table if not exists`, `gen_random_uuid()`, `enable row level security`, `drop policy if exists` antes de cada `create policy`. Crear las 4 tablas con los campos del bloque Interfaces, `on delete cascade` en las FK de contenido, y:
- Índices: `content_jobs(client_id)`, `content_jobs(campaign_id)`, `content_assets(job_id)`, `content_campaigns(client_id)`.
- RLS habilitada en las 4 tablas.
- Políticas de **lectura** para equipo (rol existente): `for select to authenticated using (exists (select 1 from public.user_profiles where id = auth.uid() and role in ('admin','vendedor')))`.
- Sin políticas para el rol `client` todavía (se agregan en el plan del portal); la escritura del motor usa `service_role`, que ignora RLS.
- Trigger/función `set_updated_at()` genérica para mantener `updated_at` en las tablas que lo tienen (o `moddatetime` si está disponible).

- [ ] **Step 2: Aplicar la migración localmente y verificar**

Run: `cd "/Users/sebamaza/Desktop/CREAPP/creapp---fintech-innovation-hub" && supabase db reset` (o `supabase migration up` contra la DB local).
Expected: aplica sin error; las 4 tablas existen.

- [ ] **Step 3: Verificar tablas y RLS por consulta**

Run (psql contra la DB local de Supabase):
`select table_name from information_schema.tables where table_schema='public' and table_name in ('clients','content_campaigns','content_jobs','content_assets');`
Expected: 4 filas.
`select relname, relrowsecurity from pg_class where relname in ('clients','content_campaigns','content_jobs','content_assets');`
Expected: `relrowsecurity = t` en las 4.

- [ ] **Step 4: Commit**

```bash
cd "/Users/sebamaza/Desktop/CREAPP/creapp---fintech-innovation-hub"
git add supabase/migrations/20261107120000_create_content_foundation.sql
git commit -m "feat(content): esquema fundación (clients, content_campaigns/jobs/assets) + RLS"
```

---

### Task 2: Motor — config + cliente de escritura a Supabase (`SupabaseSync`)

**Files:**
- Modify: `src/core/config.py` (agregar settings `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Create: `src/integrations/supabase_sync.py`
- Test: `tests/test_supabase_sync.py`
- Modify: `.env.example` (documentar las dos variables nuevas, sin valores)

**Interfaces:**
- Consumes: `settings.SUPABASE_URL`, `settings.SUPABASE_SERVICE_ROLE_KEY`.
- Produces (consume Task 3):
  - `class SupabaseSync` con:
    - `__init__(self, url: Optional[str] = None, service_role_key: Optional[str] = None)` (cae a `settings`).
    - `is_configured(self) -> bool`
    - `upsert_client(self, slug: str, name: str, niche: Optional[str] = None) -> dict` — upsert por `slug`, devuelve la fila (con `id`).
    - `upsert_campaign(self, client_id: str, slug: str, title: Optional[str] = None, month: Optional[str] = None, aesthetic_archetype: Optional[str] = None) -> dict` — upsert por `(client_id, slug)`.
    - `upsert_job(self, campaign_id: str, client_id: str, job_id_motor: str, type: str, title: Optional[str], status: str, duration: Optional[float], caption: Optional[str]) -> dict` — upsert por `job_id_motor`.
    - `replace_job_assets(self, job_id: str, assets: list[dict]) -> int` — borra los assets del job y reinserta; devuelve cantidad insertada.
  - Implementación: `httpx` contra `{url}/rest/v1/<tabla>`, headers `apikey` + `Authorization: Bearer <service_role>` + `Content-Type: application/json`; upsert con `Prefer: resolution=merge-duplicates,return=representation` y `?on_conflict=<col>`.

- [ ] **Step 1: Escribir el test que falla**

```python
# tests/test_supabase_sync.py
import httpx
from src.integrations.supabase_sync import SupabaseSync

def test_is_configured_false_without_env(monkeypatch):
    s = SupabaseSync(url=None, service_role_key=None)
    assert s.is_configured() is False

def test_upsert_client_posts_merge_duplicates(monkeypatch):
    captured = {}
    def fake_post(url, **kwargs):
        captured["url"] = url
        captured["headers"] = kwargs.get("headers", {})
        captured["json"] = kwargs.get("json")
        req = httpx.Request("POST", url)
        return httpx.Response(201, json=[{"id": "c-1", "slug": "dental_ia", "name": "Dental-IA"}], request=req)
    monkeypatch.setattr(httpx, "post", fake_post)
    s = SupabaseSync(url="https://x.supabase.co", service_role_key="svc")
    row = s.upsert_client(slug="dental_ia", name="Dental-IA")
    assert row["id"] == "c-1"
    assert "on_conflict=slug" in captured["url"]
    assert "merge-duplicates" in captured["headers"].get("Prefer", "")
    assert captured["headers"].get("apikey") == "svc"
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd "/Users/sebamaza/Desktop/PROYECTOS DEV/Creador de Contenidos" && python -m pytest tests/test_supabase_sync.py -v`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Agregar settings y implementar `SupabaseSync`**

En `src/core/config.py` sumar a `Settings`: `SUPABASE_URL: Optional[str] = None` y `SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None`. Implementar `src/integrations/supabase_sync.py` con las firmas del bloque Interfaces, usando `httpx.post`/`httpx.delete` con los headers indicados. Cada upsert postea una lista con un objeto y devuelve `resp.json()[0]`. `replace_job_assets` hace `DELETE .../content_assets?job_id=eq.<id>` y luego POST de la lista.

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `cd "/Users/sebamaza/Desktop/PROYECTOS DEV/Creador de Contenidos" && python -m pytest tests/test_supabase_sync.py -v`
Expected: PASS.

- [ ] **Step 5: Commit** (en el repo CreAPP si el motor se versiona ahí; si no, anotar en el handoff que el motor no es git)

```bash
# motor no es git repo; si lo fuera:
# git add src/core/config.py src/integrations/supabase_sync.py tests/test_supabase_sync.py .env.example
# git commit -m "feat(sync): cliente REST a Supabase con service_role (SupabaseSync)"
```

---

### Task 3: Motor — orquestación `push_job_to_portal` + comando CLI `push`

**Files:**
- Create: `src/integrations/portal_push.py`
- Modify: `main.py` (nuevo comando `push`)
- Test: `tests/test_portal_push.py`

**Interfaces:**
- Consumes: `CloudStorageManager(client_id=...).upload_job_assets(job_id, client_id, campaign_id)` (existente); `SupabaseSync` (Task 2); `JobDirectoryManager`/manifiestos para derivar `type/title/duration/caption`.
- Produces:
  - `push_job_to_portal(job_id: str, client_id: Optional[str] = None, campaign_id: Optional[str] = None) -> dict` — devuelve `{client, campaign, job, assets_count, urls}`.
  - CLI: `python main.py push <job_id> [--client-id/-c] [--campaign-id]`.

- [ ] **Step 1: Escribir los tests que fallan**

```python
# tests/test_portal_push.py
from src.integrations import portal_push

FAKE_UPLOAD_REEL = {
    "job_id": "j1", "client_id": "dental_ia", "campaign_id": "nov",
    "format": "reel_vertical_9_16",
    "assets": {"video_url": "https://r2/x.mp4", "cover_url": "https://r2/c.png"},
}
FAKE_UPLOAD_CAROUSEL = {
    "job_id": "j2", "client_id": "dental_ia", "campaign_id": "nov",
    "format": "carousel_editorial_4_5",
    "assets": {"slides_urls": ["https://r2/s1.png","https://r2/s2.png"], "pdf_url": "https://r2/d.pdf", "cover_url":"https://r2/s1.png"},
}

def _patch(monkeypatch, upload_result):
    monkeypatch.setattr(portal_push, "_upload_assets", lambda *a, **k: upload_result)
    calls = {"assets": None, "job": None, "client": None}
    class FakeSync:
        def is_configured(self): return True
        def upsert_client(self, slug, name, niche=None): calls["client"]=slug; return {"id":"c1","slug":slug}
        def upsert_campaign(self, client_id, slug, **k): return {"id":"camp1","slug":slug}
        def upsert_job(self, **k): calls["job"]=k; return {"id":"job1"}
        def replace_job_assets(self, job_id, assets): calls["assets"]=assets; return len(assets)
    monkeypatch.setattr(portal_push, "_sync", lambda: FakeSync())
    return calls

def test_reel_maps_video_and_cover(monkeypatch):
    calls = _patch(monkeypatch, FAKE_UPLOAD_REEL)
    res = portal_push.push_job_to_portal("j1", client_id="dental_ia", campaign_id="nov")
    kinds = {a["kind"] for a in calls["assets"]}
    assert kinds == {"mp4", "cover_9_16"}
    assert calls["job"]["job_id_motor"] == "j1"
    assert calls["job"]["status"] == "sent"

def test_carousel_maps_slides_and_pdf(monkeypatch):
    calls = _patch(monkeypatch, FAKE_UPLOAD_CAROUSEL)
    portal_push.push_job_to_portal("j2", client_id="dental_ia", campaign_id="nov")
    kinds = [a["kind"] for a in calls["assets"]]
    assert kinds.count("slide") == 2
    assert "pdf" in kinds

def test_missing_client_defaults_general(monkeypatch):
    up = dict(FAKE_UPLOAD_REEL); up["client_id"]="general"
    calls = _patch(monkeypatch, up)
    portal_push.push_job_to_portal("j1")
    assert calls["client"] == "general"

def test_supabase_not_configured_raises(monkeypatch):
    monkeypatch.setattr(portal_push, "_sync", lambda: type("S",(),{"is_configured":lambda self:False})())
    import pytest
    with pytest.raises(RuntimeError):
        portal_push.push_job_to_portal("j1")
```

- [ ] **Step 2: Correr y verificar que fallan**

Run: `cd "/Users/sebamaza/Desktop/PROYECTOS DEV/Creador de Contenidos" && python -m pytest tests/test_portal_push.py -v`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar `portal_push.py`**

Orden: (1) `_sync()` chequea `is_configured()`, si no → `RuntimeError("Supabase no configurado: definí SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env")`; (2) `_upload_assets(job_id, client_id, campaign_id)` llama a `CloudStorageManager(client_id=client_id).upload_job_assets(...)` (si falla o no hay assets → `RuntimeError`, sin escribir Supabase); (3) upsert client (slug=`client_id` o `"general"`, name derivado del `client_profile.json` si existe), campaign, job (type desde `format` del upload, title/duration/caption desde manifiestos si están); (4) mapear `assets` del upload → lista `content_assets` (`video_url→mp4`, `cover_url→cover_9_16`, cada `slides_urls[i]→slide`, `pdf_url→pdf`, incluir `url` y `r2_key` cuando se pueda derivar); (5) `replace_job_assets`. Indireccionar `_upload_assets` y `_sync` como funciones de módulo para que los tests las parcheen.

- [ ] **Step 4: Agregar el comando `push` en `main.py`**

Comando `typer`: `push(job_id, client_id: Optional[str]=Option(None,"-c","--client-id"), campaign_id: Optional[str]=Option(None,"--campaign-id"))` que llama a `portal_push.push_job_to_portal(...)` e imprime las URLs con `rich`.

- [ ] **Step 5: Correr los tests y verificar que pasan**

Run: `cd "/Users/sebamaza/Desktop/PROYECTOS DEV/Creador de Contenidos" && python -m pytest tests/test_portal_push.py -v`
Expected: PASS.

- [ ] **Step 6: Commit** (ver nota de git en Task 2)

---

### Task 4: Verificación end-to-end con una pieza real

**Files:** ninguno (verificación manual con datos reales).

**Interfaces:** consume todo lo anterior.

- [ ] **Step 1: Configurar credenciales en el `.env` del motor**

Agregar a `/Users/sebamaza/Desktop/PROYECTOS DEV/Creador de Contenidos/.env`: `SUPABASE_URL=...` y `SUPABASE_SERVICE_ROLE_KEY=...` (service_role del proyecto Supabase de CreAPP; obtenerla de Supabase → Project Settings → API). Confirmar que las tablas de Task 1 ya están en ese proyecto (aplicar la migración a la DB remota: `supabase db push`).

- [ ] **Step 2: Elegir un job real ya renderizado y pushearlo**

Run: `cd "/Users/sebamaza/Desktop/PROYECTOS DEV/Creador de Contenidos" && python main.py push <job_id_real> -c <client_slug>`
(Elegir un `job_id` que tenga `storage/jobs/<id>/renders/` con MP4 o slides.)
Expected: imprime URLs de R2 sin error.

- [ ] **Step 3: Verificar las filas en Supabase**

Consultar (SQL editor de Supabase o psql):
`select j.job_id_motor, j.type, j.status, c.slug, count(a.*) from content_jobs j join clients c on c.id=j.client_id left join content_assets a on a.job_id=j.id group by 1,2,3,4;`
Expected: una fila para el job, `status='sent'`, cliente correcto, cantidad de assets coherente (reel ≥1, carrusel = nº slides [+pdf]).

- [ ] **Step 4: Verificar que las URLs de R2 resuelven**

Run: `curl -sI "<video_url_o_slide_url>" | head -1`
Expected: `HTTP/2 200`.

- [ ] **Step 5: Verificar idempotencia (re-push)**

Run: `python main.py push <mismo_job_id> -c <client_slug>` otra vez, y repetir la consulta del Step 3.
Expected: sigue habiendo **una** fila del job (no duplicada) y la misma cantidad de assets (reemplazados, no acumulados).

---

## Notas de handoff
- El motor **no es git repo**: los commits de Tasks 2–3 quedan como recordatorio; si se quiere versionar, inicializar git en el motor o mover esos módulos a un repo. Las migraciones SÍ se commitean en CreAPP (Task 1).
- Próximos planes (no en este): **Plan 2** — `client_members` + rol `client` + RLS por membresía + lectura; **Plan 3** — portal de cliente (login, historial, player MP4, aprobar/pedir cambios) + `content_approvals`; **Plan 4** — botón "Enviar al cliente" (endpoint que invoca `push_job_to_portal` desde la UI) + aviso Resend; **Plan 5** — Estudio embebido vía Cloudflare Tunnel.
