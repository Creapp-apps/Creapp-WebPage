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

// Orden del menú = orden de este array.
export const SERVICES: Service[] = [
    { group: 'desarrollo', slug: 'software', title: 'Software', eyebrow: '', lead: '', deliverables: [], includes: [], graphicKey: 'software', interactive: false },
    { group: 'desarrollo', slug: 'ia', title: 'IA & Machine Learning', eyebrow: '', lead: '', deliverables: [], includes: [], graphicKey: 'ia', interactive: true },
    { group: 'desarrollo', slug: 'ux-ui', title: 'UX/UI & Product Design', eyebrow: '', lead: '', deliverables: [], includes: [], graphicKey: 'design', interactive: false },
    { group: 'desarrollo', slug: 'apis-escala', title: 'APIs & Escala', eyebrow: '', lead: '', deliverables: [], includes: [], graphicKey: 'scale', interactive: false },
    { group: 'seguridad', slug: 'pentesting', title: 'Pentesting', eyebrow: '', lead: '', deliverables: [], includes: [], graphicKey: 'scan', interactive: true, illustrative: true },
    { group: 'seguridad', slug: 'soc', title: 'Análisis SOC', eyebrow: '', lead: '', deliverables: [], includes: [], graphicKey: 'soc', interactive: false, illustrative: true },
    { group: 'seguridad', slug: 'auditorias', title: 'Auditorías', eyebrow: '', lead: '', deliverables: [], includes: [], graphicKey: 'audit', interactive: false, illustrative: true },
    { group: 'marketing', slug: 'community', title: 'Community Management', eyebrow: '', lead: '', deliverables: [], includes: [], graphicKey: 'marketing', interactive: false },
    { group: 'marketing', slug: 'publicidad', title: 'Publicidad & Campañas', eyebrow: '', lead: '', deliverables: [], includes: [], graphicKey: 'ads', interactive: false },
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
