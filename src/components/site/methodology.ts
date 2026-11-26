// Copy de la sección "Agentic Lab" de la home. Grounded en el PDF institucional
// + client_profile.json + el motor propio en producción (ya mostrado por
// EngineLive). Sin nombrar proveedores de LLM ni precios. TS puro (testeable).

export interface MethodologyPoint {
    t: string;
    d: string;
}

export const METHODOLOGY: {
    title: string;
    lead: string;
    points: MethodologyPoint[];
} = {
    title: 'Cómo trabaja el lab',
    lead: 'No somos una agencia de freelancers. Somos un software lab AI-native: diseñamos, construimos y sostenemos productos — incluidos los nuestros, en producción. La misma forma de trabajar con la que levantamos nuestros SaaS es la que aplicamos a tu proyecto.',
    points: [
        {
            t: 'AI-native, de punta a punta',
            d: 'La inteligencia artificial está en cómo trabajamos, no solo en lo que entregamos: agentes y automatización acompañan cada etapa, del discovery al soporte.',
        },
        {
            t: 'Motor propio en producción',
            d: 'Operamos nuestras propias plataformas SaaS con clientes reales. Lo que ves funcionando acá es la mejor garantía de que podemos construir lo tuyo.',
        },
        {
            t: 'Proceso con contrato y SLA',
            d: 'Cuatro etapas definidas — Descubrimiento, Diseño, Desarrollo y Lanzamiento — con entregables claros y acuerdos de nivel de servicio. Sabés qué recibís y cuándo.',
        },
        {
            t: 'Mostramos antes de decir',
            d: 'El producto en pantalla habla más que cualquier promesa. Te lo mostramos funcionando desde el primer día.',
        },
    ],
};
