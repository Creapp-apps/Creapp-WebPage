// Lee el body crudo (string) del request sin parsear. Requiere
// `export const config = { api: { bodyParser: false } }` en el handler.
export async function readRawBody(req): Promise<string> {
  if (typeof req.body === 'string') return req.body; // fallback si el runtime ya lo bufferó
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks).toString('utf8');
}
