// Cliente del proxy de Gemini (/api/gemini). La API key vive solo en el servidor;
// el cliente nunca la ve. Reemplaza el uso directo de `new GoogleGenAI(...)` en
// los services que dependen de la key compartida de CreAPP.

export interface GeminiRequest {
  model: string;
  contents: unknown;
  config?: Record<string, unknown>;
}

export async function callGemini({ model, contents, config }: GeminiRequest): Promise<string> {
  const res = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, contents, config }),
  });

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // respuesta no-JSON (ej. 404 en dev sin el endpoint)
  }

  if (!res.ok) {
    throw new Error(data?.error || `Error del servicio de IA (${res.status}).`);
  }

  return (data?.text ?? '') as string;
}
