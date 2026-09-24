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
  billingDay: number; // 1 - 31
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

const SUBSCRIPTIONS_KEY = 'creapp_subscriptions_v1';
const FINANCES_KEY = 'creapp_finances_v1';

// Datos iniciales de demostración contextualizados en CreApp
const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 'sub-001',
    clientName: 'Dr. Alejandro Fernández',
    companyName: 'Clínica Odontológica Dental Norte',
    planName: 'Dental-IA Pro & Turnero Predictivo',
    category: 'saas_license',
    productType: 'Dental IA',
    amount: 180,
    currency: 'USD',
    billingDay: 5,
    billingCycle: 'monthly',
    status: 'active',
    startDate: '2026-05-01',
    nextBillingDate: '2026-10-05',
    lastPaymentDate: '2026-09-05',
    paymentMethod: 'Transferencia Bancaria',
    paymentLink: 'https://mpago.la/dental-norte',
    clientPhone: '+54 9 11 4455-6677',
    clientEmail: 'info@dentalnorte.com.ar',
    notes: 'Abono recurrente con SLA de 99.8% y agente WhatsApp activo.',
    createdAt: '2026-05-01T12:00:00Z',
  },
  {
    id: 'sub-002',
    clientName: 'Club Cannábico del Plata',
    companyName: 'Asociación TrazApp Mar del Plata',
    planName: 'TrazApp Enterprise & Trazabilidad INASE',
    category: 'saas_license',
    productType: 'TrazApp',
    amount: 320,
    currency: 'USD',
    billingDay: 10,
    billingCycle: 'monthly',
    status: 'active',
    startDate: '2026-06-10',
    nextBillingDate: '2026-10-10',
    lastPaymentDate: '2026-09-10',
    paymentMethod: 'Crypto USDT',
    clientPhone: '+54 9 223 589-1122',
    clientEmail: 'admin@trazapp-mdp.org',
    notes: 'Control de lotes, dispensario y 5 usuarios administrativos concurrentes.',
    createdAt: '2026-06-10T15:30:00Z',
  },
  {
    id: 'sub-003',
    clientName: 'Martín Rossi',
    companyName: 'Stacked Burger Bar & Dark Kitchens',
    planName: 'Stacked SaaS - Sistema de Pedidos y Delivery Propio',
    category: 'saas_license',
    productType: 'Stacked SaaS',
    amount: 150,
    currency: 'USD',
    billingDay: 1,
    billingCycle: 'monthly',
    status: 'pending_payment',
    startDate: '2026-07-01',
    nextBillingDate: '2026-10-01',
    lastPaymentDate: '2026-09-01',
    paymentMethod: 'MercadoPago',
    paymentLink: 'https://mpago.la/stacked-burger-mrr',
    clientPhone: '+54 9 11 3322-8899',
    clientEmail: 'hola@stackedburger.com',
    notes: 'Ahorro directo en comisiones de PedidosYa / Rappi. Cobro el primer día de cada mes.',
    createdAt: '2026-07-01T10:00:00Z',
  },
  {
    id: 'sub-004',
    clientName: 'Estudio Jurídico Maza & Asoc.',
    companyName: 'Maza Legal Partners',
    planName: 'Mantenimiento Cloud & Backup Cifrado',
    category: 'maintenance',
    productType: 'Infraestructura & SLA',
    amount: 120,
    currency: 'USD',
    billingDay: 15,
    billingCycle: 'monthly',
    status: 'active',
    startDate: '2026-04-15',
    nextBillingDate: '2026-10-15',
    lastPaymentDate: '2026-09-15',
    paymentMethod: 'Transferencia Bancaria',
    clientPhone: '+54 9 11 6789-0123',
    clientEmail: 'contacto@mazalegal.com',
    notes: 'Soporte web prioritario, certificados SSL y copias de seguridad semanales.',
    createdAt: '2026-04-15T09:00:00Z',
  },
];

