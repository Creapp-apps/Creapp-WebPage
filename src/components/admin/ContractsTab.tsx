import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSignature,
  FileCheck,
  Shield,
  ShieldCheck,
  Download,
  Printer,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Building2,
  Eye,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Plus,
  Search,
  Filter,
  MessageSquare,
  Phone,
  ArrowRight,
  Lock,
  RefreshCw,
  FileText,
  X,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import {
  CREAPP_PRODUCTS,
  STACKED_PRESET,
  TRAZAPP_PRESET,
  DENTALIA_PRESET,
  CreappProductPreset,
} from '@/lib/serviceContractTemplates';
import { Lead } from '@/lib/pipelineService';
import {
  ServiceContract,
  ContractStatus,
  getContracts,
  createContract,
  updateContract,
  deleteContract,
  markContractAsSent,
  signContract,
  syncContractsWithSupabase,
} from '@/lib/contractService';

interface ContractsTabProps {
  leads: Lead[];
}

export const ContractsTab: React.FC<ContractsTabProps> = ({ leads }) => {
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'list' | 'create'>('list');

  // Filters for contract list
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');

  // Selected contract for detailed audit modal
  const [inspectingContract, setInspectingContract] = useState<ServiceContract | null>(null);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state for creating a contract
  const [selectedProductKey, setSelectedProductKey] = useState<string>('stacked');
  const [clientName, setClientName] = useState<string>('');
  const [clientTaxId, setClientTaxId] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [contractDate, setContractDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [monthlyFee, setMonthlyFee] = useState<string>('$125.000 $ars');
  const [setupFee, setSetupFee] = useState<string>('Bonificado');
  const [slaUptime, setSlaUptime] = useState<string>('99.5%');
  const [responseTimeCritical, setResponseTimeCritical] = useState<string>('< 2 horas (Incidentes Críticos P1)');
  const [durationMonths, setDurationMonths] = useState<string>('6 meses');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');

  useEffect(() => {
    setContracts(getContracts());
    // Sincronizar en tiempo real con la base de datos Supabase (verifica estado de AlPaso y propuestas)
    syncContractsWithSupabase().then((synced) => {
      setContracts(synced);
    });
  }, []);

  const refreshContracts = () => {
    setContracts(getContracts());
    syncContractsWithSupabase().then((synced) => {
      setContracts(synced);
      if (inspectingContract) {
        const updated = synced.find((c) => c.id === inspectingContract.id);
        if (updated) setInspectingContract(updated);
      }
    });
  };

  const currentPreset: CreappProductPreset =
    selectedProductKey === 'stacked'
      ? STACKED_PRESET
      : selectedProductKey === 'trazapp'
      ? TRAZAPP_PRESET
      : selectedProductKey === 'dental-ia'
      ? DENTALIA_PRESET
      : STACKED_PRESET;

  // When changing product preset in generator, sync default fees & SLA
  const handleProductPresetChange = (key: string) => {
    setSelectedProductKey(key);
    if (key === 'stacked') {
      setMonthlyFee('$125.000 $ars');
      setSlaUptime('99.5%');
      setResponseTimeCritical('< 2 horas (Incidentes Críticos P1)');
    } else if (key === 'trazapp') {
      setMonthlyFee('$180.000 $ars');
      setSlaUptime('99.9%');
      setResponseTimeCritical('< 1 hora (Incidentes Críticos P1)');
    } else if (key === 'dental-ia') {
      setMonthlyFee('$150.000 $ars');
      setSlaUptime('99.8%');
      setResponseTimeCritical('< 1 hora (Incidentes Críticos P1)');
    }
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setClientName(lead.company || lead.name);
      setClientPhone(lead.phone || '');
      setClientEmail(lead.email || '');
      if (lead.productType === 'Stacked SaaS') handleProductPresetChange('stacked');
      if (lead.productType === 'TrazApp') handleProductPresetChange('trazapp');
      if (lead.productType === 'Dental IA') handleProductPresetChange('dental-ia');
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert('Por favor ingrese el nombre del cliente.');
      return;
    }

    const ref = `#${selectedProductKey.toUpperCase()}-${contractDate.replace(/-/g, '')}-${Math.floor(10 + Math.random() * 90)}`;

    const newContract = createContract({
      contractRef: ref,
      clientName: clientName.trim(),
      clientTaxId: clientTaxId.trim() || undefined,
      clientEmail: clientEmail.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      leadId: selectedLeadId || undefined,
      productId: selectedProductKey as any,
      productName: currentPreset.name,
      monthlyFee,
      setupFee,
      currency: 'USD',
      slaUptime,
      responseTimeCritical,
      supportChannels: currentPreset.default_service_details.support_channels,
      effectiveDate: contractDate,
      durationMonths,
      status: 'sent',
    });

    refreshContracts();
    setActiveSubTab('list');
    setInspectingContract(newContract);
  };

  const handleCopyLink = (contractId: string) => {
    const target = contracts.find((c) => c.id === contractId);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://creapp.com.ar';
    const link = target?.slug ? `${origin}/propuesta/${target.slug}` : `${origin}/contrato/${contractId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(contractId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendWhatsApp = (c: ServiceContract) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://creapp.com.ar';
    const link = c.slug ? `${origin}/propuesta/${c.slug}` : `${origin}/contrato/${c.id}`;
    const cleanPhone = c.clientPhone ? c.clientPhone.replace(/[^0-9]/g, '') : '';
    const text = encodeURIComponent(
      `Hola ${c.clientName || 'equipo'},\n\nLes compartimos el enlace oficial para la revisión y firma digital de su Contrato de Servicio & SLA de ${c.productName}:\n\n🔗 ${link}\n\nQuedamos a su total disposición ante cualquier consulta técnica o administrativa.\n\nEquipo CreApp Software Lab`
    );

    markContractAsSent(c.id, 'WhatsApp');
    refreshContracts();

    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  const handleManualSign = (c: ServiceContract) => {
    const signer = prompt(`Confirmar firma manual para ${c.clientName}. Ingrese el nombre del firmante:`, c.clientName);
    if (!signer) return;
    signContract(c.id, {
      signedByName: signer,
      signedByRole: 'Firmado Físico / Confirmado por Cliente',
    });
    refreshContracts();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`¿Confirma eliminar el contrato de "${name}"?`)) {
      deleteContract(id);
      refreshContracts();
      if (inspectingContract?.id === id) setInspectingContract(null);
    }
  };

  // KPIs
  const totalContracts = contracts.length;
  const signedContracts = contracts.filter((c) => c.status === 'signed');
  const viewedContracts = contracts.filter((c) => c.status === 'viewed');
  const pendingContracts = contracts.filter((c) => c.status === 'sent' || c.status === 'viewed');

  const filteredContracts = contracts.filter((c) => {
    const matchSearch =
      c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contractRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.clientTaxId && c.clientTaxId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'signed'
        ? c.status === 'signed'
        : statusFilter === 'viewed'
        ? c.status === 'viewed'
        : statusFilter === 'sent'
        ? c.status === 'sent'
        : statusFilter === 'draft'
        ? c.status === 'draft'
        : true;

    const matchProduct = productFilter === 'all' || c.productId === productFilter;

    return matchSearch && matchStatus && matchProduct;
  });

  return (
    <div className="space-y-6">
      {/* HEADER WITH VIEW SWITCHER */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-amber-950/20 via-[#0e0e14] to-zinc-950 border border-amber-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <FileSignature size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Gestión de Contratos de Servicio & SLA</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                {totalContracts} Emitidos
              </span>
            </h2>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Monitorea en tiempo real el ciclo de vida de los acuerdos: emisión, aperturas repetidas por el cliente, confirmación y firma electrónica con certificado de SLA garantizado.
          </p>
        </div>

        {/* Action Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('list')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'list'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Layers size={14} />
            <span>Contratos & Seguimiento ({totalContracts})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('create')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'create'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Plus size={14} />
            <span>+ Emitir Nuevo Contrato</span>
          </button>
        </div>
      </div>

      {/* METRICS & AUDIT KPI BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Contratos */}
        <div className="p-4 rounded-2xl bg-[#0f0f15] border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-medium">
            <span>Contratos Emitidos</span>
            <FileText size={15} className="text-zinc-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{totalContracts}</div>
          <div className="text-[10px] text-zinc-500">Historial completo de CreApp</div>
        </div>

        {/* Firmados & Vigentes */}
        <div className="p-4 rounded-2xl bg-[#0f0f15] border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-medium">
            <span>Firmados & Activos</span>
            <CheckCircle2 size={15} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {signedContracts.length}
          </div>
          <div className="text-[10px] text-emerald-500/80 font-medium">
            {totalContracts > 0
              ? `${Math.round((signedContracts.length / totalContracts) * 100)}% tasa de confirmación`
              : '0% confirmación'}
          </div>
        </div>

        {/* Abiertos por el cliente */}
        <div className="p-4 rounded-2xl bg-[#0f0f15] border border-blue-500/20 space-y-1">
          <div className="flex items-center justify-between text-blue-400 text-xs font-medium">
            <span>Abiertos por Cliente</span>
            <Eye size={15} className="text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">
            {viewedContracts.length}
          </div>
          <div className="text-[10px] text-blue-400/80 font-medium">
            {viewedContracts.some((c) => c.viewCount >= 3)
              ? '🔥 Clientes abriendo repetidas veces'
              : 'En revisión por el cliente'}
          </div>
        </div>

        {/* Pendientes de Firma */}
        <div className="p-4 rounded-2xl bg-[#0f0f15] border border-amber-500/20 space-y-1">
          <div className="flex items-center justify-between text-amber-400 text-xs font-medium">
            <span>Pendientes de Firma</span>
            <Clock size={15} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {pendingContracts.length}
          </div>
          <div className="text-[10px] text-amber-500/80 font-medium">Esperando firma digital</div>
        </div>
      </div>

      {/* VIEW 1: CONTRACT LIST & TRACKING DASHBOARD */}
      {activeSubTab === 'list' && (
        <div className="space-y-4">
          {/* Filters & Search Toolbar */}
          <div className="p-3 rounded-2xl bg-[#0e0e14] border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, CUIT, #REF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder:text-zinc-500 text-xs focus:outline-none focus:border-amber-500 w-56 sm:w-72"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-zinc-300 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all" className="bg-[#111]">Todos los Estados</option>
                <option value="signed" className="bg-[#111]">Firmados & Vigentes</option>
                <option value="viewed" className="bg-[#111]">Abiertos / En Revisión</option>
                <option value="sent" className="bg-[#111]">Enviados (Sin abrir)</option>
                <option value="draft" className="bg-[#111]">Borradores</option>
              </select>

              {/* Product Filter */}
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-zinc-300 text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all" className="bg-[#111]">Todos los Productos</option>
                <option value="stacked" className="bg-[#111]">Stacked SaaS</option>
                <option value="trazapp" className="bg-[#111]">TrazApp</option>
                <option value="dental-ia" className="bg-[#111]">Dental IA</option>
              </select>
            </div>

            <span className="text-[11px] font-mono text-zinc-500">
              Mostrando {filteredContracts.length} de {contracts.length} acuerdos
            </span>
          </div>

          {/* Contracts Grid / Cards */}
          {filteredContracts.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#0e0e14] border border-white/5 space-y-3">
              <FileSignature size={36} className="mx-auto text-zinc-600" />
              <h3 className="text-base font-bold text-white">No se encontraron contratos</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                No hay contratos con los filtros seleccionados. Puedes generar uno nuevo haciendo clic en "+ Emitir Nuevo Contrato".
              </p>
              <button
                onClick={() => setActiveSubTab('create')}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Emitir Primer Contrato</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {filteredContracts.map((c) => {
                const isSigned = c.status === 'signed';
                const isViewed = c.status === 'viewed';
                const isOpenedMultiple = (c.viewCount || 0) >= 3 && !isSigned;

                return (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 sm:p-5 rounded-2xl bg-[#0f0f16] border transition-all hover:bg-[#12121a] flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isSigned
                        ? 'border-emerald-500/30 hover:border-emerald-500/50'
                        : isOpenedMultiple
                        ? 'border-blue-500/40 hover:border-blue-500/60 shadow-lg shadow-blue-950/20'
                        : 'border-white/5 hover:border-white/15'
                    }`}
                  >
                    {/* Left: Product & Client Information */}
                    <div className="space-y-1.5 min-w-[220px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                          {c.contractRef}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            c.productId === 'stacked'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : c.productId === 'trazapp'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : c.productId === 'dental-ia'
                              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                              : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          }`}
                        >
                          {c.productName}
                        </span>

                        {isOpenedMultiple && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse flex items-center gap-1">
                            <span>🔥 Abierto {c.viewCount} veces</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white tracking-tight">
                        {c.clientName}
                      </h3>

                      <div className="text-xs text-zinc-400 flex items-center gap-3 font-mono flex-wrap">
                        {c.clientTaxId && (
                          <span className="flex items-center gap-1 text-zinc-500">
                            <Building2 size={12} /> CUIT: {c.clientTaxId}
                          </span>
                        )}
                        <span>•</span>
                        <span>Vigencia: {c.effectiveDate}</span>
                        <span>•</span>
                        <span className="text-zinc-300 font-semibold">{c.monthlyFee} / mes</span>
                      </div>
                    </div>

                    {/* Middle: Live Status & Tracking Detail */}
                    <div className="min-w-[200px] p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                      {isSigned ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 size={12} /> Firmado & Vigente
                          </span>
                          <div className="text-[10px] text-zinc-400">
                            Firmado por: <strong>{c.signedByName}</strong>
                          </div>
                          {c.signedAt && (
                            <div className="text-[9px] font-mono text-emerald-400/80">
                              {new Date(c.signedAt).toLocaleDateString('es-AR')} • {new Date(c.signedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                            </div>
                          )}
                        </div>
                      ) : isViewed ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            <Eye size={12} /> Abierto por el Cliente ({c.viewCount} {c.viewCount === 1 ? 'vez' : 'veces'})
                          </span>
                          {c.lastViewedAt && (
                            <div className="text-[10px] text-zinc-400">
                              Última lectura: {new Date(c.lastViewedAt).toLocaleDateString('es-AR')} a las {new Date(c.lastViewedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
                            </div>
                          )}
                        </div>
                      ) : c.status === 'sent' ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            <Clock size={12} /> Enviado (Esperando Apertura)
                          </span>
                          {c.sentAt && (
                            <div className="text-[10px] text-zinc-500 font-mono">
                              Enviado el {new Date(c.sentAt).toLocaleDateString('es-AR')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-700/40 text-zinc-300 border border-zinc-600/30">
                            <FileText size={12} /> Borrador Interno
                          </span>
                          <div className="text-[10px] text-zinc-500">Pendiente de remisión</div>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Copy Link to Client */}
                      <button
                        onClick={() => handleCopyLink(c.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Copiar link de firma para el cliente"
                      >
                        {copiedId === c.id ? (
                          <>
                            <Check size={13} className="text-emerald-400" />
                            <span className="text-emerald-400 font-semibold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} />
                            <span>Link Firma</span>
                          </>
                        )}
                      </button>

                      {/* WhatsApp Share */}
                      <button
                        onClick={() => handleSendWhatsApp(c)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Enviar contrato por WhatsApp al cliente"
                      >
                        <MessageSquare size={13} />
                        <span>WhatsApp</span>
                      </button>

                      {/* Inspect / Audit details modal */}
                      <button
                        onClick={() => setInspectingContract(c)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Ver detalles, auditoría y previsualización"
                      >
                        <Eye size={13} />
                        <span>Inspeccionar</span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(c.id, c.clientName)}
                        className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Eliminar contrato"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: NEW CONTRACT GENERATOR */}
      {activeSubTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Column */}
          <div className="p-6 rounded-3xl bg-[#0e0e14] border border-white/5 space-y-5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Shield size={16} className="text-amber-400" />
                <span>Parámetros del Nuevo Contrato</span>
              </h3>
              <button
                onClick={() => setActiveSubTab('list')}
                className="text-[11px] text-zinc-400 hover:text-white"
              >
                Volver a la lista
              </button>
            </div>

            {/* Product Preset Selector */}
            <div>
              <label className="block text-zinc-400 mb-1.5 font-medium">Producto / Solución CreApp</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'stacked', name: 'Stacked SaaS' },
                  { id: 'trazapp', name: 'TrazApp' },
                  { id: 'dental-ia', name: 'Dental IA' },
                ].map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleProductPresetChange(prod.id)}
                    className={`p-2.5 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                      selectedProductKey === prod.id
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                        : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {prod.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Lead Picker */}
            <div>
              <label className="block text-zinc-400 mb-1.5 font-medium">Vincular con Cuenta del Pipeline CRM</label>
              <select
                value={selectedLeadId}
                onChange={(e) => handleSelectLead(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="">Seleccionar lead del CRM...</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id} className="bg-[#111]">
                    {l.company || l.name} — {l.productType}
                  </option>
                ))}
              </select>
            </div>

            {/* Client Details Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-3.5 pt-2 border-t border-white/5">
              <div>
                <label className="block text-zinc-400 mb-1">Nombre Comercial del Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Burger Club Palermo"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1">CUIT / Identificación Fiscal</label>
                  <input
                    type="text"
                    placeholder="30-71649281-9"
                    value={clientTaxId}
                    onChange={(e) => setClientTaxId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+54 11 4829-1920"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1">Cuota Recurrente Mensual</label>
                  <input
                    type="text"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Setup / Puesta en marcha</label>
                  <input
                    type="text"
                    value={setupFee}
                    onChange={(e) => setSetupFee(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1">Fecha de Inicio de Vigencia</label>
                  <input
                    type="date"
                    value={contractDate}
                    onChange={(e) => setContractDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Plazo de Vigencia</label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="3 meses" className="bg-[#111]">3 meses</option>
                    <option value="6 meses" className="bg-[#111]">6 meses</option>
                    <option value="12 meses" className="bg-[#111]">12 meses (1 año)</option>
                    <option value="24 meses" className="bg-[#111]">24 meses (2 años)</option>
                  </select>
                </div>
              </div>

              {/* SLA Details */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
                  Garantías de Nivel de Servicio (SLA):
                </span>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Disponibilidad (Uptime):</span>
                  <input
                    type="text"
                    value={slaUptime}
                    onChange={(e) => setSlaUptime(e.target.value)}
                    className="w-20 px-2 py-0.5 rounded bg-black border border-white/10 text-emerald-400 font-mono text-right"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Respuesta Crítica:</span>
                  <input
                    type="text"
                    value={responseTimeCritical}
                    onChange={(e) => setResponseTimeCritical(e.target.value)}
                    className="w-44 px-2 py-0.5 rounded bg-black border border-white/10 text-amber-300 font-mono text-[11px] text-right"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('list')}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileSignature size={14} />
                  <span>Guardar & Emitir Contrato</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live Document Preview Column */}
          <div className="lg:col-span-2 p-8 rounded-3xl bg-[#0b0b10] border border-white/10 shadow-2xl text-zinc-300 font-serif leading-relaxed text-xs space-y-5 print:text-black print:bg-white">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 print:border-black">
              <div>
                <div className="font-sans font-bold text-sm tracking-wider text-white print:text-black">
                  CREAPP SOFTWARE LAB
                </div>
                <div className="text-[10px] text-zinc-400 font-sans print:text-zinc-600">
                  FINTECH & INNOVATION HUB // ACUERDO DE SERVICIO TECNOLÓGICO (SLA)
                </div>
              </div>
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                PREVIEW: #{selectedProductKey.toUpperCase()}-{contractDate.replace(/-/g, '')}
              </span>
            </div>

            <div>
              <h4 className="font-sans font-bold text-base text-white mb-2 print:text-black">
                Contrato de Licenciamiento y Prestación de Servicios SaaS: {currentPreset.name}
              </h4>
              <p className="text-justify text-zinc-300 print:text-zinc-800">
                En la fecha <strong>{contractDate}</strong>, comparecen por una parte <strong>CREAPP INNOVATION HUB</strong> (en adelante "El Proveedor"), y por la otra parte la entidad <strong>{clientName || '[Razón Social / Nombre del Cliente]'}</strong> ({clientTaxId || '[Identificación Fiscal / CUIT]'}) (en adelante "El Cliente"), conviniendo las siguientes cláusulas y condiciones:
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <strong className="font-sans font-semibold text-white block mb-1 print:text-black">
                  1. OBJETO Y ALCANCE TECNOLÓGICO
                </strong>
                <p className="text-justify text-zinc-400 print:text-zinc-700">
                  {currentPreset.contract_description} El Proveedor pondrá a disposición la infraestructura cloud, base de datos de alta disponibilidad y actualizaciones continuas del sistema.
                </p>
              </div>

              <div>
                <strong className="font-sans font-semibold text-white block mb-1 print:text-black">
                  2. NIVEL DE SERVICIO (SLA) Y CANALES DE SOPORTE
                </strong>
                <p className="text-justify text-zinc-400 print:text-zinc-700">
                  Se garantiza un Uptime mensual de <strong>{slaUptime}</strong>. Canal de atención: <strong>{currentPreset.default_service_details.support_channels}</strong>. Tiempo de respuesta para incidentes críticos: <strong>{responseTimeCritical}</strong>.
                </p>
              </div>

              <div>
                <strong className="font-sans font-semibold text-white block mb-1 print:text-black">
                  3. ESQUEMA FINANCIERO Y CUOTAS
                </strong>
                <p className="text-justify text-zinc-400 print:text-zinc-700">
                  El costo del setup inicial es <strong>{setupFee}</strong>. La cuota recurrente mensual estipulada es de <strong>{monthlyFee}</strong>, pagadera por período adelantado dentro de los primeros 10 días de cada mes calendario. Plazo inicial mínimo: <strong>{durationMonths}</strong>.
                </p>
              </div>
            </div>

            {/* Firmas Preview */}
            <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-8 print:border-black font-sans">
              <div className="space-y-1 text-center">
                <div className="h-12 border-b border-dashed border-zinc-700 print:border-black flex items-end justify-center pb-1">
                  <span className="font-bold text-xs text-purple-400 print:text-black">
                    Sebastián Maza — CreApp CEO
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                  Por CreApp Software Lab
                </span>
              </div>

              <div className="space-y-1 text-center">
                <div className="h-12 border-b border-dashed border-zinc-700 print:border-black flex items-end justify-center pb-1">
                  <span className="font-semibold text-xs text-zinc-400 print:text-black">
                    {clientName || '[Firma del Cliente]'}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                  Firma Representante Legal
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INSPECTION & AUDIT MODAL */}
      <AnimatePresence>
        {inspectingContract && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectingContract(null)}
              className="fixed inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl bg-[#0e0e16] border border-amber-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 z-10 max-h-[92vh] overflow-y-auto my-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setInspectingContract(null)}
                className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div className="space-y-1 pr-8">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {inspectingContract.contractRef}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10">
                    {inspectingContract.productName}
                  </span>
                  {inspectingContract.status === 'signed' ? (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Firmado & Vigente
                    </span>
                  ) : inspectingContract.status === 'viewed' ? (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                      <Eye size={12} /> Abierto {inspectingContract.viewCount} veces
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      <Clock size={12} /> Enviado
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white tracking-tight">
                  {inspectingContract.clientName}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Cuota Mensual: <strong className="text-white">{inspectingContract.monthlyFee}</strong> • SLA: <strong className="text-emerald-400">{inspectingContract.slaUptime}</strong> • Plazo: {inspectingContract.durationMonths}
                </p>
              </div>

              {/* Quick Actions in Modal */}
              <div className="p-3.5 rounded-2xl bg-black/50 border border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleCopyLink(inspectingContract.id)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedId === inspectingContract.id ? (
                      <>
                        <Check size={13} className="text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Enlace Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copiar Link de Firma</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleSendWhatsApp(inspectingContract)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <MessageSquare size={13} />
                    <span>Enviar WhatsApp</span>
                  </button>

                  <a
                    href={inspectingContract.slug ? `/propuesta/${inspectingContract.slug}` : `/contrato/${inspectingContract.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <ExternalLink size={13} />
                    <span>Abrir Portal Cliente ↗</span>
                  </a>
                </div>

                {inspectingContract.status !== 'signed' && (
                  <button
                    onClick={() => handleManualSign(inspectingContract)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 size={13} />
                    <span>Marcar como Firmado</span>
                  </button>
                )}
              </div>

              {/* Banner de Sincronización para AlPaso */}
              {inspectingContract.slug === 'al-paso' && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
                  <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-white block">Contrato Original de AlPaso Burguers Conectado</span>
                    <p className="text-emerald-300/80 leading-relaxed">
                      Este acuerdo corresponde a la propuesta oficial generada el 21/09/2026 para <strong>Dante Luca De Simone (DNI: 20-41883145-7)</strong> por <strong>$125.000 $ars / mes</strong>. El enlace oficial es <code className="px-1.5 py-0.5 rounded bg-black/40 text-emerald-300 font-mono">/propuesta/al-paso</code>. Está sincronizado en tiempo real con Supabase y detectará automáticamente la firma digital del cliente cuando la efectúe.
                    </p>
                  </div>
                </div>
              )}

              {/* Activity & Tracking Log */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-400" />
                  <span>Historial de Actividad & Lecturas del Cliente:</span>
                </h4>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                  {inspectingContract.activityHistory && inspectingContract.activityHistory.length > 0 ? (
                    inspectingContract.activityHistory.map((act) => (
                      <div key={act.id} className="flex items-start gap-3 text-xs">
                        <div className="p-1 rounded-full bg-white/5 text-amber-400 mt-0.5">
                          {act.type === 'signed' ? (
                            <CheckCircle2 size={13} className="text-emerald-400" />
                          ) : act.type === 'viewed' ? (
                            <Eye size={13} className="text-blue-400" />
                          ) : act.type === 'sent' ? (
                            <Share2 size={13} className="text-purple-400" />
                          ) : (
                            <FileSignature size={13} className="text-zinc-400" />
                          )}
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <p className="text-zinc-200 font-medium">{act.description}</p>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {new Date(act.timestamp).toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-500 italic">Sin registros previos.</span>
                  )}
                </div>
              </div>

              {/* Digital Signature Certificate (if signed) */}
              {inspectingContract.status === 'signed' && (
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <ShieldCheck size={16} />
                    <span>Certificado de Firma Digital Válido</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
                    <div>Firmante: <strong>{inspectingContract.signedByName}</strong></div>
                    <div>Fecha: <strong>{new Date(inspectingContract.signedAt || '').toLocaleString('es-AR')}</strong></div>
                    {inspectingContract.verificationHash && (
                      <div className="col-span-2 font-mono text-[10px] text-zinc-400">
                        Hash: <span className="text-emerald-300">{inspectingContract.verificationHash}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContractsTab;
