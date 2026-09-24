import React from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  TrendingUp,
  FileCheck2,
  Users2,
  ArrowUpRight,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Radar,
  Kanban,
  CheckCircle2,
  Clock,
  ExternalLink,
  KeyRound,
} from 'lucide-react';
import type { Proposal } from '@/lib/proposalTypes';
import { Lead, STAGE_CONFIG } from '@/lib/pipelineService';
import { AdminTab } from './AdminLayout';

interface DashboardTabProps {
  proposals: Proposal[];
  leads: Lead[];
  onNavigateTab: (tab: AdminTab) => void;
  onCreateProposal: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  proposals,
  leads,
  onNavigateTab,
  onCreateProposal,
}) => {
  // Cálculos de métricas 100% reales basadas en el estado actual
  const totalPipelineValue = leads.reduce((acc, lead) => acc + (lead.estimatedValue || 0), 0);
  const signedProposals = proposals.filter((p) => p.status === 'signed').length;
  const publishedProposals = proposals.filter((p) => p.status === 'published').length;
  const winRate = proposals.length > 0 ? Math.round((signedProposals / proposals.length) * 100) : 0;
  
  // MRR recurrente real de clientes en entrega o producción
  const activeSaaSMRR = leads
    .filter((l) => l.stage === 'delivered' || l.stage === 'in_production')
    .reduce((acc, l) => acc + (l.productType === 'Stacked SaaS' ? 350 : 200), 0);

  const qualifiedLeads = leads.filter((l) => l.stage === 'prospect' || l.stage === 'contacted').length;
  const inProductionLead = leads.find((l) => l.stage === 'in_production');
  const avgTicket = leads.length > 0 ? Math.round(totalPipelineValue / leads.length) : 0;

  const kpis = [
    {
      title: 'Valor Total en Pipeline',
      value: `$${totalPipelineValue.toLocaleString()} USD`,
      subtitle: `${leads.length} cuenta${leads.length !== 1 ? 's' : ''} en seguimiento`,
      change: `${leads.length} registradas`,
      icon: DollarSign,
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
    },
    {
      title: 'MRR Proyectado (SaaS & SLA)',
      value: `$${activeSaaSMRR.toLocaleString()} USD/mes`,
      subtitle: 'Suscripciones y cuotas de mantenimiento',
      change: activeSaaSMRR > 0 ? 'Recurrente activo' : 'Sin contratos activos',
      icon: TrendingUp,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
    },
    {
      title: 'Tasa de Conversión (Win Rate)',
      value: `${winRate}%`,
      subtitle: `${signedProposals} firmadas de ${proposals.length} registradas`,
      change: proposals.length > 0 ? `${publishedProposals} publicadas` : 'Sin propuestas',
      icon: FileCheck2,
      color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400',
    },
    {
      title: 'Prospectos Calificados',
      value: `${qualifiedLeads}`,
      subtitle: 'Cuentas en etapa de diagnóstico o prospección',
      change: qualifiedLeads > 0 ? `${qualifiedLeads} pendientes` : 'Al día',
      icon: Users2,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* HERO BANNER */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-purple-950/40 via-zinc-900/60 to-black/80 border border-purple-500/20 overflow-hidden shadow-2xl">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono">
              <Sparkles size={13} />
              <span>CreApp Operational OS • Fintech & Software Lab</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Centro de Operaciones y Ventas
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Monitorea el ciclo completo: prospección de leads B2B con IA, propuestas interactivas de video, contratos con SLA y desarrollo en producción.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('scraper')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition-all hover:scale-[1.02]"
            >
              <Radar size={16} className="text-purple-400" />
              <span>Explorar Scraper B2B</span>
            </button>
            <button
              onClick={() => onNavigateTab('pipeline')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30 transition-all hover:opacity-95 hover:scale-[1.02]"
            >
              <Kanban size={16} />
              <span>Ver Pipeline Kanban</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className={`p-5 rounded-2xl bg-gradient-to-br ${kpi.color} bg-[#0e0e12]/80 backdrop-blur-md border transition-all hover:border-white/20`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-400">{kpi.title}</span>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                  <Icon size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight mb-1">{kpi.value}</div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">{kpi.subtitle}</span>
                <span className="text-purple-300 font-mono">{kpi.change}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* TWO COLUMNS: PIPELINE HEALTH & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Distribution */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0e0e12]/80 border border-white/5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Embudo Comercial y de Producción</h3>
                <p className="text-xs text-zinc-400">Distribución de clientes por etapas del ciclo de vida</p>
              </div>
              <button
                onClick={() => onNavigateTab('pipeline')}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
              >
                <span>Abrir Tablero</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="space-y-3 my-4">
              {(Object.keys(STAGE_CONFIG) as Array<keyof typeof STAGE_CONFIG>).map((stageKey) => {
                const config = STAGE_CONFIG[stageKey];
                const stageLeads = leads.filter((l) => l.stage === stageKey);
                const stageValue = stageLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
                const percent = leads.length > 0 ? (stageLeads.length / leads.length) * 100 : 0;

                return (
                  <div key={stageKey} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                        {config.label}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-zinc-400">{stageLeads.length} cuentas</span>
                        <span className="font-semibold text-zinc-200">${stageValue} USD</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-zinc-800/60 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent > 0 ? percent : 0}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${config.color.replace('text-', 'bg-')}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
            <span>Ticket promedio: <strong className="text-white">${avgTicket} USD</strong></span>
            <span>Total en cartera: <strong className="text-zinc-200">{leads.length} cuentas</strong></span>
          </div>
        </div>

        {/* Quick Launchpad & Propuestas destacadas */}
        <div className="p-6 rounded-2xl bg-[#0e0e12]/80 border border-white/5 backdrop-blur-md flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Accesos Rápidos</h3>
            <p className="text-xs text-zinc-400 mb-4">Acciones directas para el equipo de ventas y lab</p>

            <div className="space-y-2">
              <button
                onClick={() => onNavigateTab('scraper')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-transform">
                    <Radar size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Scraper B2B de Negocios</div>
                    <div className="text-[10px] text-zinc-400">Prospectar comercios y generar pitch con IA</div>
                  </div>
                </div>
                <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-purple-400" />
              </button>

              <button
                onClick={onCreateProposal}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 group-hover:scale-105 transition-transform">
                    <FileSpreadsheet size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Nueva Propuesta Interactiva</div>
                    <div className="text-[10px] text-zinc-400">Con video pitch Remotion y contrato</div>
                  </div>
                </div>
                <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-pink-400" />
              </button>

              <button
                onClick={() => onNavigateTab('contracts')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
                    <FileCheck2 size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Plantillas de Contrato & SLA</div>
                    <div className="text-[10px] text-zinc-400">Stacked, TrazApp, Dental-IA y Custom</div>
                  </div>
                </div>
                <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-amber-400" />
              </button>

              <button
                onClick={() => onNavigateTab('projects')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition-transform">
                    <KeyRound size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">Credenciales & Proyectos (Vault)</div>
                    <div className="text-[10px] text-zinc-400">Credenciales, repositorios y URLs</div>
                  </div>
                </div>
                <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-indigo-400" />
              </button>
            </div>
          </div>

          <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-500/20 flex items-center gap-3 text-xs">
            <Clock size={16} className="text-purple-400 shrink-0" />
            <span className="text-zinc-300">
              {inProductionLead ? (
                <>
                  En producción activa: <strong className="text-white">{inProductionLead.company}</strong> ({inProductionLead.productType})
                </>
              ) : (
                <>Pipeline operacional listo: Sin entregas críticas pendientes.</>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
