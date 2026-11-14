// src/lib/financeService.ts
// Gestión contable, suscripciones de clientes y control de débitos operativos de CreApp
// Persistencia en Supabase (compartido entre el equipo + realtime); antes localStorage.

import { supabase, getSupabase } from './supabaseClient';

export type SubscriptionCategory =
  | 'saas_license'
  | 'maintenance'
  | 'retainer'
  | 'hosting'
  | 'custom';

export type SubscriptionStatus =
  | 'active'
  | 'pending_payment'
  | 'paused'
  | 'overdue'
  | 'cancelled';

export interface Subscription {
  id: string;
  clientName: string;
  companyName: string;
  planName: string;
  category: SubscriptionCategory;
  productType: 'Stacked SaaS' | 'TrazApp' | 'Dental IA' | 'Desarrollo a Medida' | 'Infraestructura & SLA';
  amount: number;
  currency: 'USD' | 'ARS';
  billingDay: number | string; // Ej: "Del 1 al 10 de cada mes", "Del 1 al 5 de cada mes", o número 23
  billingCycle: 'monthly' | 'quarterly' | 'annual';
  status: SubscriptionStatus;
  startDate: string; // YYYY-MM-DD
  nextBillingDate: string; // YYYY-MM-DD
  lastPaymentDate?: string; // YYYY-MM-DD
  paymentMethod: 'MercadoPago' | 'Transferencia Bancaria' | 'Stripe' | 'Crypto USDT' | 'Efectivo';
  paymentLink?: string;
  clientPhone?: string;
  clientEmail?: string;
  notes?: string;
  leadId?: string;
  createdAt: string;
}

export type ExpenseCategory =
  | 'infrastructure'     // Vercel, Supabase, Cloudflare, AWS, Dominios
  | 'ai_apis'            // OpenAI, Google Gemini, Anthropic, Twilio
  | 'saas_tools'          // GitHub, Figma, Notion, Google Workspace
  | 'resources_freelance' // Devs externos, diseñadores, contratistas
  | 'legal_accounting'   // Gestoría, impuestos, tasas
  | 'marketing'          // Pauta Meta/Google, ads
  | 'other';

export type TransactionType = 'expense' | 'income';

export interface FinanceTransaction {
  id: string;
  type: TransactionType;
  concept: string;
  provider: string; // ej: "Vercel Inc.", "Supabase", "OpenAI LLC", "Figma"
  category: ExpenseCategory;
  amount: number;
  currency: 'USD' | 'ARS';
  date: string; // YYYY-MM-DD
  paymentMethod: 'Tarjeta Corporativa' | 'Transferencia' | 'Crypto' | 'PayPal' | 'Débito Automático';
  recurring: boolean;
  status: 'paid' | 'scheduled' | 'pending';
  receiptNumber?: string;
  notes?: string;
  subscriptionId?: string; // Si fue originado por el cobro de una suscripción
  createdAt: string;
}

// --- SUSCRIPCIONES (Supabase, compartido + realtime) ---

type SubRow = {
  id: string;
  client_name: string;
  company_name: string | null;
  plan_name: string | null;
  category: Subscription['category'];
  product_type: Subscription['productType'] | null;
  amount: number | string | null;
  currency: 'USD' | 'ARS' | null;
  billing_day: string | null;
  billing_cycle: Subscription['billingCycle'] | null;
  status: SubscriptionStatus;
  start_date: string | null;
  next_billing_date: string | null;
  last_payment_date: string | null;
  payment_method: Subscription['paymentMethod'] | null;
  payment_link: string | null;
  client_phone: string | null;
  client_email: string | null;
  notes: string | null;
  lead_id: string | null;
  created_at: string;
};

