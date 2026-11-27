// Copy del sitio. Fuente: PDF institucional aprobado (CreAPP-IT-Solutions-Servicios-2026)
// + spec docs/2026-11-25-rediseno-web-design-spec.md. No inventar: si falta algo, se pregunta.

export interface Area {
    n: string;
    id: string;
    short: string;
    title: string;
    lead: string;
    subs: { t: string; d: string }[];
    deliverables: string[];
    closing: string;
    isNew?: boolean;
}

export const AREAS: Area[] = [
    {
        n: '01',
        id: 'area-software',
        short: 'Software',
        title: 'Desarrollo de Software',
        lead: 'Convertimos un proceso manual en un producto propio. Apps, plataformas y sistemas a medida, construidos para escalar y pensados para tus usuarios — no un Excel estirado hasta que se rompe.',
        subs: [
            { t: 'Apps nativas iOS / Android', d: 'Producto móvil de calidad, con la experiencia que tus usuarios esperan en cada plataforma.' },
            { t: 'Plataformas web escalables', d: 'React + TypeScript y arquitectura que aguanta el crecimiento, no solo la demo.' },
            { t: 'Software a medida', d: 'Tu operación en un sistema propio, diseñado alrededor de cómo trabajás realmente.' },
            { t: 'APIs & automatización', d: 'Integramos los sistemas que hoy no se hablan y automatizamos las tareas repetitivas.' },
        ],
        deliverables: ['Código propio y documentado', 'Deploy & CI/CD', 'Documentación técnica', 'Soporte post-lanzamiento'],
        closing: 'Un producto propio, no un parche sobre el problema.',
    },
    {
        n: '02',
        id: 'area-ia',
        short: 'IA',
        title: 'IA & Machine Learning',
        lead: 'Inteligencia artificial donde suma de verdad, no humo. Agentes, automatización y modelos integrados a tu operación desde el día uno, con una postura honesta sobre qué hace y qué no.',
        subs: [
            { t: 'Agentes IA & chatbots', d: 'Atención y tareas automatizadas.' },
            { t: 'Automatización inteligente', d: 'Documentos, respuestas y flujos de trabajo que se resuelven solos.' },
            { t: 'Modelos predictivos', d: 'Decisiones basadas en datos de tu negocio, no en intuición.' },
            { t: 'Procesamiento de lenguaje', d: 'Entender y generar texto a escala: clasificación, extracción y generación.' },
        ],
        deliverables: ['IA integrada a tu producto', 'Flujos versionados', 'Evaluación honesta de alcance', 'Monitoreo de resultados'],
        closing: 'IA que resuelve tu trabajo, en serio.',
    },
    {
        n: '03',
        id: 'area-diseno',
        short: 'UX/UI',
        title: 'UX/UI & Diseño de Producto',
        lead: 'Discovery antes del código. Diseñamos productos que se entienden sin manual: investigamos el problema, validamos la solución y la llevamos a una interfaz premium y consistente.',
        subs: [
            { t: 'Investigación & discovery', d: 'Entender a fondo el problema y a los usuarios antes de construir.' },
            { t: 'Prototipos validados', d: 'Probamos la idea con un prototipo navegable antes de invertir en desarrollo.' },
            { t: 'Diseño de interfaz', d: 'UI premium, consistente y accesible, alineada a tu marca.' },
            { t: 'Design systems', d: 'Componentes reutilizables que escalan junto al producto.' },
        ],
        deliverables: ['Research & insights', 'Prototipo navegable', 'Design system', 'Handoff a desarrollo'],
        closing: 'Si necesita manual, lo rediseñamos.',
    },
    {
        n: '04',
        id: 'area-escala',
        short: 'Escala',
        title: 'Integración & Escala',
        lead: 'Sistemas que se hablan e infraestructura que aguanta, para que crecer no te rompa. Arquitectura, despliegues automáticos, monitoreo e integraciones entre todas tus herramientas.',
        subs: [
            { t: 'Arquitectura escalable', d: 'Pensada para el crecimiento real, no solo para pasar la demo.' },
            { t: 'CI/CD', d: 'Despliegues automáticos y repetibles, sin manualidades frágiles.' },
            { t: 'Monitoreo & observabilidad', d: 'Saber qué pasa en producción antes de que sea un problema.' },
            { t: 'Integraciones', d: 'Conectar pagos, CRM, mensajería y datos en un solo flujo.' },
        ],
        deliverables: ['Pipeline CI/CD', 'Monitoreo configurado', 'Documentación de arquitectura', 'SLA de soporte'],
        closing: 'Para que el próximo pico de uso no sea un incendio.',
    },
    {
        n: '05',
        id: 'area-ciber',
        short: 'Ciber',
        title: 'Ciberseguridad',
        isNew: true,
        lead: 'Entender tu exposición y reducirla. Evaluamos tus sistemas, te damos un informe claro priorizado por severidad y un plan concreto de qué resolver primero — con recomendaciones accionables, sin tecnicismos vacíos.',
        subs: [
            { t: 'Análisis de Vulnerabilidades', d: 'Identificamos y priorizamos los puntos débiles de tus sistemas, aplicaciones e infraestructura.' },
            { t: 'Informes SOC', d: 'Reportes de seguridad para tener visibilidad continua de lo que ocurre en tu entorno.' },
            { t: 'Auditorías de Seguridad', d: 'Evaluación de la postura de seguridad de tus apps, infraestructura y procesos.' },
            { t: 'Plan de remediación', d: 'Qué arreglar, en qué orden y por qué — con re-test de verificación al cerrar.' },
        ],
        deliverables: ['Informe priorizado por severidad', 'Recomendaciones accionables', 'Plan de remediación', 'Re-test de verificación'],
        closing: 'Primero entender el riesgo; después, un plan para bajarlo.',
    },
    {
        n: '06',
        id: 'area-marketing',
        short: 'Marketing',
        title: 'Marketing & Contenidos',
        lead: 'La ingeniería también se comunica. Estrategia, producción y pauta para que tu producto se vea tanto como funciona: contenido de calidad de agencia, gestión de redes y campañas de performance.',
        subs: [
            { t: 'Estrategia de contenido', d: 'Qué decir, a quién y cada cuánto. Un plan, no publicaciones sueltas.' },
            { t: 'Producción audiovisual', d: 'Reels, carruseles e historias con calidad de agencia, listos para publicar.' },
            { t: 'Gestión de redes & publicación', d: 'Calendario, publicación automatizada y portal de seguimiento del cliente.' },
            { t: 'Campañas & Google Ads', d: 'Paid media en Google Ads y Meta: armado, segmentación y optimización.' },
        ],
        deliverables: ['Plan de contenido', 'Piezas listas para publicar', 'Calendario & publicación', 'Reportes de campaña'],
        closing: 'Que tu producto se vea tanto como funciona.',
    },
];

