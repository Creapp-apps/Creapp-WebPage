export type PipelineStage = 
  | 'prospect'          // Lead recién captado / Scrapeado
  | 'contacted'         // Contacto inicial / Diagnóstico
  | 'proposal_sent'     // Propuesta comercial interactiva enviada
  | 'negotiation'       // Negociación / Ajuste de contrato
  | 'in_production'     // En desarrollo / Sprint activo
  | 'delivered';        // Entregado / Mantenimiento mensual MRR

export interface Lead {
  id: string;
  name: string;
  company: string;
  industry: string;
  stage: PipelineStage;
  estimatedValue: number;
  currency: 'USD' | 'ARS';
  phone?: string;
  email?: string;
  website?: string;
  productType: 'Stacked SaaS' | 'TrazApp' | 'Dental IA' | 'Desarrollo a Medida' | 'Landing & Growth';
  notes?: string;
  createdAt: string;
  lastContactAt?: string;
  proposalSlug?: string;
}

export const STAGE_CONFIG: Record<PipelineStage, { label: string; color: string; bg: string; border: string }> = {
  prospect: {
    label: '1. Prospecto / Lead',
    color: 'text-zinc-400',
    bg: 'bg-zinc-900/60',
    border: 'border-zinc-800',
  },
  contacted: {
    label: '2. Contacto & Diagnóstico',
    color: 'text-amber-400',
    bg: 'bg-amber-950/20',
    border: 'border-amber-500/30',
  },
  proposal_sent: {
    label: '3. Propuesta Enviada',
    color: 'text-purple-400',
    bg: 'bg-purple-950/20',
    border: 'border-purple-500/30',
  },
  negotiation: {
    label: '4. Negociación & Contrato',
    color: 'text-blue-400',
    bg: 'bg-blue-950/20',
    border: 'border-blue-500/30',
  },
  in_production: {
    label: '5. En Producción / Sprint',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/20',
    border: 'border-emerald-500/30',
  },
  delivered: {
    label: '6. Entregado & MRR Activo',
    color: 'text-cyan-400',
    bg: 'bg-cyan-950/20',
    border: 'border-cyan-500/30',
  },
};

const STORAGE_KEY = 'creapp_leads_pipeline_production_v2';

export const getLeads = (): Lead[] => {
  try {
    // Limpiar claves antiguas de prueba si existen
    if (localStorage.getItem('creapp_leads_pipeline_v1')) {
      localStorage.removeItem('creapp_leads_pipeline_v1');
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading leads from storage', e);
    return [];
  }
};

export const saveLeads = (leads: Lead[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch (e) {
    console.error('Error saving leads to storage', e);
  }
};

export const createLead = (lead: Omit<Lead, 'id' | 'createdAt'>): Lead => {
  const all = getLeads();
  const newLead: Lead = {
    ...lead,
    id: `lead-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newLead, ...all];
  saveLeads(updated);
  return newLead;
};

export const updateLeadStage = (leadId: string, newStage: PipelineStage): Lead[] => {
  const all = getLeads();
  const updated = all.map((l) => (l.id === leadId ? { ...l, stage: newStage, lastContactAt: new Date().toISOString() } : l));
  saveLeads(updated);
  return updated;
};

export const updateLead = (leadId: string, patch: Partial<Lead>): Lead[] => {
  const all = getLeads();
  const updated = all.map((l) => (l.id === leadId ? { ...l, ...patch } : l));
  saveLeads(updated);
  return updated;
};

export const deleteLead = (leadId: string): Lead[] => {
  const all = getLeads();
  const updated = all.filter((l) => l.id !== leadId);
  saveLeads(updated);
  return updated;
};
