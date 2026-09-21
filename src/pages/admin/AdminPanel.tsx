import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  LogOut,
  FileText,
  ExternalLink,
  Database,
  Zap,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import creappLogoOfficial from '@/assets/CREAPP LOGO VECTOR.png';
import { supabase } from '@/lib/supabaseClient';
import { getAllProposals, deleteProposal } from '@/lib/proposalService';
import type { Proposal } from '@/lib/proposalTypes';
import { CREAPP_PRODUCTS } from '@/lib/serviceContractTemplates';

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
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalStep, setCreateModalStep] = useState<'type' | 'product'>('type');

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
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
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

  return (
    <div className="min-h-screen bg-background-dark text-slate-200 font-body">
      {/* Header */}
      <header className="border-b border-white/5 bg-surface-dark/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img
              src={creappLogoOfficial}
              alt="CreAPP"
              className="h-10 w-auto object-contain drop-shadow-[0_0_12px_rgba(255,45,120,0.35)]"
            />
            <div>
              <h1 className="text-lg font-display font-black text-white tracking-tight">Propuestas Comerciales</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Panel de Administración</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/control-center')}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-xs uppercase tracking-widest font-bold transition-colors border border-white/10 hover:border-white/20 px-4 py-2 rounded-lg"
            >
              <Database size={14} />
              Centro de Control
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-500 hover:text-white text-xs uppercase tracking-widest font-bold transition-colors"
            >
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-10">
          <button
            onClick={() => {
              setCreateModalStep('type');
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-black uppercase tracking-widest text-[11px] hover:opacity-90 transition-all active:scale-[0.98] shadow-lg cursor-pointer"
          >
            <Plus size={16} />
            Nueva Propuesta
          </button>
        </div>

        {/* Proposals Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : proposals.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="mx-auto text-slate-700 mb-6" size={48} />
            <h3 className="text-xl font-display font-black text-white mb-3">Sin propuestas aún</h3>
            <p className="text-slate-500 text-sm mb-8">Creá tu primera propuesta comercial o contrato de servicio para Stacked, Trazapp o Dental-IA.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {proposals.map((proposal) => {
              const isService = proposal.proposal_type === 'service' || proposal.methodology?.proposal_type === 'service';
              const productId = proposal.methodology?.product_id;
              
              let productBadge = { label: '💼 Proyecto', style: 'bg-blue-500/10 text-blue-300 border-blue-500/20', icon: '💼' };
              if (isService) {
                if (productId === 'trazapp' || proposal.slug?.includes('trazapp') || proposal.client_name?.toLowerCase().includes('trazapp') || proposal.hero_title?.toLowerCase().includes('trazapp')) {
                  productBadge = { label: '🌿 Trazapp SaaS', style: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: '🌿' };
                } else if (productId === 'dental-ia' || proposal.slug?.includes('dental') || proposal.client_name?.toLowerCase().includes('dental') || proposal.hero_title?.toLowerCase().includes('dental')) {
                  productBadge = { label: '🦷 Dental-IA SaaS', style: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: '🦷' };
                } else {
                  productBadge = { label: '🍔 Stacked SaaS', style: 'bg-orange-500/15 text-orange-300 border-orange-500/30', icon: '🍔' };
                }
              }

              return (
              <motion.div
                key={proposal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-primary/20 transition-all"
              >
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${proposal.brand_color_primary}33, ${proposal.brand_color_secondary}33)` }}
                  >
                    {proposal.client_logo_url ? (
                      <img src={proposal.client_logo_url} alt="Logo" className="w-8 h-8 object-contain" />
                    ) : isService ? (
                      <span className="text-xl">{productBadge.icon}</span>
                    ) : (
                      <FileText size={20} style={{ color: proposal.brand_color_primary }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-display font-black text-white text-lg tracking-tight truncate">{proposal.client_name}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${productBadge.style}`}>
                        {productBadge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{proposal.date}</span>
                      <span className="text-slate-700">•</span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{proposal.total_value}</span>
                      <span className="text-slate-700">•</span>
                      <span className="text-[10px] text-slate-600 font-mono">/{proposal.slug}</span>
                      {isService && (
                        <>
                          <span className="text-slate-700">•</span>
                          <span className="text-[9px] text-slate-400 font-medium tracking-wide">CreAPP Software Lab</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusColors[proposal.status]}`}>
                    {statusLabels[proposal.status]}
                  </span>
                  <a
                    href={`/propuesta/${proposal.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    title="Ver propuesta"
                  >
                    <Eye size={16} />
                  </a>
                  <button
                    onClick={() => navigate(`/admin/propuesta/${proposal.id}`)}
                    className="p-2.5 rounded-lg bg-white/5 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(proposal.id, proposal.client_name)}
                    className="p-2.5 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
              );
            })}
          </div>
        )}

        {/* Modal Selección de Tipo de Propuesta / Producto CreAPP */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-[#0B101B] border border-white/10 rounded-2xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col gap-6"
              >
                {/* Glow decorativo de acento */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-secondary" />

                {/* Botón cerrar */}
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>

                {createModalStep === 'type' ? (
                  <>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                        CreAPP Software Lab
                      </span>
                      <h3 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight mt-1">
                        ¿Qué tipo de propuesta deseas crear?
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Elegí el formato comercial adecuado para tu cliente:
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Opción 1: Desarrollo de Proyecto */}
                      <button
                        onClick={() => {
                          setIsCreateModalOpen(false);
                          navigate('/admin/propuesta/nueva?type=project');
                        }}
                        className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-primary/50 hover:bg-primary/[0.06] transition-all text-left group cursor-pointer flex flex-col justify-between relative overflow-hidden"
                      >
                        <div>
                          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-3.5 group-hover:scale-110 transition-transform">
                            <Briefcase size={20} />
                          </div>
                          <h4 className="text-sm font-black text-white group-hover:text-primary transition-colors">
                            Desarrollo de Proyecto
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                            Desarrollo de software a medida por hitos, sprints y cronograma técnico de entregas.
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-400 group-hover:text-white">
                          <span>Seleccionar</span>
                          <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>

                      {/* Opción 2: Contrato de Servicio */}
                      <button
                        onClick={() => setCreateModalStep('product')}
                        className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-purple-500/50 hover:bg-purple-500/[0.06] transition-all text-left group cursor-pointer flex flex-col justify-between relative overflow-hidden"
                      >
                        <div>
                          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3.5 group-hover:scale-110 transition-transform">
                            <Zap size={20} />
                          </div>
                          <h4 className="text-sm font-black text-white group-hover:text-purple-300 transition-colors">
                            Contrato de Servicio
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                            Acuerdo de suscripción, licencia de uso mensual recurrente y SLA de soporte técnico.
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-400 group-hover:text-white">
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
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-white mb-2 transition-colors cursor-pointer"
                      >
                        <ArrowLeft size={14} /> Volver a tipo de propuesta
                      </button>
                      <h3 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight">
                        ¿Para qué producto es el contrato de servicio?
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Seleccioná la plataforma de CreAPP para cargar automáticamente su identidad y contrato legal:
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
                          className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.05] transition-all text-left flex items-center justify-between gap-4 group cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-black/50 border border-white/10 p-2 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <img src={prod.logo_url} alt={prod.name} className="w-full h-full object-contain" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-white group-hover:text-primary transition-colors">
                                  {prod.name}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/5 truncate">
                                  {prod.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-md">
                                {prod.tagline}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div
                              className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:border-white/30 group-hover:translate-x-0.5 transition-all"
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
      </main>
    </div>
  );
};

export default AdminPanel;
