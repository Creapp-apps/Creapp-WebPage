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
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    linkedin?: string;
  };
  rating: number;
  reviewCount: number;
  source: 'google_places' | 'gemini_intelligence';
  lat?: number;
  lng?: number;
  digitalHealth: {
    hasWebsite: boolean;
    isMobileFriendly: boolean;
    hasSSL: boolean;
    loadSpeed: 'Rápida' | 'Media' | 'Lenta' | 'Crítica' | 'Inexistente';
    diagnosis: string;
    suggestedSolution: 'Stacked SaaS' | 'TrazApp' | 'Dental IA' | 'Desarrollo a Medida' | 'Landing & Growth';
    estimatedBudget: number;
  };
}

export const extractSocials = (
  url?: string,
  existing?: { instagram?: string; facebook?: string; tiktok?: string; linkedin?: string }
): { instagram?: string; facebook?: string; tiktok?: string; linkedin?: string } => {
  const res: { instagram?: string; facebook?: string; tiktok?: string; linkedin?: string } = { ...existing };
  if (!url) return res;
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes('instagram.com/')) {
    res.instagram = trimmed;
  } else if (lower.includes('facebook.com/') || lower.includes('fb.me/') || lower.includes('fb.com/')) {
    res.facebook = trimmed;
  } else if (lower.includes('tiktok.com/')) {
    res.tiktok = trimmed;
  } else if (lower.includes('linkedin.com/')) {
    res.linkedin = trimmed;
  }
  return res;
};