const INITIAL_TRANSACTIONS: FinanceTransaction[] = [
  {
    id: 'tx-001',
    type: 'expense',
    concept: 'Vercel Pro Plan (Hosting & Edge Network)',
    provider: 'Vercel Inc.',
    category: 'infrastructure',
    amount: 20,
    currency: 'USD',
    date: '2026-09-02',
    paymentMethod: 'Tarjeta Corporativa',
    recurring: true,
    status: 'paid',
    notes: 'Despliegues en producción para CreApp y aplicaciones de clientes.',
    createdAt: '2026-09-02T10:00:00Z',
  },
  {
    id: 'tx-002',
    type: 'expense',
    concept: 'Supabase Pro Plan (PostgreSQL Cloud & Auth)',
    provider: 'Supabase Inc.',
    category: 'infrastructure',
    amount: 25,
    currency: 'USD',
    date: '2026-09-05',
    paymentMethod: 'Tarjeta Corporativa',
    recurring: true,
    status: 'paid',
    notes: 'Base de datos de producción con réplicas y Row Level Security.',
    createdAt: '2026-09-05T11:00:00Z',
  },
  {
    id: 'tx-003',
    type: 'expense',
    concept: 'OpenAI API (Tokens GPT-4o & Embeddings)',
    provider: 'OpenAI LLC',
    category: 'ai_apis',
    amount: 45,
    currency: 'USD',
    date: '2026-09-12',
    paymentMethod: 'Tarjeta Corporativa',
    recurring: true,
    status: 'paid',
    notes: 'Consumo de IA para diagnóstico de prospección y agentes conversacionales.',
    createdAt: '2026-09-12T14:20:00Z',
  },
  {
    id: 'tx-004',
    type: 'expense',
    concept: 'Google Maps Platform & Places API',
    provider: 'Google Cloud Platform',
    category: 'infrastructure',
    amount: 18,
    currency: 'USD',
    date: '2026-09-15',
    paymentMethod: 'Tarjeta Corporativa',
    recurring: true,
    status: 'paid',
    notes: 'Scraper radar geográfico y validación de ubicaciones de prospectos.',
    createdAt: '2026-09-15T09:15:00Z',
  },
  {
    id: 'tx-005',
    type: 'expense',
    concept: 'Figma Professional (Diseño UI/UX & Sistemas)',
    provider: 'Figma Inc.',
    category: 'saas_tools',
    amount: 15,
    currency: 'USD',
    date: '2026-09-18',
    paymentMethod: 'Tarjeta Corporativa',
    recurring: true,
    status: 'paid',
    notes: 'Licencia para prototipado interactivo de productos de software.',
    createdAt: '2026-09-18T16:00:00Z',
  },
  {
    id: 'tx-006',
    type: 'expense',
    concept: 'GitHub Team & Copilot Workspace',
    provider: 'GitHub Inc.',
    category: 'saas_tools',
    amount: 19,
    currency: 'USD',
    date: '2026-09-20',
    paymentMethod: 'Tarjeta Corporativa',
    recurring: true,
    status: 'paid',
    notes: 'Repositorios privados de clientes y CI/CD pipelines.',
    createdAt: '2026-09-20T08:30:00Z',
  },
  {
    id: 'tx-007',
    type: 'expense',
    concept: 'Honorarios Especialista QA & Automatización',
    provider: 'Lucas Romero (Freelancer)',
    category: 'resources_freelance',
    amount: 160,
    currency: 'USD',
    date: '2026-09-22',
    paymentMethod: 'Transferencia',
    recurring: false,
    status: 'paid',
    notes: 'Testing end-to-end de pasarelas de pago y seguridad.',
    createdAt: '2026-09-22T17:00:00Z',
  },
  {
    id: 'tx-008',
    type: 'income',
    concept: 'Cobro Abono Mensual - TrazApp Enterprise',
    provider: 'Asociación TrazApp Mar del Plata',
    category: 'saas_tools',
    amount: 320,
    currency: 'USD',
    date: '2026-09-10',
    paymentMethod: 'Crypto',
    recurring: true,
    status: 'paid',
    subscriptionId: 'sub-002',
    notes: 'Cobro recurrente mensual recibido.',
    createdAt: '2026-09-10T12:00:00Z',
  },
  {
    id: 'tx-009',
    type: 'income',
    concept: 'Cobro Abono Mensual - Dental-IA Pro',
    provider: 'Clínica Odontológica Dental Norte',
    category: 'saas_tools',
    amount: 180,
    currency: 'USD',
    date: '2026-09-05',
    paymentMethod: 'Transferencia',
    recurring: true,
    status: 'paid',
    subscriptionId: 'sub-001',
    notes: 'Cobro recurrente mensual recibido.',
    createdAt: '2026-09-05T12:00:00Z',
  },
];

