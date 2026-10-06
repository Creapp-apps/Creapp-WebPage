// =========================================================================
// CreAPP Mission Control — Real Fleet Latency & Uptime Ping Engine
// Realiza mediciones HTTP en vivo a los dominios reales de produccion
// =========================================================================

import https from 'https';
import http from 'http';

function measureUrl(targetUrl) {
  return new Promise((resolve) => {
    const start = process.hrtime();
    try {
      const parsedUrl = new URL(targetUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.request(
        parsedUrl,
        {
          method: 'HEAD',
          timeout: 5000,
          headers: {
            'User-Agent': 'CreAPP-NOC-Uptime-Monitor/2026',
            'Cache-Control': 'no-cache',
          },
        },
        (res) => {
          const diff = process.hrtime(start);
          const latencyMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
          const isHealthy = res.statusCode >= 200 && res.statusCode < 400;
          resolve({
            url: targetUrl,
            status: isHealthy ? 'healthy' : 'degraded',
            statusCode: res.statusCode,
            latencyMs: latencyMs,
            timestamp: new Date().toISOString(),
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve({
          url: targetUrl,
          status: 'down',
          statusCode: 408,
          latencyMs: 5000,
          timestamp: new Date().toISOString(),
        });
      });

      req.on('error', (err) => {
        const diff = process.hrtime(start);
        const latencyMs = Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
        resolve({
          url: targetUrl,
          status: 'down',
          statusCode: 500,
          error: err.message,
          latencyMs: latencyMs || 999,
          timestamp: new Date().toISOString(),
        });
      });

      req.end();
    } catch (err) {
      resolve({
        url: targetUrl,
        status: 'down',
        statusCode: 500,
        error: err.message,
        latencyMs: 999,
        timestamp: new Date().toISOString(),
      });
    }
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const FLEET_URLS = [
    { id: 'dental-ia', url: 'https://dentalia.com.ar' },
    { id: 'stacked', url: 'https://software.stacked.com.ar' },
    { id: 'celebra', url: 'https://celebraexperiencias.com.ar' },
    { id: 'trazapp', url: 'https://software.trazapp.ar' },
    { id: 'belcalis-nails', url: 'https://belcalisnails.com.ar' },
  ];

  try {
    const results = await Promise.all(
      FLEET_URLS.map(async (item) => {
        const pingResult = await measureUrl(item.url);
        return {
          id: item.id,
          ...pingResult,
        };
      })
    );

    return res.status(200).json({
      success: true,
      measuredAt: new Date().toISOString(),
      results,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to ping fleet', message: err.message });
  }
}
