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

const STORAGE_KEY = 'creapp_service_contracts_v2';

const INITIAL_CONTRACTS: ServiceContract[] = [
  {
    id: 'cnt-stacked-001',
    contractRef: '#STACKED-20260920-01',
    clientName: 'Burger Club Palermo',
    clientTaxId: '30-71649281-9',
    clientEmail: 'gerencia@burgerclub.com.ar',
    clientPhone: '+54 11 4829-1920',
    productId: 'stacked',
    productName: 'Stacked SaaS',
    monthlyFee: '$350 USD',
    setupFee: 'Bonificado',
    currency: 'USD',
    slaUptime: '99.5%',
    responseTimeCritical: '< 2 horas (Incidentes Críticos P1)',
    supportChannels: 'WhatsApp Prioritario + Tickets/Email',
    effectiveDate: '2026-09-20',
    durationMonths: '6 meses',
    status: 'viewed',
    viewCount: 4,
    firstViewedAt: '2026-09-21T14:32:00.000Z',
    lastViewedAt: '2026-09-24T09:45:00.000Z',
    sentAt: '2026-09-20T16:00:00.000Z',
    createdAt: '2026-09-20T15:45:00.000Z',
    updatedAt: '2026-09-24T09:45:00.000Z',
    activityHistory: [
      {
        id: 'act-1',
        type: 'created',
        description: 'Contrato generado por CreApp Software Lab',
        timestamp: '2026-09-20T15:45:00.000Z',
      },
      {
        id: 'act-2',
        type: 'sent',
        description: 'Enlace de firma remitido al cliente vía WhatsApp',
        timestamp: '2026-09-20T16:00:00.000Z',
      },
      {
        id: 'act-3',
        type: 'viewed',
        description: 'El cliente abrió el contrato desde Buenos Aires (Apertura #1)',
        timestamp: '2026-09-21T14:32:00.000Z',
      },
      {
        id: 'act-4',
        type: 'viewed',
        description: 'El cliente revisó el acuerdo de SLA y cuotas (Apertura #4)',
        timestamp: '2026-09-24T09:45:00.000Z',
      },
    ],
  },
  {
    id: 'cnt-dent-002',
    contractRef: '#DENTALIA-20260918-01',
    clientName: 'Clínica Odontológica Belgrano',
    clientTaxId: '20-33829104-4',
    clientEmail: 'contacto@odontologiabelgrano.com',
    clientPhone: '+54 11 5820-3040',
    productId: 'dental-ia',
    productName: 'Dental IA',
    monthlyFee: '$280 USD',
    setupFee: '$150 USD',
    currency: 'USD',
    slaUptime: '99.8%',
    responseTimeCritical: '< 1 hora (Incidentes Críticos P1)',
    supportChannels: 'WhatsApp Prioritario 24/7',
    effectiveDate: '2026-09-18',
    durationMonths: '12 meses',
    status: 'signed',
    viewCount: 3,
    firstViewedAt: '2026-09-18T11:10:00.000Z',
    lastViewedAt: '2026-09-19T17:22:00.000Z',
    sentAt: '2026-09-18T10:45:00.000Z',
    signedAt: '2026-09-19T17:25:00.000Z',
    signedByName: 'Dr. Roberto Méndez',
    signedByTaxId: '20-33829104-4',
    signedByRole: 'Director Médico y Titular',
    verificationHash: 'SHA256-DNT-8819A4B-2026',
    createdAt: '2026-09-18T10:30:00.000Z',
    updatedAt: '2026-09-19T17:25:00.000Z',
    activityHistory: [
      {
        id: 'act-10',
        type: 'created',
        description: 'Contrato generado por CreApp Software Lab',
        timestamp: '2026-09-18T10:30:00.000Z',
      },
      {
        id: 'act-11',
        type: 'sent',
        description: 'Enviado para firma digital',
        timestamp: '2026-09-18T10:45:00.000Z',
      },
      {
        id: 'act-12',
        type: 'viewed',
        description: 'Contrato abierto por el cliente',
        timestamp: '2026-09-18T11:10:00.000Z',
      },
      {
        id: 'act-13',
        type: 'signed',
        description: 'Firmado digitalmente por Dr. Roberto Méndez (Director Médico)',
        timestamp: '2026-09-19T17:25:00.000Z',
        metadata: { hash: 'SHA256-DNT-8819A4B-2026' },
      },
    ],
  },
];

export const getContracts = (): ServiceContract[] => {
  if (typeof window === 'undefined' || !window.localStorage) return INITIAL_CONTRACTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CONTRACTS));
      return INITIAL_CONTRACTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading contracts from storage', e);
    return INITIAL_CONTRACTS;
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
  return contracts.find((c) => c.id === id || c.contractRef.toLowerCase() === id.toLowerCase());
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
