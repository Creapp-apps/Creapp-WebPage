import { supabase, getSupabase } from './supabaseClient';

export type ContractStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'cancelled';

export interface ContractActivityLog {
  id: string;
  type: 'created' | 'sent' | 'viewed' | 'signed' | 'status_change';
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ServiceContract {
  id: string;
  contractRef: string;
  clientName: string;
  clientTaxId?: string;
  clientEmail?: string;
  clientPhone?: string;
  leadId?: string;
  slug?: string;
  productId: 'stacked' | 'trazapp' | 'dental-ia' | 'custom';
  productName: string;
  monthlyFee: string;
  setupFee?: string;
  currency: 'USD' | 'ARS';
  slaUptime: string;
  responseTimeCritical: string;
  supportChannels: string;
  effectiveDate: string;
  durationMonths: string;
  status: ContractStatus;

  // Tracking & Analytics
  viewCount: number;
  firstViewedAt?: string;
  lastViewedAt?: string;
  sentAt?: string;

  // Digital Signature details
  signedAt?: string;
  signedByName?: string;
  signedByTaxId?: string;
  signedByRole?: string;
  signatureImage?: string;
  verificationHash?: string;

  customClauses?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  activityHistory: ContractActivityLog[];
}

// Contrato ORIGINAL real generado en CreApp para AlPaso Burguers (Dante Luca De Simone).
// Se conserva como referencia documental; NO se auto-seedea en la tabla (arranca vacía).
export const AL_PASO_CONTRACT: ServiceContract = {
  id: 'c3483f5d-e49a-4314-8da6-17191c5a1149',
  contractRef: '#STACKED-ALPASO-01',
  clientName: 'AlPaso Burguers',
  clientTaxId: '20-41883145-7',
  clientEmail: 'alpaso@alpaso.com',
  clientPhone: '+54 9 11 5975-7013',
  productId: 'stacked',
  productName: 'Stacked SaaS',
  monthlyFee: '$125.000 $ars',
  setupFee: 'Bonificado',
  currency: 'ARS',
  slaUptime: '99.5%',
  responseTimeCritical: '< 2 horas (Incidentes Críticos P1)',
  supportChannels: 'WhatsApp Prioritario + Soporte vía Tickets/Email',
  effectiveDate: '2026-09-21',
  durationMonths: '6 meses',
  status: 'sent',
  slug: 'al-paso',
  viewCount: 1,
  sentAt: '2026-09-21T21:04:21.000Z',
  createdAt: '2026-09-21T21:04:21.000Z',
  updatedAt: '2026-09-23T13:40:22.000Z',
  notes: 'AlPaso Burguers - Villa Ballester (Titular: Dante Luca De Simone)',
  activityHistory: [
    {
      id: 'act-alpaso-1',
      type: 'created',
      description: 'Contrato marco de prestación de servicios Stacked SaaS emitido en CreApp Lab',
      timestamp: '2026-09-21T21:04:21.000Z',
    },
    {
      id: 'act-alpaso-2',
      type: 'sent',
      description: 'Enlace original de firma remitido a Dante Luca De Simone vía WhatsApp (+54 9 11 5975-7013)',
      timestamp: '2026-09-21T21:05:00.000Z',
    },
  ],
};

// ── Persistencia en Supabase (tabla public.service_contracts) ────────────────
// Compartido entre el equipo y en vivo. Antes era localStorage (cada navegador
// veía SUS contratos). Ver migración 20261114190000_create_service_contracts.sql.

type ContractRow = {
  id: string;
  contract_ref: string | null;
  client_name: string;
  client_tax_id: string | null;
  client_email: string | null;
  client_phone: string | null;
  lead_id: string | null;
  slug: string | null;
  product_id: ServiceContract['productId'] | null;
  product_name: string | null;
  monthly_fee: string | null;
  setup_fee: string | null;
  currency: 'USD' | 'ARS' | null;
  sla_uptime: string | null;
  response_time_critical: string | null;
  support_channels: string | null;
  effective_date: string | null;
  duration_months: string | null;
  status: ContractStatus | null;
  view_count: number | null;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  sent_at: string | null;
  signed_at: string | null;
  signed_by_name: string | null;
  signed_by_tax_id: string | null;
  signed_by_role: string | null;
  signature_image: string | null;
  verification_hash: string | null;
  custom_clauses: string | null;
  notes: string | null;
  activity_history: ContractActivityLog[] | null;
  created_at: string;
  updated_at: string;
};

const rowToContract = (r: ContractRow): ServiceContract => ({
  id: r.id,
  contractRef: r.contract_ref ?? '',
  clientName: r.client_name,
  clientTaxId: r.client_tax_id ?? undefined,
  clientEmail: r.client_email ?? undefined,
  clientPhone: r.client_phone ?? undefined,
  leadId: r.lead_id ?? undefined,
  slug: r.slug ?? undefined,
  productId: (r.product_id ?? 'custom') as ServiceContract['productId'],
  productName: r.product_name ?? '',
  monthlyFee: r.monthly_fee ?? '',
  setupFee: r.setup_fee ?? undefined,
  currency: (r.currency ?? 'USD') as ServiceContract['currency'],
  slaUptime: r.sla_uptime ?? '',
  responseTimeCritical: r.response_time_critical ?? '',
  supportChannels: r.support_channels ?? '',
  effectiveDate: r.effective_date ?? '',
  durationMonths: r.duration_months ?? '',
  status: (r.status ?? 'draft') as ContractStatus,
  viewCount: Number(r.view_count ?? 0),
  firstViewedAt: r.first_viewed_at ?? undefined,
  lastViewedAt: r.last_viewed_at ?? undefined,
  sentAt: r.sent_at ?? undefined,
  signedAt: r.signed_at ?? undefined,
  signedByName: r.signed_by_name ?? undefined,
  signedByTaxId: r.signed_by_tax_id ?? undefined,
  signedByRole: r.signed_by_role ?? undefined,
  signatureImage: r.signature_image ?? undefined,
  verificationHash: r.verification_hash ?? undefined,
  customClauses: r.custom_clauses ?? undefined,
  notes: r.notes ?? undefined,
  activityHistory: r.activity_history ?? [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// camelCase -> columnas snake_case (solo los campos presentes en el patch).
const contractToRow = (patch: Partial<ServiceContract>): Record<string, any> => {
  const row: Record<string, any> = {};
  if (patch.contractRef !== undefined) row.contract_ref = patch.contractRef;
  if (patch.clientName !== undefined) row.client_name = patch.clientName;
  if (patch.clientTaxId !== undefined) row.client_tax_id = patch.clientTaxId;
  if (patch.clientEmail !== undefined) row.client_email = patch.clientEmail;
  if (patch.clientPhone !== undefined) row.client_phone = patch.clientPhone;
  if (patch.leadId !== undefined) row.lead_id = patch.leadId;
  if (patch.slug !== undefined) row.slug = patch.slug;
  if (patch.productId !== undefined) row.product_id = patch.productId;
  if (patch.productName !== undefined) row.product_name = patch.productName;
  if (patch.monthlyFee !== undefined) row.monthly_fee = patch.monthlyFee;
  if (patch.setupFee !== undefined) row.setup_fee = patch.setupFee;
  if (patch.currency !== undefined) row.currency = patch.currency;
  if (patch.slaUptime !== undefined) row.sla_uptime = patch.slaUptime;
  if (patch.responseTimeCritical !== undefined) row.response_time_critical = patch.responseTimeCritical;
  if (patch.supportChannels !== undefined) row.support_channels = patch.supportChannels;
  if (patch.effectiveDate !== undefined) row.effective_date = patch.effectiveDate;
  if (patch.durationMonths !== undefined) row.duration_months = patch.durationMonths;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.viewCount !== undefined) row.view_count = patch.viewCount;
  if (patch.firstViewedAt !== undefined) row.first_viewed_at = patch.firstViewedAt || null;
  if (patch.lastViewedAt !== undefined) row.last_viewed_at = patch.lastViewedAt || null;
  if (patch.sentAt !== undefined) row.sent_at = patch.sentAt || null;
  if (patch.signedAt !== undefined) row.signed_at = patch.signedAt || null;
  if (patch.signedByName !== undefined) row.signed_by_name = patch.signedByName;
  if (patch.signedByTaxId !== undefined) row.signed_by_tax_id = patch.signedByTaxId;
  if (patch.signedByRole !== undefined) row.signed_by_role = patch.signedByRole;
  if (patch.signatureImage !== undefined) row.signature_image = patch.signatureImage;
  if (patch.verificationHash !== undefined) row.verification_hash = patch.verificationHash;
  if (patch.customClauses !== undefined) row.custom_clauses = patch.customClauses;
  if (patch.notes !== undefined) row.notes = patch.notes;
  if (patch.activityHistory !== undefined) row.activity_history = patch.activityHistory;
  return row;
};

export const getContracts = async (): Promise<ServiceContract[]> => {
  const { data, error } = await supabase
    .from('service_contracts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToContract);
};

// Matchea por id, #REF (contractRef) o slug. Como el id puede no ser un uuid real,
// traemos todos y resolvemos en memoria (igual que antes con localStorage).
export const getContractById = async (id: string): Promise<ServiceContract | undefined> => {
  const contracts = await getContracts();
  return contracts.find(
    (c) =>
      c.id === id ||
      c.contractRef.toLowerCase() === id.toLowerCase() ||
      (c.slug && c.slug.toLowerCase() === id.toLowerCase())
  );
};

export const createContract = async (
  data: Omit<ServiceContract, 'id' | 'createdAt' | 'updatedAt' | 'activityHistory' | 'viewCount'>
): Promise<ServiceContract> => {
  const now = new Date().toISOString();
  const row = contractToRow(data);
  row.view_count = 0;
  row.activity_history = [
    {
      id: `act-${Date.now()}`,
      type: 'created',
      description: `Contrato creado para ${data.clientName} (${data.productName})`,
      timestamp: now,
    },
  ];

  const { data: inserted, error } = await supabase
    .from('service_contracts')
    .insert([row])
    .select()
    .single();
  if (error) throw error;
  return rowToContract(inserted);
};

export const updateContract = async (
  id: string,
  patch: Partial<ServiceContract>
): Promise<ServiceContract | null> => {
  const { data, error } = await supabase
    .from('service_contracts')
    .update(contractToRow(patch))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data ? rowToContract(data) : null;
};

export const recordContractView = async (id: string): Promise<ServiceContract | null> => {
  const target = await getContractById(id);
  if (!target) return null;

  const now = new Date().toISOString();
  const newCount = (target.viewCount || 0) + 1;
  const isFirst = !target.firstViewedAt;

  // Si está en 'draft' o 'sent', pasa a 'viewed' automáticamente
  const newStatus: ContractStatus =
    target.status === 'signed' ? 'signed' : target.status === 'cancelled' ? 'cancelled' : 'viewed';

  const newActivity: ContractActivityLog = {
    id: `act-${Date.now()}`,
    type: 'viewed',
    description: `El cliente visualizó el contrato (Apertura #${newCount})`,
    timestamp: now,
  };

  return updateContract(target.id, {
    viewCount: newCount,
    firstViewedAt: isFirst ? now : target.firstViewedAt,
    lastViewedAt: now,
    status: newStatus,
    activityHistory: [newActivity, ...(target.activityHistory || [])],
  });
};

export const markContractAsSent = async (
  id: string,
  channel: string = 'WhatsApp'
): Promise<ServiceContract | null> => {
  const target = await getContractById(id);
  if (!target) return null;

  const now = new Date().toISOString();
  const newActivity: ContractActivityLog = {
    id: `act-${Date.now()}`,
    type: 'sent',
    description: `Contrato enviado al cliente vía ${channel}`,
    timestamp: now,
  };

  return updateContract(target.id, {
    sentAt: now,
    status: target.status === 'draft' ? 'sent' : target.status,
    activityHistory: [newActivity, ...(target.activityHistory || [])],
  });
};

export const signContract = async (
  id: string,
  signData: {
    signedByName: string;
    signedByTaxId?: string;
    signedByRole?: string;
    signatureImage?: string;
  }
): Promise<ServiceContract | null> => {
  const target = await getContractById(id);
  if (!target) return null;

  const now = new Date().toISOString();
  const hash = `SHA256-${target.productId.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const newActivity: ContractActivityLog = {
    id: `act-${Date.now()}`,
    type: 'signed',
    description: `Contrato firmado y confirmado por ${signData.signedByName}${signData.signedByRole ? ` (${signData.signedByRole})` : ''}`,
    timestamp: now,
    metadata: { hash },
  };

  return updateContract(target.id, {
    status: 'signed',
    signedAt: now,
    signedByName: signData.signedByName,
    signedByTaxId: signData.signedByTaxId,
    signedByRole: signData.signedByRole,
    signatureImage: signData.signatureImage,
    verificationHash: hash,
    activityHistory: [newActivity, ...(target.activityHistory || [])],
  });
};

export const deleteContract = async (id: string): Promise<ServiceContract[]> => {
  const { error } = await supabase.from('service_contracts').delete().eq('id', id);
  if (error) throw error;
  return getContracts();
};

// Sincronización con Supabase: verifica si la propuesta 'al-paso' fue firmada y,
// de ser así, actualiza el contrato correspondiente (slug 'al-paso').
export const syncContractsWithSupabase = async (): Promise<ServiceContract[]> => {
  try {
    const contracts = await getContracts();
    const target = contracts.find(
      (c) => c.slug === 'al-paso' || c.id === 'c3483f5d-e49a-4314-8da6-17191c5a1149'
    );
    if (!target) return contracts;

    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('slug', 'al-paso')
      .single();

    if (error || !proposal) return contracts;

    const isSigned = !!proposal.signed_at || proposal.status === 'signed';
    if (!isSigned || target.status === 'signed') return contracts;

    const signedAt = proposal.signed_at || proposal.updated_at || new Date().toISOString();
    const signedUrl = proposal.signed_contract_url || undefined;
    const clientRep =
      proposal.methodology?.client_legal_data?.representative_name?.trim() ||
      'Dante Luca De Simone';
    const clientDni =
      proposal.methodology?.client_legal_data?.representative_dni?.trim() ||
      '20-41883145-7';
    const clientRole =
      proposal.methodology?.client_legal_data?.representative_role?.trim() || 'Dueño';

    const activities = [...target.activityHistory];
    if (!activities.some((a) => a.type === 'signed')) {
      activities.push({
        id: `act-sign-${Date.now()}`,
        type: 'signed',
        description: `Contrato firmado digitalmente por ${clientRep} (${clientRole})`,
        timestamp: signedAt,
      });
    }

    await updateContract(target.id, {
      status: 'signed',
      signedAt,
      signedByName: clientRep,
      signedByTaxId: clientDni,
      signedByRole: clientRole,
      signatureImage: signedUrl,
      activityHistory: activities,
    });

    return getContracts();
  } catch (err) {
    console.error('Error syncing contracts with Supabase:', err);
    return getContracts();
  }
};

// Realtime: cuando el otro usuario crea/edita/borra o firma un contrato, se
// refleja al instante. Devuelve la función de desuscripción.
export const subscribeContracts = (onChange: () => void): (() => void) => {
  const sb = getSupabase();
  const channel = sb
    .channel('service-contracts-shared')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'service_contracts' }, () => onChange())
    .subscribe();
  return () => { void sb.removeChannel(channel); };
};
