import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { exec } from 'child_process';
import fs from 'fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
      watch: {
        ignored: ['**/public/temp/**', '**/temp/**'],
      },
    },
    plugins: [
      react(),
      {
        name: 'remotion-renderer-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/render-video' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', () => {
                try {
                  const inputProps = JSON.parse(body);
                  
                  // Ensure temp directory exists
                  if (!fs.existsSync('./temp')) {
                    fs.mkdirSync('./temp', { recursive: true });
                  }
                  if (!fs.existsSync('./public/temp')) {
                    fs.mkdirSync('./public/temp', { recursive: true });
                  }
                  
                  // Write inputs to JSON in non-public temp directory
                  const inputPath = './temp/inputs.json';
                  fs.writeFileSync(inputPath, JSON.stringify(inputProps, null, 2));
                  
                  // Output path
                  const isVertical = inputProps.aspectRatio === '9:16';
                  const compositionId = isVertical ? 'ProposalVideoVertical' : 'ProposalVideo';
                  const prefix = isVertical ? 'vertical-' : 'horizontal-';
                  const safeClientSlug = (inputProps.clientName || 'cliente')
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
                  const outputVideoName = `propuesta-${prefix}${safeClientSlug}-${Date.now()}.mp4`;
                  const outputPath = `./public/temp/${outputVideoName}`;
                  
                  // Run Remotion CLI command
                  const command = `npx remotion render src/remotion-entry.tsx ${compositionId} "${outputPath}" --props="${inputPath}" --log=error --overwrite`;
                  
                  console.log(`[Remotion Video Renderer] Executing command: ${command}`);
                  
                  exec(command, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
                    if (error) {
                      console.error(`[Remotion Video Renderer] Error: ${error.message}`);
                      console.error(stderr);
                      res.writeHead(500, { 'Content-Type': 'application/json' });
                      res.end(JSON.stringify({ error: 'Fallo al renderizar el video con Remotion CLI', details: error.message }));
                      return;
                    }
                    console.log(`[Remotion Video Renderer] Render completed successfully.`);
                    console.log(stdout);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, videoUrl: `/api/download-video?file=${outputVideoName}` }));
                  });
                } catch (err: any) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Formato de petición inválido', details: err?.message || String(err) }));
                }
              });
            } else if (req.url?.startsWith('/api/download-video') && req.method === 'GET') {
              try {
                const urlObj = new URL(req.url, 'http://localhost');
                const fileName = urlObj.searchParams.get('file');
                if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Nombre de archivo inválido' }));
                  return;
                }
                const filePath = path.join(process.cwd(), 'public', 'temp', fileName);
                if (!fs.existsSync(filePath)) {
                  res.writeHead(404, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Archivo no encontrado' }));
                  return;
                }
                const stat = fs.statSync(filePath);
                res.writeHead(200, {
                  'Content-Type': 'video/mp4',
                  'Content-Length': stat.size,
                  'Content-Disposition': `attachment; filename="${fileName}"`,
                });
                fs.createReadStream(filePath).pipe(res);
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error al descargar el archivo', details: err?.message }));
              }
            } else if (req.url?.startsWith('/api/places/search') && req.method === 'GET') {
              try {
                const urlObj = new URL(req.url, 'http://localhost');
                const query = urlObj.searchParams.get('query') || '';
                const lat = urlObj.searchParams.get('lat');
                const lng = urlObj.searchParams.get('lng');
                const radius = urlObj.searchParams.get('radius') || '2500';
                const key = urlObj.searchParams.get('key') || env.GOOGLE_MAPS_API_KEY;

                if (!key) {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, hasGoogleKey: false, results: [] }));
                  return;
                }

                let placesData: any = null;

                // Si se suministraron coordenadas geográficas, usar Nearby Search API
                if (lat && lng) {
                  const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(query)}&language=es&key=${key}`;
                  const nearbyRes = await fetch(nearbyUrl);
                  placesData = await nearbyRes.json();
                }

                // Fallback a Text Search si no hay coordenadas o no hubo resultados
                if (!placesData || placesData.status === 'ZERO_RESULTS' || !placesData.results?.length) {
                  const textUrl = lat && lng 
                    ? `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lng}&radius=${radius}&language=es&key=${key}`
                    : `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=es&key=${key}`;
                  const textRes = await fetch(textUrl);
                  const textData = await textRes.json();
                  if (textData.status === 'OK' || !placesData) {
                    placesData = textData;
                  }
                }

                if (placesData.status !== 'OK' && placesData.status !== 'ZERO_RESULTS') {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ 
                    success: false, 
                    hasGoogleKey: true, 
                    error: placesData.error_message || placesData.status,
                    results: [] 
                  }));
                  return;
                }

                const rawResults = placesData.results || [];
                // Obtenemos detalles complementarios (web y teléfono) para los resultados
                const enriched = await Promise.all(
                  rawResults.slice(0, 10).map(async (place: any) => {
                    let phone = '';
                    let website = '';
                    try {
                      if (place.place_id) {
                        const detRes = await fetch(
                          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_phone_number,international_phone_number,website&key=${key}`
                        );
                        const detData = await detRes.json();
                        if (detData.result) {
                          phone = detData.result.international_phone_number || detData.result.formatted_phone_number || '';
                          website = detData.result.website || '';
                        }
                      }
                    } catch (e) {
                      // ignore detail failure
                    }

                    return {
                      place_id: place.place_id,
                      name: place.name,
                      address: place.vicinity || place.formatted_address || '',
                      rating: place.rating || 0,
                      user_ratings_total: place.user_ratings_total || 0,
                      lat: place.geometry?.location?.lat,
                      lng: place.geometry?.location?.lng,
                      phone,
                      website,
                      types: place.types || [],
                    };
                  })
                );

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, hasGoogleKey: true, results: enriched }));
              } catch (err: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error consultando Google Places', details: err?.message }));
              }
            } else {
              next();
            }
          });
        }
      }
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_MAPS_API_KEY': JSON.stringify(env.GOOGLE_MAPS_API_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    }
  };
});
