import { GoogleGenAI } from "@google/genai";
import { createLead, Lead } from "./pipelineService";

export interface ScrapedProspect {
  id: string;
  name: string;
  category: string;
  city: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  rating: number;
  reviewCount: number;
  source: 'google_places' | 'gemini_intelligence';
  lat?: number;
  lng?: number;
  digitalHealth: {
    hasWebsite: boolean;
    isMobileFriendly: boolean;
    hasSSL: boolean;
    loadSpeed: 'Rápida' | 'Lenta' | 'Crítica' | 'Inexistente';
    diagnosis: string;
    suggestedSolution: 'Stacked SaaS' | 'TrazApp' | 'Dental IA' | 'Desarrollo a Medida' | 'Landing & Growth';
    estimatedBudget: number;
  };
}

export interface GeoSearchOptions {
  lat?: number;
  lng?: number;
  radiusMeters?: number;
}

export const getGeminiApiKey = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem('creapp_gemini_api_key');
    if (stored) return stored;
  }
  return (
    (import.meta as any)?.env?.VITE_GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.GEMINI_API_KEY ||
    ''
  );
};

export const getGoogleMapsApiKey = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = localStorage.getItem('creapp_google_maps_api_key');
    if (stored) return stored;
  }
  return (
    (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY ||
    (process.env as any).GOOGLE_MAPS_API_KEY ||
    ''
  );
};

export const setStoredApiKeys = (keys: { geminiKey?: string; mapsKey?: string }) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (keys.geminiKey !== undefined) {
      localStorage.setItem('creapp_gemini_api_key', keys.geminiKey.trim());
    }
    if (keys.mapsKey !== undefined) {
      localStorage.setItem('creapp_google_maps_api_key', keys.mapsKey.trim());
    }
  }
};

export const getApiStatus = async () => {
  const geminiKey = getGeminiApiKey();
  const mapsKey = getGoogleMapsApiKey();

  let geminiConnected = false;
  let geminiModel = 'gemini-3.6-flash';
  let geminiError = '';

  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const res = await ai.models.generateContent({
        model: geminiModel,
        contents: 'test',
      });
      if (res.text !== undefined) {
        geminiConnected = true;
      }
    } catch (e: any) {
      geminiError = e.message || 'Error de autenticación';
    }
  }

  return {
    gemini: {
      hasKey: !!geminiKey,
      connected: geminiConnected,
      model: geminiModel,
      error: geminiError,
    },
    googleMaps: {
      hasKey: !!mapsKey,
    },
  };
};

/**
 * Búsqueda de prospectos B2B combinando Google Places API + Análisis Gemini
 */
