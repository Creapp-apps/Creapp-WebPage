-- =========================================================================
-- CreAPP Mission Control & Telemetry NOC — Supabase Schema
-- =========================================================================

-- 1. TABLA: FLOTA DE APLICACIONES MONITOREADAS
CREATE TABLE IF NOT EXISTS app_monitored_fleet (
  id TEXT PRIMARY KEY, -- ej: 'celebra-eventos', 'creador-contenidos', 'creapp-hub'
  name TEXT NOT NULL,
  app_url TEXT NOT NULL,
  health_url TEXT,
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'staging', 'development')),
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'down', 'maintenance')),
  uptime_percentage NUMERIC(5,2) NOT NULL DEFAULT 99.95,
  latency_ms INT NOT NULL DEFAULT 65,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sentry_project_slug TEXT,
  error_count_24h INT NOT NULL DEFAULT 0,
  tech_stack TEXT[] DEFAULT ARRAY['React', 'TypeScript', 'Tailwind'],
  category TEXT DEFAULT 'Client App',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABLA: INCIDENTES TÉCNICOS & BUGS CAPTURADOS EN TIEMPO REAL
CREATE TABLE IF NOT EXISTS app_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id TEXT NOT NULL REFERENCES app_monitored_fleet(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  error_type TEXT NOT NULL DEFAULT 'RuntimeError',
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('critical', 'error', 'warning', 'info')),
  message TEXT NOT NULL,
  stack_trace TEXT,
  file_source TEXT,
  url_path TEXT,
  breadcrumbs JSONB DEFAULT '[]'::jsonb,
  user_device JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored')),
  ai_diagnosis TEXT,
  ai_solution_diff TEXT,
  occurrence_count INT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. HABILITAR RLS (Row Level Security)
ALTER TABLE app_monitored_fleet ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_incidents ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para lectura/escritura (permitir a anon y service_role para telemetría ágil)
CREATE POLICY "Permitir lectura publica/anon de apps" ON app_monitored_fleet FOR SELECT USING (true);
CREATE POLICY "Permitir gestion de apps monitoreadas" ON app_monitored_fleet FOR ALL USING (true);

CREATE POLICY "Permitir lectura publica/anon de incidentes" ON app_incidents FOR SELECT USING (true);
CREATE POLICY "Permitir insercion e ingesta de incidentes" ON app_incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizacion de incidentes" ON app_incidents FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminacion de incidentes" ON app_incidents FOR DELETE USING (true);

-- 4. INSERTAR LAS 5 APLICACIONES NUCLEARES DE CREAPP CON SUS DOMINIOS REALES
INSERT INTO app_monitored_fleet (id, name, app_url, health_url, environment, status, uptime_percentage, latency_ms, tech_stack, category, error_count_24h)
VALUES 
  (
    'dental-ia',
    'Dental-IA',
    'https://dentalia.com.ar',
    'https://dentalia.com.ar/api/health',
    'production',
    'healthy',
    99.96,
    62,
    ARRAY['Next.js', 'React', 'Gemini Vision', 'Supabase'],
    'Dental SaaS (Multi-tenant)',
    0
  ),
  (
    'stacked',
    'Stacked',
    'https://software.stacked.com.ar',
    'https://software.stacked.com.ar/api/health',
    'production',
    'healthy',
    99.94,
    54,
    ARRAY['React', 'Vite', 'Node.js', 'MercadoPago', 'Tailwind'],
    'Food & Delivery (Multi-tenant)',
    0
  ),
  (
    'celebra',
    'Célebra',
    'https://celebraexperiencias.com.ar',
    'https://celebraexperiencias.com.ar/api/health',
    'production',
    'healthy',
    99.98,
    45,
    ARRAY['Vite', 'React 18', 'TypeScript', 'Tailwind', 'Framer Motion'],
    'Atelier de Eventos',
    1
  ),
  (
    'trazapp',
    'TrazAPP',
    'https://software.trazapp.ar',
    'https://software.trazapp.ar/api/health',
    'production',
    'healthy',
    99.91,
    88,
    ARRAY['Next.js', 'PostgreSQL', 'IoT Telemetry', 'MQTT'],
    'Trazabilidad (Multi-tenant)',
    0
  ),
  (
    'belcalis-nails',
    'Belcalis Nails',
    'https://belcalisnails.com.ar',
    'https://belcalisnails.com.ar/api/health',
    'production',
    'healthy',
    99.95,
    52,
    ARRAY['React', 'Vite', 'Supabase Booking', 'WhatsApp API'],
    'Beauty Atelier',
    0
  )
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  app_url = EXCLUDED.app_url,
  status = EXCLUDED.status,
  updated_at = now();

-- 5. INSERTAR INCIDENTES DE EJEMPLO PARA PRUEBAS INMEDIATAS
INSERT INTO app_incidents (
  app_id,
  title,
  error_type,
  severity,
  message,
  stack_trace,
  file_source,
  url_path,
  breadcrumbs,
  user_device,
  status,
  occurrence_count,
  ai_diagnosis,
  ai_solution_diff
) VALUES (
  'celebra-eventos',
  'TypeError: Cannot read properties of undefined (reading ''basePrice'')',
  'TypeError',
  'critical',
  'Cannot read properties of undefined (reading ''basePrice'') at handleOpenProposal',
  'TypeError: Cannot read properties of undefined (reading ''basePrice'')
    at handleOpenProposal (src/components/ServiceCard.tsx:142:38)
    at onClick (src/components/ServiceCard.tsx:98:21)
    at HTMLButtonElement.dispatch (node_modules/react-dom/cjs/react-dom.production.min.js:52:312)
    at invokeGuardedCallback (node_modules/react-dom/cjs/react-dom.production.min.js:53:14)',
  'src/components/ServiceCard.tsx:142',
  '/estudio?section=Invitaciones',
  '[
    {"timestamp": "2026-10-04T16:15:02Z", "category": "navigation", "message": "Navegó a /estudio?section=Invitaciones"},
    {"timestamp": "2026-10-04T16:15:08Z", "category": "ui.scroll", "message": "Scroll a 62% del viewport"},
    {"timestamp": "2026-10-04T16:15:12Z", "category": "ui.click", "message": "Click en botón Ver propuesta (Card: Producción audiovisual)"},
    {"timestamp": "2026-10-04T16:15:12Z", "category": "xhr", "message": "GET /api/catalog/services/audiovisual -> 200 OK"}
  ]'::jsonb,
  '{
    "browser": "Safari Mobile 18.2",
    "os": "iOS 18.2",
    "device": "Apple iPhone 15 Pro",
    "screen": "393x852",
    "connection": "4G"
  }'::jsonb,
  'open',
  3,
  'El objeto "pricing" no está definido en el registro del servicio audiovisual devuelto por la API o el archivo estático. Al acceder directamente a pricing.basePrice se dispara una excepción fatal que bloquea el modal de compra.',
  '// En src/components/ServiceCard.tsx:142
- const formattedPrice = service.pricing.basePrice.toLocaleString();
+ const formattedPrice = service.pricing?.basePrice 
+   ? service.pricing.basePrice.toLocaleString() 
+   : (service.basePrice ? service.basePrice.toLocaleString() : "Consultar");'
);
