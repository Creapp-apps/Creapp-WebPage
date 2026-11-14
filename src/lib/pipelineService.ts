import { supabase, getSupabase } from './supabaseClient';

export type PipelineStage =
  | 'no_answer'         // No contestó / Contacto Nulo (enfriamiento para recontactar luego)
  | 'prospect'          // Lead recién captado / Scrapeado
  | 'contacted'         // Contacto inicial / Diagnóstico
  | 'proposal_sent'     // Propuesta comercial interactiva enviada
  | 'negotiation'       // Negociación / Ajuste de contrato
  | 'in_production'     // En desarrollo / Sprint activo
  | 'delivered'         // Entregado / Mantenimiento mensual MRR
  | 'rejected';         // Rechazados (cerrado perdido / ya tienen agenda / no interesados)

export interface Lead {
  id: string;
  name: string;
  company: string;
  contactName?: string;
  industry: string;
  stage: PipelineStage;
  estimatedValue: number;
  currency: 'USD' | 'ARS';
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  productType: 'Stacked SaaS' | 'TrazApp' | 'Dental IA' | 'Desarrollo a Medida' | 'Landing & Growth';
  notes?: string;
  createdAt: string;
  lastContactAt?: string;
  proposalSlug?: string;
  address?: string;
  city?: string;
  rating?: number;
  reviewCount?: number;
  originalProspect?: any;
}

export const STAGE_CONFIG: Record<PipelineStage, { label: string; color: string; bg: string; border: string }> = {
  no_answer: {
    label: '0. No Contestó / Contacto Nulo',
    color: 'text-rose-400',
    bg: 'bg-rose-950/20',
    border: 'border-rose-500/25',
  },
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
  rejected: {
    label: '7. Rechazados',
    color: 'text-red-400',
    bg: 'bg-red-950/20',
    border: 'border-red-500/30',
  },
};

// ── Persistencia en Supabase (tabla public.leads) ───────────────────────────
// Compartido entre el equipo y en vivo. Antes era localStorage (cada navegador
// veía SU tablero). Ver migración 20261114170000_create_leads_table.sql.

type LeadRow = {
  id: string;
  name: string;
  company: string | null;
  contact_name: string | null;
  industry: string | null;
  stage: PipelineStage;
  estimated_value: number | string | null;
  currency: 'USD' | 'ARS' | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  product_type: Lead['productType'] | null;
  notes: string | null;
  address: string | null;
  city: string | null;
  rating: number | null;
  review_count: number | null;
  proposal_slug: string | null;
  original_prospect: any | null;
  created_at: string;
  last_contact_at: string | null;
  updated_at?: string | null;
};

const rowToLead = (r: LeadRow): Lead => ({
  id: r.id,
  name: r.name,
  company: r.company ?? '',
  contactName: r.contact_name ?? undefined,
  industry: r.industry ?? '',
  stage: r.stage,
  estimatedValue: Number(r.estimated_value ?? 0),
  currency: (r.currency ?? 'USD') as Lead['currency'],
  phone: r.phone ?? undefined,
  email: r.email ?? undefined,
  website: r.website ?? undefined,
  instagram: r.instagram ?? undefined,
  facebook: r.facebook ?? undefined,
  productType: (r.product_type ?? 'Desarrollo a Medida') as Lead['productType'],
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
  lastContactAt: r.last_contact_at ?? undefined,
  proposalSlug: r.proposal_slug ?? undefined,
  address: r.address ?? undefined,
  city: r.city ?? undefined,
  rating: r.rating ?? undefined,
  reviewCount: r.review_count ?? undefined,
  originalProspect: r.original_prospect ?? undefined,
});

// camelCase -> columnas snake_case (solo los campos presentes en el patch).
const leadToRow = (patch: Partial<Lead>): Record<string, any> => {
  const row: Record<string, any> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.company !== undefined) row.company = patch.company;
  if (patch.contactName !== undefined) row.contact_name = patch.contactName;
  if (patch.industry !== undefined) row.industry = patch.industry;
  if (patch.stage !== undefined) row.stage = patch.stage;
  if (patch.estimatedValue !== undefined) row.estimated_value = patch.estimatedValue;
  if (patch.currency !== undefined) row.currency = patch.currency;
  if (patch.phone !== undefined) row.phone = patch.phone;
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.website !== undefined) row.website = patch.website;
  if (patch.instagram !== undefined) row.instagram = patch.instagram;
  if (patch.facebook !== undefined) row.facebook = patch.facebook;
  if (patch.productType !== undefined) row.product_type = patch.productType;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.address !== undefined) row.address = patch.address;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.rating !== undefined) row.rating = patch.rating;
  if (patch.reviewCount !== undefined) row.review_count = patch.reviewCount;
  if (patch.proposalSlug !== undefined) row.proposal_slug = patch.proposalSlug;
  if (patch.originalProspect !== undefined) row.original_prospect = patch.originalProspect;
  return row;
};

export const getLeads = async (): Promise<Lead[]> => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToLead);
};

export const createLead = async (lead: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead> => {
  const { data, error } = await supabase
    .from('leads')
    .insert([leadToRow(lead)])
    .select()
    .single();
  if (error) throw error;
  return rowToLead(data);
};

export const updateLeadStage = async (leadId: string, newStage: PipelineStage): Promise<Lead[]> => {
  const { error } = await supabase
    .from('leads')
    .update({ stage: newStage, last_contact_at: new Date().toISOString() })
    .eq('id', leadId);
  if (error) throw error;
  return getLeads();
};

export const updateLead = async (leadId: string, patch: Partial<Lead>): Promise<Lead[]> => {
  const { error } = await supabase
    .from('leads')
    .update(leadToRow(patch))
    .eq('id', leadId);
  if (error) throw error;
  return getLeads();
};

export const deleteLead = async (leadId: string): Promise<Lead[]> => {
  const { error } = await supabase.from('leads').delete().eq('id', leadId);
  if (error) throw error;
  return getLeads();
};

// Realtime: cuando el otro usuario mueve/edita/borra una tarjeta, se refleja al
// instante en el tablero propio. Devuelve la función de desuscripción.
export const subscribeLeads = (onChange: () => void): (() => void) => {
  const sb = getSupabase();
  const channel = sb
    .channel('leads-pipeline')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => onChange())
    .subscribe();
  return () => { void sb.removeChannel(channel); };
};