const subRowToSub = (r: SubRow): Subscription => ({
  id: r.id,
  clientName: r.client_name,
  companyName: r.company_name ?? '',
  planName: r.plan_name ?? '',
  category: r.category,
  productType: (r.product_type ?? 'Desarrollo a Medida') as Subscription['productType'],
  amount: Number(r.amount ?? 0),
  currency: (r.currency ?? 'USD') as Subscription['currency'],
  billingDay: r.billing_day ?? '',
  billingCycle: (r.billing_cycle ?? 'monthly') as Subscription['billingCycle'],
  status: r.status,
  startDate: r.start_date ?? '',
  nextBillingDate: r.next_billing_date ?? '',
  lastPaymentDate: r.last_payment_date ?? undefined,
  paymentMethod: (r.payment_method ?? 'Transferencia Bancaria') as Subscription['paymentMethod'],
  paymentLink: r.payment_link ?? undefined,
  clientPhone: r.client_phone ?? undefined,
  clientEmail: r.client_email ?? undefined,
  notes: r.notes ?? undefined,
  leadId: r.lead_id ?? undefined,
  createdAt: r.created_at,
});

const subToRow = (p: Partial<Subscription>): Record<string, any> => {
  const row: Record<string, any> = {};
  if (p.clientName !== undefined) row.client_name = p.clientName;
  if (p.companyName !== undefined) row.company_name = p.companyName;
  if (p.planName !== undefined) row.plan_name = p.planName;
  if (p.category !== undefined) row.category = p.category;
  if (p.productType !== undefined) row.product_type = p.productType;
  if (p.amount !== undefined) row.amount = p.amount;
  if (p.currency !== undefined) row.currency = p.currency;
  if (p.billingDay !== undefined) row.billing_day = String(p.billingDay);
  if (p.billingCycle !== undefined) row.billing_cycle = p.billingCycle;
  if (p.status !== undefined) row.status = p.status;
  if (p.startDate !== undefined) row.start_date = p.startDate || null;
  if (p.nextBillingDate !== undefined) row.next_billing_date = p.nextBillingDate || null;
  if (p.lastPaymentDate !== undefined) row.last_payment_date = p.lastPaymentDate || null;
  if (p.paymentMethod !== undefined) row.payment_method = p.paymentMethod;
  if (p.paymentLink !== undefined) row.payment_link = p.paymentLink;
  if (p.clientPhone !== undefined) row.client_phone = p.clientPhone;
  if (p.clientEmail !== undefined) row.client_email = p.clientEmail;
  if (p.notes !== undefined) row.notes = p.notes;
  if (p.leadId !== undefined) row.lead_id = p.leadId;
  return row;
};

export async function getSubscriptions(): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(subRowToSub);
}

export async function createSubscription(
  input: Omit<Subscription, 'id' | 'createdAt'>
): Promise<Subscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert([subToRow(input)])
    .select()
    .single();
  if (error) throw error;
  return subRowToSub(data);
}

export async function updateSubscription(
  id: string,
  updates: Partial<Subscription>
): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .update(subToRow(updates))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data ? subRowToSub(data) : null;
}

