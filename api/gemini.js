import { GoogleGenAI } from '@google/genai';

// Proxy serverless para Gemini. Mantiene la API key SOLO en el servidor
// (GEMINI_API_KEY, sin prefijo VITE) para que nunca viaje al bundle del cliente.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Servicio de IA no disponible (GEMINI_API_KEY no configurada).' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { model, contents, config } = body;

    if (!model || !contents) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos (model, contents).' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model, contents, config });

    return res.status(200).json({ text: response.text ?? '' });
  } catch (error) {
    console.error('[api/gemini] Error:', error);
    return res.status(500).json({ error: error?.message || 'Error interno al consultar Gemini.' });
  }
}
