
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

export const generateProjectAdvice = async (userPrompt: string) => {
  if (!API_KEY) return "AI services are currently unavailable.";
  
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        systemInstruction: "You are a professional Fintech consultant at Creapp. Help the user brainstorm or define their fintech project. Be concise, professional, and innovative.",
        temperature: 0.7,
      }
    });
    return response.text || "I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Something went wrong with the AI service.";
  }
};

export const importProposalFromDocument = async (base64Data: string, mimeType: string, isTextOnly: boolean = false) => {
  if (!API_KEY) throw new Error("Servicio de IA no disponible temporalmente (falta la API key).");

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const systemInstruction = `
Eres un asistente de inteligencia artificial especializado en consultoría Fintech e integración de datos.
Tu tarea es leer y analizar el documento adjunto (puede ser un PDF de requerimientos, una propuesta preliminar, un pliego de condiciones o un resumen de proyecto) y extraer toda la información para rellenar los inputs del generador de presupuestos de Creapp.

Debes mapear la información extraída exactamente al esquema JSON proporcionado. Si alguna información no está explícitamente en el documento, puedes inferirla de manera inteligente para que la propuesta se vea completa e innovadora (por ejemplo, sugiriendo colores de marca Fintech adecuados o iconos de Lucide correspondientes).
  `;

  const userPrompt = `
Analiza este documento y extrae toda la información estructurada que se solicita a continuación.
Debes devolver ÚNICAMENTE un objeto JSON que cumpla exactamente con el siguiente esquema y tipos:

{
  "client_name": "Nombre de la empresa cliente (string)",
  "hero_title": "Título del proyecto comercial (string)",
  "hero_badge": "Insignia superior para el banner, ej. 'FINTECH INNOVATION' (string)",
  "description": "Descripción general atractiva de la propuesta (string)",
  "total_value": "Valor total estimado del proyecto con el prefijo USD, ej. 'USD 18500' (string)",
  "brand_color_primary": "Color hex primario sugerido para el branding Fintech del cliente, ej. '#ff007f' (string)",
  "brand_color_secondary": "Color hex secundario sugerido, ej. '#9d00ff' (string)",
  "inclusions": [
    {
      "title": "Título del entregable o inclusión (string)",
      "description": "Detalle técnico corto (string)",
      "tooltip": "Nota de ayuda o alcance específico (string)",
      "icon_name": "Nombre de un icono de Lucide apropiado, ej: 'LayoutDashboard', 'ShieldCheck', 'Database', 'Mobile', 'Code', 'TrendingUp', 'Terminal', 'Cloud' (string)"
    }
  ],
  "exclusions": [
    {
      "title": "Título de lo excluido (string)",
      "tooltip": "Motivo o aclaración del límite de exclusión (string)"
    }
  ],
  "milestones": [
    {
      "week_range": "Rango de semanas, ej. '1-4', '5-8', '9-12' (string)",
      "title": "Título de la fase del cronograma (string)",
      "icon_name": "Nombre de un icono de Lucide, ej. 'LayoutDashboard', 'Clock', 'ShieldCheck' (string)",
      "price": "Precio asignado a este hito sin el prefijo USD, ej. '550' (string)",
      "description": "Detalle de qué se entrega en esta fase (string)",
      "control_milestone": "El nombre del hito de control de pago, ej. 'ONBOARDING COMPLETO' (string)"
    }
  ],
  "payments": [
    {
      "percentage": "Porcentaje de pago, ej: '30%', '40%' (string)",
      "label": "Nombre del pago, ej: 'Kickoff inicial', 'Entrega Final' (string)",
      "description": "Descripción de la condición de facturación (string)",
      "tooltip": "Nota flotante aclaratoria del pago (string)"
    }
  ],
  "infrastructure_costs": [
    {
      "title": "Nombre del servicio de infraestructura, ej. 'Servidor Supabase Pro' (string)",
      "provider": "Proveedor, ej: 'Supabase', 'Vercel', 'AWS' (string)",
      "monthly_cost": "Costo estimado mensual sin símbolo de dólar ni decimales, ej. '25' o '0' (string)",
      "description": "Qué cubre este costo (string)",
      "is_optional": "Si es opcional o requerido para el cliente (boolean)"
    }
  ],
  "weekly_breakdown": [
    {
      "id": "Identificador único, ej. 'W01', 'W02' (string)",
      "type": "Tipo de fila, debe ser 'week' o 'milestone' (string)",
      "title": "Título de la semana o hito, ej: 'DISEÑO UX/UI' (string)",
      "detail": "Detalle técnico de las tareas a realizar en esa semana (string)",
      "hours": "Horas estimadas para esa semana, ej: '15.0' o '0.0' si es un hito de entrega (string)"
    }
  ],
  "methodology": {
    "incremental_title": "Título del bloque de desarrollo incremental (string)",
    "incremental_text": "Texto explicativo del desarrollo incremental (string). Nota: puedes usar '{client_name}' en el texto para referirte al cliente de forma dinámica.",
    "planning_title": "Título del bloque de planificación (string)",
    "planning_text": "Texto explicativo del bloque de planificación (string). Nota: puedes usar '{client_name}' en el texto.",
    "schedule_monday_title": "Título para el Lunes, ej. 'LUN' (string)",
    "schedule_monday_subtitle": "Subtítulo para el Lunes, ej. 'Sprint Kickoff (15 min)' (string)",
    "schedule_monday_text": "Texto explicativo para las tareas del Lunes (string)",
    "schedule_tuesday_title": "Título para Martes-Jueves, ej. 'MAR - JUE' (string)",
    "schedule_tuesday_subtitle": "Subtítulo para Martes-Jueves, ej. 'Desarrollo & Staging' (string)",
    "schedule_tuesday_text": "Texto explicativo para Martes-Jueves (string)",
    "schedule_friday_title": "Título para el Viernes, ej. 'VIE' (string)",
    "schedule_friday_subtitle": "Subtítulo para el Viernes, ej. 'Demo Semanal & Aprobación' (string)",
    "schedule_friday_text": "Texto explicativo para el Viernes (string)"
  }
}
  `;

  try {
    let contents: any[] = [];
    if (isTextOnly) {
      contents = [userPrompt + "\n\nCONTENIDO DEL DOCUMENTO:\n" + base64Data];
    } else {
      contents = [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        userPrompt
      ];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No se recibió respuesta del modelo de IA.");
    }

    return JSON.parse(text);
  } catch (error) {
    console.error("Error al importar la propuesta con Gemini:", error);
    throw error;
  }
};

