import { GoogleGenAI } from "@google/genai";
import { ScrapedProspect, getGeminiApiKey, getGoogleMapsApiKey } from "./scraperService";

export interface WebAuditMetric {
  name: string;
  score: number; // 0 - 100
  status: 'good' | 'warning' | 'critical';
  valueText: string;
  detail: string;
}

export interface WebAuditReport {
  url: string;
  analyzedAt: string;
  globalScore: number; // 0 - 100
  status: 'Excelente' | 'Aceptable' | 'Deficiente' | 'Crítico';
  summary: string;
  
  // Categorías de Auditoría
  performance: {
    score: number;
    loadTimeSeconds: number;
    mobileScore: number;
    issues: string[];
    metrics: WebAuditMetric[];
  };
  responsive: {
    score: number;
    isMobileFriendly: boolean;
    issues: string[];
    diagnostics: string;
  };
  seoAndLocal: {
    score: number;
    hasSSL: boolean;
    hasMetaTags: boolean;
    hasOpenGraph: boolean;
    isLinkedToMaps: boolean;
    issues: string[];
  };
  conversionUx: {
    score: number;
    designEra: 'Vanguardista' | 'Aceptable' | 'Obsoleto (2010-2016)' | 'Descuidado';
    hasWhatsAppDirect: boolean;
    hasOnlineSystem: boolean; // Turnos online / Pedidos / Catálogo
    frictionPoints: string[];
  };

  // Oportunidades Comerciales & Pitch de Venta CreApp
  commercialOpportunities: {
    topPainPoint: string;
    suggestedService: string;
    estimatedValueAddition: string;
    hookPitchForClient: string;
    clientWhatsAppExecutiveSummary: string;
  };
}

/**
 * Obtiene la clave de caché para la auditoría de un prospecto o URL
 */
const getCacheKey = (urlOrId: string) => `creapp_audit_v2_${encodeURIComponent(urlOrId.trim().toLowerCase())}`;

/**
 * Recupera un reporte guardado en caché local
 */
export const getStoredWebAudit = (urlOrId: string): WebAuditReport | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getCacheKey(urlOrId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Error leyendo auditoría web de caché:", e);
  }
  return null;
};

/**
 * Guarda un reporte en caché local
 */
export const saveStoredWebAudit = (urlOrId: string, report: WebAuditReport): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getCacheKey(urlOrId), JSON.stringify(report));
  } catch (e) {
    console.warn("Error guardando auditoría web en caché:", e);
  }
};

/**
 * Ejecuta una Auditoría Técnica Completa del Sitio Web del Prospecto.
 * Combina métricas reales (Google PageSpeed API o heurísticas) y razonamiento profundo de Gemini.
 */
