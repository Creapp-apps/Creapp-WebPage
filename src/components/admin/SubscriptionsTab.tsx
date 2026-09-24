// src/components/admin/SubscriptionsTab.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Repeat,
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  ExternalLink,
  Edit3,
  Trash2,
  CreditCard,
  Building2,
  ArrowRight,
  TrendingUp,
  X,
  FileCheck,
  Pause,
  Play,
  Share2,
} from 'lucide-react';
import {
  Subscription,
  SubscriptionStatus,
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  recordSubscriptionPayment,
  getFinancialMetrics,
  saveSubscriptions,
  parseArgentineNumber,
} from '@/lib/financeService';
import { Lead } from '@/lib/pipelineService';

interface SubscriptionsTabProps {
  leads?: Lead[];
}

export const SubscriptionsTab: React.FC<SubscriptionsTabProps> = ({ leads = [] }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [paymentModalSub, setPaymentModalSub] = useState<Subscription | null>(null);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Input formateado para moneda argentina (permite ingresar 125.000 sin truncar a 125)
  const [amountInput, setAmountInput] = useState('125.000');

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    clientName: '',
    planName: '',
    productType: 'Stacked SaaS' as Subscription['productType'],
    category: 'saas_license' as Subscription['category'],
    amount: 125000,
    currency: 'ARS' as 'USD' | 'ARS',
    billingDay: 23,
    billingCycle: 'monthly' as Subscription['billingCycle'],
    status: 'active' as SubscriptionStatus,
    startDate: new Date().toISOString().split('T')[0],
    nextBillingDate: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split('T')[0];
    })(),
    paymentMethod: 'Transferencia Bancaria' as Subscription['paymentMethod'],
    paymentLink: '',
    clientPhone: '',
    clientEmail: '',
    notes: '',
  });

  const loadData = () => {
    const rawSubs = getSubscriptions();
    // Auto-curar si alguna suscripción de AlPaso o en ARS se guardó con el bug del punto como $125
    let hasHealed = false;
    const healed = rawSubs.map((s) => {
      if (s.amount === 125 && (s.currency === 'ARS' || s.companyName.toLowerCase().includes('alpaso'))) {
        hasHealed = true;
        return { ...s, amount: 125000, currency: 'ARS' as const };
      }
      return s;
    });
    if (hasHealed) {
      saveSubscriptions(healed);
    }
    setSubscriptions(healed);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // KPIs en Pesos Argentinos ($ARS)
  const metrics = getFinancialMetrics();
  const totalActiveSubs = subscriptions.filter((s) => s.status === 'active').length;
  const totalPendingSubs = subscriptions.filter(
    (s) => s.status === 'pending_payment' || s.status === 'overdue'
  ).length;

  const totalMRR = subscriptions
    .filter((s) => s.status === 'active' || s.status === 'pending_payment')
    .reduce((acc, s) => acc + (s.currency === 'ARS' ? s.amount : s.amount * 1250), 0);

  // Filtrado
  const filteredSubscriptions = subscriptions.filter((s) => {
    const matchesSearch =
      s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.planName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesProduct = productFilter === 'all' || s.productType === productFilter;

    return matchesSearch && matchesStatus && matchesProduct;
  });

  const handleOpenCreate = () => {
    setEditingSub(null);
    setAmountInput('125.000');
    setFormData({
      companyName: '',
      clientName: '',
      planName: 'Abono Mensual de Servicio & SLA',
      productType: 'Stacked SaaS',
      category: 'saas_license',
      amount: 125000,
      currency: 'ARS',
      billingDay: 23,
      billingCycle: 'monthly',
      status: 'active',
      startDate: new Date().toISOString().split('T')[0],
      nextBillingDate: (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return d.toISOString().split('T')[0];
      })(),
      paymentMethod: 'Transferencia Bancaria',
      paymentLink: '',
      clientPhone: '',
      clientEmail: '',
      notes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (sub: Subscription) => {
    setEditingSub(sub);
    let realAmt = sub.amount;
    if (realAmt === 125 && (sub.currency === 'ARS' || sub.companyName.toLowerCase().includes('alpaso'))) {
      realAmt = 125000;
    }
    setAmountInput(realAmt.toLocaleString('es-AR'));
    setFormData({
      companyName: sub.companyName,
      clientName: sub.clientName,
      planName: sub.planName,
      productType: sub.productType,
      category: sub.category,
      amount: realAmt,
      currency: sub.currency || 'ARS',
      billingDay: sub.billingDay,
      billingCycle: sub.billingCycle,
      status: sub.status,
      startDate: sub.startDate,
      nextBillingDate: sub.nextBillingDate,
      paymentMethod: sub.paymentMethod,
      paymentLink: sub.paymentLink || '',
      clientPhone: sub.clientPhone || '',
      clientEmail: sub.clientEmail || '',
      notes: sub.notes || '',
    });
    setIsCreateModalOpen(true);
  };

  const handleSelectLead = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const leadAmt = lead.estimatedValue > 0 ? lead.estimatedValue : 125000;
    setAmountInput(leadAmt.toLocaleString('es-AR'));
    setFormData((prev) => ({
      ...prev,
      companyName: lead.company,
      clientName: lead.name,
      clientPhone: lead.phone || '',
      clientEmail: lead.email || '',
      currency: 'ARS',
      productType:
        lead.productType === 'Stacked SaaS'
          ? 'Stacked SaaS'
          : lead.productType === 'TrazApp'
          ? 'TrazApp'
          : lead.productType === 'Dental IA'
          ? 'Dental IA'
          : 'Desarrollo a Medida',
      planName: `Abono Mensual ${lead.productType}`,
      amount: leadAmt,
    }));
  };

  const handleSaveSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName) return;

    const parsedAmount = parseArgentineNumber(amountInput) || formData.amount;
    const finalData = {
      ...formData,
      amount: parsedAmount,
    };

    if (editingSub) {
      updateSubscription(editingSub.id, finalData);
      showToast('Suscripción actualizada exitosamente.');
    } else {
      createSubscription(finalData);
      showToast('Nueva suscripción registrada y activada.');
    }

    setIsCreateModalOpen(false);
    loadData();
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`¿Eliminar la suscripción de "${name}"?`)) return;
    deleteSubscription(id);
    loadData();
    showToast('Suscripción eliminada.');
  };

  const handleToggleStatus = (sub: Subscription) => {
    const newStatus: SubscriptionStatus = sub.status === 'active' ? 'paused' : 'active';
    updateSubscription(sub.id, { status: newStatus });
    loadData();
    showToast(`Suscripción ${newStatus === 'active' ? 'reactivada' : 'pausada'}.`);
  };

  const handleConfirmPayment = () => {
    if (!paymentModalSub) return;
    const res = recordSubscriptionPayment(paymentModalSub.id, paymentModalSub.paymentMethod, paymentNotes);
    if (res) {
      showToast(`¡Cobro de $${paymentModalSub.amount.toLocaleString('es-AR')} ${paymentModalSub.currency === 'ARS' ? '$ars' : 'USD'} registrado e ingresado a Finanzas!`);
    }
    setPaymentModalSub(null);
    setPaymentNotes('');
    loadData();
  };

  const handleSendWhatsAppReminder = (sub: Subscription) => {
    const cleanPhone = (sub.clientPhone || '').replace(/[^0-9]/g, '');
    const formattedAmount = `$${sub.amount.toLocaleString('es-AR')} ${sub.currency === 'ARS' ? '$ars' : 'USD'}`;
    const message = encodeURIComponent(
      `Hola ${sub.clientName || sub.companyName}, te escribimos desde CreApp. Te recordamos el abono mensual correspondiente al servicio de ${sub.planName} por un monto de ${formattedAmount}.\n\nCualquier consulta sobre la facturación o soporte quedamos a entera disposición. ¡Muchas gracias!`
    );
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    } else {
      alert('Esta suscripción no tiene un número telefónico registrado para enviar WhatsApp.');
    }
  };

  // Helper para días restantes hasta el cobro
  const getDaysUntilBilling = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
            className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-xl shadow-2xl flex items-center gap-2 text-xs font-semibold"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-emerald-950/20 via-[#0e0e14] to-zinc-950 border border-emerald-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Repeat size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Suscripciones & Abonos de Clientes</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                MRR Tracker
              </span>
            </h2>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Administra los contratos de servicio activos, cuotas mensuales recurrentes, días de facturación y cobro automatizado de clientes con productos CreApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Plus size={15} />
            <span>Nueva Suscripción</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Total */}
        <div className="p-5 rounded-2xl bg-[#0e0e12] border border-white/5 relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">MRR Recurrente</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            ${Math.round(totalMRR).toLocaleString('es-AR')}{' '}
            <span className="text-xs text-emerald-400 font-semibold">$ars / mes</span>
          </div>
          <p className="text-[11px] text-emerald-400/90 flex items-center gap-1 font-medium">
            <span>● {totalActiveSubs} contratos activos facturando</span>
          </p>
        </div>

        {/* Abonos Activos */}
        <div className="p-5 rounded-2xl bg-[#0e0e12] border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Clientes con Abono</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Building2 size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {subscriptions.length} <span className="text-xs text-zinc-500 font-normal">cuentas</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            {totalActiveSubs} activas • {subscriptions.filter((s) => s.status === 'paused').length} pausadas
          </p>
        </div>

        {/* Por Cobrar este Mes */}
        <div className="p-5 rounded-2xl bg-[#0e0e12] border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Cobros Pendientes</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Clock size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
            {totalPendingSubs} <span className="text-xs text-zinc-500 font-normal">por cobrar</span>
          </div>
          <p className="text-[11px] text-amber-300/80">
            Vencimientos programados para este ciclo
          </p>
        </div>

        {/* Tasa de Retención / Cumplimiento */}
        <div className="p-5 rounded-2xl bg-[#0e0e12] border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Salud de Cobranza</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <FileCheck size={15} />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {subscriptions.length > 0 ? Math.round((totalActiveSubs / subscriptions.length) * 100) : 100}%
          </div>
          <p className="text-[11px] text-zinc-400">
            Ratio de contratos operativos sin mora
          </p>
        </div>
      </div>

      {/* FILTROS & BARRA DE BÚSQUEDA */}
      <div className="p-4 rounded-2xl bg-[#0e0e12] border border-white/5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por cliente, empresa o plan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* Filtro de Producto */}
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="all">Todos los Productos</option>
            <option value="Stacked SaaS">Stacked SaaS</option>
            <option value="TrazApp">TrazApp</option>
            <option value="Dental IA">Dental IA</option>
            <option value="Infraestructura & SLA">Infraestructura & SLA</option>
            <option value="Desarrollo a Medida">Desarrollo a Medida</option>
          </select>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'active', label: 'Activas' },
            { id: 'pending_payment', label: 'Por Cobrar' },
            { id: 'paused', label: 'Pausadas' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-white/5 text-zinc-400 hover:text-zinc-200 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE SUSCRIPCIONES */}
      {filteredSubscriptions.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-white/5 bg-[#0e0e12] space-y-3">
          <Repeat size={40} className="mx-auto text-zinc-600 mb-2" />
          <h3 className="text-sm font-semibold text-zinc-300">No hay suscripciones en esta vista</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Registra tu primer abono recurrente de cliente para comenzar a rastrear ingresos mensuales.
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
          >
            + Crear Nueva Suscripción
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSubscriptions.map((sub) => {
            const daysLeft = getDaysUntilBilling(sub.nextBillingDate);
            const isDueSoon = daysLeft >= 0 && daysLeft <= 5;
            const isOverdue = daysLeft < 0;

            let productBadgeStyle = 'bg-blue-500/10 text-blue-300 border-blue-500/20';
            if (sub.productType === 'Stacked SaaS') productBadgeStyle = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
            if (sub.productType === 'TrazApp') productBadgeStyle = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
            if (sub.productType === 'Dental IA') productBadgeStyle = 'bg-pink-500/10 text-pink-300 border-pink-500/20';

            return (
              <motion.div
                key={sub.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-[#0e0e12] border border-white/5 hover:border-emerald-500/30 transition-all shadow-lg flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top Bar: Empresa, Producto y Estado */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors">
                          {sub.companyName}
                        </h3>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${productBadgeStyle}`}>
                          {sub.productType}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                        <span>Contacto: {sub.clientName}</span>
                        {sub.clientPhone && <span>• {sub.clientPhone}</span>}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {sub.status === 'active' && (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold flex items-center gap-1">
                          <CheckCircle2 size={12} /> Activa
                        </span>
                      )}
                      {sub.status === 'pending_payment' && (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold flex items-center gap-1">
                          <Clock size={12} /> Por Cobrar
                        </span>
                      )}
                      {sub.status === 'paused' && (
                        <span className="px-2.5 py-1 rounded-xl bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[11px] font-semibold flex items-center gap-1">
                          <Pause size={12} /> Pausada
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Plan Details & Monto Card */}
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-300 font-semibold">{sub.planName}</span>
                      <div className="text-right">
                        <span className="text-base font-black text-emerald-400 font-mono">
                          ${sub.amount.toLocaleString('es-AR')} {sub.currency === 'ARS' ? '$ars' : 'USD'}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-normal"> /mes</span>
                      </div>
                    </div>

                    {/* Fechas de Cobro */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[11px]">
                      <div>
                        <span className="text-zinc-500 block">Día de cobro mensual:</span>
                        <span className="text-zinc-200 font-medium">Día {sub.billingDay} de cada mes</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Próximo cobro:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-200 font-semibold">{sub.nextBillingDate}</span>
                          {isOverdue && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                              Vencido
                            </span>
                          )}
                          {isDueSoon && !isOverdue && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              En {daysLeft} días
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {sub.notes && (
                      <p className="text-[11px] text-zinc-400 italic pt-1 border-t border-white/5">
                        📝 {sub.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Registrar Cobro Button */}
                    <button
                      onClick={() => setPaymentModalSub(sub)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      title="Registrar cobro del mes y renovar ciclo"
                    >
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>Registrar Cobro</span>
                    </button>

                    {/* WhatsApp Recordatorio */}
                    {sub.clientPhone && (
                      <button
                        onClick={() => handleSendWhatsAppReminder(sub)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-400 border border-white/10 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Enviar recordatorio de cobro por WhatsApp"
                      >
                        <Send size={12} />
                        <span>Aviso WA</span>
                      </button>
                    )}

                    {/* Pausar / Reactivar */}
                    <button
                      onClick={() => handleToggleStatus(sub)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                      title={sub.status === 'active' ? 'Pausar abono' : 'Reactivar abono'}
                    >
                      {sub.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(sub)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                      title="Editar suscripción"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(sub.id, sub.companyName)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                      title="Eliminar suscripción"
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

      {/* MODAL REGISTRAR COBRO */}
      <AnimatePresence>
        {paymentModalSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0e0e14] border border-emerald-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Registrar Cobro Recurrente</h3>
                    <p className="text-xs text-zinc-400">{paymentModalSub.companyName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPaymentModalSub(null)}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-zinc-300">
                  <span>Monto del Abono:</span>
                  <span className="font-bold text-emerald-400 text-sm font-mono">
                    ${paymentModalSub.amount} {paymentModalSub.currency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Plan:</span>
                  <span>{paymentModalSub.planName}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Método Habitual:</span>
                  <span>{paymentModalSub.paymentMethod}</span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <label className="text-zinc-400">Notas de Cobro / Comprobante (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ej: Transferencia Banco Galicia #48293"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <p className="text-[11px] text-zinc-400 leading-relaxed bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-300/90">
                💡 Al confirmar, se actualizará la fecha de próximo cobro al mes entrante y se registrará automáticamente el ingreso en el módulo de <strong>Finanzas</strong>.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalSub(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>Confirmar Cobro</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL CREAR / EDITAR SUSCRIPCIÓN */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0e0e14] border border-white/10 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <Repeat size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {editingSub ? 'Editar Suscripción' : 'Nueva Suscripción de Cliente'}
                    </h3>
                    <p className="text-xs text-zinc-400">Definir contrato de servicio y facturación periódica</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-zinc-500 hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Selector Rápido desde Leads si estamos creando */}
              {!editingSub && leads.length > 0 && (
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1.5">
                  <span className="text-purple-300 font-semibold block">
                    ⚡ Vincular con cliente existente en el Pipeline CRM:
                  </span>
                  <select
                    onChange={(e) => handleSelectLead(e.target.value)}
                    defaultValue=""
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-purple-500/30 text-white text-xs focus:outline-none"
                  >
                    <option value="" disabled>
                      Seleccionar cliente del Pipeline para autocompletar...
                    </option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.company} ({l.name}) — {l.productType}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <form onSubmit={handleSaveSubscription} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Empresa / Negocio *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Clínica Dental Norte"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Nombre de Contacto</label>
                    <input
                      type="text"
                      placeholder="Ej: Dr. Alejandro"
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Producto CreApp</label>
                    <select
                      value={formData.productType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          productType: e.target.value as Subscription['productType'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="Stacked SaaS">Stacked SaaS</option>
                      <option value="TrazApp">TrazApp</option>
                      <option value="Dental IA">Dental IA</option>
                      <option value="Infraestructura & SLA">Infraestructura & SLA</option>
                      <option value="Desarrollo a Medida">Desarrollo a Medida</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Nombre del Plan / Abono *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Dental-IA Pro & Agente WA"
                      value={formData.planName}
                      onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Monto Recurrente *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-zinc-500 font-mono text-xs">$</span>
                      <input
                        type="text"
                        required
                        placeholder="125.000"
                        value={amountInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAmountInput(val);
                          const parsed = parseArgentineNumber(val);
                          setFormData((prev) => ({ ...prev, amount: parsed }));
                        }}
                        onBlur={() => {
                          const parsed = parseArgentineNumber(amountInput);
                          if (parsed > 0) {
                            setAmountInput(parsed.toLocaleString('es-AR'));
                            setFormData((prev) => ({ ...prev, amount: parsed }));
                          }
                        }}
                        className="w-full pl-7 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 block">
                      Interpretado: ${(parseArgentineNumber(amountInput) || formData.amount).toLocaleString('es-AR')} {formData.currency === 'ARS' ? '$ars' : 'USD'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Moneda</label>
                    <select
                      value={formData.currency}
                      onChange={(e) =>
                        setFormData({ ...formData, currency: e.target.value as 'USD' | 'ARS' })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="ARS">ARS ($ Pesos Argentinos)</option>
                      <option value="USD">USD ($ Dólar)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Día de Cobro Mensual</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={formData.billingDay}
                      onChange={(e) =>
                        setFormData({ ...formData, billingDay: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Próxima Fecha de Cobro</label>
                    <input
                      type="date"
                      value={formData.nextBillingDate}
                      onChange={(e) =>
                        setFormData({ ...formData, nextBillingDate: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Método de Cobro Habitual</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          paymentMethod: e.target.value as Subscription['paymentMethod'],
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                      <option value="MercadoPago">MercadoPago</option>
                      <option value="Stripe">Stripe</option>
                      <option value="Crypto USDT">Crypto USDT</option>
                      <option value="Efectivo">Efectivo</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="+54 9 11 1234-5678"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-zinc-400 font-medium">Email de Facturación</label>
                    <input
                      type="email"
                      placeholder="admin@empresa.com"
                      value={formData.clientEmail}
                      onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-400 font-medium">Notas / Alcance del Contrato</label>
                  <textarea
                    rows={2}
                    placeholder="Detalles sobre SLA, servidores incluidos, soporte..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/30"
                  >
                    {editingSub ? 'Guardar Cambios' : 'Activar Suscripción'}
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

export default SubscriptionsTab;
