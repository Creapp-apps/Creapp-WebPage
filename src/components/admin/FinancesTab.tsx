// src/components/admin/FinancesTab.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WalletCards,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  DollarSign,
  Calendar,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Trash2,
  Edit3,
  X,
  Layers,
  Sparkles,
  Receipt,
  Repeat,
  ShieldCheck,
} from 'lucide-react';
import {
  FinanceTransaction,
  ExpenseCategory,
  TransactionType,
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getFinancialMetrics,
  EXPENSE_CATEGORIES_INFO,
} from '@/lib/financeService';

export const FinancesTab: React.FC = () => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    type: 'expense' as TransactionType,
    concept: '',
    provider: '',
    category: 'infrastructure' as ExpenseCategory,
    amount: 20,
    currency: 'USD' as 'USD' | 'ARS',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Tarjeta Corporativa' as FinanceTransaction['paymentMethod'],
    recurring: true,
    status: 'paid' as FinanceTransaction['status'],
    receiptNumber: '',
    notes: '',
  });

  const loadData = () => {
    setTransactions(getTransactions());
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const metrics = getFinancialMetrics();

  // Filtrado de transacciones
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.concept.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;

    return matchesSearch && matchesType && matchesCategory && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingTx(null);
    setFormData({
      type: 'expense',
      concept: '',
      provider: '',
      category: 'infrastructure',
      amount: 20,
      currency: 'USD',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'Tarjeta Corporativa',
      recurring: true,
      status: 'paid',
      receiptNumber: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tx: FinanceTransaction) => {
    setEditingTx(tx);
    setFormData({
      type: tx.type,
      concept: tx.concept,
      provider: tx.provider,
      category: tx.category,
      amount: tx.amount,
      currency: tx.currency,
      date: tx.date,
      paymentMethod: tx.paymentMethod,
      recurring: tx.recurring,
      status: tx.status,
      receiptNumber: tx.receiptNumber || '',
      notes: tx.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.concept || !formData.provider) return;

    if (editingTx) {
      updateTransaction(editingTx.id, formData);
      showToast('Movimiento financiero actualizado.');
    } else {
      createTransaction(formData);
      showToast(formData.type === 'expense' ? 'Débito operativo registrado.' : 'Ingreso registrado en Finanzas.');
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = (id: string, concept: string) => {
    if (!confirm(`¿Eliminar el registro "${concept}"?`)) return;
    deleteTransaction(id);
    loadData();
    showToast('Registro eliminado.');
  };

  const handleToggleStatus = (tx: FinanceTransaction) => {
    const nextStatus: FinanceTransaction['status'] = tx.status === 'paid' ? 'pending' : 'paid';
    updateTransaction(tx.id, { status: nextStatus });
    loadData();
    showToast(`Estado cambiado a ${nextStatus === 'paid' ? 'Pagado' : 'Pendiente'}.`);
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['ID', 'Tipo', 'Fecha', 'Concepto', 'Proveedor', 'Categoria', 'Monto', 'Moneda', 'Metodo', 'Recurrente', 'Estado'];
    const rows = transactions.map((t) => [
      t.id,
      t.type,
      t.date,
      `"${t.concept.replace(/"/g, '""')}"`,
      `"${t.provider.replace(/"/g, '""')}"`,
      t.category,
      t.amount,
      t.currency,
      t.paymentMethod,
      t.recurring ? 'SI' : 'NO',
      t.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `creapp_finanzas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 backdrop-blur-xl shadow-2xl flex items-center gap-2 text-xs font-semibold"
          >
            <CheckCircle2 size={16} className="text-cyan-400" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-cyan-950/20 via-[#0e0e14] to-zinc-950 border border-cyan-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <WalletCards size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Finanzas, Débitos & Costos Operativos</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                OPEX & Cash Flow
              </span>
            </h2>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Control centralizado de pagos a proveedores, stacks tecnológicos (Vercel, Supabase, OpenAI, Google Cloud), herramientas SaaS, freelancers y balance contable neto de CreApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-semibold transition-colors cursor-pointer"
            title="Exportar movimientos a CSV"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Registrar Débito / Movimiento</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS: CASH FLOW & OPEX */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ingresos Recurrentes y Cobros */}
        <div className="p-5 rounded-2xl bg-[#0e0e12] border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Ingresos del Mes</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ArrowUpRight size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
            +${metrics.totalIncomeMonth.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">USD</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Abonos cobrados + ingresos operativos
          </p>
        </div>

        {/* Débitos & Gastos del Mes */}
        <div className="p-5 rounded-2xl bg-[#0e0e12] border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Débitos & OPEX del Mes</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <ArrowDownRight size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono tracking-tight">
            -${metrics.totalExpensesMonth.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">USD</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Servicios cloud, APIs y recursos
          </p>
        </div>

        {/* Balance Neto / Margen */}
        <div className="p-5 rounded-2xl bg-[#0e0e12] border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Margen Neto Operativo</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight ${metrics.netBalanceMonth >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
            ${metrics.netBalanceMonth.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">USD</span>
          </div>
          <p className="text-[11px] text-cyan-300/80 font-semibold">
            {metrics.profitMarginPercent}% de rentabilidad sobre ingresos
          </p>
        </div>

        {/* OPEX Fijo Recurrente */}
        <div className="p-5 rounded-2xl bg-[#0e0e12] border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Débitos Fijos Stacks</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Repeat size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-300 font-mono tracking-tight">
            ${metrics.recurringExpensesMRR.toLocaleString()} <span className="text-xs text-zinc-500 font-normal">USD/mes</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Costo base mensual de arquitectura
          </p>
        </div>
      </div>

      {/* CATEGORY BREAKDOWN PILLS */}
      <div className="p-4 rounded-2xl bg-[#0e0e12] border border-white/5 space-y-3">
        <span className="text-xs text-zinc-400 font-semibold block">
          Desglose de Débitos Operativos por Categoría:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {(
            [
              'infrastructure',
              'ai_apis',
              'saas_tools',
              'resources_freelance',
            ] as ExpenseCategory[]
          ).map((cat) => {
            const info = EXPENSE_CATEGORIES_INFO[cat];
            const amount = metrics.expensesByCategory[cat] || 0;
            return (
              <div
                key={cat}
                className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{info.icon}</span>
                  <div>
                    <span className="text-[11px] text-zinc-400 block font-medium">{info.label}</span>
                    <span className="text-xs font-bold text-white font-mono">${Math.round(amount)} USD</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTROS & BÚSQUEDA */}
      <div className="p-4 rounded-2xl bg-[#0e0e12] border border-white/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por concepto o proveedor (ej: Vercel, OpenAI)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {/* Categoría */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">Todas las Categorías</option>
            <option value="infrastructure">⚡ Infraestructura & Cloud</option>
            <option value="ai_apis">🧠 APIs IA & Tokens</option>
            <option value="saas_tools">🛠️ Software & SaaS Tools</option>
            <option value="resources_freelance">👥 Recursos & Freelancers</option>
            <option value="legal_accounting">⚖️ Legal & Contable</option>
            <option value="marketing">🚀 Marketing & Ads</option>
            <option value="other">📦 Otros Gastos</option>
          </select>
        </div>

        {/* Tipo de Movimiento (Todos / Débitos / Ingresos) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'expense', label: 'Solo Débitos / Pagos' },
            { id: 'income', label: 'Solo Ingresos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                typeFilter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-white/5 text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA / LISTADO DE MOVIMIENTOS */}
      {filteredTransactions.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-white/5 bg-[#0e0e12] space-y-3">
          <Receipt size={40} className="mx-auto text-zinc-600 mb-2" />
          <h3 className="text-sm font-semibold text-zinc-300">No hay movimientos con estos filtros</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Registra débitos operativos para monitorear el consumo de servidores y herramientas de desarrollo.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
          >
            + Registrar Débito Ahora
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTransactions.map((tx) => {
            const catInfo = EXPENSE_CATEGORIES_INFO[tx.category] || EXPENSE_CATEGORIES_INFO.other;
            const isExpense = tx.type === 'expense';

            return (
              <motion.div
                key={tx.id}
                layout
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-[#0e0e12] border border-white/5 hover:border-cyan-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                {/* Info Principal */}
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isExpense
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {isExpense ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {tx.concept}
                      </h4>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${catInfo.badge}`}>
                        {catInfo.icon} {catInfo.label}
                      </span>
                      {tx.recurring && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                          <Repeat size={9} /> Recurrente
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                      <span className="text-zinc-300 font-medium">{tx.provider}</span>
                      <span>•</span>
                      <span>{tx.date}</span>
                      <span>•</span>
                      <span className="text-zinc-500">{tx.paymentMethod}</span>
                    </p>
                  </div>
                </div>

                {/* Monto y Acciones */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                  <div className="text-right">
                    <div
                      className={`text-base font-black font-mono tracking-tight ${
                        isExpense ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {isExpense ? '-' : '+'}${tx.amount} {tx.currency}
                    </div>
                    <div>
                      {tx.status === 'paid' ? (
                        <span className="text-[10px] text-emerald-400 font-medium flex items-center justify-end gap-1">
                          <CheckCircle2 size={10} /> Pagado
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-medium flex items-center justify-end gap-1">
                          <Clock size={10} /> {tx.status === 'scheduled' ? 'Programado' : 'Pendiente'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(tx)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                      title={tx.status === 'paid' ? 'Marcar como pendiente' : 'Marcar como pagado'}
                    >
                      <CheckCircle2 size={13} className={tx.status === 'paid' ? 'text-emerald-400' : 'text-zinc-500'} />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(tx)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                      title="Editar movimiento"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id, tx.concept)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                      title="Eliminar movimiento"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL REGISTRAR / EDITAR MOVIMIENTO */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0e0e14] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <WalletCards size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {editingTx ? 'Editar Movimiento' : 'Registrar Débito / Movimiento'}
                    </h3>
                    <p className="text-xs text-zinc-400">Control de gastos de stacks, servicios o ingresos</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
                {/* Tipo de Movimiento */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'expense' })}
                    className={`py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      formData.type === 'expense'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                        : 'bg-white/5 text-zinc-400 border border-transparent'
                    }`}
                  >
                    <ArrowDownRight size={14} />
                    <span>Débito / Gasto Operativo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'income' })}
                    className={`py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      formData.type === 'income'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'bg-white/5 text-zinc-400 border border-transparent'
                    }`}
                  >
                    <ArrowUpRight size={14} />
                    <span>Ingreso / Cobro</span>
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Concepto / Detalle *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Vercel Pro Plan (Hosting & Edge)"
                    value={formData.concept}
                    onChange={(e) => setFormData({ ...formData, concept: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Proveedor / Empresa *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Vercel Inc. / OpenAI"
                      value={formData.provider}
                      onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Categoría</label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category: e.target.value as ExpenseCategory,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="infrastructure">⚡ Infraestructura & Cloud</option>
                      <option value="ai_apis">🧠 APIs IA & Tokens</option>
                      <option value="saas_tools">🛠️ Software & SaaS Tools</option>
                      <option value="resources_freelance">👥 Recursos & Freelancers</option>
                      <option value="legal_accounting">⚖️ Legal & Contable</option>
                      <option value="marketing">🚀 Marketing & Ads</option>
                      <option value="other">📦 Otros Gastos</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Monto *</label>
                    <input
                      type="number"
                      required
                      min={0.01}
                      step="any"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Moneda</label>
                    <select
                      value={formData.currency}
                      onChange={(e) =>
                        setFormData({ ...formData, currency: e.target.value as 'USD' | 'ARS' })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="USD">USD ($ Dólar)</option>
                      <option value="ARS">ARS ($ Pesos)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Fecha de Pago</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Método de Pago</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentMethod: e.target.value as FinanceTransaction['paymentMethod'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="Tarjeta Corporativa">Tarjeta Corporativa</option>
                      <option value="Transferencia">Transferencia Bancaria</option>
                      <option value="Crypto">Crypto USDT / USDC</option>
                      <option value="PayPal">PayPal</option>
                      <option value="Débito Automático">Débito Automático</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Estado</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as FinanceTransaction['status'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="paid">Pagado</option>
                      <option value="scheduled">Programado</option>
                      <option value="pending">Pendiente de Pago</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-xl bg-black/40 border border-white/5">
                  <input
                    type="checkbox"
                    id="recurringCheck"
                    checked={formData.recurring}
                    onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-0 bg-black/50 border-white/20"
                  />
                  <label htmlFor="recurringCheck" className="text-zinc-300 font-medium cursor-pointer">
                    Es un débito mensual recurrente (Stack fijo mensual)
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Notas / Nº de Factura</label>
                  <input
                    type="text"
                    placeholder="Ej: Factura #INV-2026-904"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30"
                  >
                    {editingTx ? 'Guardar Cambios' : 'Registrar Movimiento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FinancesTab;