export const PROCESS = [
    { n: '01', t: 'Descubrimiento', d: 'Entendemos tu negocio, tu operación y el problema real antes de escribir una línea de código.' },
    { n: '02', t: 'Diseño', d: 'Prototipamos y validamos la solución. Vas a ver el producto antes de construirlo.' },
    { n: '03', t: 'Desarrollo', d: 'Construcción iterativa con entregas visibles. Stack moderno, código propio y documentado.' },
    { n: '04', t: 'Lanzamiento', d: 'Deploy, puesta en producción y acompañamiento. El producto en la calle, con soporte.' },
];

export const PROCESS_FACTS = [
    { k: '4 etapas', d: 'Proceso con contrato formal y entregables por fase.' },
    { k: '<2 h', d: 'Respuesta en incidentes críticos, soporte prioritario.' },
    { k: 'SLA', d: 'Acuerdos de nivel de servicio en cada proyecto.' },
];

export const PRODUCTS = [
    { name: 'Stacked', kind: 'SaaS Gastronómico', d: 'Sistema operativo para gastronomía: pantalla de cocina (KDS), comanderas, menú QR, pedidos online y delivery centralizado, sin comisiones a terceros.' },
    { name: 'Trazapp', kind: 'SaaS Agrotech', d: 'Gestión agronómica con trazabilidad Reprocann, dispensario de club y telemetría IoT de salas en tiempo real para cultivo de cannabis medicinal.' },
    { name: 'Dental-IA', kind: 'SaaS Healthtech', d: 'Sistema operativo clínico para odontólogos: odontograma FDI interactivo, agente IA en WhatsApp 24/7 y turnero con señas automáticas.' },
];

