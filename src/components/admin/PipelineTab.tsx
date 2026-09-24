import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
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
} from 'lucide-react';
import {
  Lead,
  PipelineStage,
  STAGE_CONFIG,
  updateLeadStage,
  deleteLead,
  createLead,
} from '@/lib/pipelineService';

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

    onLeadsChange(leads); // Trigger refresh
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

      {/* KANBAN BOARD */}
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin">
        {stages.map((stageKey) => {
          const config = STAGE_CONFIG[stageKey];
          const stageLeads = filteredLeads.filter((l) => l.stage === stageKey);
          const stageSum = stageLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
          const stageIndex = stages.indexOf(stageKey);

          return (
            <div
              key={stageKey}
              className={`w-72 shrink-0 rounded-2xl border ${config.border} ${config.bg} p-3 flex flex-col max-h-[75vh]`}
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
                        className="p-3.5 rounded-xl bg-[#121217] border border-white/5 hover:border-white/20 transition-all shadow-md group relative flex flex-col justify-between gap-2.5"
                      >
                        {/* Top: Product Badge & Amount (only if explicitly set > 0) */}
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded-md border font-semibold ${getProductColor(
                              lead.productType
                            )}`}
                          >
                            {lead.productType}
                          </span>
                          {lead.estimatedValue && lead.estimatedValue > 0 ? (
                            <span className="text-xs font-bold text-white font-mono flex items-center">
                              ${lead.estimatedValue} <span className="text-[10px] text-zinc-500 ml-1">USD</span>
                            </span>
                          ) : null}
                        </div>

                        {/* Middle: Company & Contact */}
                        <div>
                          <h4 className="text-xs font-bold text-zinc-100 group-hover:text-purple-300 transition-colors">
                            {lead.company}
                          </h4>
                          <p className="text-[11px] text-zinc-400">{lead.name}</p>
                          <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Building2 size={10} />
                            {lead.industry}
                          </p>
                        </div>

                        {/* Notes */}
                        {lead.notes && (
                          <p className="text-[11px] text-zinc-400 bg-white/5 p-2 rounded-lg border border-white/5 line-clamp-2 italic">
                            "{lead.notes}"
                          </p>
                        )}

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-zinc-400">
                          {/* Left actions: WhatsApp / Link */}
                          <div className="flex items-center gap-1.5">
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                                title="Escribir por WhatsApp"
                              >
                                <Phone size={12} />
                              </a>
                            )}
                            <button
                              onClick={() => onCreateProposalFromLead(lead)}
                              className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-colors"
                              title="Generar Propuesta de Video"
                            >
                              <FileSpreadsheet size={12} />
                            </button>
                            <button
                              onClick={() => handleDelete(lead.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                              title="Eliminar Lead"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Stage step navigation */}
                          <div className="flex items-center gap-1">
                            {stageIndex > 0 && (
                              <button
                                onClick={() => handleStageMove(lead.id, lead.stage, 'prev')}
                                className="p-1 rounded-md bg-white/5 hover:bg-white/10 hover:text-white"
                                title="Mover etapa anterior"
                              >
                                <ArrowLeft size={12} />
                              </button>
                            )}
                            {stageIndex < stages.length - 1 && (
                              <button
                                onClick={() => handleStageMove(lead.id, lead.stage, 'next')}
                                className="p-1 rounded-md bg-purple-500/20 text-purple-300 hover:bg-purple-500/40"
                                title="Avanzar etapa"
                              >
                                <ArrowRight size={12} />
                              </button>
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
      </AnimatePresence>
    </div>
  );
};

export default PipelineTab;
