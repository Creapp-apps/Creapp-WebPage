const https = require('https');

const AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN || '';
const ORG_SLUG = process.env.SENTRY_ORG_SLUG || 'creapp';
const TEAM_SLUG = process.env.SENTRY_TEAM_SLUG || 'creapp';

const TARGET_APPS = [
  { name: 'Dental-IA', slug: 'dental-ia', platform: 'javascript-react' },
  { name: 'Stacked', slug: 'stacked', platform: 'javascript-react' },
  { name: 'Célebra', slug: 'celebra', platform: 'javascript-react' },
  { name: 'TrazAPP', slug: 'trazapp', platform: 'javascript-react' },
  { name: 'Belcalis Nails', slug: 'belcalis-nails', platform: 'javascript-react' },
];

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'sentry.io',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CreAPP-Mission-Control/1.0',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('🚀 Iniciando configuración de proyectos en Sentry para CreAPP...\n');
  const results = {};

  for (const app of TARGET_APPS) {
    console.log(`📦 Configurando proyecto: ${app.name} (${app.slug})...`);
    
    // 1. Intentar crear el proyecto
    const createRes = await apiRequest('POST', `/api/0/teams/${ORG_SLUG}/${TEAM_SLUG}/projects/`, {
      name: app.name,
      slug: app.slug,
      platform: app.platform,
    });

    let projectSlug = app.slug;
    if (createRes.status === 201) {
      console.log(`  ✅ Creado con éxito: ${createRes.data.slug}`);
      projectSlug = createRes.data.slug;
    } else if (createRes.status === 400 && createRes.data?.slug?.[0]?.includes('already exists')) {
      console.log(`  ℹ️ El proyecto ya existía: ${app.slug}`);
    } else {
      console.log(`  Respuesta de creación (${createRes.status}):`, createRes.data);
    }

    // 2. Obtener las Client Keys (DSN) del proyecto
    const keysRes = await apiRequest('GET', `/api/0/projects/${ORG_SLUG}/${projectSlug}/keys/`);
    if (keysRes.status === 200 && Array.isArray(keysRes.data) && keysRes.data.length > 0) {
      const dsn = keysRes.data[0].dsn.public;
      console.log(`  🔑 DSN obtenido: ${dsn}\n`);
      results[app.slug] = {
        name: app.name,
        slug: projectSlug,
        dsn: dsn,
      };
    } else {
      console.log(`  ⚠️ No se pudo obtener el DSN para ${projectSlug}:`, keysRes.data);
    }
  }

  console.log('🎉 RESUMEN DE PROYECTOS Y DSNs DE CREAPP:');
  console.log(JSON.stringify(results, null, 2));

  // Guardar en archivo para referencia
  const fs = require('fs');
  fs.writeFileSync('./sentry_dsn_registry.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Guardado en ./sentry_dsn_registry.json');
}

main().catch(console.error);
