// src/lib/financeService.ts
// Gestión contable, suscripciones de clientes y control de débitos operativos de CreApp

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

const SUBSCRIPTIONS_KEY = 'creapp_subscriptions_real_v1';
const FINANCES_KEY = 'creapp_finances_real_v1';

// --- SUSCRIPCIONES STORAGE & CRUD ---

export function getSubscriptions(): Subscription[] {
  if (typeof window === 'undefined') return [];
  try {
    // Limpiar claves viejas con datos mock si existiesen
    const legacy = localStorage.getItem('creapp_subscriptions_v1');
    if (legacy) {
      localStorage.removeItem('creapp_subscriptions_v1');
    }

    const raw = localStorage.getItem(SUBSCRIPTIONS_KEY);
    if (!raw) {
      localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify([]));
      return [];
    }
    const parsed: Subscription[] = JSON.parse(raw);
    // Filtrar cualquier residuo de mock sub-00
    const clean = parsed.filter((s) => !s.id.startsWith('sub-00'));
    if (clean.length !== parsed.length) {
      localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(clean));
    }
    return clean;
  } catch (e) {
    console.error('Error reading subscriptions:', e);
    return [];
  }
}

export function clearAllSubscriptions(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify([]));
}

export function saveSubscriptions(subscriptions: Subscription[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subscriptions));
  } catch (e) {
    console.error('Error saving subscriptions:', e);
  }
}

export function createSubscription(input: Omit<Subscription, 'id' | 'createdAt'>): Subscription {
  const newSub: Subscription = {
    ...input,
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  const list = getSubscriptions();
  const updated = [newSub, ...list];
  saveSubscriptions(updated);
  return newSub;
}

export function updateSubscription(id: string, updates: Partial<Subscription>): Subscription | null {
  const list = getSubscriptions();
  const index = list.findIndex((s) => s.id === id);
  if (index === -1) return null;
  const updatedSub = { ...list[index], ...updates };
  list[index] = updatedSub;
  saveSubscriptions(list);
  return updatedSub;
}

export function deleteSubscription(id: string): void {
  const list = getSubscriptions();
  const filtered = list.filter((s) => s.id !== id);
  saveSubscriptions(filtered);
}

/**
 * Registra el cobro de una suscripción:
 * 1. Actualiza lastPaymentDate a hoy.
 * 2. Proyecta nextBillingDate al mes siguiente manteniendo el billingDay.
 * 3. Marca la suscripción como 'active'.
 * 4. Genera automáticamente un movimiento de ingreso en Finanzas!
 */
export function recordSubscriptionPayment(
  subscriptionId: string,
  paymentMethod?: Subscription['paymentMethod'],
  notes?: string
): { subscription: Subscription; transaction: FinanceTransaction } | null {
  const list = getSubscriptions();
  const sub = list.find((s) => s.id === subscriptionId);
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

  const updatedSub: Subscription = {
    ...sub,
    status: 'active',
    lastPaymentDate: todayStr,
    nextBillingDate: nextDateStr,
    notes: notes ? `${sub.notes ? sub.notes + ' | ' : ''}Último cobro: ${notes}` : sub.notes,
  };

  const updatedList = list.map((s) => (s.id === subscriptionId ? updatedSub : s));
  saveSubscriptions(updatedList);

  // Crear transacción de ingreso automático en Finanzas
  const newTx = createTransaction({
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

  return { subscription: updatedSub, transaction: newTx };
}

// --- FINANZAS / DÉBITOS STORAGE & CRUD ---

export function getTransactions(): FinanceTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    // Limpiar claves viejas con datos mock si existiesen
    const legacy = localStorage.getItem('creapp_finances_v1');
    if (legacy) {
      localStorage.removeItem('creapp_finances_v1');
    }

    const raw = localStorage.getItem(FINANCES_KEY);
    if (!raw) {
      localStorage.setItem(FINANCES_KEY, JSON.stringify([]));
      return [];
    }
    const parsed: FinanceTransaction[] = JSON.parse(raw);
    // Filtrar cualquier residuo de mock tx-00
    const clean = parsed.filter((t) => !t.id.startsWith('tx-00'));
    if (clean.length !== parsed.length) {
      localStorage.setItem(FINANCES_KEY, JSON.stringify(clean));
    }
    return clean;
  } catch (e) {
    console.error('Error reading transactions:', e);
    return [];
  }
}

export function clearAllTransactions(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FINANCES_KEY, JSON.stringify([]));
}

export function saveTransactions(transactions: FinanceTransaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FINANCES_KEY, JSON.stringify(transactions));
  } catch (e) {
    console.error('Error saving transactions:', e);
  }
}

export function createTransaction(
  input: Omit<FinanceTransaction, 'id' | 'createdAt'>
): FinanceTransaction {
  const newTx: FinanceTransaction = {
    ...input,
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  const list = getTransactions();
  const updated = [newTx, ...list];
  saveTransactions(updated);
  return newTx;
}

export function updateTransaction(
  id: string,
  updates: Partial<FinanceTransaction>
): FinanceTransaction | null {
  const list = getTransactions();
  const index = list.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const updatedTx = { ...list[index], ...updates };
  list[index] = updatedTx;
  saveTransactions(list);
  return updatedTx;
}

export function deleteTransaction(id: string): void {
  const list = getTransactions();
  const filtered = list.filter((t) => t.id !== id);
  saveTransactions(filtered);
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

export function getFinancialMetrics(): FinancialMetrics {
  const subscriptions = getSubscriptions();
  const transactions = getTransactions();

  // MRR: Suma de suscripciones activas en $ARS (CreApp opera en Pesos Argentinos)
  const totalMRR = subscriptions
    .filter((s) => s.status === 'active' || s.status === 'pending_payment')
    .reduce((acc, s) => acc + (s.currency === 'ARS' ? s.amount : s.amount * 1250), 0);

  const activeSubscriptionsCount = subscriptions.filter((s) => s.status === 'active').length;
  const pendingSubscriptionsCount = subscriptions.filter(
    (s) => s.status === 'pending_payment' || s.status === 'overdue'
  ).length;

  // Filtrar movimientos del mes actual
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  const thisMonthTransactions = transactions.filter((t) => t.date.startsWith(currentMonthStr));

  // Ingresos del mes ($ARS)
  const totalIncomeMonth = thisMonthTransactions
    .filter((t) => t.type === 'income' && t.status === 'paid')
    .reduce((acc, t) => acc + (t.currency === 'ARS' ? t.amount : t.amount * 1250), 0);

  // Gastos del mes ($ARS)
  const totalExpensesMonth = thisMonthTransactions
    .filter((t) => t.type === 'expense' && t.status === 'paid')
    .reduce((acc, t) => acc + (t.currency === 'ARS' ? t.amount : t.amount * 1250), 0);

  // Gastos recurrentes fijos ($ARS)
  const recurringExpensesMRR = transactions
    .filter((t) => t.type === 'expense' && t.recurring)
    .reduce((acc, t) => acc + (t.currency === 'ARS' ? t.amount : t.amount * 1250), 0);

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
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const amt = t.currency === 'ARS' ? t.amount : t.amount * 1250;
      if (expensesByCategory[t.category] !== undefined) {
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