export async function deleteSubscription(id: string): Promise<void> {
  const { error } = await supabase.from('subscriptions').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Registra el cobro de una suscripción: actualiza lastPaymentDate/nextBillingDate/estado
 * y genera automáticamente un ingreso en Finanzas.
 */
export async function recordSubscriptionPayment(
  subscriptionId: string,
  paymentMethod?: Subscription['paymentMethod'],
  notes?: string
): Promise<{ subscription: Subscription; transaction: FinanceTransaction } | null> {
  const subs = await getSubscriptions();
  const sub = subs.find((s) => s.id === subscriptionId);
  if (!sub) return null;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Calcular próxima fecha de cobro (+1 mes)
  const nextDate = new Date(today);
  nextDate.setMonth(nextDate.getMonth() + 1);
  const numericDay = typeof sub.billingDay === 'number'
    ? sub.billingDay
    : parseInt(String(sub.billingDay).replace(/\D+/g, ' ').trim().split(' ')[0] || '1');
  if (numericDay > 0 && numericDay <= 28) {
    nextDate.setDate(numericDay);
  }
  const nextDateStr = nextDate.toISOString().split('T')[0];

  const updatedSub = await updateSubscription(subscriptionId, {
    status: 'active',
    lastPaymentDate: todayStr,
    nextBillingDate: nextDateStr,
    notes: notes ? `${sub.notes ? sub.notes + ' | ' : ''}Último cobro: ${notes}` : sub.notes,
  });

  // Crear transacción de ingreso automático en Finanzas
  const newTx = await createTransaction({
    type: 'income',
    concept: `Cobro Abono Mensual - ${sub.planName}`,
    provider: sub.companyName || sub.clientName,
    category: 'saas_tools',
    amount: sub.amount,
    currency: sub.currency,
    date: todayStr,
    paymentMethod: paymentMethod === 'Crypto USDT' ? 'Crypto' : 'Transferencia',
    recurring: true,
    status: 'paid',
    subscriptionId: sub.id,
    notes: `Cobro automático de suscripción recurrente. ${notes || ''}`,
  });

  return { subscription: updatedSub ?? sub, transaction: newTx };
}

// --- FINANZAS / DÉBITOS (Supabase, compartido + realtime) ---

type TxRow = {
  id: string;
  type: TransactionType;
  concept: string;
  provider: string | null;
  category: ExpenseCategory;
  amount: number | string | null;
  currency: 'USD' | 'ARS' | null;
  date: string;
  payment_method: FinanceTransaction['paymentMethod'] | null;
  recurring: boolean | null;
  status: FinanceTransaction['status'];
  receipt_number: string | null;
  notes: string | null;
  subscription_id: string | null;
  created_at: string;
};

const txRowToTx = (r: TxRow): FinanceTransaction => ({
  id: r.id,
  type: r.type,
  concept: r.concept,
  provider: r.provider ?? '',
  category: r.category,
  amount: Number(r.amount ?? 0),
  currency: (r.currency ?? 'USD') as FinanceTransaction['currency'],
  date: r.date,
  paymentMethod: (r.payment_method ?? 'Transferencia') as FinanceTransaction['paymentMethod'],
  recurring: !!r.recurring,
  status: r.status,
  receiptNumber: r.receipt_number ?? undefined,
  notes: r.notes ?? undefined,
  subscriptionId: r.subscription_id ?? undefined,
  createdAt: r.created_at,
});

const txToRow = (p: Partial<FinanceTransaction>): Record<string, any> => {
  const row: Record<string, any> = {};
  if (p.type !== undefined) row.type = p.type;
  if (p.concept !== undefined) row.concept = p.concept;
  if (p.provider !== undefined) row.provider = p.provider;
  if (p.category !== undefined) row.category = p.category;
  if (p.amount !== undefined) row.amount = p.amount;
  if (p.currency !== undefined) row.currency = p.currency;
  if (p.date !== undefined) row.date = p.date || null;
  if (p.paymentMethod !== undefined) row.payment_method = p.paymentMethod;
  if (p.recurring !== undefined) row.recurring = p.recurring;
  if (p.status !== undefined) row.status = p.status;
  if (p.receiptNumber !== undefined) row.receipt_number = p.receiptNumber;
  if (p.notes !== undefined) row.notes = p.notes;
  if (p.subscriptionId !== undefined) row.subscription_id = p.subscriptionId;
  return row;
};

export async function getTransactions(): Promise<FinanceTransaction[]> {
  const { data, error } = await supabase
    .from('finance_transactions')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(txRowToTx);
}

export async function createTransaction(
  input: Omit<FinanceTransaction, 'id' | 'createdAt'>
): Promise<FinanceTransaction> {
  const { data, error } = await supabase
    .from('finance_transactions')
    .insert([txToRow(input)])
    .select()
    .single();
  if (error) throw error;
  return txRowToTx(data);
}

export async function updateTransaction(
  id: string,
  updates: Partial<FinanceTransaction>
): Promise<FinanceTransaction | null> {
  const { data, error } = await supabase
    .from('finance_transactions')
    .update(txToRow(updates))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data ? txRowToTx(data) : null;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
  if (error) throw error;
}

// --- RESUMEN FINANCIERO Y MÉTRICAS GLOBALES ---

// Utility para parsear números en formato argentino ($125.000 -> 125000)
export function parseArgentineNumber(value: string | number): number {
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  if (!value) return 0;
  let clean = value.toString().trim().replace(/[^0-9.,]/g, '');
  if (!clean) return 0;

  // Si tiene puntos como separadores de miles (ej: 125.000 o 1.250.000)
  if (clean.includes('.') && !clean.includes(',')) {
    const parts = clean.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      clean = clean.replace(/\./g, '');
    }
  } else if (clean.includes('.') && clean.includes(',')) {
    // Formato estándar con decimales 125.000,50
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length === 3) {
      clean = clean.replace(/,/g, '');
    } else {
      clean = clean.replace(',', '.');
    }
  }

  const result = parseFloat(clean);
  return isNaN(result) ? 0 : result;
}