// --- SUSCRIPCIONES STORAGE & CRUD ---

export function getSubscriptions(): Subscription[] {
  if (typeof window === 'undefined') return INITIAL_SUBSCRIPTIONS;
  try {
    const raw = localStorage.getItem(SUBSCRIPTIONS_KEY);
    if (!raw) {
      localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(INITIAL_SUBSCRIPTIONS));
      return INITIAL_SUBSCRIPTIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading subscriptions:', e);
    return INITIAL_SUBSCRIPTIONS;
  }
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
  if (sub.billingDay > 0 && sub.billingDay <= 28) {
    nextDate.setDate(sub.billingDay);
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
  if (typeof window === 'undefined') return INITIAL_TRANSACTIONS;
  try {
    const raw = localStorage.getItem(FINANCES_KEY);
    if (!raw) {
      localStorage.setItem(FINANCES_KEY, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading transactions:', e);
    return INITIAL_TRANSACTIONS;
  }
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

export interface FinancialMetrics {
  totalMRR: number; // Monthly Recurring Revenue de suscripciones activas (USD)
  activeSubscriptionsCount: number;
  pendingSubscriptionsCount: number;
  totalIncomeMonth: number; // Ingresos registrados este mes
  totalExpensesMonth: number; // Débitos / OPEX registrados este mes
  netBalanceMonth: number; // Margen neto = Ingresos - Gastos
  profitMarginPercent: number; // Margen de ganancia en %
  expensesByCategory: Record<ExpenseCategory, number>;
  recurringExpensesMRR: number; // Gastos operativos recurrentes mensuales
}

export function getFinancialMetrics(): FinancialMetrics {
  const subscriptions = getSubscriptions();
  const transactions = getTransactions();

  // MRR: Suma de suscripciones activas en USD
  const totalMRR = subscriptions
    .filter((s) => s.status === 'active' || s.status === 'pending_payment')
    .reduce((acc, s) => acc + (s.currency === 'USD' ? s.amount : s.amount / 1200), 0);

  const activeSubscriptionsCount = subscriptions.filter((s) => s.status === 'active').length;
  const pendingSubscriptionsCount = subscriptions.filter(
    (s) => s.status === 'pending_payment' || s.status === 'overdue'
  ).length;

  // Filtrar movimientos del mes actual
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  const thisMonthTransactions = transactions.filter((t) => t.date.startsWith(currentMonthStr));

  // Ingresos del mes
  const totalIncomeMonth = thisMonthTransactions
    .filter((t) => t.type === 'income' && t.status === 'paid')
    .reduce((acc, t) => acc + (t.currency === 'USD' ? t.amount : t.amount / 1200), 0);

  // Gastos del mes
  const totalExpensesMonth = thisMonthTransactions
    .filter((t) => t.type === 'expense' && t.status === 'paid')
    .reduce((acc, t) => acc + (t.currency === 'USD' ? t.amount : t.amount / 1200), 0);

  // Gastos recurrentes fijos (stacks mensuales)
  const recurringExpensesMRR = transactions
    .filter((t) => t.type === 'expense' && t.recurring)
    .reduce((acc, t) => acc + (t.currency === 'USD' ? t.amount : t.amount / 1200), 0);

  const netBalanceMonth = totalIncomeMonth - totalExpensesMonth;
  const profitMarginPercent =
    totalIncomeMonth > 0 ? Math.round((netBalanceMonth / totalIncomeMonth) * 100) : 0;

  // Desglose por categoría
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
      const amt = t.currency === 'USD' ? t.amount : t.amount / 1200;
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