export const searchProspects = async (
  category: string,
  city: string,
  onlyWithoutWebsite: boolean = false,
  geo?: GeoSearchOptions
): Promise<ScrapedProspect[]> => {
  if (!city.trim() && (!geo?.lat || !geo?.lng)) return [];

  const query = category ? `${category}${city ? ` en ${city}` : ''}` : city;
  const mapsKey = getGoogleMapsApiKey();
  const geminiKey = getGeminiApiKey();

  let placesList: any[] = [];

  // 1. Intentar consultar Google Places API mediante nuestro proxy seguro
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    let placesUrl = `${origin}/api/places/search?query=${encodeURIComponent(query)}${
      mapsKey ? `&key=${encodeURIComponent(mapsKey)}` : ''
    }`;
    if (geo?.lat && geo?.lng) {
      placesUrl += `&lat=${geo.lat}&lng=${geo.lng}&radius=${geo.radiusMeters || 2500}`;
    }
    const res = await fetch(placesUrl);
    const data = await res.json();

    if (data.success && data.results && data.results.length > 0) {
      placesList = data.results;
    }
  } catch (err) {
    console.warn("No se pudo conectar al endpoint de Google Places, fallback a Gemini:", err);
  }

  // 2. Si Google Places devolvió locales reales: enriquecer con Gemini
  if (placesList.length > 0 && geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const analysisPrompt = `
Eres el Director de Estrategia Tecnológica de CreApp (Software Lab).
Analiza esta lista de locales reales extraídos de Google Maps${city ? ` en "${city}"` : ''}:

${JSON.stringify(placesList, null, 2)}

Para cada local, evalúa su oportunidad técnica según el portafolio de CreApp:
- Si es gastronomía (burgers, hamburguesas, pizzerías, sushi, cafés, cervecerías) -> Stacked SaaS ($350 USD)
- Si es salud, consultorios u odontología (consultorio odontológico, clínicas, dentistas, estética) -> Dental IA ($600 USD)
- Si es agro, botánica o trazabilidad -> TrazApp ($500 USD)
- Si es servicios (veterinarias, gimnasios, barberías, estudios) sin web -> Landing & Growth ($350 USD)
- Si requiere software complejo a medida -> Desarrollo a Medida ($550 USD)

Devuelve un JSON estrictamente válido con la lista completa respetando los campos originales pero agregando digitalHealth:
[
  {
    "id": "place_id_original",
    "name": "Nombre original",
    "category": "${category}",
    "city": "${city || 'Zona Seleccionada'}",
    "address": "Dirección original",
    "phone": "Teléfono original",
    "website": "Web original o vacío",
    "rating": 4.5,
    "reviewCount": 100,
    "source": "google_places",
    "lat": -34.123,
    "lng": -58.123,
    "digitalHealth": {
      "hasWebsite": true o false,
      "isMobileFriendly": false,
      "hasSSL": true o false,
      "loadSpeed": "Rápida" | "Lenta" | "Inexistente",
      "diagnosis": "Diagnóstico breve del dolor u oportunidad del negocio",
      "suggestedSolution": "Stacked SaaS",
      "estimatedBudget": 350
    }
  }
]
Devuelve ÚNICAMENTE el array JSON sin markdown ni explicaciones.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: analysisPrompt,
        config: { temperature: 0.2 },
      });

      const raw = response.text?.trim() || '';
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        // Asegurar que lat y lng se conserven desde placesList
        const enrichedWithCoords = parsed.map((p: any, idx: number) => {
          const original = placesList.find(x => x.place_id === p.id || x.name === p.name) || placesList[idx];
          return {
            ...p,
            lat: p.lat ?? original?.lat,
            lng: p.lng ?? original?.lng,
            phone: p.phone || original?.phone || '',
            website: p.website || original?.website || '',
            address: p.address || original?.address || '',
          };
        });

        if (onlyWithoutWebsite) {
          return enrichedWithCoords.filter((p: ScrapedProspect) => !p.digitalHealth.hasWebsite);
        }
        return enrichedWithCoords;
      }
    } catch (aiErr) {
      console.error("Error analizando con Gemini:", aiErr);
    }
  }

  // 3. Si no hay Google Maps Key o no devolvió datos: Usar Gemini directamente para rastrear e investigar negocios reales
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const prompt = `
Actúa como un motor de prospección B2B y consultor de CreApp Software Lab.
Investiga y enumera 3 a 5 empresas y comercios REALES y destacados en "${city}" del rubro "${category}".
${onlyWithoutWebsite ? 'Enfócate en los que no tengan sitio web propio o tengan presencia digital desactualizada.' : ''}

Devuelve un array JSON con esta estructura exacta:
[
  {
    "id": "prospect-1",
    "name": "Nombre real del negocio en ${city}",
    "category": "${category}",
    "city": "${city}",
    "address": "Zona o dirección en ${city}",
    "phone": "+54 9 ... (o teléfono real / formato estándar)",
    "email": "",
    "website": "",
    "rating": 4.6,
    "reviewCount": 140,
    "source": "gemini_intelligence",
    "digitalHealth": {
      "hasWebsite": false,
      "isMobileFriendly": false,
      "hasSSL": false,
      "loadSpeed": "Inexistente",
      "diagnosis": "Diagnóstico específico de por qué pierden clientes y cómo CreApp lo soluciona",
      "suggestedSolution": "Stacked SaaS", // Stacked SaaS, Dental IA, TrazApp, Desarrollo a Medida, Landing & Growth
      "estimatedBudget": 350
    }
  }
]

Devuelve ÚNICAMENTE el bloque JSON sin ningún texto adicional fuera del array.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: { temperature: 0.2 },
      });

      const rawText = response.text?.trim() || '';
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const results = parsed.map((item: any, idx: number) => ({
          ...item,
          id: `prospect-${Date.now()}-${idx}`,
          source: 'gemini_intelligence',
        }));
        if (onlyWithoutWebsite) {
          return results.filter((p: ScrapedProspect) => !p.digitalHealth.hasWebsite);
        }
        return results;
      }
    } catch (e) {
      console.error("Error en investigación con Gemini:", e);
    }
  }

  return [];
};

