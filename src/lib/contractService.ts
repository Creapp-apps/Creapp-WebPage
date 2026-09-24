import { supabase } from './supabaseClient';

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

const STORAGE_KEY = 'creapp_service_contracts_v3';

// Contrato ORIGINAL real generado en CreApp para AlPaso Burguers (Dante Luca De Simone)
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

const INITIAL_CONTRACTS: ServiceContract[] = [AL_PASO_CONTRACT];

export const getContracts = (): ServiceContract[] => {
  if (typeof window === 'undefined' || !window.localStorage) return INITIAL_CONTRACTS;
  try {
    // Limpiar claves viejas con mocks ficticios
    const oldV2 = localStorage.getItem('creapp_service_contracts_v2');
    if (oldV2) {
      localStorage.removeItem('creapp_service_contracts_v2');
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CONTRACTS));
      return INITIAL_CONTRACTS;
    }
    const parsed: ServiceContract[] = JSON.parse(raw);
    // Filtrar cualquier contrato mock ficticio anterior
    const filtered = parsed.filter(
      (c) =>
        !c.id.includes('stacked-001') &&
        !c.clientName.toLowerCase().includes('burger club') &&
        !c.clientName.toLowerCase().includes('odontol')
    );
    if (!filtered.some((c) => c.slug === 'al-paso' || c.id === AL_PASO_CONTRACT.id)) {
      filtered.unshift(AL_PASO_CONTRACT);
    }
    if (filtered.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return filtered;
  } catch (e) {
    console.error('Error loading contracts from storage', e);
    return INITIAL_CONTRACTS;
  }
};

// Sincronización en tiempo real con Supabase para verificar si Dante firmó el contrato original
export const syncContractsWithSupabase = async (): Promise<ServiceContract[]> => {
  const current = getContracts();
  try {
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('slug', 'al-paso')
      .single();

    if (error || !proposal) return current;

    const isSigned = !!proposal.signed_at || proposal.status === 'signed';
    const signedAt = proposal.signed_at || (isSigned ? proposal.updated_at : undefined);
    const signedUrl = proposal.signed_contract_url || undefined;
    const clientRep =
      proposal.methodology?.client_legal_data?.representative_name?.trim() ||
      'Dante Luca De Simone';
    const clientDni =
      proposal.methodology?.client_legal_data?.representative_dni?.trim() ||
      '20-41883145-7';
    const clientRole =
      proposal.methodology?.client_legal_data?.representative_role?.trim() || 'Dueño';

    const updated = current.map((c) => {
      if (c.slug === 'al-paso' || c.id === 'c3483f5d-e49a-4314-8da6-17191c5a1149') {
        const nextStatus: ContractStatus = isSigned ? 'signed' : (c.status === 'draft' ? 'sent' : c.status);
        const activities = [...c.activityHistory];
        if (isSigned && !activities.some((a) => a.type === 'signed')) {
          activities.push({
            id: `act-sign-${Date.now()}`,
            type: 'signed',
            description: `Contrato firmado digitalmente por ${clientRep} (${clientRole})`,
            timestamp: signedAt || new Date().toISOString(),
          });
        }
        return {
          ...c,
          status: nextStatus,
          signedAt,
          signedByName: clientRep,
          signedByTaxId: clientDni,
          signedByRole: clientRole,
          signatureImage: signedUrl,
          activityHistory: activities,
          updatedAt: proposal.updated_at || c.updatedAt,
        };
      }
      return c;
    });

    saveContracts(updated);
    return updated;
  } catch (err) {
    console.error('Error syncing contracts with Supabase:', err);
    return current;
  }
};

export const saveContracts = (contracts: ServiceContract[]): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
  } catch (e) {
    console.error('Error saving contracts to storage', e);
  }
};

export const getContractById = (id: string): ServiceContract | undefined => {
  const contracts = getContracts();
  return contracts.find(
    (c) =>
      c.id === id ||
      c.contractRef.toLowerCase() === id.toLowerCase() ||
      (c.slug && c.slug.toLowerCase() === id.toLowerCase())
  );
};

export const createContract = (
  data: Omit<ServiceContract, 'id' | 'createdAt' | 'updatedAt' | 'activityHistory' | 'viewCount'>
): ServiceContract => {
  const contracts = getContracts();
  const now = new Date().toISOString();
  const id = `cnt-${Date.now()}`;

  const newContract: ServiceContract = {
    ...data,
    id,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
    activityHistory: [
      {
        id: `act-${Date.now()}`,
        type: 'created',
        description: `Contrato creado para ${data.clientName} (${data.productName})`,
        timestamp: now,
      },
    ],
  };

  const updated = [newContract, ...contracts];
  saveContracts(updated);
  return newContract;
};

export const updateContract = (id: string, patch: Partial<ServiceContract>): ServiceContract | null => {
  const contracts = getContracts();
  let updatedContract: ServiceContract | null = null;

  const updated = contracts.map((c) => {
    if (c.id === id) {
      updatedContract = {
        ...c,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      return updatedContract;
    }
    return c;
  });

  if (updatedContract) {
    saveContracts(updated);
  }
  return updatedContract;
};

export const recordContractView = (id: string): ServiceContract | null => {
  const contracts = getContracts();
  let target = contracts.find((c) => c.id === id || c.contractRef.toLowerCase() === id.toLowerCase());
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

export const markContractAsSent = (id: string, channel: string = 'WhatsApp'): ServiceContract | null => {
  const contracts = getContracts();
  const target = contracts.find((c) => c.id === id);
  if (!target) return null;

  const now = new Date().toISOString();
  const newActivity: ContractActivityLog = {
    id: `act-${Date.now()}`,
    type: 'sent',
    description: `Contrato enviado al cliente vía ${channel}`,
    timestamp: now,
  };

  return updateContract(id, {
    sentAt: now,
    status: target.status === 'draft' ? 'sent' : target.status,
    activityHistory: [newActivity, ...(target.activityHistory || [])],
  });
};

export const signContract = (
  id: string,
  signData: {
    signedByName: string;
    signedByTaxId?: string;
    signedByRole?: string;
    signatureImage?: string;
  }
): ServiceContract | null => {
  const contracts = getContracts();
  const target = contracts.find((c) => c.id === id || c.contractRef.toLowerCase() === id.toLowerCase());
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

export const deleteContract = (id: string): ServiceContract[] => {
  const contracts = getContracts();
  const updated = contracts.filter((c) => c.id !== id);
  saveContracts(updated);
  return updated;
};
