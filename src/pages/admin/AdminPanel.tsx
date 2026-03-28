import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Rocket,
  Plus,
  Eye,
  Pencil,
  Trash2,
  LogOut,
  FileText,
  ExternalLink,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getAllProposals, deleteProposal, seedAstillerosVision } from '@/lib/proposalService';
import type { Proposal } from '@/lib/proposalTypes';

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
  const [seeding, setSeeding] = useState(false);

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

  const handleSeedAstilleros = async () => {
    setSeeding(true);
    try {
      await seedAstillerosVision();
      await fetchProposals();
    } catch (err) {
      console.error('Error seeding:', err);
      alert('Error al importar datos. ¿Ya existe una propuesta con slug "astilleros-vision"?');
    }
    setSeeding(false);
  };

  return (
    <div className="min-h-screen bg-background-dark text-slate-200 font-body">
      {/* Header */}
      <header className="border-b border-white/5 bg-surface-dark/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <Rocket className="text-white fill-current" size={18} />
            </div>
            <div>
              <h1 className="text-lg font-display font-black text-white tracking-tight">Propuestas Comerciales</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Panel de Administración</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-white text-xs uppercase tracking-widest font-bold transition-colors"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Migration Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-emerald-500/10 border-b border-emerald-500/20"
      >
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />
          <p className="text-emerald-300 text-sm font-bold tracking-wide">
            ✅ Todo funcionando perfecto! Migración y Vercel!
          </p>
        </div>
      </motion.div>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-10">
          <button
            onClick={() => navigate('/admin/propuesta/nueva')}
            className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-black uppercase tracking-widest text-[11px] hover:opacity-90 transition-all active:scale-[0.98] shadow-lg"
          >
            <Plus size={16} />
            Nueva Propuesta
          </button>
          {proposals.length === 0 && (
            <button
              onClick={handleSeedAstilleros}
              disabled={seeding}
              className="flex items-center gap-3 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-black uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all disabled:opacity-50"
            >
              <Database size={16} />
              {seeding ? 'Importando...' : 'Importar Datos Astilleros Vision'}
            </button>
          )}
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
            <p className="text-slate-500 text-sm mb-8">Creá tu primera propuesta comercial o importá los datos de Astilleros Vision.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {proposals.map((proposal) => (
              <motion.div
                key={proposal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group hover:border-primary/20 transition-all"
              >
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
                    style={{ background: `linear-gradient(135deg, ${proposal.brand_color_primary}33, ${proposal.brand_color_secondary}33)` }}
                  >
                    <FileText size={20} style={{ color: proposal.brand_color_primary }} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-black text-white text-lg tracking-tight truncate">{proposal.client_name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{proposal.date}</span>
                      <span className="text-slate-700">•</span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{proposal.total_value}</span>
                      <span className="text-slate-700">•</span>
                      <span className="text-[10px] text-slate-600 font-mono">/{proposal.slug}</span>
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
