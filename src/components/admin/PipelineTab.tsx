import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Phone,
  Globe,
  Sparkles,
  ExternalLink,
  Trash2,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  X,
  Building2,
  CheckCircle2,
  Copy,
  Check,
  Edit3,
  Save,
  MessageSquare,
  Instagram,
  Facebook,
} from 'lucide-react';
import {
  Lead,
  PipelineStage,
  STAGE_CONFIG,
  updateLeadStage,
  deleteLead,
  createLead,
  updateLead,
} from '@/lib/pipelineService';
import { getInstagramHandle } from '@/lib/scraperService';

interface PipelineTabProps {
  leads: Lead[];
  onLeadsChange: (leads: Lead[]) => void;
  onCreateProposalFromLead: (lead: Lead) => void;
}

export const PipelineTab: React.FC<PipelineTabProps> = ({
  leads,
  onLeadsChange,
  onCreateProposalFromLead,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const kanbanContainerRef = useRef<HTMLDivElement>(null);

  // Form state para nuevo lead manual
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    company: '',
    industry: 'Gastronomía',
    productType: 'Stacked SaaS' as Lead['productType'],
    estimatedValue: 0,
    phone: '',
    email: '',
    website: '',
    notes: '',
  });

  const stages: PipelineStage[] = [
    'prospect',
    'contacted',
    'proposal_sent',
    'negotiation',
    'in_production',
    'delivered',
  ];

  const scrollToStage = (index: number) => {
    const stageKey = stages[index];
    const targetEl = document.getElementById(`kanban-col-${stageKey}`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else if (kanbanContainerRef.current) {
      kanbanContainerRef.current.scrollTo({ left: index * 286, behavior: 'smooth' });
    }
  };

  const scrollHorizontal = (direction: 'left' | 'right') => {
    if (!kanbanContainerRef.current) return;
    const delta = direction === 'left' ? -350 : 350;
    kanbanContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const filteredLeads = leads.filter((lead) => {
    const matchSearch =
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.industry.toLowerCase().includes(searchTerm.toLowerCase());
    const matchProduct = selectedProduct === 'all' || lead.productType === selectedProduct;
    return matchSearch && matchProduct;
  });

  const handleStageMove = (leadId: string, currentStage: PipelineStage, direction: 'next' | 'prev') => {
    const currentIndex = stages.indexOf(currentStage);
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex >= 0 && targetIndex < stages.length) {
      const nextStage = stages[targetIndex];
      const updated = updateLeadStage(leadId, nextStage);
      onLeadsChange(updated);
      // Auto-centrar la columna objetivo para que el usuario nunca pierda de vista la tarjeta
      setTimeout(() => {
        scrollToStage(targetIndex);
      }, 50);
    }
  };

  const handleDelete = (leadId: string) => {
    if (confirm('¿Eliminar esta cuenta del pipeline?')) {
      const updated = deleteLead(leadId);
      onLeadsChange(updated);
    }
  };

  const handleCreateLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name || !newLeadForm.company) return;

    createLead({
      name: newLeadForm.name,
      company: newLeadForm.company,
      industry: newLeadForm.industry,
      stage: 'prospect',
      estimatedValue: Number(newLeadForm.estimatedValue) || 0,
      currency: 'USD',
      phone: newLeadForm.phone,
      email: newLeadForm.email,
      website: newLeadForm.website,
      productType: newLeadForm.productType,
      notes: newLeadForm.notes,
    });

    onLeadsChange(getLeads()); // Trigger refresh with newly created lead
    setIsNewLeadModalOpen(false);
    setNewLeadForm({
      name: '',
      company: '',
      industry: 'Gastronomía',
      productType: 'Stacked SaaS',
      estimatedValue: 0,
      phone: '',
      email: '',
      website: '',
      notes: '',
    });
  };

  const getProductColor = (product: Lead['productType']) => {
    switch (product) {
      case 'Stacked SaaS':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'TrazApp':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Dental IA':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'Desarrollo a Medida':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Pipeline Comercial y Producción</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {filteredLeads.length} Activos
            </span>
          </h2>
          <p className="text-xs text-zinc-400">
            Control de cuentas desde la prospección inicial hasta la entrega final y cobro recurrente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente, rubro..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 w-44 sm:w-56"
            />
          </div>

          {/* Product Filter */}
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-purple-500"
          >
            <option value="all" className="bg-[#111]">Todos los Productos</option>
            <option value="Stacked SaaS" className="bg-[#111]">Stacked SaaS</option>
            <option value="TrazApp" className="bg-[#111]">TrazApp</option>
            <option value="Dental IA" className="bg-[#111]">Dental IA</option>
            <option value="Desarrollo a Medida" className="bg-[#111]">Desarrollo a Medida</option>
            <option value="Landing & Growth" className="bg-[#111]">Landing & Growth</option>
          </select>

          <button
            onClick={() => setIsNewLeadModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm hover:opacity-90 transition-all"
          >
            <Plus size={14} />
            <span>Nuevo Lead</span>
          </button>
        </div>
      </div>

      {/* QUICK STAGE JUMP & HORIZONTAL SCROLL CONTROLS */}
      <div className="flex items-center justify-between gap-3 p-2 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-2 shrink-0">
            Saltar a Etapa:
          </span>
          {stages.map((stageKey, idx) => {
            const config = STAGE_CONFIG[stageKey];
            const count = filteredLeads.filter((l) => l.stage === stageKey).length;
            const hasActiveLeads = count > 0;
            return (
              <button
                key={stageKey}
                onClick={() => scrollToStage(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 cursor-pointer ${
                  hasActiveLeads
                    ? 'bg-purple-500/20 text-purple-200 border border-purple-500/40 hover:bg-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)] font-semibold'
                    : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{config.label.split('. ')[1] || config.label}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    hasActiveLeads
                      ? 'bg-purple-500 text-white font-bold'
                      : 'bg-white/10 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Scroll Controls */}
        <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-white/10">
          <button
            onClick={() => scrollHorizontal('left')}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors"
            title="Desplazar a la izquierda"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scrollHorizontal('right')}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors"
            title="Desplazar a la derecha"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div 
        ref={kanbanContainerRef}
        className="flex gap-4 overflow-x-auto pb-6 kanban-scrollbar scroll-smooth"
      >
        {stages.map((stageKey) => {
          const config = STAGE_CONFIG[stageKey];
          const stageLeads = filteredLeads.filter((l) => l.stage === stageKey);
          const stageSum = stageLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
          const stageIndex = stages.indexOf(stageKey);

          return (
            <div
              key={stageKey}
              id={`kanban-col-${stageKey}`}
              className={`w-[270px] shrink-0 rounded-2xl border ${config.border} ${config.bg} p-3 flex flex-col max-h-[75vh]`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-white">{config.label}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-zinc-300">
                    {stageLeads.length}
                  </span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {stageLeads.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-600 border border-dashed border-white/5 rounded-xl">
                    Sin cuentas en esta etapa
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const cleanPhone = lead.phone ? lead.phone.replace(/[^0-9]/g, '') : null;
                    return (
                      <motion.div
                        key={lead.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => {
                          setSelectedLeadForDetail(lead);
                          setEditedNotes(lead.notes || '');
                          setIsEditingNotes(false);
                        }}
                        className="p-3 rounded-xl bg-[#111116] border border-white/5 hover:border-purple-500/40 hover:bg-[#151520] transition-all shadow-md group relative cursor-pointer flex flex-col gap-2"
                      >
                        {/* Top: Product Badge + Quick Stage Nav */}
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded-md border font-semibold ${getProductColor(
                              lead.productType
                            )}`}
                          >
                            {lead.productType}
                          </span>

                          {/* Quick stage mover (stops click propagation) */}
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {stageIndex > 0 && (
                              <button
                                onClick={() => handleStageMove(lead.id, lead.stage, 'prev')}
                                className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors"
                                title="Mover etapa anterior"
                              >
                                <ArrowLeft size={11} />
                              </button>
                            )}
                            {stageIndex < stages.length - 1 && (
                              <button
                                onClick={() => handleStageMove(lead.id, lead.stage, 'next')}
                                className="p-1 rounded-md bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 transition-colors"
                                title="Avanzar etapa"
                              >
                                <ArrowRight size={11} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Company Name & Rubro + Indicators */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-zinc-100 group-hover:text-purple-300 transition-colors truncate">
                              {lead.company || lead.name}
                            </h4>
                            <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5 truncate">
                              <Building2 size={10} className="shrink-0" />
                              <span className="truncate">{lead.industry}</span>
                            </p>
                          </div>

                          <div
                            className="flex items-center gap-1.5 shrink-0 pt-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                                title={`WhatsApp: ${lead.phone}`}
                              >
                                <Phone size={10} />
                              </a>
                            )}
                            {lead.website && (
                              <a
                                href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                                title={`Web: ${lead.website}`}
                              >
                                <Globe size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: NUEVO LEAD */}
      <AnimatePresence>
        {isNewLeadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewLeadModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0f0f14] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="text-base font-bold text-white">Registrar Nueva Cuenta en Pipeline</h3>
                </div>
                <button
                  onClick={() => setIsNewLeadModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateLeadSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Nombre del Contacto *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Marcelo Fernández"
                      value={newLeadForm.name}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Empresa / Negocio *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Pizzería Roma"
                      value={newLeadForm.company}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, company: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Solución de CreApp</label>
                    <select
                      value={newLeadForm.productType}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, productType: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="Stacked SaaS" className="bg-[#111]">Stacked SaaS</option>
                      <option value="TrazApp" className="bg-[#111]">TrazApp</option>
                      <option value="Dental IA" className="bg-[#111]">Dental IA</option>
                      <option value="Desarrollo a Medida" className="bg-[#111]">Desarrollo a Medida</option>
                      <option value="Landing & Growth" className="bg-[#111]">Landing & Growth</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Presupuesto Estimado USD (Opcional)</label>
                    <input
                      type="number"
                      placeholder="0 (A definir)"
                      value={newLeadForm.estimatedValue === 0 ? '' : newLeadForm.estimatedValue}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, estimatedValue: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">WhatsApp / Teléfono</label>
                    <input
                      type="text"
                      placeholder="+54 9 11 ..."
                      value={newLeadForm.phone}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Sitio Web / Instagram</label>
                    <input
                      type="text"
                      placeholder="negocio.com"
                      value={newLeadForm.website}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, website: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Notas / Diagnóstico Técnico</label>
                  <textarea
                    rows={3}
                    placeholder="Detalles del dolor que tienen o requerimiento especial..."
                    value={newLeadForm.notes}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewLeadModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold text-white shadow-lg shadow-purple-600/30"
                  >
                    Añadir al Pipeline
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL DETALLE DE LEAD (CLICK EN TARJETA) */}
        {selectedLeadForDetail && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-xl bg-[#0e0e14] border border-white/10 rounded-3xl p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedLeadForDetail(null)}
                className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>

              {/* Modal Header */}
              <div className="pr-8 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono px-2.5 py-0.5 rounded-md border font-semibold ${getProductColor(
                      selectedLeadForDetail.productType
                    )}`}
                  >
                    {selectedLeadForDetail.productType}
                  </span>
                  <span className="text-xs text-zinc-400 flex items-center gap-1 font-mono">
                    <Building2 size={12} />
                    {selectedLeadForDetail.industry}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {selectedLeadForDetail.company || selectedLeadForDetail.name}
                </h3>
              </div>

              {/* Stage Switcher */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-zinc-400 font-semibold">Etapa en Pipeline:</span>
                <select
                  value={selectedLeadForDetail.stage}
                  onChange={(e) => {
                    const newStage = e.target.value as PipelineStage;
                    const updated = updateLeadStage(selectedLeadForDetail.id, newStage);
                    onLeadsChange(updated);
                    setSelectedLeadForDetail({ ...selectedLeadForDetail, stage: newStage });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  {stages.map((st) => (
                    <option key={st} value={st} className="bg-[#111] text-white">
                      {STAGE_CONFIG[st].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Information & Channels */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Phone / WhatsApp */}
                <div className="p-3.5 rounded-2xl bg-[#14141c] border border-white/5 space-y-2">
                  <div className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5">
                    <Phone size={13} className="text-emerald-400" />
                    <span>WhatsApp / Teléfono</span>
                  </div>
                  {selectedLeadForDetail.phone ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-white truncate">
                        {selectedLeadForDetail.phone}
                      </span>
                      <div className="flex items-center gap-1">
                        <a
                          href={`https://wa.me/${selectedLeadForDetail.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          Chat <ExternalLink size={10} />
                        </a>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedLeadForDetail.phone || '');
                            setCopiedPhone(true);
                            setTimeout(() => setCopiedPhone(false), 2000);
                          }}
                          className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
                          title="Copiar teléfono"
                        >
                          {copiedPhone ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500 italic">No registrado</span>
                  )}
                </div>

                {/* Website */}
                <div className="p-3.5 rounded-2xl bg-[#14141c] border border-white/5 space-y-2">
                  <div className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5">
                    <Globe size={13} className="text-blue-400" />
                    <span>Sitio Web Oficial</span>
                  </div>
                  {selectedLeadForDetail.website ? (
                    <a
                      href={
                        selectedLeadForDetail.website.startsWith('http')
                          ? selectedLeadForDetail.website
                          : `https://${selectedLeadForDetail.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1 truncate"
                    >
                      <span className="truncate">{selectedLeadForDetail.website}</span>
                      <ExternalLink size={11} className="shrink-0" />
                    </a>
                  ) : (
                    <span className="text-xs text-amber-400/90 font-medium flex items-center gap-1">
                      ⚠️ Sin sitio web detectado
                    </span>
                  )}
                </div>

                {/* Redes Sociales (Instagram / Facebook) */}
                {(() => {
                  const igUrl = selectedLeadForDetail.instagram || (selectedLeadForDetail.website && /instagram\.com/i.test(selectedLeadForDetail.website) ? selectedLeadForDetail.website : null);
                  const fbUrl = selectedLeadForDetail.facebook || (selectedLeadForDetail.website && /facebook\.com/i.test(selectedLeadForDetail.website) ? selectedLeadForDetail.website : null);
                  const igHandle = igUrl ? getInstagramHandle(igUrl) : null;
                  const leadName = selectedLeadForDetail.company || selectedLeadForDetail.name;
                  const leadCity = selectedLeadForDetail.city || '';

                  return (
                    <div className="p-3.5 rounded-2xl bg-[#14141c] border border-white/5 space-y-2 col-span-1 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5">
                          <Instagram size={13} className="text-pink-400" />
                          <span>Redes Sociales & Perfiles</span>
                        </div>
                        <a
                          href={`https://www.google.com/search?q=site:instagram.com+"${encodeURIComponent(leadName)}"${leadCity ? `+${encodeURIComponent(leadCity)}` : ''}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-zinc-400 hover:text-pink-300 flex items-center gap-1 transition-colors"
                          title="Buscar Instagram en Google"
                        >
                          <span>Rastrear en Google</span>
                          <ExternalLink size={9} />
                        </a>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        {igUrl ? (
                          <a
                            href={igUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 border border-pink-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                            title="Abrir Instagram del negocio"
                          >
                            <Instagram size={13} className="text-pink-400" />
                            <span>{igHandle || 'Instagram'}</span>
                            <ExternalLink size={10} className="text-pink-400/70" />
                          </a>
                        ) : (
                          <a
                            href={`https://www.google.com/search?q=site:instagram.com+"${encodeURIComponent(leadName)}"${leadCity ? `+${encodeURIComponent(leadCity)}` : ''}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-pink-300 border border-white/10 text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Instagram size={12} className="text-zinc-500" />
                            <span>Buscar Instagram ↗</span>
                          </a>
                        )}

                        {fbUrl ? (
                          <a
                            href={fbUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                            title="Abrir Facebook del negocio"
                          >
                            <Facebook size={13} className="text-blue-400" />
                            <span>Facebook</span>
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <a
                            href={`https://www.google.com/search?q=site:facebook.com+"${encodeURIComponent(leadName)}"${leadCity ? `+${encodeURIComponent(leadCity)}` : ''}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-blue-300 border border-white/10 text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <Facebook size={12} className="text-zinc-500" />
                            <span>Buscar Facebook ↗</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Diagnóstico Técnico & Notas del Scraper */}
              <div className="p-4 rounded-2xl bg-gradient-to-b from-[#161622] to-[#101017] border border-purple-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-400" />
                    Diagnóstico & Notas de Prospección
                  </span>
                  <button
                    onClick={() => setIsEditingNotes(!isEditingNotes)}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <Edit3 size={11} />
                    {isEditingNotes ? 'Cancelar' : 'Editar Notas'}
                  </button>
                </div>

                {isEditingNotes ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={4}
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      className="w-full p-3 rounded-xl bg-black/60 border border-white/10 text-white text-xs leading-relaxed focus:outline-none focus:border-purple-500 resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          const updated = updateLead(selectedLeadForDetail.id, { notes: editedNotes });
                          onLeadsChange(updated);
                          setSelectedLeadForDetail({ ...selectedLeadForDetail, notes: editedNotes });
                          setIsEditingNotes(false);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 flex items-center gap-1.5 transition-colors shadow-md"
                      >
                        <Save size={12} /> Guardar Cambios
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-300 leading-relaxed bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-1.5">
                    <p className="italic leading-relaxed">
                      "{selectedLeadForDetail.notes || 'Sin diagnóstico ni notas registradas.'}"
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => {
                    handleDelete(selectedLeadForDetail.id);
                    setSelectedLeadForDetail(null);
                  }}
                  className="px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={13} />
                  Eliminar Lead
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const leadToPropose = selectedLeadForDetail;
                      setSelectedLeadForDetail(null);
                      onCreateProposalFromLead(leadToPropose);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition-all"
                  >
                    <FileSpreadsheet size={13} />
                    Generar Propuesta
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PipelineTab;
