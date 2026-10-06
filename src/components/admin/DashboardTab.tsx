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
  Target,
  Send,
  Award,
} from 'lucide-react';
import type { Proposal } from '@/lib/proposalTypes';
import { Lead, STAGE_CONFIG } from '@/lib/pipelineService';
import { AdminTab } from './AdminLayout';
import { getFinancialMetrics } from '@/lib/financeService';
import { useAuth } from '@/context/AuthContext';

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
  const { isAdmin } = useAuth();

  // Cálculos de métricas reales basadas en el estado actual
  const totalPipelineValue = leads.reduce((acc, lead) => acc + (lead.estimatedValue || 0), 0);
  const signedProposals = proposals.filter((p) => p.status === 'signed').length;
  const publishedProposals = proposals.filter((p) => p.status === 'published').length;
  const winRate = proposals.length > 0 ? Math.round((signedProposals / proposals.length) * 100) : 0;
  
  // MRR recurrente de contratos de suscripción activos (solo admin)
  const financeMetrics = isAdmin ? getFinancialMetrics() : { totalMRR: 0, activeSubscriptionsCount: 0 };
  const activeSaaSMRR = financeMetrics.totalMRR;

  const qualifiedLeads = leads.filter((l) => l.stage === 'prospect' || l.stage === 'contacted').length;
  const inProductionLead = leads.find((l) => l.stage === 'in_production');
  const avgTicket = leads.length > 0 ? Math.round(totalPipelineValue / leads.length) : 0;

  // Métricas específicas de gestión comercial para Vendedores
  const newProspectsCount = leads.filter((l) => l.stage === 'prospect').length;
  const contactedCount = leads.filter((l) => l.stage === 'contacted').length;
  const proposalsSentCount = leads.filter((l) => l.stage === 'proposal_sent').length;
  const negotiationCount = leads.filter((l) => l.stage === 'negotiation').length;
  const inPlayCount = proposalsSentCount + negotiationCount;
  const wonLeadsCount = leads.filter((l) => l.stage === 'in_production' || l.stage === 'delivered').length;

  // KPIs de Master Admin (Visión Financiera Global y Operaciones)
  const adminKpis = [
    {
      title: 'Valor Total en Pipeline',
      value: `$${totalPipelineValue.toLocaleString()} USD`,
      subtitle: `${leads.length} cuenta${leads.length !== 1 ? 's' : ''} en seguimiento`,
      change: `${leads.length} registradas`,
      icon: DollarSign,
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
    },
    {
      title: 'MRR Recurrente (Suscripciones)',
      value: `$${activeSaaSMRR.toLocaleString('es-AR')} $ars/mes`,
      subtitle: `${financeMetrics.activeSubscriptionsCount} abonos activos facturando`,
      change: `${financeMetrics.activeSubscriptionsCount} contratos activos`,
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

  // KPIs para Vendedores (Enfocados en Captación, Embudo y Éxito de Ventas)
  const sellerKpis = [
    {
      title: 'Prospectos en Cartera',
      value: `${leads.length}`,
      subtitle: `${newProspectsCount} nuevos sin contactar`,
      change: 'Base captada',
      icon: Target,
      color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
    },
    {
      title: 'En Diagnóstico & Contacto',
      value: `${contactedCount}`,
      subtitle: 'Cuentas con reunión o diagnóstico activo',
      change: contactedCount > 0 ? `${contactedCount} en curso` : 'Al día',
      icon: Users2,
      color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400',
    },
    {
      title: 'Propuestas & Negociación',
      value: `${inPlayCount}`,
      subtitle: `${proposalsSentCount} enviadas • ${negotiationCount} en ajuste`,
      change: inPlayCount > 0 ? 'En cierre' : 'Sin pendientes',
      icon: Send,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
    },
    {
      title: 'Ventas Ganadas (Cierres)',
      value: `${wonLeadsCount}`,
      subtitle: `${signedProposals} acuerdos comerciales firmados`,
      change: wonLeadsCount > 0 ? 'Éxito comercial' : '0 cerradas',
      icon: Award,
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400',
    },
  ];

  const kpis = isAdmin ? adminKpis : sellerKpis;

  return (
    <div className="space-y-5 sm:space-y-8 animate-fadeIn">
      {/* HERO BANNER */}
      <div className="relative rounded-2xl sm:rounded-3xl p-4 sm:p-8 bg-gradient-to-r from-purple-950/40 via-zinc-900/60 to-black/80 border border-purple-500/20 overflow-hidden shadow-2xl">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] sm:text-xs font-mono">
              <Sparkles size={12} className="shrink-0" />
              <span className="truncate">{isAdmin ? 'CreApp Operational OS • Fintech & Software' : 'CreApp Sales OS • Hub Comercial'}</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
              {isAdmin ? 'Centro de Operaciones y Ventas' : 'Panel de Ventas y Prospección'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed line-clamp-2 sm:line-clamp-none">
              {isAdmin
                ? 'Monitorea el ciclo completo: prospección de leads B2B con IA, propuestas interactivas de video, contratos con SLA y desarrollo en producción.'
                : 'Monitorea tu cartera de prospectos, gestiona contactos activos y potencia el cierre de ventas y propuestas comerciales.'}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto pt-1 sm:pt-0">
            <button
              onClick={() => onNavigateTab('scraper')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition-all hover:scale-[1.02]"
            >
              <Radar size={15} className="text-purple-400 shrink-0" />
              <span className="truncate">Scraper B2B</span>
            </button>
            <button
              onClick={() => onNavigateTab('pipeline')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30 transition-all hover:opacity-95 hover:scale-[1.02]"
            >
              <Kanban size={15} className="shrink-0" />
              <span className="truncate">Pipeline CRM</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI GRID - 2x2 on Mobile, 4 columns on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-3.5 sm:p-5 rounded-2xl bg-gradient-to-br ${kpi.color} bg-[#0e0e12]/80 backdrop-blur-md border transition-all hover:border-white/20 flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] sm:text-xs font-medium text-zinc-400 truncate pr-1">
                  {kpi.title}
                </span>
                <div className="p-1.5 sm:p-2 rounded-xl bg-black/40 border border-white/5 shrink-0">
                  <Icon size={14} className="sm:w-4 sm:h-4" />
                </div>
              </div>

              <div className="text-lg sm:text-2xl font-black text-white tracking-tight my-0.5 sm:mb-1 truncate">
                {kpi.value}
              </div>

              <div className="flex items-center justify-between text-[10px] sm:text-[11px] pt-1.5 border-t border-white/5 mt-1">
                <span className="text-zinc-400 truncate max-w-[90px] sm:max-w-none">{kpi.subtitle}</span>
                <span className="text-purple-300 font-mono text-[9px] sm:text-[10px] shrink-0 font-medium ml-1">
                  {kpi.change}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* TWO COLUMNS: PIPELINE HEALTH & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Pipeline Distribution */}
        <div className="lg:col-span-2 p-4 sm:p-6 rounded-2xl bg-[#0e0e12]/80 border border-white/5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Embudo Comercial y de Producción</h3>
                <p className="text-xs text-zinc-400">Distribución de clientes por etapas del ciclo de vida</p>
              </div>
              <button
                onClick={() => onNavigateTab('pipeline')}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium shrink-0"
              >
                <span>Tablero</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="space-y-2.5 sm:space-y-3 my-3 sm:my-4">
              {(Object.keys(STAGE_CONFIG) as Array<keyof typeof STAGE_CONFIG>).map((stageKey) => {
                const config = STAGE_CONFIG[stageKey];
                const stageLeads = leads.filter((l) => l.stage === stageKey);
                const stageValue = stageLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
                const percent = leads.length > 0 ? (stageLeads.length / leads.length) * 100 : 0;

                return (
                  <div key={stageKey} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 flex items-center gap-2 truncate">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${config.color.replace('text-', 'bg-')}`} />
                        <span className="truncate">{config.label}</span>
                      </span>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                        <span className="font-mono text-zinc-400 text-[11px] sm:text-xs">{stageLeads.length}</span>
                        <span className="font-semibold text-zinc-200 text-[11px] sm:text-xs">${stageValue} USD</span>
                      </div>
                    </div>
                    <div className="h-1.5 sm:h-2 w-full bg-zinc-800/60 rounded-full overflow-hidden">
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

          <div className="pt-3 sm:pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
            <span>Ticket prom: <strong className="text-white">${avgTicket} USD</strong></span>
            <span>Total: <strong className="text-zinc-200">{leads.length} cuentas</strong></span>
          </div>
        </div>

        {/* Quick Launchpad & Acciones comerciales / operacionales */}
        <div className="p-4 sm:p-6 rounded-2xl bg-[#0e0e12]/80 border border-white/5 backdrop-blur-md flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Accesos Rápidos</h3>
            <p className="text-xs text-zinc-400 mb-3 sm:mb-4">
              {isAdmin
                ? 'Acciones directas para operaciones y ventas'
                : 'Herramientas de prospección y gestión'}
            </p>

            <div className="space-y-2">
              <button
                onClick={() => onNavigateTab('scraper')}
                className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all group"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-105 transition-transform shrink-0">
                    <Radar size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">Scraper B2B de Negocios</div>
                    <div className="text-[10px] text-zinc-400 truncate">Prospectar comercios con IA</div>
                  </div>
                </div>
                <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-purple-400 shrink-0 ml-1" />
              </button>

              <button
                onClick={onCreateProposal}
                className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all group"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400 group-hover:scale-105 transition-transform shrink-0">
                    <FileSpreadsheet size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">Creador de Propuestas</div>
                    <div className="text-[10px] text-zinc-400 truncate">Software por hitos y video pitch</div>
                  </div>
                </div>
                <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-pink-400 shrink-0 ml-1" />
              </button>

              <button
                onClick={() => onNavigateTab('pipeline')}
                className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all group"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <Kanban size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">Tablero Pipeline CRM</div>
                    <div className="text-[10px] text-zinc-400 truncate">Seguimiento por etapas Kanban</div>
                  </div>
                </div>
                <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-emerald-400 shrink-0 ml-1" />
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => onNavigateTab('contracts')}
                    className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                        <FileCheck2 size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">Plantillas de Contrato & SLA</div>
                        <div className="text-[10px] text-zinc-400 truncate">SaaS y proyectos custom</div>
                      </div>
                    </div>
                    <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-amber-400 shrink-0 ml-1" />
                  </button>

                  <button
                    onClick={() => onNavigateTab('projects')}
                    className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left transition-all group"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                        <KeyRound size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">Credenciales & Proyectos</div>
                        <div className="text-[10px] text-zinc-400 truncate">Vault de accesos y repositorios</div>
                      </div>
                    </div>
                    <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-indigo-400 shrink-0 ml-1" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-500/20 flex items-center gap-3 text-xs">
            <Clock size={16} className="text-purple-400 shrink-0" />
            <span className="text-zinc-300 text-[11px] sm:text-xs">
              {isAdmin ? (
                inProductionLead ? (
                  <>
                    En producción activa: <strong className="text-white">{inProductionLead.company}</strong>
                  </>
                ) : (
                  <>Pipeline operacional listo: Sin entregas pendientes.</>
                )
              ) : inPlayCount > 0 ? (
                <>
                  Foco activo: <strong className="text-white">{inPlayCount} cuentas</strong> en propuesta o negociación.
                </>
              ) : (
                <>Cartera comercial al día: Usa el Scraper B2B para nuevos clientes.</>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTab;