/**
 * Generador de Pitch personalizado por WhatsApp / Email
 */
export const generateColdPitchWithAI = async (
  prospect: ScrapedProspect,
  channel: 'whatsapp' | 'email' | 'linkedin' = 'whatsapp'
): Promise<string> => {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
Actúa como el Director Comercial de CreApp (Software Lab & FinTech Hub).
Redacta un mensaje de primer contacto para prospección comercial en frío por ${channel.toUpperCase()}.

Datos del Prospecto:
- Nombre del Negocio: ${prospect.name}
- Rubro: ${prospect.category}
- Ciudad: ${prospect.city}
- Diagnóstico Técnico: ${prospect.digitalHealth.diagnosis}
- Solución recomendada de CreApp: ${prospect.digitalHealth.suggestedSolution}
- Sitio web actual: ${prospect.website || 'No posee sitio web'}
- Fuente de datos: ${prospect.source === 'google_places' ? 'Google Maps' : 'Investigación de Mercado'}

Pautas de tono y estilo:
1. No suenes a bot ni a vendedor insistente. Sé un consultor de software profesional, empático y directo.
2. Menciona un dolor específico que detectamos en su negocio (por ejemplo su web desactualizada, comisiones excesivas en apps de terceros o falta de digitalización).
3. Haz un gancho de curiosidad para mostrarle una demo interactiva o propuesta sin compromiso.
4. Si es WhatsApp: usa párrafos cortos, emojis profesionales y llamada a la acción clara.
5. Devuelve SOLO el texto del mensaje listo para enviar.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          temperature: 0.7,
        },
      });

      if (response.text) {
        return response.text.trim();
      }
    } catch (e) {
      console.warn("Error calling Gemini API for pitch:", e);
    }
  }

  // Fallback estructurado en base a los datos reales
  if (channel === 'whatsapp') {
    return `¡Hola ${prospect.name}! 👋 Les escribe el equipo de CreApp Software Lab.\n\nEstuvimos analizando comercios de ${prospect.category} en ${prospect.city}. Notamos una oportunidad clave para su operación: ${prospect.digitalHealth.diagnosis}\n\nEn CreApp desarrollamos soluciones como ${prospect.digitalHealth.suggestedSolution} para automatizar procesos y ventas sin fricciones.\n\n¿Les interesaría que les preparemos una demo rápida de 2 minutos para que vean el impacto en su negocio? ¡Saludos!`;
  }

  return `Estimado equipo de ${prospect.name},\n\nDesde CreApp Software Lab nos ponemos en contacto porque identificamos una oportunidad para optimizar su operativa en ${prospect.city}: ${prospect.digitalHealth.diagnosis}.\n\nImplementamos soluciones como ${prospect.digitalHealth.suggestedSolution} para empresas de su sector.\n\nQuedamos a su disposición para coordinar una breve reunión o presentarles una propuesta técnica.\n\nAtentamente,\nEquipo CreApp Innovation Hub`;
};

export const importProspectToPipeline = (prospect: ScrapedProspect): Lead => {
  return createLead({
    name: prospect.name,
    company: prospect.name,
    industry: prospect.category,
    stage: 'prospect',
    estimatedValue: prospect.digitalHealth.estimatedBudget || 0,
    currency: 'USD',
    phone: prospect.phone,
    email: prospect.email,
    website: prospect.website,
    productType: prospect.digitalHealth.suggestedSolution,
    notes: `Prospectado vía CreApp Scraper (${prospect.source}): ${prospect.digitalHealth.diagnosis}`,
  });
};