export const ABOUT_POINTS = [
    { t: 'Productos propios en producción', d: 'Stacked, Trazapp y Dental-IA funcionando con clientes reales. No mostramos un portfolio: mostramos software funcionando.' },
    { t: 'Stack moderno y verificable', d: 'React, TypeScript, Three.js, Supabase y LLMs. Tecnología actual, elegida por lo que resuelve, no por moda.' },
    { t: 'Proceso con contrato y SLA', d: 'Cuatro etapas definidas, entregables claros y acuerdos de nivel de servicio. Sabés qué recibís y cuándo.' },
    { t: 'Remote-first, respuesta en <2h', d: 'Equipo en Buenos Aires, 100% remoto. Soporte prioritario por WhatsApp para incidentes críticos.' },
];

// Roles exactos pendientes de confirmar (spec §11): hasta entonces, "Fundador".
export const TEAM = [
    { name: 'Seba', role: 'Fundador', mono: 'S' },
    { name: 'Facu', role: 'Fundador', mono: 'F' },
];

export const STACK = ['React', 'TypeScript', 'Three.js / WebGL', 'GSAP', 'Remotion', 'Supabase', 'Node.js', 'CI/CD'];

export const NAV = [
    { label: 'Servicios', href: '#servicios' },
    { label: 'Proceso', href: '#proceso' },
    { label: 'Productos', href: '#productos' },
    { label: 'Nosotros', href: '#nosotros' },
    { label: 'Contacto', href: '#contacto' },
];

// S13 · Clientes con su plataforma en producción (URLs verificadas 200 el 2026-11-25).
// `quote` son BORRADORES redactados por nosotros: el sitio solo los muestra cuando el cliente
// confirmó el texto exacto (`quoteConfirmed: true`). Nunca publicar una cita sin esa confirmación.
export interface Client {
    name: string;
    sector: string;
    built: string;
    url: string;
    display: string;
    quote: string;
    quoteConfirmed: boolean;
}

export const CLIENTS: Client[] = [
    { name: 'Curadent', sector: 'Odontología', built: 'Dental-IA', url: 'https://www.curadent.com.ar', display: 'curadent.com.ar',
        quote: 'Los turnos y las consultas por WhatsApp dejaron de ser un quilombo. El sistema nos ordenó el día a día del consultorio.', quoteConfirmed: false },
    { name: 'Consultorio Álvarez', sector: 'Odontología', built: 'Dental-IA', url: 'https://www.dentalva.ar', display: 'dentalva.ar',
        quote: 'Pasamos de las fichas de papel a tener todo el historial clínico en un solo lugar. El equipo lo adoptó enseguida.', quoteConfirmed: false },
    { name: 'AlPaso', sector: 'Gastronomía', built: 'Stacked', url: 'https://software.stacked.com.ar/alpaso', display: 'software.stacked.com.ar/alpaso',
        quote: 'La cocina y los pedidos por fin hablan el mismo idioma. Menos errores, menos gritos, más foco en cocinar.', quoteConfirmed: false },
    { name: 'Damafa', sector: 'Gastronomía', built: 'Stacked', url: 'https://www.damafa.ar', display: 'www.damafa.ar',
        quote: 'Tener nuestra propia tienda, sin comisiones de terceros, nos cambió la ecuación. Y el soporte siempre está.', quoteConfirmed: false },
    { name: 'Zolsea', sector: 'Sitio institucional', built: 'Web a medida', url: 'https://www.zolsea.com.ar', display: 'zolsea.com.ar',
        quote: 'Nos entregaron una web que de verdad nos representa, y cuando necesitamos algo, responden.', quoteConfirmed: false },
    { name: 'Transportes Maralan', sector: 'Logística', built: 'Software a medida', url: 'https://www.transportesmaralan.com.ar', display: 'transportesmaralan.com.ar',
        quote: 'Digitalizaron una operación que llevábamos a mano. Hoy tenemos todo bajo control y a la vista.', quoteConfirmed: false },
];
