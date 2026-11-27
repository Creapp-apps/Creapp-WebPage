// Registro único de servicios de CreAPP. Fuente de la taxonomía: alimenta la
// navbar con dropdowns, las rutas de react-router y la plantilla ServicePage.
// TS puro (sin JSX): testeable con node:test. El copy (eyebrow/lead/
// deliverables/includes) se completa en la Task 2, grounded en el PDF
// institucional + client_profile.json. graphicKey mapea a un componente en la
// capa de vista (ServicePage), no se importa acá.

export type ServiceGroup = 'desarrollo' | 'seguridad' | 'marketing';

export interface Service {
    group: ServiceGroup;
    slug: string;
    title: string;
    eyebrow: string;
    lead: string;
    deliverables: string[];
    includes: { t: string; d: string }[];
    graphicKey: string;
    interactive: boolean;
    illustrative?: boolean;
}

export const GROUP_LABELS: Record<ServiceGroup, string> = {
    desarrollo: 'Desarrollo',
    seguridad: 'Seguridad',
    marketing: 'Marketing & Contenidos',
};

// Orden del menú = orden de este array. Copy grounded en el PDF institucional
// aprobado (vía AREAS de content.ts) + client_profile.json. Sin proveedores LLM
// ni precios. Seguridad redactada en capacidad.
export const SERVICES: Service[] = [
    {
        group: 'desarrollo', slug: 'software', title: 'Software', graphicKey: 'software', interactive: false,
        eyebrow: 'Apps, plataformas y sistemas a medida',
        lead: 'Convertimos un proceso manual en un producto propio. Apps, plataformas y sistemas a medida, construidos para escalar y pensados para tus usuarios — no un Excel estirado hasta que se rompe.',
        deliverables: ['Código propio y documentado', 'Deploy & CI/CD', 'Documentación técnica', 'Soporte post-lanzamiento'],
        includes: [
            { t: 'Apps nativas iOS / Android', d: 'Producto móvil de calidad, con la experiencia que tus usuarios esperan en cada plataforma.' },
            { t: 'Plataformas web escalables', d: 'React + TypeScript y arquitectura que aguanta el crecimiento, no solo la demo.' },
            { t: 'Software a medida', d: 'Tu operación en un sistema propio, diseñado alrededor de cómo trabajás realmente.' },
            { t: 'Automatización de procesos', d: 'Integramos lo que hoy no se habla y automatizamos las tareas repetitivas.' },
        ],
    },
    {
        group: 'desarrollo', slug: 'ia', title: 'IA & Machine Learning', graphicKey: 'ia', interactive: true,
        eyebrow: 'IA donde suma, no humo',
        lead: 'Inteligencia artificial donde suma de verdad, no humo. Agentes, automatización y modelos integrados a tu operación desde el día uno, con una postura honesta sobre qué hace y qué no.',
        deliverables: ['IA integrada a tu producto', 'Flujos versionados', 'Evaluación honesta de alcance', 'Monitoreo de resultados'],
        includes: [
            { t: 'Agentes IA & chatbots', d: 'Atención y tareas automatizadas que responden en tu tono.' },
            { t: 'Automatización inteligente', d: 'Documentos, respuestas y flujos de trabajo que se resuelven solos.' },
            { t: 'Modelos predictivos', d: 'Decisiones basadas en los datos de tu negocio, no en intuición.' },
            { t: 'Procesamiento de lenguaje', d: 'Entender y generar texto a escala: clasificación, extracción y generación.' },
        ],
    },
    {
        group: 'desarrollo', slug: 'apis-escala', title: 'APIs & Escala', graphicKey: 'scale', interactive: false,
        eyebrow: 'APIs REST, integraciones y escalado',
        lead: 'Diseñamos y desarrollamos las APIs REST que hacen que tus sistemas se hablen, y la infraestructura para que crecer no te rompa. Integraciones, arquitectura escalable y despliegues automáticos para operar a escala corporativa.',
        deliverables: ['API REST documentada (OpenAPI)', 'Integraciones entre sistemas', 'Pipeline CI/CD', 'Monitoreo & SLA de soporte'],
        includes: [
            { t: 'Diseño & desarrollo de APIs REST', d: 'Endpoints versionados y documentados, pensados para que otros equipos integren sin fricción.' },
            { t: 'Integraciones corporativas', d: 'Conectamos pagos, CRM, mensajería y los sistemas que hoy no se hablan en un solo flujo.' },
            { t: 'Arquitectura escalable', d: 'Pensada para el crecimiento real, no solo para pasar la demo.' },
            { t: 'CI/CD & observabilidad', d: 'Despliegues automáticos y monitoreo para saber qué pasa en producción antes de que sea un problema.' },
        ],
    },
    {
        group: 'seguridad', slug: 'pentesting', title: 'Pentesting', graphicKey: 'scan', interactive: true, illustrative: true,
        eyebrow: 'Encontrar las puertas abiertas antes que otro',
        lead: 'Evaluamos tus sistemas, aplicaciones e infraestructura para encontrar y priorizar los puntos débiles antes de que los encuentre un atacante. Un informe claro, ordenado por severidad, con un plan concreto de qué resolver primero.',
        deliverables: ['Informe priorizado por severidad', 'Prueba de concepto de cada hallazgo', 'Plan de remediación', 'Re-test de verificación'],
        includes: [
            { t: 'Análisis de vulnerabilidades', d: 'Identificamos y priorizamos los puntos débiles de tus sistemas, apps e infraestructura.' },
            { t: 'Pruebas sobre apps web', d: 'Revisamos tu plataforma buscando las fallas que realmente se explotan.' },
            { t: 'Informe accionable', d: 'Qué arreglar, en qué orden y por qué — sin tecnicismos vacíos.' },
            { t: 'Re-test al cerrar', d: 'Verificamos que cada hallazgo quedó efectivamente resuelto.' },
        ],
    },
    {
        group: 'seguridad', slug: 'soc', title: 'Análisis SOC', graphicKey: 'soc', interactive: false, illustrative: true,
        eyebrow: 'Visibilidad continua de lo que pasa',
        lead: 'Reportes de seguridad para tener visibilidad continua de lo que ocurre en tu entorno: qué eventos importan, qué tendencias aparecen y qué conviene atender. Para que la seguridad deje de ser una foto y pase a ser una película.',
        deliverables: ['Reporte de eventos priorizado', 'Tablero de indicadores', 'Recomendaciones accionables', 'Revisión periódica'],
        includes: [
            { t: 'Monitoreo de eventos', d: 'Seguimiento de la actividad relevante de tu entorno, resumida en lo que importa.' },
            { t: 'Indicadores de seguridad', d: 'Métricas claras de postura y tendencia, sin ruido.' },
            { t: 'Alertas priorizadas', d: 'Separamos lo urgente de lo que puede esperar.' },
            { t: 'Informe periódico', d: 'Un reporte legible para decidir, no un volcado de registros.' },
        ],
    },
    {
        group: 'seguridad', slug: 'auditorias', title: 'Auditorías', graphicKey: 'audit', interactive: false, illustrative: true,
        eyebrow: 'La foto honesta de tu postura',
        lead: 'Evaluamos la postura de seguridad de tus aplicaciones, tu infraestructura y tus procesos contra buenas prácticas, y te damos un diagnóstico claro con prioridades. Primero entender el riesgo; después, un plan para bajarlo.',
        deliverables: ['Diagnóstico de postura', 'Hallazgos priorizados por severidad', 'Plan de remediación', 'Re-test de verificación'],
        includes: [
            { t: 'Auditoría de aplicaciones', d: 'Revisión de la seguridad de tu software y sus integraciones.' },
            { t: 'Auditoría de infraestructura', d: 'Configuraciones, accesos y exposición de tus servidores y servicios.' },
            { t: 'Revisión de procesos', d: 'Cómo maneja tu equipo accesos, datos y respuestas a incidentes.' },
            { t: 'Plan de remediación', d: 'Qué arreglar, en qué orden y por qué, con verificación al cerrar.' },
        ],
    },
    {
        group: 'marketing', slug: 'community', title: 'Community Management', graphicKey: 'marketing', interactive: false,
        eyebrow: 'Tu producto, presente y constante',
        lead: 'La ingeniería también se comunica. Estrategia, producción y gestión de redes para que tu producto se vea tanto como funciona: contenido de calidad de agencia, calendario y publicación, con un plan detrás y no publicaciones sueltas.',
        deliverables: ['Plan de contenido', 'Piezas listas para publicar', 'Calendario & publicación', 'Reporte mensual'],
        includes: [
            { t: 'Estrategia de contenido', d: 'Qué decir, a quién y cada cuánto. Un plan, no publicaciones sueltas.' },
            { t: 'Producción audiovisual', d: 'Reels, carruseles e historias con calidad de agencia, listos para publicar.' },
            { t: 'Gestión de redes', d: 'Calendario, publicación y un portal de seguimiento para el cliente.' },
            { t: 'Comunidad', d: 'Respuesta y conversación con tu audiencia, en tu tono.' },
        ],
    },
    {
        group: 'marketing', slug: 'publicidad', title: 'Publicidad & Campañas', graphicKey: 'ads', interactive: false,
        eyebrow: 'Pauta que trae clientes, no likes',
        lead: 'Paid media para que el producto llegue a quien lo necesita: armado, segmentación y optimización de campañas en buscadores y redes, medidas por resultados y no por vanidad.',
        deliverables: ['Plan de campaña', 'Segmentación de audiencias', 'Optimización continua', 'Reporte de resultados'],
        includes: [
            { t: 'Campañas de búsqueda', d: 'Aparecer justo cuando alguien busca lo que ofrecés.' },
            { t: 'Campañas en redes', d: 'Pauta segmentada donde está tu audiencia.' },
            { t: 'Segmentación & optimización', d: 'Ajuste continuo por rendimiento real, no por corazonada.' },
            { t: 'Medición', d: 'Reportes claros de qué funcionó y qué no.' },
        ],
    },
];

export function servicePath(s: Pick<Service, 'group' | 'slug'>): string {
    return `/${s.group}/${s.slug}`;
}

export function getService(group: string, slug: string): Service | undefined {
    return SERVICES.find((s) => s.group === group && s.slug === slug);
}

export function servicesByGroup(): Record<ServiceGroup, Service[]> {
    const out: Record<ServiceGroup, Service[]> = { desarrollo: [], seguridad: [], marketing: [] };
    for (const s of SERVICES) out[s.group].push(s);
    return out;
}