// Utility para formatear el día o rango de cobro mensual
export function formatBillingDay(billingDay: number | string | undefined): string {
  if (!billingDay) return 'Del 1 al 10 de cada mes';
  const str = String(billingDay).trim();
  if (str.toLowerCase().includes('cada mes') || str.toLowerCase().includes('del ')) {
    return str;
  }
  if (str.includes('-')) {
    const [start, end] = str.split('-');
    return `Del ${start.trim()} al ${end.trim()} de cada mes`;
  }
  if (!isNaN(Number(str))) {
    return `Día ${str} de cada mes`;
  }
  return str;
}

export interface FinancialMetrics {
  totalMRR: number; // Monthly Recurring Revenue de suscripciones activas en $ARS
  activeSubscriptionsCount: number;
  pendingSubscriptionsCount: number;
  totalIncomeMonth: number; // Ingresos registrados este mes ($ARS)
  totalExpensesMonth: number; // Débitos / OPEX registrados este mes ($ARS)
  netBalanceMonth: number; // Margen neto = Ingresos - Gastos ($ARS)
  profitMarginPercent: number; // Margen de ganancia en %
  expensesByCategory: Record<ExpenseCategory, number>;
  recurringExpensesMRR: number; // Gastos operativos recurrentes mensuales ($ARS)
}

export const EMPTY_FINANCIAL_METRICS: FinancialMetrics = {
  totalMRR: 0,
  activeSubscriptionsCount: 0,
  pendingSubscriptionsCount: 0,
  totalIncomeMonth: 0,
  totalExpensesMonth: 0,
  netBalanceMonth: 0,
  profitMarginPercent: 0,
  expensesByCategory: {
    infrastructure: 0,
    ai_apis: 0,
    saas_tools: 0,
    resources_freelance: 0,
    legal_accounting: 0,
    marketing: 0,
    other: 0,
  },
  recurringExpensesMRR: 0,
};