export const getInstagramHandle = (url?: string): string | null => {
  if (!url) return null;
  const clean = url
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/\/.*$/, '')
    .replace(/^[?#].*$/, '');
  if (clean && !['p', 'reel', 'reels', 'explore', 'stories', 'direct'].includes(clean.toLowerCase())) {
    return `@${clean.replace(/^@/, '')}`;
  }
  return null;
};

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
    let placesUrl = `${origin}/api/places/search?query=${encodeURIComponent(query)}&fetchAll=true${
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

  // 2. Si Google Places devolvió locales reales: enriquecer con Gemini o fallback garantizado
  if (placesList.length > 0) {
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const analysisPrompt = `
Eres el Director de Estrategia Tecnológica de CreApp (Software Lab).
Analiza esta lista de locales reales extraídos de Google Maps${city ? ` en "${city}"` : ''}:

${JSON.stringify(placesList, null, 2)}

Para cada local, evalúa su oportunidad técnica según el portafolio de CreApp:
- Si es gastronomía (burgers, hamburguesas, pizzerías, sushi, cafés, cervecerías) -> Stacked SaaS
- Si es salud, consultorios u odontología (consultorio odontológico, clínicas, dentistas, estética) -> Dental IA
- Si es agro, botánica o trazabilidad -> TrazApp
- Si es servicios (veterinarias, gimnasios, barberías, estudios) sin web -> Landing & Growth
- Si requiere software complejo a medida -> Desarrollo a Medida

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
      "estimatedBudget": 0
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
          // Asegurar que lat y lng se conserven desde placesList y extraer redes sociales
          const enrichedWithCoords = parsed.map((p: any, idx: number) => {
            const original = placesList.find(x => x.place_id === p.id || x.name === p.name) || placesList[idx];
            const rawWeb = p.website || original?.website || '';
            const socials = extractSocials(rawWeb, p.socialLinks);
            const isSocialAsWebsite = Boolean(socials.instagram || socials.facebook || socials.tiktok);
            const hasRealWebsite = Boolean(rawWeb && !isSocialAsWebsite);

            return {
              ...p,
              lat: p.lat ?? original?.lat,
              lng: p.lng ?? original?.lng,
              phone: p.phone || original?.phone || '',
              website: rawWeb,
              socialLinks: socials,
              address: p.address || original?.address || '',
              digitalHealth: {
                ...p.digitalHealth,
                hasWebsite: hasRealWebsite,
                diagnosis: isSocialAsWebsite
                  ? `Utiliza perfil de ${socials.instagram ? 'Instagram' : 'redes'} como canal digital pero carece de sitio web y software propio.`
                  : p.digitalHealth?.diagnosis,
              }
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

    // Fallback garantizado si no hay clave de Gemini o si el enriquecimiento falló:
    // Muestra el 100% de los locales reales de Google Places
    const fallbackResults: ScrapedProspect[] = placesList.map((place: any, idx: number) => {
      const rawWeb = (place.website || '').trim();
      const socials = extractSocials(rawWeb);
      const isSocialAsWebsite = Boolean(socials.instagram || socials.facebook || socials.tiktok);
      const hasRealWeb = Boolean(rawWeb && !isSocialAsWebsite);

      return {
        id: place.place_id || `place-${idx}`,
        name: place.name || 'Comercio',
        category: category || 'Comercio',
        city: city || 'Zona Seleccionada',
        address: place.address || '',
        phone: place.phone || '',
        email: '',
        website: rawWeb,
        socialLinks: socials,
        rating: place.rating || 0,
        reviewCount: place.user_ratings_total || 0,
        source: 'google_places',
        lat: place.lat,
        lng: place.lng,
        digitalHealth: {
          hasWebsite: hasRealWeb,
          isMobileFriendly: false,
          hasSSL: Boolean(rawWeb.startsWith('https')),
          loadSpeed: hasRealWeb ? 'Media' : 'Inexistente',
          diagnosis: isSocialAsWebsite
            ? `Utiliza ${socials.instagram ? 'Instagram' : 'redes'} como canal principal pero no tiene web ni software propio.`
            : hasRealWeb
            ? 'Cuenta con sitio web. Oportunidad de modernización y optimización de conversión.'
            : 'Sin sitio web propio. Depende de redes o plataformas intermediarias con altas comisiones.',
          suggestedSolution: 'Stacked SaaS',
          estimatedBudget: 0,
        },
      };
    });

    if (onlyWithoutWebsite) {
      return fallbackResults.filter((p) => !p.digitalHealth.hasWebsite);
    }
    return fallbackResults;
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
      "estimatedBudget": 0
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
/**
 * Extrae un nombre de contacto amigable y respetuoso del nombre comercial o razón social
 * Ej: "Consultorio odontológico Doctora Montes" -> "Dra. Montes"
 * Ej: "Dr.Guillermo Krittian ODONTÓLOGO" -> "Dr. Guillermo"
 * Ej: "Dra. Mariana López Consultorio Dental" -> "Dra. Mariana"
 * Ej: "Parrilla Don Julio" -> "Don Julio"
 */
export const extractFriendlyLeadName = (rawName: string): string => {
  if (!rawName) return '';
  const trimmed = rawName.trim();

  // 1. Detectar títulos profesionales con nombre o apellido
  // Soporta: Dr., Dra., Doctor, Doctora, Odont., Odontólogo, Odontóloga, Lic., Licenciado/a
  const professionalMatch = trimmed.match(
    /\b(Dr\.|Doctor|Dra\.|Doctora|Odont\.|Odont[oó]log[oa]|Lic\.|Licenciado|Licenciada)\s*([A-Za-zÁÉÍÓÚáéíóúñÑ]+)(?:\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]+))?/i
  );
  if (professionalMatch) {
    let title = professionalMatch[1].toLowerCase();
    if (title.startsWith('dr') || title.startsWith('doctor') || title.startsWith('odont')) {
      title = (title.includes('a') || title.endsWith('a')) ? 'Dra.' : 'Dr.';
    } else if (title.startsWith('lic')) {
      title = title.includes('a') ? 'Lic.' : 'Lic.';
    }
    const namePart1 = professionalMatch[2].charAt(0).toUpperCase() + professionalMatch[2].slice(1).toLowerCase();
    return `${title} ${namePart1}`;
  }

  // 2. Limpiar palabras comerciales genéricas, prefijos y adjetivos que distorsionan el nombre
  const cleanName = trimmed
    .replace(/\b(ODONTOL[OÓ]GIC[OA]S?|ODONT[OÓ]LOG[OA]S?|ODONTOLOG[IÍ]A|M[EÉ]DIC[OA]S?|MEDICINA|DENTALES?|DENTISTA|CL[IÍ]NICA|CONSULTORIO|CENTRO|INSTITUTO|LAB|LABORATORIO|ESTUDIO|S\.?R\.?L\.?|S\.?A\.?)\b/gi, '')
    .replace(/[^A-Za-zÁÉÍÓÚáéíóúñÑ\s]/g, ' ')
    .trim();

  const words = cleanName.split(/\s+/).filter(w => w.length > 1);
  if (words.length > 0) {
    // Si quedan 1 o 2 palabras razonables (ej. "Don Julio", "MV", "Independencia")
    return words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  return rawName;
};

export const extractBusinessShortName = (rawName: string, category: string = ''): string => {
  if (!rawName) return 'su negocio';
  const friendly = extractFriendlyLeadName(rawName);
  if (friendly && (friendly.startsWith('Dr.') || friendly.startsWith('Dra.') || friendly.startsWith('Lic.'))) {
    return friendly;
  }
  // Limpiar sufijos corporativos
  const clean = rawName
    .replace(/\b(S\.?R\.?L\.?|S\.?A\.?|S\.?A\.?S\.?|INC\.?)\b/gi, '')
    .trim();
  return clean || rawName;
};

export interface ConversationalPitch {
  step1: string; // Apertura: Fricción real / Pregunta inocente de alta respuesta
  step2: string; // Transición: Enganche de venta suave tras recibir confirmación
}

/**
 * Genera el argumento conversacional en 2 pasos propuesto por Sebastián:
 * Paso 1: Gancho inocente como potencial cliente/paciente que experimentó fricción al buscar web/turnos (tasa de respuesta > 85%).
 * Paso 2: Transición empática y presentación de Dental-IA / CreApp para cuando contestan y confirman el número.
 */
export const generateConversationalHookPitch = (prospect: ScrapedProspect): ConversationalPitch => {
  const isDental = /odont|dent|dient/i.test(`${prospect.category || ''} ${prospect.name || ''} ${prospect.digitalHealth.suggestedSolution || ''}`);
  const isGastro = /gastronom|restauran|comida|pizz|bar|caf[eé]|hamburgue/i.test(prospect.category || '');
  const businessTarget = extractBusinessShortName(prospect.name, prospect.category);
  const city = prospect.city || 'la zona';

  let step1 = '';
  let step2 = '';

  if (isDental) {
    step1 = 
      `Hola, buenas tardes! ¿Es este el WhatsApp de ${businessTarget}?\n\n` +
      `Quería consultar para sacar un turno pero no encontré ninguna página web ni Instagram oficial, ¿es este el número correcto para agendar?`;

    step2 = 
      `¡Muchas gracias por responder!\n\n` +
      `Te cuento con total sinceridad: formo parte de Dental-IA (tecnología para consultorios odontológicos). Justo estaba revisando consultorios con excelente reputación en ${city} y noté en carne propia lo que le cuesta a un paciente nuevo poder agendar rápido o fuera de horario al no tener web ni bot de WhatsApp.\n\n` +
      `¿No han evaluado automatizar la recepción de turnos por WhatsApp las 24hs? Desarrollamos un asistente con IA que responde dudas frecuentes, filtra prepagas y agenda turnos en el sistema del consultorio de forma 100% automática, para que no pierdan pacientes y ustedes no vivan pendientes del celular todo el día.\n\n` +
      `¿Te interesaría que te mande una demo interactiva de 2 minutos para ver cómo funcionaría en su propio consultorio, sin ningún compromiso? 📞`;
  } else if (isGastro) {
    step1 = 
      `Hola, buenas tardes! ¿Es este el WhatsApp de ${businessTarget}?\n\n` +
      `Quería consultar para hacer un pedido / ver la carta pero no encontré página web ni Instagram oficial, ¿es por acá?`;

    step2 = 
      `¡Muchas gracias por responder!\n\n` +
      `Te cuento con total sinceridad: formo parte de CreApp Software Lab. Justo estaba viendo locales gastronómicos de gran nivel en ${city} como el de ustedes y noté en carne propia lo que le cuesta a un cliente nuevo pedir directo sin tener una carta web o canal propio.\n\n` +
      `¿No han evaluado tener su propio canal de pedidos directos a WhatsApp para no pagar el 25-30% de comisiones a aplicaciones como PedidosYa o Rappi? Desarrollamos menús interactivos que envían los pedidos listos a cocina.\n\n` +
      `¿Te interesaría ver una demo interactiva de 2 minutos de cómo funcionaría para su local, sin compromiso? 🚀`;
  } else {
    step1 = 
      `Hola, buenas tardes! ¿Es este el WhatsApp de ${businessTarget}?\n\n` +
      `Quería hacerles una consulta sobre sus servicios pero no encontré sitio web directo, ¿es este el número correcto?`;

    step2 = 
      `¡Muchas gracias por responder!\n\n` +
      `Te cuento con total sinceridad: formo parte de CreApp Software Lab. Justo estaba revisando empresas con excelente trayectoria en ${city} y noté en carne propia lo difícil que es para un cliente nuevo conocer sus soluciones o cotizar directo al no contar con un sitio web o canal interactivo.\n\n` +
      `¿No han evaluado incorporar una plataforma web y automatización para captar clientes 24/7 sin depender de responder uno por uno?\n\n` +
      `¿Te interesaría ver una demo rápida de 2 minutos personalizada para su empresa, sin ningún compromiso? 🚀`;
  }

  return { step1, step2 };
};

/**
 * Genera el argumento de reactivación para leads en "0. No Contestó / Contacto Nulo".
 * Enfoque de alta conversión: El dolor del paciente que "no logró comunicarse cuando realmente lo necesitaba".
 * La falta de respuesta en el propio chat es la prueba real, verídica e irrefutable
 * de la fuga de turnos y por qué necesitan Dental-IA / CreApp.
 */
export const generateReactivationPitch = (prospect: ScrapedProspect): string => {
  const isDental = /odont|dent|dient/i.test(`${prospect.category || ''} ${prospect.name || ''} ${prospect.digitalHealth.suggestedSolution || ''}`);
  const isGastro = /gastronom|restauran|comida|pizz|bar|caf[eé]|hamburgue/i.test(prospect.category || '');
  const friendlyName = extractFriendlyLeadName(prospect.name) || extractBusinessShortName(prospect.name, prospect.category);
  const city = prospect.city || 'la zona';

  if (isDental) {
    return (
      `Hola ${friendlyName}, ¿cómo estás? Te saluda Sebastián nuevamente.\n\n` +
      `Te escribí hace unos días por acá para consultar por un turno y no tuve respuesta.\n\n` +
      `Y justamente esto que me pasó a mí es el motivo principal por el que te vuelvo a escribir con total honestidad: lo que acabo de experimentar en carne propia es exactamente lo que le pasa todas las semanas a decenas de pacientes que buscan atención, no reciben respuesta inmediata o fuera de hora, y terminan sacando turno en otro consultorio.\n\n` +
      `Soy creador de *Dental-IA*. Ayudamos a consultorios y profesionales con excelente reputación en ${city} a resolver esto de raíz: instalamos un asistente inteligente en WhatsApp que responde al instante las dudas frecuentes y agenda turnos en la agenda del consultorio las 24 horas de forma 100% automática.\n\n` +
      `Si a mí no pudieron responderme por la lógica carga de trabajo del día a día, imaginate cuántos tratamientos y pacientes se les están fugando al mes sin que se den cuenta.\n\n` +
      `¿Te gustaría que te muestre una *demo interactiva de 2 minutos* para ver cómo solucionar esto definitivamente en tu consultorio? 📞`
    );
  }

  if (isGastro) {
    return (
      `Hola equipo de ${friendlyName}, ¿cómo están? Les saluda Sebastián de CreApp.\n\n` +
      `Les escribí hace unos días para consultar por un pedido y no recibí respuesta.\n\n` +
      `Y precisamente esto que me ocurrió es el motivo por el que les vuelvo a escribir: lo que viví como cliente es exactamente lo que le pasa a comensales que quieren pedirles directo, no reciben respuesta rápida y terminan pidiendo por apps como PedidosYa o Rappi (donde ustedes regalan el 25-30% en comisiones) o se van a la competencia.\n\n` +
      `En *CreApp Software Lab* desarrollamos sistemas de pedidos automáticos directo a su WhatsApp con panel de comandas en cocina, para que ningún cliente quede sin respuesta y recuperen el 100% de la rentabilidad.\n\n` +
      `¿Les interesaría ver una *demo interactiva de 2 minutos* de cómo funcionaría para su local, sin ningún compromiso? 🚀`
    );
  }

  return (
    `Hola ${friendlyName}, ¿cómo están? Les saluda Sebastián de CreApp Software Lab.\n\n` +
    `Les escribí hace unos días para hacerles una consulta sobre sus servicios y no recibí respuesta.\n\n` +
    `Justamente esto que me ocurrió como potencial cliente es el motivo de este mensaje: en la actualidad, no tener un canal de respuesta automatizado hace que consultas de alto valor queden en el camino y el cliente busque otra alternativa inmediata.\n\n` +
    `Ayudamos a empresas con gran trayectoria en ${city} a automatizar la captura, calificación y agendamiento de clientes 24/7 para que ninguna oportunidad comercial se pierda por demoras en la atención.\n\n` +
    `¿Les gustaría coordinar una breve demo interactiva de 2 minutos para ver cómo resolverlo, sin ningún compromiso? 🚀`
  );
};

/**
 * Normaliza teléfonos argentinos y limpia emojis/formatos para enlaces nativos de WhatsApp (wa.me)
 */
export const formatWhatsAppUrl = (phone: string, text: string): string => {
  let cleanPhone = (phone || '').replace(/[^0-9]/g, '');

  // Normalización para teléfonos de Argentina:
  // Si empieza con 54 (código país) pero le falta el 9 para celular (ej. 54 11 7133-5176 -> 541171335176)
  if (cleanPhone.startsWith('54') && !cleanPhone.startsWith('549') && cleanPhone.length >= 12) {
    cleanPhone = '549' + cleanPhone.slice(2);
  } else if (cleanPhone.startsWith('11') && cleanPhone.length === 10) {
    cleanPhone = '549' + cleanPhone;
  } else if (cleanPhone.startsWith('15') && cleanPhone.length === 10) {
    cleanPhone = '54911' + cleanPhone.slice(2);
  }

  // 1. Convertir negritas de Markdown (**texto**) al estándar nativo de WhatsApp (*texto*)
  let waText = text.replace(/\*\*(.*?)\*\*/g, '*$1*');

  // 2. Limpiar Selectores de Variación Unicode (\uFE0E y \uFE0F) que en WhatsApp Web se renderizan como cajas vacías / notdef
  // Por ejemplo, transforma ⭐️ (\u2B50\uFE0F) en ⭐ pura (\u2B50)
  waText = waText.replace(/[\uFE0E\uFE0F]/g, '');

  // 3. Normalizar emojis que suelen fallar en desktop/web por versiones 100% universales
  waText = waText.replace(/🗓/g, '📅'); // Calendario universal

  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waText)}`
    : `https://wa.me/?text=${encodeURIComponent(waText)}`;
};

/**
 * Generador de Pitch personalizado por WhatsApp / Email
 * Enfoque cercano, consultivo y amigable (Sebastián de CreApp / Dental IA)
 */
export const generateColdPitchWithAI = async (
  prospect: ScrapedProspect,
  channel: 'whatsapp' | 'email' | 'linkedin' = 'whatsapp'
): Promise<string> => {
  const isDental = /odont|dent|dient/i.test(`${prospect.category || ''} ${prospect.name || ''} ${prospect.digitalHealth.suggestedSolution || ''}`);
  const friendlyName = extractFriendlyLeadName(prospect.name) || prospect.name;
  const productName = isDental ? 'Dental-IA' : (prospect.digitalHealth.suggestedSolution || 'CreApp Software Lab');
  const categoryEmoji = isDental ? '🦷' : (/gastronom|restauran|comida|pizz|bar/i.test(prospect.category) ? '🍽️' : '🚀');
  const clientEntity = isDental ? 'pacientes' : 'clientes';
  const placeEntity = isDental ? 'consultorio' : 'negocio';
  const appointmentEntity = isDental ? 'turnos' : 'consultas y reservas';
  const targetAudience = isDental ? 'los odontólogos' : 'negocios de tu rubro';

  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `
Actúa como Sebastián, fundador y asesor de soluciones tecnológicas en CreApp Software Lab y creador de Dental IA.
Tu objetivo es redactar un mensaje de primer contacto para prospección en frío por ${channel.toUpperCase()} dirigido a ${prospect.name}.

Datos del Prospecto:
- Nombre / Razón Social: ${prospect.name}
- Nombre sugerido para el saludo: ${friendlyName}
- Rubro: ${prospect.category}
- Ciudad/Localidad: ${prospect.city || 'su localidad'}
- Calificación en Google Maps: ${prospect.rating ? `${prospect.rating} estrellas con ${prospect.reviewCount} opiniones` : 'Excelente reputación'}
- Diagnóstico técnico detectado: ${prospect.digitalHealth.diagnosis}
- Solución tecnológica recomendada: ${productName}
- Sitio web actual: ${prospect.website || 'No posee sitio web ni canal automatizado'}

ESTILO Y TONO EXIGIDO (IMPRESCINDIBLE):
- Tono: Muy cercano, amigable, respetuoso y consultivo. HABLA EN PRIMERA PERSONA ("Te saluda Sebastián, de parte de ${productName}"). NUNCA hables en tercera persona corporativa como "el equipo de dirección comercial" ni suenes a bot o spam.
- Estructura obligatoria del mensaje:
  1. Saludo cercano: "Hola ${friendlyName}, ¿cómo estás? Te saluda Sebastián, de parte de ${productName} ${categoryEmoji}"
  2. Elogio sincero: Menciona que estabas revisando ${isDental ? 'consultorios' : 'negocios'} con excelente reputación en ${prospect.city || 'la zona'} vía Google Maps y te llamaron la atención las impecables valoraciones de sus ${clientEntity}. ¡Felicitaciones por ese nivel de servicio! ⭐⭐⭐⭐⭐
  3. Detección empática del dolor: Notaste que hoy no cuentan con sitio web ni canal digital automatizado para escalar la captación de ${clientEntity} y gestionar su ${placeEntity} de forma más efectiva y menos desgastante, lo que suele hacer que se pierdan ${appointmentEntity} fuera del horario comercial.
  4. Solución: Comenta sobre *${productName}*, diseñada para que ${targetAudience} puedan automatizar su atención en WhatsApp, responder consultas frecuentes y agendar ${appointmentEntity} las 24 horas de forma autónoma. 🤖
  5. Oferta de valor sin compromiso: Proponer mostrar una *demo interactiva de 2 minutos* para ver en vivo cómo funcionaría en su propio ${placeEntity}, sin ningún tipo de compromiso. 📞
  6. Llamada a la acción cálida: "¿Te gustaría que agendemos una videollamada para charlar un poco mas? 📅"

REGLAS DE FORMATO Y EMOJIS (CRÍTICO):
- Formato de negrita: USA UN SOLO ASTERISCO (*texto*) para negrita nativa de WhatsApp. NO uses doble asterisco (**).
- Compatibilidad absoluta de emojis: Usa ÚNICAMENTE emojis universales de alta compatibilidad (como ⭐, ${categoryEmoji}, 🤖, 📞, 📅). NUNCA uses emojis extraños ni de Unicode 14/15 que causan cajas vacías o signos de interrogación en WhatsApp.
- Saltos de línea dobles entre párrafos para que sea ultra legible en el celular.
- Devuelve ÚNICAMENTE el texto listo para enviar, sin introducciones ni comillas extra.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          temperature: 0.65,
        },
      });

      if (response.text) {
        // Limpiar selectores de variación que rompen en WhatsApp Web
        let cleanedText = response.text.trim().replace(/[\uFE0E\uFE0F]/g, '');
        cleanedText = cleanedText.replace(/🗓/g, '📅');
        return cleanedText;
      }
    } catch (e) {
      console.warn("Error calling Gemini API for pitch:", e);
    }
  }

  // Fallback estructurado de alta conversión que respeta 100% las directivas
  if (channel === 'whatsapp') {
    return (
      `Hola ${friendlyName}, ¿cómo estás? Te saluda Sebastián, de parte de ${productName} ${categoryEmoji}\n\n` +
      `Estaba revisando ${isDental ? 'consultorios' : 'negocios'} con excelente reputación en ${prospect.city || 'la zona'} vía Google Maps y me llamaron mucho la atención las impecables valoraciones de tus ${clientEntity}.\n` +
      `¡Felicitaciones por ese nivel de servicio! ⭐⭐⭐⭐⭐\n\n` +
      `Precisamente viendo la calidad de tu trabajo, noté que hoy no contás con un sitio web ni con un canal digital automatizado para escalar la captación de ${clientEntity} y gestionar tu ${placeEntity} de una forma mas efectiva y menos desgastante. Esto suele hacer que se pierdan ${appointmentEntity} de personas que buscan atención fuera del horario comercial o que no reciben respuesta inmediata.\n\n` +
      `Por eso, queremos comentarte acerca de nuestra plataforma *${productName}*, una solución diseñada para que ${targetAudience} puedan automatizar su atención en WhatsApp, responder consultas frecuentes y agendar ${appointmentEntity} las 24 horas de forma 100% autónoma. 🤖\n\n` +
      `Me gustaría mostrarte una *demo interactiva de 2 minutos* para que veas en vivo cómo funcionaría en tu ${placeEntity}, sin ningún tipo de compromiso. 📞\n\n` +
      `¿Te gustaría que agendemos una videollamada para charlar un poco mas? 📅`
    );
  }

  return (
    `Estimado/a ${friendlyName},\n\n` +
    `Te saluda Sebastián, de parte de ${productName}.\n\n` +
    `Estuve revisando la excelente reputación de ${prospect.name} en ${prospect.city || 'la zona'} en Google Maps, y me impresionaron las valoraciones de tus ${clientEntity}. ¡Felicitaciones por ese nivel de servicio!\n\n` +
    `Noté que actualmente no disponen de una web propia ni de un canal automatizado 24/7 para canalizar ${appointmentEntity} y consultas frecuentes. Implementamos soluciones de software como *${productName}* para resolver este dolor de forma 100% autónoma.\n\n` +
    `¿Tendrías 5 minutos para coordinar una breve demo interactiva esta semana?\n\n` +
    `Quedo a tu total disposición.\n\n` +
    `Atentamente,\n` +
    `Sebastián Maza\n` +
    `Fundador & CTO · CreApp Software Lab`
  );
};

export const importProspectToPipeline = (prospect: ScrapedProspect): Lead => {
  const instagram = prospect.socialLinks?.instagram || (prospect.website?.includes('instagram.com') ? prospect.website : undefined);
  const facebook = prospect.socialLinks?.facebook || (prospect.website?.includes('facebook.com') ? prospect.website : undefined);

  return createLead({
    name: prospect.name,
    company: prospect.name,
    industry: prospect.category,
    stage: 'prospect',
    estimatedValue: 0,
    currency: 'USD',
    phone: prospect.phone,
    email: prospect.email,
    website: prospect.website,
    instagram,
    facebook,
    productType: (['Stacked SaaS', 'TrazApp', 'Dental IA', 'Desarrollo a Medida', 'Landing & Growth'].includes(prospect.digitalHealth.suggestedSolution)
      ? prospect.digitalHealth.suggestedSolution
      : 'Desarrollo a Medida') as any,
    notes: `Prospectado vía CreApp Scraper (${prospect.source}): ${prospect.digitalHealth.diagnosis}`,
    address: prospect.address,
    city: prospect.city,
    rating: prospect.rating,
    reviewCount: prospect.reviewCount,
    originalProspect: prospect,
  });
};

/* =========================================================
   PERSISTENCIA DE SESIÓN & HISTORIAL DE BÚSQUEDAS SCRAPER
   ========================================================= */

export interface SavedScrapeSession {
  id: string;
  keyword: string;
  city: string;
  onlyWithoutWeb: boolean;
  timestamp: string;
  geoCenter?: { lat: number; lng: number };
  radiusMeters?: number;
  prospects: ScrapedProspect[];
}

const SCRAPER_CURRENT_SESSION_KEY = 'creapp_scraper_current_session_v1';
const SCRAPER_HISTORY_KEY = 'creapp_scraper_history_v1';

export const getStoredScraperSession = (): SavedScrapeSession | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(SCRAPER_CURRENT_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Error loading scraper session', e);
    return null;
  }
};

export const saveStoredScraperSession = (session: SavedScrapeSession): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(SCRAPER_CURRENT_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Error saving scraper session', e);
  }
};

export const clearStoredScraperSession = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(SCRAPER_CURRENT_SESSION_KEY);
  } catch (e) {
    console.error('Error clearing scraper session', e);
  }
};

export const getScrapeHistory = (): SavedScrapeSession[] => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(SCRAPER_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading scraper history', e);
    return [];
  }
};

export const addScrapeToHistory = (session: SavedScrapeSession): SavedScrapeSession[] => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const history = getScrapeHistory();
    // Excluir id duplicado o búsqueda exacta duplicada
    const filtered = history.filter(
      (h) => h.id !== session.id && !(h.keyword.toLowerCase() === session.keyword.toLowerCase() && h.city.toLowerCase() === session.city.toLowerCase())
    );
    const updated = [session, ...filtered].slice(0, 30); // Guardar hasta 30 búsquedas
    localStorage.setItem(SCRAPER_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error adding scrape to history', e);
    return [];
  }
};

export const deleteScrapeFromHistory = (id: string): SavedScrapeSession[] => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const history = getScrapeHistory();
    const updated = history.filter((h) => h.id !== id);
    localStorage.setItem(SCRAPER_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error deleting scrape from history', e);
    return [];
  }
};

export const clearAllScrapeHistory = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(SCRAPER_HISTORY_KEY);
    localStorage.removeItem(SCRAPER_CURRENT_SESSION_KEY);
  } catch (e) {
    console.error('Error clearing history', e);
  }
};

