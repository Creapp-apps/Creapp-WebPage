import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  FileText,
  Briefcase,
  Zap,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Filter,
} from 'lucide-react';
import { getAllProposals, deleteProposal } from '@/lib/proposalService';
import type { Proposal } from '@/lib/proposalTypes';
import { CREAPP_PRODUCTS } from '@/lib/serviceContractTemplates';
import { getLeads, Lead } from '@/lib/pipelineService';

// Subcomponentes del SaaS OS
import AdminLayout, { AdminTab } from '@/components/admin/AdminLayout';
import DashboardTab from '@/components/admin/DashboardTab';
import PipelineTab from '@/components/admin/PipelineTab';
import ScraperTab from '@/components/admin/ScraperTab';
import ContractsTab from '@/components/admin/ContractsTab';
import ProjectsTab from '@/components/admin/ProjectsTab';
import SubscriptionsTab from '@/components/admin/SubscriptionsTab';
import FinancesTab from '@/components/admin/FinancesTab';

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  signed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  signed: 'Firmada',
};

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab activo sincronizado con query params (?tab=...)
  const initialTab = (searchParams.get('tab') as AdminTab) || 'dashboard';
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalStep, setCreateModalStep] = useState<'type' | 'product'>('type');

  // Filtro interno para tab de propuestas
  const [proposalFilter, setProposalFilter] = useState<'all' | 'published' | 'signed' | 'draft'>('all');

  const fetchProposals = async () => {
    setLoading(true);
    try {
      const data = await getAllProposals();
      setProposals(data);
    } catch (err) {
      console.error('Error fetching proposals:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProposals();
    setLeads(getLeads());
  }, []);

  const handleTabChange = (tab: AdminTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Confirmar eliminación de la propuesta "${name}"?`)) return;
    try {
      await deleteProposal(id);
      setProposals((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Error deleting proposal:', err);
    }
  };

  const handleCreateProposalFromLead = (lead: Lead) => {
    if (lead.productType === 'Stacked SaaS') {
      navigate('/admin/propuesta/nueva?type=service&product=stacked');
    } else if (lead.productType === 'TrazApp') {
      navigate('/admin/propuesta/nueva?type=service&product=trazapp');
    } else if (lead.productType === 'Dental IA') {
      navigate('/admin/propuesta/nueva?type=service&product=dental-ia');
    } else {
      navigate('/admin/propuesta/nueva?type=project');
    }
  };

  const handleLeadImported = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev]);
  };

  const filteredProposals = proposals.filter((p) => {
    if (proposalFilter === 'all') return true;
    return p.status === proposalFilter;
  });

  return (
    <AdminLayout
      currentTab={activeTab}
      onTabChange={handleTabChange}
      onCreateProposalClick={() => {
        setCreateModalStep('type');
        setIsCreateModalOpen(true);
      }}
      onCreateLeadClick={() => {
        handleTabChange('pipeline');
      }}
    >
      {/* 1. DASHBOARD VIEW */}
      {activeTab === 'dashboard' && (
        <DashboardTab
          proposals={proposals}
          leads={leads}
          onNavigateTab={handleTabChange}
          onCreateProposal={() => {
            setCreateModalStep('type');
            setIsCreateModalOpen(true);
          }}
        />
      )}

      {/* 2. SCRAPER & PROSPECTION VIEW */}
      {activeTab === 'scraper' && (
        <ScraperTab
          onLeadImported={handleLeadImported}
          onNavigateToPipeline={() => handleTabChange('pipeline')}
        />
      )}

      {/* 3. PIPELINE KANBAN VIEW */}
      {activeTab === 'pipeline' && (
        <PipelineTab
          leads={leads}
          onLeadsChange={(updated) => setLeads(updated)}
          onCreateProposalFromLead={handleCreateProposalFromLead}
        />
      )}

      {/* 4. PROPOSALS CATALOG VIEW */}
      {activeTab === 'proposals' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Propuestas Comerciales & Video Pitch</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {proposals.length} Total
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Páginas interactivas con renderizado de video Remotion, especificaciones técnicas y aceptación en línea.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter */}
              <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl text-xs">
                {(['all', 'published', 'signed', 'draft'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setProposalFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                      proposalFilter === filter
                        ? 'bg-purple-600 text-white font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {filter === 'all' ? 'Todas' : statusLabels[filter] || filter}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setCreateModalStep('type');
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md hover:opacity-90 transition-all"
              >
                <Plus size={14} />
                <span>Nueva Propuesta</span>
              </button>
            </div>
          </div>

          {/* Proposals List */}
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="text-center py-20 bg-[#0e0e12] border border-white/5 rounded-3xl">
              <FileText className="mx-auto text-zinc-700 mb-4" size={44} />
              <h3 className="text-base font-bold text-white mb-2">Sin propuestas en este filtro</h3>
              <p className="text-zinc-400 text-xs mb-6 max-w-sm mx-auto">
                Crea una propuesta personalizada o selecciona un producto Stacked, TrazApp o Dental-IA.
              </p>
              <button
                onClick={() => {
                  setCreateModalStep('type');
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <Plus size={14} />
                <span>Crear Propuesta Ahora</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredProposals.map((proposal) => {
                const isService =
                  proposal.proposal_type === 'service' || proposal.methodology?.proposal_type === 'service';
                const productId = proposal.methodology?.product_id;

                let productBadge = {
                  label: '💼 Proyecto Custom',
                  style: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
                  icon: '💼',
                };
                if (isService) {
                  if (
                    productId === 'trazapp' ||
                    proposal.slug?.includes('trazapp') ||
                    proposal.client_name?.toLowerCase().includes('trazapp')
                  ) {
                    productBadge = {
                      label: '🌿 TrazApp SaaS',
                      style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                      icon: '🌿',
                    };
                  } else if (
                    productId === 'dental-ia' ||
                    proposal.slug?.includes('dental') ||
                    proposal.client_name?.toLowerCase().includes('dental')
                  ) {
                    productBadge = {
                      label: '🦷 Dental-IA SaaS',
                      style: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
                      icon: '🦷',
                    };
                  } else {
                    productBadge = {
                      label: '🍔 Stacked SaaS',
                      style: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
                      icon: '🍔',
                    };
                  }
                }

                return (
                  <motion.div
                    key={proposal.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-[#0e0e12] border border-white/5 hover:border-purple-500/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5 group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                        style={{
                          background: `linear-gradient(135deg, ${proposal.brand_color_primary || '#7C3AED'}22, ${
                            proposal.brand_color_secondary || '#EC4899'
                          }22)`,
                        }}
                      >
                        {proposal.client_logo_url ? (
                          <img src={proposal.client_logo_url} alt="Logo" className="w-8 h-8 object-contain" />
                        ) : isService ? (
                          <span className="text-xl">{productBadge.icon}</span>
                        ) : (
                          <FileText size={20} className="text-purple-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-bold text-white text-base tracking-tight truncate">
                            {proposal.client_name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border ${productBadge.style}`}
                          >
                            {productBadge.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-400">
                          <span className="text-zinc-500">{proposal.date}</span>
                          <span className="text-zinc-700">•</span>
                          <span className="font-mono font-semibold text-zinc-200">{proposal.total_value}</span>
                          <span className="text-zinc-700">•</span>
                          <span className="text-purple-400 font-mono text-[11px]">/propuesta/{proposal.slug}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border font-mono ${
                          statusColors[proposal.status] || 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {statusLabels[proposal.status] || proposal.status}
                      </span>

                      <a
                        href={`/propuesta/${proposal.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-colors"
                        title="Ver propuesta pública"
                      >
                        <Eye size={15} />
                      </a>

                      <button
                        onClick={() => navigate(`/admin/propuesta/${proposal.id}`)}
                        className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-colors"
                        title="Editar propuesta"
                      >
                        <Pencil size={15} />
                      </button>

                      <button
                        onClick={() => handleDelete(proposal.id, proposal.client_name)}
                        className="p-2 rounded-xl hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. CONTRACTS VIEW */}
      {activeTab === 'contracts' && <ContractsTab leads={leads} />}

      {/* 6. CREDENCIALES & PROYECTOS (VAULT) VIEW */}
      {activeTab === 'projects' && <ProjectsTab />}

      {/* 7. SUSCRIPCIONES & ABONOS DE CLIENTES */}
      {activeTab === 'subscriptions' && <SubscriptionsTab leads={leads} />}

      {/* 8. FINANZAS & DÉBITOS OPERATIVOS */}
      {activeTab === 'finances' && <FinancesTab />}

      {/* MODAL: SELECCIÓN DE PROPUESTA COMERCIAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0B101B] border border-white/10 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col gap-6"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400" />

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                title="Cerrar"
              >
                <X size={18} />
              </button>

              {createModalStep === 'type' ? (
                <>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-purple-400">
                      CreApp Innovation Hub
                    </span>
                    <h3 className="text-xl font-bold text-white tracking-tight mt-1">
                      ¿Qué tipo de propuesta deseas crear?
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Elige el formato comercial adecuado para el cliente:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        setIsCreateModalOpen(false);
                        navigate('/admin/propuesta/nueva?type=project');
                      }}
                      className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-purple-500/50 hover:bg-purple-500/[0.06] transition-all text-left group flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3.5 group-hover:scale-110 transition-transform">
                          <Briefcase size={20} />
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                          Desarrollo a Medida
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                          Software a medida por hitos, sprints y cronograma técnico de entregas.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-zinc-400 group-hover:text-white">
                        <span>Seleccionar</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>

                    <button
                      onClick={() => setCreateModalStep('product')}
                      className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-pink-500/50 hover:bg-pink-500/[0.06] transition-all text-left group flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-400 mb-3.5 group-hover:scale-110 transition-transform">
                          <Zap size={20} />
                        </div>
                        <h4 className="text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                          Contrato SaaS & SLA
                        </h4>
                        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                          Suscripción mensual, licencia de uso de producto CreApp y SLA de soporte.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-zinc-400 group-hover:text-white">
                        <span>Continuar</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <button
                      onClick={() => setCreateModalStep('type')}
                      className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-2 transition-colors"
                    >
                      <ArrowLeft size={14} /> Volver a tipo de propuesta
                    </button>
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      Selecciona la plataforma CreApp
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      Carga automáticamente la identidad de marca, video de pitch y contrato legal:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 max-h-[380px] overflow-y-auto pr-1">
                    {CREAPP_PRODUCTS.map((prod) => (
                      <button
                        key={prod.id}
                        onClick={() => {
                          setIsCreateModalOpen(false);
                          navigate(`/admin/propuesta/nueva?type=service&product=${prod.id}`);
                        }}
                        className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05] transition-all text-left flex items-center justify-between gap-4 group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-black/50 border border-white/10 p-2 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <img src={prod.logo_url} alt={prod.name} className="w-full h-full object-contain" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                                {prod.name}
                              </h4>
                              <span className="text-[10px] text-zinc-400 font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/5 truncate">
                                {prod.category}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 truncate mt-0.5 max-w-md">
                              {prod.tagline}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div
                            className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:border-white/30 group-hover:translate-x-0.5 transition-all"
                            style={{ backgroundColor: `${prod.brand_color_primary}15` }}
                          >
                            <ArrowRight size={14} style={{ color: prod.brand_color_primary }} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminPanel;