export async function getFinancialMetrics(): Promise<FinancialMetrics> {
  const defaultFallback: FinancialMetrics = {
    totalMRR: 0,
    activeSubscriptionsCount: 0,
    pendingSubscriptionsCount: 0,
    totalIncomeMonth: 0,
    totalExpensesMonth: 0,
    netBalanceMonth: 0,
    profitMarginPercent: 0,
    expensesByCategory: {
      infrastructure: 0,
      ai_apis: 0,
      saas_tools: 0,
      resources_freelance: 0,
      legal_accounting: 0,
      marketing: 0,
      other: 0,
    },
    recurringExpensesMRR: 0,
  };

  try {
    const [subscriptions, transactions] = await Promise.all([
      getSubscriptions(),
      getTransactions(),
    ]);

    // MRR: Suma de suscripciones activas en $ARS (CreApp opera en Pesos Argentinos)
    const totalMRR = subscriptions
      .filter((s) => s && (s.status === 'active' || s.status === 'pending_payment'))
      .reduce((acc, s) => acc + (s.currency === 'ARS' ? (s.amount || 0) : (s.amount || 0) * 1250), 0);

    const activeSubscriptionsCount = subscriptions.filter((s) => s && s.status === 'active').length;
    const pendingSubscriptionsCount = subscriptions.filter(
      (s) => s && (s.status === 'pending_payment' || s.status === 'overdue')
    ).length;

    // Filtrar movimientos del mes actual de forma segura
    const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
    const thisMonthTransactions = transactions.filter(
      (t) => t && t.date && typeof t.date === 'string' && t.date.startsWith(currentMonthStr)
    );

    // Ingresos del mes ($ARS)
    const totalIncomeMonth = thisMonthTransactions
      .filter((t) => t.type === 'income' && t.status === 'paid')
      .reduce((acc, t) => acc + (t.currency === 'ARS' ? (t.amount || 0) : (t.amount || 0) * 1250), 0);

    // Gastos del mes ($ARS)
    const totalExpensesMonth = thisMonthTransactions
      .filter((t) => t.type === 'expense' && t.status === 'paid')
      .reduce((acc, t) => acc + (t.currency === 'ARS' ? (t.amount || 0) : (t.amount || 0) * 1250), 0);

    // Gastos recurrentes fijos ($ARS)
    const recurringExpensesMRR = transactions
      .filter((t) => t && t.type === 'expense' && t.recurring)
      .reduce((acc, t) => acc + (t.currency === 'ARS' ? (t.amount || 0) : (t.amount || 0) * 1250), 0);

    const netBalanceMonth = totalIncomeMonth - totalExpensesMonth;
    const profitMarginPercent =
      totalIncomeMonth > 0 ? Math.round((netBalanceMonth / totalIncomeMonth) * 100) : 0;

    // Desglose por categoría (en $ARS)
    const expensesByCategory: Record<ExpenseCategory, number> = {
      infrastructure: 0,
      ai_apis: 0,
      saas_tools: 0,
      resources_freelance: 0,
      legal_accounting: 0,
      marketing: 0,
      other: 0,
    };

    thisMonthTransactions
      .filter((t) => t && t.type === 'expense')
      .forEach((t) => {
        const amt = t.currency === 'ARS' ? (t.amount || 0) : (t.amount || 0) * 1250;
        if (t.category && expensesByCategory[t.category] !== undefined) {
          expensesByCategory[t.category] += amt;
        } else {
          expensesByCategory.other += amt;
        }
      });

    return {
      totalMRR: Math.round(totalMRR),
      activeSubscriptionsCount,
      pendingSubscriptionsCount,
      totalIncomeMonth: Math.round(totalIncomeMonth),
      totalExpensesMonth: Math.round(totalExpensesMonth),
      netBalanceMonth: Math.round(netBalanceMonth),
      profitMarginPercent,
      expensesByCategory,
      recurringExpensesMRR: Math.round(recurringExpensesMRR),
    };
  } catch (err) {
    console.warn('[FinanceService] Error calculando métricas financieras:', err);
    return defaultFallback;
  }
}

// Realtime: cambios en suscripciones o transacciones (hechos por el otro usuario)
// se reflejan al instante. Devuelve la función de desuscripción.
export function subscribeFinance(onChange: () => void): () => void {
  const sb = getSupabase();
  const channel = sb
    .channel('finance-shared')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_transactions' }, () => onChange())
    .subscribe();
  return () => { void sb.removeChannel(channel); };
}

export const EXPENSE_CATEGORIES_INFO: Record<
  ExpenseCategory,
  { label: string; icon: string; color: string; badge: string }
> = {
  infrastructure: {
    label: 'Infraestructura & Cloud',
    icon: '⚡',
    color: 'text-amber-400',
    badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  },
  ai_apis: {
    label: 'APIs IA & Tokens',
    icon: '🧠',
    color: 'text-purple-400',
    badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  },
  saas_tools: {
    label: 'Software & SaaS Tools',
    icon: '🛠️',
    color: 'text-blue-400',
    badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  },
  resources_freelance: {
    label: 'Recursos & Freelancers',
    icon: '👥',
    color: 'text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  },
  legal_accounting: {
    label: 'Legal & Contable',
    icon: '⚖️',
    color: 'text-indigo-400',
    badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  },
  marketing: {
    label: 'Marketing & Ads',
    icon: '🚀',
    color: 'text-pink-400',
    badge: 'bg-pink-500/10 text-pink-300 border-pink-500/20',
  },
  other: {
    label: 'Otros Gastos',
    icon: '📦',
    color: 'text-zinc-400',
    badge: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
  },
};