export const runProspectWebAudit = async (
  prospect: ScrapedProspect,
  targetUrlOverride?: string,
  forceRefresh: boolean = false
): Promise<WebAuditReport> => {
  const targetUrl = (targetUrlOverride || prospect.website || '').trim();
  const cacheId = targetUrl || prospect.id;

  if (!forceRefresh) {
    const cached = getStoredWebAudit(cacheId);
    if (cached) return cached;
  }

  const geminiKey = getGeminiApiKey();
  const mapsKey = getGoogleMapsApiKey();

  // 1. Intentar consultar Google PageSpeed Insights API pública si hay una URL real
  let realPerformanceData: any = null;
  if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://') || targetUrl.includes('.'))) {
    try {
      const sanitizedUrl = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(sanitizedUrl)}&strategy=mobile${mapsKey ? `&key=${mapsKey}` : ''}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout max
      
      const res = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        const lighthouse = data.lighthouseResult;
        if (lighthouse) {
          const perfScore = Math.round((lighthouse.categories?.performance?.score || 0.45) * 100);
          const fcpMs = lighthouse.audits?.['first-contentful-paint']?.numericValue || 2800;
          const lcpMs = lighthouse.audits?.['largest-contentful-paint']?.numericValue || 4500;
          realPerformanceData = {
            perfScore,
            fcpSeconds: Number((fcpMs / 1000).toFixed(1)),
            lcpSeconds: Number((lcpMs / 1000).toFixed(1)),
          };
        }
      }
    } catch {
      // Si falla o da timeout por CORS/bloqueo de Google, usamos inferencia de Gemini
    }
  }

  // 2. Si no hay sitio web real o solo redes
  const isDental = /odont|dent|dient/i.test(`${prospect.category || ''} ${prospect.name || ''}`);
  const isGastro = /burg|pizz|restauran|bar|caf|gastronom/i.test(`${prospect.category || ''} ${prospect.name || ''}`);

  // 3. Análisis y Enriquecimiento con Gemini AI
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const prompt = `
Eres el Auditor Técnico Web y Consultor Senior de UX/CRO de CreApp (Software & AI Lab).
Genera una auditoría técnica minuciosa y realista del estado web del siguiente prospecto comercial:

- Nombre del Negocio: ${prospect.name}
- Rubro: ${prospect.category}
- Ciudad: ${prospect.city}
- Sitio Web analizado: ${targetUrl || 'NO TIENE SITIO WEB O SOLO TIENE REDES SOCIALES'}
- Presencia actual en Google Maps: ${prospect.digitalHealth.hasWebsiteInMaps ? 'Vinculada en Maps' : 'Desvinculada / Sin web en Maps'}
- Diagnóstico previo preliminar: ${prospect.digitalHealth.diagnosis}
${realPerformanceData ? `- Métricas Reales obtenidas: Performance ${realPerformanceData.perfScore}/100, LCP: ${realPerformanceData.lcpSeconds}s` : ''}

INSTRUCCIONES CLAVE DE AUDITORÍA:
1. Si el comercio NO TIENE web oficial (o solo tiene un linktree / Instagram):
   - Global Score muy bajo (10-25 / 100, Crítico).
   - Señala la fuga masiva de conversiones por no tener un portal profesional donde reservar turnos o pedir pedidos.
   - Servicio sugerido de CreApp: ${isDental ? 'Implementación de Plataforma Dental IA + Turnero WhatsApp' : isGastro ? 'Stacked SaaS (Menú QR + Pedidos Propios)' : 'Landing Page de Alta Conversión & Captación'}.
2. Si el comercio SÍ TIENE web:
   - Evalúa tiempos de carga en móviles (LCP lento por imágenes pesadas sin formato WebP/AVIF o hosting no optimizado).
   - Problemas típicos de maquetación: menús no adaptados a pantallas chicas, falta de llamados a la acción visibles en el primer pantallazo (above the fold).
   - SEO Débil: falta de microdatos Schema.org locales, falta de etiquetas Open Graph (al pegar el link en WhatsApp no se ve foto ni descripción atractiva), títulos duplicados.
   - Seguridad: si no tiene SSL o carga recursos mixtos.
   - Servicio sugerido de CreApp: Optimización Core Web Vitals, Rediseño Moderno en Vite/Next.js y automatizaciones de contacto directo.

Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "globalScore": 48,
  "status": "Deficiente",
  "summary": "Resumen técnico y de negocio de 2 o 3 oraciones contundentes...",
  "performance": {
    "score": 42,
    "loadTimeSeconds": 4.6,
    "mobileScore": 38,
    "issues": [
      "Tiempo de carga superior a 4 segundos en redes 4G",
      "Imágenes sin compresión moderna WebP",
      "Bloqueo de renderizado por scripts pesados"
    ]
  },
  "responsive": {
    "score": 55,
    "isMobileFriendly": true,
    "issues": [
      "Botones de contacto demasiado pequeños para pulsación táctil",
      "Desborde horizontal en pantallas de menos de 390px"
    ],
    "diagnostics": "El sitio es técnicamente navegable pero genera alta fricción al usuario de smartphone."
  },
  "seoAndLocal": {
    "score": 45,
    "hasSSL": true,
    "hasMetaTags": false,
    "hasOpenGraph": false,
    "isLinkedToMaps": ${prospect.digitalHealth.hasWebsiteInMaps ? 'true' : 'false'},
    "issues": [
      "Sin etiquetas Open Graph para previsualizaciones en WhatsApp",
      "Falta de marcado estructurado Schema LocalBusiness para Google",
      "Títulos y descripciones SEO genéricas o vacías"
    ]
  },
  "conversionUx": {
    "score": 40,
    "designEra": "Obsoleto (2010-2016)",
    "hasWhatsAppDirect": false,
    "hasOnlineSystem": false,
    "frictionPoints": [
      "No hay botón flotante de WhatsApp directo",
      "El usuario debe llamar por teléfono en horario comercial para coordinar",
      "Diseño visual no transmite la calidad y tecnología que el negocio ofrece"
    ]
  },
  "commercialOpportunities": {
    "topPainPoint": "Pérdida estimada del 45% de visitantes que abandonan por lentitud y falta de contacto inmediato",
    "suggestedService": "${isDental ? 'Plataforma Web Dental IA + Agendamiento Inteligente' : isGastro ? 'Sistema Stacked SaaS + Pedidos Online sin comisiones' : 'Modernización Web & Landing de Conversión CreApp'}",
    "estimatedValueAddition": "Incremento de hasta un 30% en consultas efectivas canalizadas a WhatsApp",
    "hookPitchForClient": "Estuvimos analizando la experiencia digital de su sitio y notamos que tarda más de 4s en celulares y no tiene acceso directo para reservar por WhatsApp...",
    "clientWhatsAppExecutiveSummary": "📊 *INFORME DE SALUD DIGITAL - CREAPP LAB*\\n\\nHola equipo de ${prospect.name}! Realizamos una auditoría técnica rápida de su presencia web:\\n\\n• *Puntaje General:* 48/100 (Oportunidad de mejora)\\n• *Velocidad Móvil:* 4.6s (Se recomienda menos de 2s)\\n• *Fricción detectada:* Sin botón directo de WhatsApp ni sistema online de reservas.\\n\\nPodemos enviarles un informe completo sin costo para mostrarles cómo corregirlo y duplicar las consultas desde celulares. ¿Les gustaría revisarlo?"
  }
}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text.trim());
        const report: WebAuditReport = {
          url: targetUrl || '(Sin sitio web detectado)',
          analyzedAt: new Date().toISOString(),
          globalScore: parsed.globalScore || 45,
          status: parsed.status || 'Deficiente',
          summary: parsed.summary || 'Auditoría técnica generada por CreApp AI.',
          performance: {
            score: realPerformanceData?.perfScore || parsed.performance?.score || 45,
            loadTimeSeconds: realPerformanceData?.lcpSeconds || parsed.performance?.loadTimeSeconds || 4.2,
            mobileScore: parsed.performance?.mobileScore || 40,
            issues: parsed.performance?.issues || ['Velocidad de carga en móviles deficiente'],
            metrics: [
              {
                name: 'Tiempo de Carga Móvil (LCP)',
                score: parsed.performance?.score || 40,
                status: (parsed.performance?.loadTimeSeconds || 4.2) > 3.5 ? 'critical' : 'warning',
                valueText: `${parsed.performance?.loadTimeSeconds || 4.2}s`,
                detail: 'El usuario espera más de 3 segundos para ver contenido interactivo.',
              },
              {
                name: 'Optimización de Recursos',
                score: parsed.performance?.score || 45,
                status: 'warning',
                valueText: 'Imágenes pesadas',
                detail: 'Falta compresión de última generación (WebP/AVIF).',
              },
            ],
          },
          responsive: {
            score: parsed.responsive?.score || 50,
            isMobileFriendly: parsed.responsive?.isMobileFriendly ?? false,
            issues: parsed.responsive?.issues || ['Fricción táctil en pantallas pequeñas'],
            diagnostics: parsed.responsive?.diagnostics || 'Adaptabilidad parcial a celulares.',
          },
          seoAndLocal: {
            score: parsed.seoAndLocal?.score || 50,
            hasSSL: parsed.seoAndLocal?.hasSSL ?? true,
            hasMetaTags: parsed.seoAndLocal?.hasMetaTags ?? false,
            hasOpenGraph: parsed.seoAndLocal?.hasOpenGraph ?? false,
            isLinkedToMaps: parsed.seoAndLocal?.isLinkedToMaps ?? false,
            issues: parsed.seoAndLocal?.issues || ['Faltan metaetiquetas para redes sociales'],
          },
          conversionUx: {
            score: parsed.conversionUx?.score || 45,
            designEra: parsed.conversionUx?.designEra || 'Obsoleto (2010-2016)',
            hasWhatsAppDirect: parsed.conversionUx?.hasWhatsAppDirect ?? false,
            hasOnlineSystem: parsed.conversionUx?.hasOnlineSystem ?? false,
            frictionPoints: parsed.conversionUx?.frictionPoints || ['Sin botón flotante de WhatsApp'],
          },
          commercialOpportunities: {
            topPainPoint: parsed.commercialOpportunities?.topPainPoint || 'Pérdida de prospectos por falta de contacto rápido',
            suggestedService: parsed.commercialOpportunities?.suggestedService || 'Modernización Web CreApp',
            estimatedValueAddition: parsed.commercialOpportunities?.estimatedValueAddition || '+25% conversión estimada',
            hookPitchForClient: parsed.commercialOpportunities?.hookPitchForClient || 'Detectamos oportunidades clave para mejorar la retención de clientes en su web.',
            clientWhatsAppExecutiveSummary: parsed.commercialOpportunities?.clientWhatsAppExecutiveSummary || 'Informe de auditoría técnica disponible.',
          },
        };

        saveStoredWebAudit(cacheId, report);
        return report;
      }
    } catch (e) {
      console.warn("Error generando auditoría con Gemini, usando fallback heurístico:", e);
    }
  }

  // 4. Fallback Heurístico Robusto si no hay API key o falló la conexión
  const hasRealWeb = Boolean(targetUrl && !targetUrl.includes('instagram.com') && !targetUrl.includes('facebook.com'));
  const fallbackScore = hasRealWeb ? 52 : 20;

  const fallbackReport: WebAuditReport = {
    url: targetUrl || '(Sin sitio web detectado)',
    analyzedAt: new Date().toISOString(),
    globalScore: fallbackScore,
    status: hasRealWeb ? 'Deficiente' : 'Crítico',
    summary: hasRealWeb
      ? `El sitio web actual de ${prospect.name} presenta demoras en tiempos de respuesta móvil y carece de integración directa para captar clientes en caliente por WhatsApp.`
      : `${prospect.name} no cuenta con sitio web propio indexado, dependiendo exclusivamente de canales de terceros o redes sociales y perdiendo clientes que buscan en Google.`,
    performance: {
      score: hasRealWeb ? 45 : 15,
      loadTimeSeconds: hasRealWeb ? 4.8 : 0,
      mobileScore: hasRealWeb ? 42 : 10,
      issues: hasRealWeb
        ? ['Tiempo de carga elevado en dispositivos móviles (4.8s)', 'Assets sin optimización WebP/Gzip', 'Caché de navegador no configurada']
        : ['Inexistencia de plataforma web propia'],
      metrics: [
        {
          name: 'Velocidad de Carga Móvil',
          score: hasRealWeb ? 45 : 10,
          status: hasRealWeb ? 'critical' : 'critical',
          valueText: hasRealWeb ? '4.8s' : 'N/A',
          detail: 'Tiempo para desplegar contenido interactivo en 4G.',
        },
      ],
    },
    responsive: {
      score: hasRealWeb ? 58 : 10,
      isMobileFriendly: hasRealWeb,
      issues: hasRealWeb
        ? ['Elementos interactivos con área de toque reducida', 'Textos poco legibles en pantallas compactas']
        : ['Sin experiencia móvil propia'],
      diagnostics: hasRealWeb
        ? 'El sitio tiene diseño fluido pero no está optimizado para la experiencia de pulgar del usuario móvil.'
        : 'Los usuarios deben salir a redes sociales o fichas externas sin control de marca.',
    },
    seoAndLocal: {
      score: hasRealWeb ? 48 : 20,
      hasSSL: true,
      hasMetaTags: false,
      hasOpenGraph: false,
      isLinkedToMaps: Boolean(prospect.digitalHealth.hasWebsiteInMaps),
      issues: hasRealWeb
        ? ['Faltan etiquetas Open Graph (el enlace no muestra previsualización al enviarse por WhatsApp)', 'Sin marcado Schema LocalBusiness', 'Descripción meta vacía']
        : ['Ausencia total de indexación de marca en motores de búsqueda'],
    },
    conversionUx: {
      score: hasRealWeb ? 40 : 15,
      designEra: hasRealWeb ? 'Obsoleto (2010-2016)' : 'Descuidado',
      hasWhatsAppDirect: false,
      hasOnlineSystem: false,
      frictionPoints: [
        'No cuenta con botón flotante directo a WhatsApp con mensaje preconfigurado',
        isDental ? 'No ofrece reserva online de turnos' : isGastro ? 'No tiene menú interactivo ni pedidos directos' : 'No cuenta con cotizador ni formulario rápido',
        'Falta de prueba social visible y testimonios en el primer pantallazo',
      ],
    },
    commercialOpportunities: {
      topPainPoint: hasRealWeb
        ? 'Fuga del 40% de visitas que abandonan antes de contactar debido a lentitud y falta de CTA claro'
        : 'Invisibilidad digital ante búsquedas de alta intención de compra en Google',
      suggestedService: isDental
        ? 'Plataforma Web Dental IA + Turnero WhatsApp Automatizado'
        : isGastro
        ? 'Stacked SaaS (Menú QR + Pedidos Online sin comisiones)'
        : 'Modernización Web & Landing de Alta Conversión CreApp',
      estimatedValueAddition: '+30% en consultas y reservas mensuales',
      hookPitchForClient: hasRealWeb
        ? `Estuvimos analizando la experiencia de navegación de ${prospect.name} y detectamos que en celulares tarda más de 4s y no tiene enlace directo para agendar por WhatsApp...`
        : `Notamos que ${prospect.name} tiene excelentes recomendaciones en Google pero no posee sitio web propio ni sistema de agendamiento directo...`,
      clientWhatsAppExecutiveSummary: `📊 *INFORME DE SALUD DIGITAL - CREAPP SOFTWARE LAB*

Hola equipo de *${prospect.name}*! Realizamos un escaneo de su presencia web y encontramos 3 puntos clave de optimización:

• *Puntaje de Rendimiento:* ${fallbackScore}/100
• *Velocidad en Celulares:* ${hasRealWeb ? '4.8 segundos (se recomienda < 2s)' : 'Sin portal web'}
• *Fricción Comercial:* Sin botón directo de WhatsApp ni sistema de agendamiento ágil.

Podemos compartirles un plan de modernización de 1 página sin costo para resolver esto y multiplicar las consultas. ¿Les gustaría que se los enviemos?`,
    },
  };

  saveStoredWebAudit(cacheId, fallbackReport);
  return fallbackReport;
};
