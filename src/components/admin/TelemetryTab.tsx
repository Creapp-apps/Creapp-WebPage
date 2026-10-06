import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronRight,
  Clock,
  Code2,
  Copy,
  Cpu,
  ExternalLink,
  Flame,
  Globe,
  Layers,
  Monitor,
  Play,
  Radio,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  Wifi,
  X,
  Zap,
  Pencil,
  Building2,
} from 'lucide-react';
import {
  MonitoredApp,
  Incident,
  getMonitoredFleet,
  getIncidents,
  updateIncidentStatus,
  diagnoseIncidentWithAI,
  simulateTestIncident,
  pingAppHealth,
  pingLiveFleet,
  updateMonitoredApp,
} from '@/lib/telemetryService';

export const TelemetryTab: React.FC = () => {
  const [apps, setApps] = useState<MonitoredApp[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'error' | 'warning'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showSdkModal, setShowSdkModal] = useState<boolean>(false);
  const [selectedSdkApp, setSelectedSdkApp] = useState<string>('celebra');
  const [copiedDsn, setCopiedDsn] = useState<boolean>(false);
  const [activeTabModal, setActiveTabModal] = useState<'trace' | 'breadcrumbs' | 'device' | 'ai'>('ai');
  const [editingApp, setEditingApp] = useState<MonitoredApp | null>(null);
  const [editAppUrl, setEditAppUrl] = useState<string>('');
  const [editHealthUrl, setEditHealthUrl] = useState<string>('');
  const [lastPingAt, setLastPingAt] = useState<string>('');

  // Cargar datos
  const loadData = async (runLivePing: boolean = true) => {
    setLoading(true);
    const [fleetData, incidentsData] = await Promise.all([
      getMonitoredFleet(),
      getIncidents(),
    ]);
    setApps(fleetData);
    setIncidents(incidentsData);
    setLoading(false);

    if (runLivePing) {
      const livePings = await pingLiveFleet();
      if (livePings && livePings.length > 0) {
        setApps((prev) =>
          prev.map((app) => {
            const match = livePings.find(
              (p) =>
                p.id === app.id ||
                (p.id === 'celebra' && (app.id === 'celebra-eventos' || app.id === 'celebra')) ||
                (p.id === 'dental-ia' && (app.id === 'dental-ia' || app.id === 'app-dental-ia')) ||
                (p.id === 'stacked' && (app.id === 'stacked' || app.id === 'app-stacked')) ||
                (p.id === 'trazapp' && (app.id === 'trazapp' || app.id === 'app-trazapp')) ||
                (p.id === 'belcalis-nails' && (app.id === 'belcalis-nails' || app.id === 'belcalis')) ||
                app.name.toLowerCase().includes(p.id) ||
                (app.app_url && p.url && app.app_url.includes(p.url.replace('https://', '')))
            );
            if (match) {
              return {
                ...app,
                latency_ms: match.latencyMs,
                status: match.status,
                last_heartbeat_at: new Date().toISOString(),
              };
            }
            return app;
          })
        );
        setLastPingAt(new Date().toLocaleTimeString());
      }
    }
  };

  useEffect(() => {
    try {
      const localFleet = localStorage.getItem('creapp_monitored_fleet');
      if (
        localFleet &&
        (localFleet.includes('celebra-eventos') ||
          localFleet.includes('"error_count_24h":1') ||
          localFleet.includes('"error_count_24h": 1'))
      ) {
        localStorage.removeItem('creapp_monitored_fleet');
      }
      const localInc = localStorage.getItem('creapp_incidents');
      if (localInc && (localInc.includes('basePrice') || localInc.includes('inc-001'))) {
        localStorage.removeItem('creapp_incidents');
      }
    } catch (_) {}

    loadData(true);
    const interval = setInterval(async () => {
      const livePings = await pingLiveFleet();
      if (livePings && livePings.length > 0) {
        setApps((prev) =>
          prev.map((app) => {
            const match = livePings.find(
              (p) =>
                p.id === app.id ||
                (p.id === 'celebra' && (app.id === 'celebra-eventos' || app.id === 'celebra')) ||
                (p.id === 'dental-ia' && (app.id === 'dental-ia' || app.id === 'app-dental-ia')) ||
                (p.id === 'stacked' && (app.id === 'stacked' || app.id === 'app-stacked')) ||
                (p.id === 'trazapp' && (app.id === 'trazapp' || app.id === 'app-trazapp')) ||
                (p.id === 'belcalis-nails' && (app.id === 'belcalis-nails' || app.id === 'belcalis')) ||
                app.name.toLowerCase().includes(p.id) ||
                (app.app_url && p.url && app.app_url.includes(p.url.replace('https://', '')))
            );
            if (match) {
              return {
                ...app,
                latency_ms: match.latencyMs,
                status: match.status,
                last_heartbeat_at: new Date().toISOString(),
              };
            }
            return app;
          })
        );
        setLastPingAt(new Date().toLocaleTimeString());
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refrescar pings de salud y Sentry en vivo
  const handleRefreshHealth = async () => {
    setRefreshing(true);
    const [livePings, freshIncidents] = await Promise.all([
      pingLiveFleet(),
      getIncidents(),
    ]);
    if (livePings && livePings.length > 0) {
      setApps((prev) =>
        prev.map((app) => {
          const match = livePings.find(
            (p) =>
              p.id === app.id ||
              (p.id === 'celebra' && (app.id === 'celebra-eventos' || app.id === 'celebra')) ||
              (p.id === 'dental-ia' && (app.id === 'dental-ia' || app.id === 'app-dental-ia')) ||
              (p.id === 'stacked' && (app.id === 'stacked' || app.id === 'app-stacked')) ||
              (p.id === 'trazapp' && (app.id === 'trazapp' || app.id === 'app-trazapp')) ||
              (p.id === 'belcalis-nails' && (app.id === 'belcalis-nails' || app.id === 'belcalis')) ||
              app.name.toLowerCase().includes(p.id) ||
              (app.app_url && p.url && app.app_url.includes(p.url.replace('https://', '')))
          );
          if (match) {
            return {
              ...app,
              latency_ms: match.latencyMs,
              status: match.status,
              last_heartbeat_at: new Date().toISOString(),
            };
          }
          return app;
        })
      );
      setLastPingAt(new Date().toLocaleTimeString());
    }
    setIncidents(freshIncidents);
    setRefreshing(false);
  };

  // Limpiar caché local de incidentes mock
  const handleClearLocalCache = async () => {
    localStorage.removeItem('creapp_incidents');
    localStorage.removeItem('creapp_monitored_fleet');
    await loadData(true);
  };

  // Simular error en vivo
  const handleSimulateIncident = async () => {
    const targetApp = selectedAppId !== 'all' ? selectedAppId : 'celebra-eventos';
    const newInc = await simulateTestIncident(targetApp);
    setIncidents((prev) => [newInc, ...prev]);
    setSelectedIncident(newInc);
    setActiveTabModal('ai');
  };

  // Cambiar estado de un incidente
  const handleStatusChange = async (id: string, newStatus: Incident['status']) => {
    await updateIncidentStatus(id, newStatus);
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: newStatus } : inc))
    );
    if (selectedIncident && selectedIncident.id === id) {
      setSelectedIncident((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Diagnóstico con Gemini AI
  const handleRunAiDiagnosis = async (incident: Incident) => {
    setIsDiagnosing(true);
    try {
      const result = await diagnoseIncidentWithAI(incident);
      const updatedIncident: Incident = {
        ...incident,
        ai_diagnosis: result.diagnosis,
        ai_solution_diff: result.solutionDiff,
      };
      setIncidents((prev) =>
        prev.map((i) => (i.id === incident.id ? updatedIncident : i))
      );
      setSelectedIncident(updatedIncident);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Filtrado de incidentes
  const filteredIncidents = incidents.filter((inc) => {
    if (selectedAppId !== 'all' && inc.app_id !== selectedAppId) return false;
    if (severityFilter !== 'all' && inc.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && inc.status !== statusFilter) return false;
    return true;
  });

  const openIncidentsCount = incidents.filter((i) => i.status === 'open').length;
  const criticalCount = incidents.filter((i) => i.severity === 'critical' && i.status === 'open').length;

  return (
    <div className="space-y-7 pb-16">
      {/* 1. HERO HEADER: MISSION CONTROL */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c0f17] via-[#090b10] to-[#040508] border border-white/10 p-6 md:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 blur-[100px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-500/10 blur-[90px] pointer-events-none rounded-full" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>NOC & OBSERVABILITY ENGINE 2026</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Centro de Control de Aplicaciones</span>
              <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Flota CreAPP
              </span>
            </h1>
            <p className="text-zinc-400 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              Monitoreo técnico en tiempo real de todas las aplicaciones activas del ecosistema. 
              Detección prematura de excepciones JS, fallas de API, latencia y diagnóstico automatizado por IA con código de corrección.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefreshHealth}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all hover:scale-[1.02]"
              title="Ping de salud inmediato"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-purple-400' : ''} />
              <span>{refreshing ? 'Verificando...' : 'Test de Salud'}</span>
            </button>

            <button
              onClick={() => setShowSdkModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold border border-white/10 transition-all hover:scale-[1.02]"
              title="Ver cómo conectar una app con Sentry/SDK"
            >
              <Code2 size={14} className="text-amber-400" />
              <span>Conectar App / SDK</span>
            </button>

            <button
              onClick={handleSimulateIncident}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-rose-900/20 hover:opacity-95 transition-all hover:scale-[1.02]"
              title="Disparar un error de prueba para verificar alertas"
            >
              <Flame size={14} className="animate-bounce" />
              <span>Simular Bug de Prueba</span>
            </button>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-6 pt-6 border-t border-white/5">
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="text-[11px] font-mono uppercase text-zinc-400">Apps Monitoreadas</span>
            <div className="text-xl md:text-2xl font-bold text-white mt-0.5 flex items-center gap-2">
              <Server size={18} className="text-purple-400" />
              <span>{apps.length}</span>
              <span className="text-[11px] font-normal text-emerald-400">100% Online</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="text-[11px] font-mono uppercase text-zinc-400">Uptime Promedio</span>
            <div className="text-xl md:text-2xl font-bold text-emerald-400 mt-0.5 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              <span>99.95%</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="text-[11px] font-mono uppercase text-zinc-400">Bugs Abiertos</span>
            <div className="text-xl md:text-2xl font-bold text-amber-400 mt-0.5 flex items-center gap-2">
              <Bug size={18} className="text-amber-400" />
              <span>{openIncidentsCount}</span>
              {criticalCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
            <span className="text-[11px] font-mono uppercase text-zinc-400">Latencia Red (NOC)</span>
            <div className="text-xl md:text-2xl font-bold text-cyan-400 mt-0.5 flex items-center gap-2">
              <Wifi size={18} className="text-cyan-400" />
              <span>
                {Math.round(apps.reduce((acc, a) => acc + (a.latency_ms || 50), 0) / (apps.length || 1))} ms
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FLEET HEALTH GRID (RADAR DE APLICACIONES) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 font-mono flex items-center gap-2">
            <Radio size={16} className="text-emerald-400" />
            <span>Radar de Aplicaciones Desplegadas</span>
          </h2>
          <div className="flex items-center gap-3">
            {lastPingAt && (
              <span className="text-xs font-mono text-emerald-400/90 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>En vivo · Último ping: {lastPingAt}</span>
              </span>
            )}
            <span className="text-xs text-zinc-500 hidden sm:inline">Pings automáticos cada 30s</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apps.map((app) => {
            const isSelected = selectedAppId === app.id;
            const appOpenBugs = incidents.filter(
              (inc) =>
                (inc.app_id === app.id ||
                  (app.id === 'celebra' && (inc.app_id === 'celebra' || inc.app_id === 'celebra-eventos')) ||
                  (app.id === 'celebra-eventos' && (inc.app_id === 'celebra' || inc.app_id === 'celebra-eventos')) ||
                  (app.id === 'dental-ia' && (inc.app_id === 'dental-ia' || inc.app_id === 'app-dental-ia')) ||
                  (app.id === 'stacked' && (inc.app_id === 'stacked' || inc.app_id === 'app-stacked'))) &&
                inc.status === 'open'
            ).length;

            return (
              <motion.div
                key={app.id}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedAppId(isSelected ? 'all' : app.id)}
                className={`cursor-pointer p-5 rounded-2xl border transition-all relative overflow-hidden ${
                  isSelected
                    ? 'bg-purple-950/20 border-purple-500/50 shadow-lg shadow-purple-950/30'
                    : 'bg-[#0d1017] border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      <h3 className="text-sm font-bold text-white truncate">{app.name}</h3>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500 block truncate mt-0.5">
                      {app.app_url}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10 shrink-0">
                    {app.category}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/5 text-center">
                  <div className="bg-white/[0.02] p-2 rounded-xl">
                    <span className="text-[10px] text-zinc-500 block">Uptime</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {app.uptime_percentage}%
                    </span>
                  </div>
                  <div className="bg-white/[0.02] p-2 rounded-xl">
                    <span className="text-[10px] text-zinc-500 block">Latencia</span>
                    <span className="text-xs font-bold text-cyan-400 font-mono">
                      {app.latency_ms}ms
                    </span>
                  </div>
                  <div className="bg-white/[0.02] p-2 rounded-xl">
                    <span className="text-[10px] text-zinc-500 block">Bugs 24h</span>
                    <span
                      className={`text-xs font-bold font-mono ${
                        appOpenBugs > 0 ? 'text-amber-400' : 'text-zinc-400'
                      }`}
                    >
                      {appOpenBugs}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 text-[11px] text-zinc-500">
                  <div className="flex items-center gap-1.5 truncate">
                    {app.tech_stack?.slice(0, 3).map((t, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-zinc-400">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingApp(app);
                        setEditAppUrl(app.app_url);
                        setEditHealthUrl(app.health_url || `${app.app_url}/api/health`);
                      }}
                      className="text-zinc-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                      title="Editar URL de la aplicación"
                    >
                      <Pencil size={11} />
                      <span>Editar</span>
                    </button>

                    <a
                      href={app.app_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-0.5"
                    >
                      <span>Abrir</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 3. INCIDENT LIVE STREAM & BUG FEED */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 font-mono flex items-center gap-2">
              <Terminal size={16} className="text-rose-400" />
              <span>Live Bug Stream & Telemetría Forense</span>
              <span className="text-xs font-normal text-zinc-400 font-sans">
                ({filteredIncidents.length} evento{filteredIncidents.length !== 1 ? 's' : ''})
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Haz click en cualquier incidente para ver el archivo exacto, línea de código culpable y solución con IA.
            </p>
          </div>

          {/* FILTERS */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by App */}
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="bg-white/5 border border-white/10 text-zinc-300 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-purple-500"
            >
              <option value="all">Todas las apps</option>
              {apps.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            {/* Filter by Severity */}
            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl text-xs">
              {(['all', 'critical', 'error', 'warning'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                    severityFilter === sev
                      ? 'bg-purple-600 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {sev === 'all' ? 'Todos' : sev}
                </button>
              ))}
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl text-xs">
              {(['all', 'open', 'resolved'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                    statusFilter === st
                      ? 'bg-purple-600 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {st === 'all' ? 'Estado: Todos' : st === 'open' ? 'Abiertos' : 'Resueltos'}
                </button>
              ))}
            </div>

            <button
              onClick={handleClearLocalCache}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-300 border border-white/10 hover:border-rose-500/20 text-xs transition-colors"
              title="Purga incidentes de prueba de la memoria y re-consulta Sentry en vivo"
            >
              Purgar datos mock
            </button>
          </div>
        </div>

        {/* LISTA DE INCIDENTES */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="p-10 rounded-3xl bg-[#0b0e14] border border-white/5 text-center">
            <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-3" />
            <h3 className="text-base font-bold text-white">Sin incidencias registradas</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
              Todas las aplicaciones están corriendo sin excepciones en este filtro. Puedes pulsar "Simular Bug de Prueba" para verificar la captura.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredIncidents.map((incident) => {
              const isResolved = incident.status === 'resolved';
              const appInfo = apps.find((a) => a.id === incident.app_id);

              return (
                <motion.div
                  key={incident.id}
                  whileHover={{ x: 2 }}
                  onClick={() => {
                    setSelectedIncident(incident);
                    setActiveTabModal(incident.ai_diagnosis ? 'ai' : 'trace');
                  }}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isResolved
                      ? 'bg-[#090b0f] border-white/5 opacity-60'
                      : incident.severity === 'critical'
                      ? 'bg-rose-950/15 border-rose-500/30 hover:border-rose-500/60'
                      : 'bg-[#0d1017] border-white/5 hover:border-purple-500/40'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        incident.severity === 'critical'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : incident.severity === 'error'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      <Bug size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-purple-300">
                          [{appInfo?.name || incident.app_id}]
                        </span>
                        {(incident.tenant_name || incident.tenant_id) && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 font-semibold">
                            <Building2 size={10} />
                            <span>Tenant: {incident.tenant_name || incident.tenant_id}</span>
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                            incident.severity === 'critical'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {incident.severity}
                        </span>
                        <span className="text-[11px] font-mono text-zinc-500">
                          {incident.occurrence_count > 1 && `(x${incident.occurrence_count})`}
                        </span>
                        <span className="text-[11px] text-zinc-500">•</span>
                        <span className="text-[11px] font-mono text-zinc-400">{incident.url_path}</span>
                      </div>

                      <h4 className="text-sm font-semibold text-white truncate mt-1">
                        {incident.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 mt-1.5 font-mono">
                        {incident.file_source && (
                          <span className="text-amber-300/90 flex items-center gap-1">
                            <Code2 size={12} />
                            <span>{incident.file_source}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-zinc-500">
                          <Smartphone size={12} />
                          <span>{incident.user_device?.browser || 'Browser'}</span>
                        </span>
                        {incident.ai_diagnosis && (
                          <span className="text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded">
                            <Sparkles size={11} />
                            <span>IA Diagnosticada</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    <span
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${
                        isResolved
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {isResolved ? 'Resuelto' : 'Abierto'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(incident.id, isResolved ? 'open' : 'resolved');
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                      title={isResolved ? 'Reabrir incidente' : 'Marcar como resuelto'}
                    >
                      <CheckCircle2 size={15} className={isResolved ? 'text-emerald-400' : ''} />
                    </button>

                    <ChevronRight size={16} className="text-zinc-600" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. MODAL FORENSE DETALLADO DEL INCIDENTE */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-[#0b0e14] border border-white/10 rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-purple-500 to-amber-400" />

              {/* Header Modal */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">
                      {selectedIncident.app_id}
                    </span>
                    {(selectedIncident.tenant_name || selectedIncident.tenant_id) && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold flex items-center gap-1">
                        <Building2 size={11} />
                        <span>Tenant: {selectedIncident.tenant_name || selectedIncident.tenant_id}</span>
                      </span>
                    )}
                    <span className="text-xs font-mono text-rose-400 font-bold uppercase">
                      {selectedIncident.severity}
                    </span>
                    <span className="text-xs text-zinc-500">•</span>
                    <span className="text-xs font-mono text-zinc-400">{selectedIncident.url_path}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1 leading-snug">
                    {selectedIncident.title}
                  </h3>
                </div>

                <button
                  onClick={() => setSelectedIncident(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Selector de pestañas internas */}
              <div className="flex items-center gap-2 pt-4 pb-2 border-b border-white/5">
                <button
                  onClick={() => setActiveTabModal('ai')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTabModal === 'ai'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Sparkles size={14} className="text-amber-300" />
                  <span>Diagnóstico IA & Fix</span>
                </button>

                <button
                  onClick={() => setActiveTabModal('trace')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTabModal === 'trace'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Terminal size={14} />
                  <span>Stack Trace & Archivo</span>
                </button>

                <button
                  onClick={() => setActiveTabModal('breadcrumbs')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTabModal === 'breadcrumbs'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Clock size={14} />
                  <span>Breadcrumbs ({selectedIncident.breadcrumbs?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTabModal('device')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTabModal === 'device'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Smartphone size={14} />
                  <span>Dispositivo / Red</span>
                </button>
              </div>

              {/* Contenido scrolleable */}
              <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1 custom-scrollbar">
                {/* TAB 1: DIAGNÓSTICO IA & FIX */}
                {activeTabModal === 'ai' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/30 to-amber-950/20 border border-purple-500/30">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
                          <Sparkles size={14} />
                          <span>ANÁLISIS FORENSE GEMINI AI</span>
                        </span>

                        <button
                          onClick={() => handleRunAiDiagnosis(selectedIncident)}
                          disabled={isDiagnosing}
                          className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold transition-all flex items-center gap-1.5"
                        >
                          <RefreshCw size={12} className={isDiagnosing ? 'animate-spin' : ''} />
                          <span>{isDiagnosing ? 'Analizando...' : 'Re-diagnosticar con IA'}</span>
                        </button>
                      </div>

                      <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                        {selectedIncident.ai_diagnosis ||
                          'Haz click en "Re-diagnosticar con IA" para que Google Gemini analice el stack trace y genere el fix exacto.'}
                      </p>
                    </div>

                    {selectedIncident.ai_solution_diff && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                          <span className="font-mono text-[11px] text-emerald-400">
                            CÓDIGO DE CORRECCIÓN SUGERIDO (DIFF):
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(selectedIncident.ai_solution_diff || '');
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 2000);
                            }}
                            className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300"
                          >
                            <Copy size={12} />
                            <span>{copiedCode ? '¡Copiado!' : 'Copiar Fix'}</span>
                          </button>
                        </div>

                        <pre className="p-4 rounded-2xl bg-black/70 border border-white/10 text-emerald-300 font-mono text-xs overflow-x-auto leading-relaxed">
                          {selectedIncident.ai_solution_diff}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: STACK TRACE & ARCHIVO */}
                {activeTabModal === 'trace' && (
                  <div className="space-y-3">
                    {selectedIncident.file_source && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono flex items-center gap-2">
                        <Code2 size={16} />
                        <span>Archivo y línea culpable: <b>{selectedIncident.file_source}</b></span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <span className="text-[11px] font-mono text-zinc-400 uppercase">Stack Trace Raw:</span>
                      <pre className="p-4 rounded-2xl bg-black/80 border border-white/10 text-rose-300/90 font-mono text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap">
                        {selectedIncident.stack_trace || selectedIncident.message}
                      </pre>
                    </div>
                  </div>
                )}

                {/* TAB 3: BREADCRUMBS (CAMINO PREVIO DEL USUARIO) */}
                {activeTabModal === 'breadcrumbs' && (
                  <div className="space-y-2">
                    <span className="text-[11px] font-mono text-zinc-400 uppercase">
                      Últimos pasos del usuario antes de la falla:
                    </span>

                    <div className="space-y-2">
                      {selectedIncident.breadcrumbs?.map((b, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs flex items-start gap-3"
                        >
                          <span className="font-mono text-[10px] text-zinc-500 shrink-0 mt-0.5">
                            {idx + 1}.
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-purple-300 mr-2 uppercase">
                              {b.category}
                            </span>
                            <span className="text-zinc-200">{b.message}</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                            {new Date(b.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: DISPOSITIVO */}
                {activeTabModal === 'device' && (
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-mono block">Navegador</span>
                      <span className="font-bold text-white mt-1 block">
                        {selectedIncident.user_device?.browser || 'Safari 18'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-mono block">Sistema Operativo</span>
                      <span className="font-bold text-white mt-1 block">
                        {selectedIncident.user_device?.os || 'iOS 18.2'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-mono block">Dispositivo</span>
                      <span className="font-bold text-white mt-1 block">
                        {selectedIncident.user_device?.device || 'iPhone 15 Pro'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-zinc-500 text-[10px] uppercase font-mono block">Conexión / Red</span>
                      <span className="font-bold text-white mt-1 block">
                        {selectedIncident.user_device?.connection || '4G LTE'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Modal con Acciones */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                <button
                  onClick={() =>
                    handleStatusChange(
                      selectedIncident.id,
                      selectedIncident.status === 'resolved' ? 'open' : 'resolved'
                    )
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedIncident.status === 'resolved'
                      ? 'bg-white/10 text-zinc-300 hover:bg-white/15'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  <span>
                    {selectedIncident.status === 'resolved'
                      ? 'Reabrir Incidente'
                      : 'Marcar como Solucionado'}
                  </span>
                </button>

                <button
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                >
                  Cerrar Vista
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. MODAL CÓMO CONECTAR UNA APP (SNIPPET SENTRY, NATIVE & SUPABASE) */}
      <AnimatePresence>
        {showSdkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-[#0b0e14] border border-white/10 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Code2 size={18} className="text-amber-400" />
                  <h3 className="text-base font-bold text-white">
                    Guía de Conexión & Detección de Bugs (Para Casa)
                  </h3>
                </div>
                <button
                  onClick={() => setShowSdkModal(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="py-4 space-y-4 text-xs text-zinc-300 leading-relaxed overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {/* SECCIÓN 1: SELECTOR DE APP Y DSN REAL */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-purple-300 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-[10px]">1</span>
                      <span>Selecciona la aplicación para ver su DSN oficial</span>
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Sentry Activo</span>
                  </div>

                  {/* Selector de Apps */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
                    {apps.map((app) => (
                      <button
                        key={app.id}
                        onClick={() => setSelectedSdkApp(app.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold truncate transition-all ${
                          selectedSdkApp === app.id
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {app.name}
                      </button>
                    ))}
                  </div>

                  {/* DSN y Snippet de la App Seleccionada */}
                  {(() => {
                    const currentSdkApp = apps.find((a) => a.id === selectedSdkApp) || apps[0];
                    const appDsn = currentSdkApp?.sentry_dsn || 'https://sentry.io/...';

                    return (
                      <div className="space-y-2.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span>DSN asignado para <b>{currentSdkApp?.name}</b>:</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(appDsn);
                              setCopiedDsn(true);
                              setTimeout(() => setCopiedDsn(false), 2000);
                            }}
                            className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono text-[10px] bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20"
                          >
                            <Copy size={11} />
                            <span>{copiedDsn ? '¡Copiado!' : 'Copiar DSN'}</span>
                          </button>
                        </div>

                        <div className="p-2.5 rounded-xl bg-black/80 border border-white/10 font-mono text-[11px] text-amber-300/90 truncate">
                          {appDsn}
                        </div>

                        <p className="text-zinc-400 text-[11px]">
                          Pega en el <code>main.tsx</code> (o <code>index.tsx</code>) de <b>{currentSdkApp?.name}</b>:
                        </p>

                        <pre className="p-3.5 rounded-xl bg-black/80 border border-white/10 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "${appDsn}",
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
  environment: "production",
});`}
                        </pre>
                      </div>
                    );
                  })()}
                </div>

                {/* SECCIÓN 2: WEBHOOK HACIA CREAPP */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <h4 className="font-bold text-amber-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px]">2</span>
                    <span>Conectar Sentry con este Centro de Control de CreAPP</span>
                  </h4>
                  <p className="text-zinc-400">
                    En tu panel de Sentry: Ve a <b>Settings &gt; Integrations &gt; Webhooks</b> y pega la URL de ingesta de CreAPP:
                  </p>
                  <div className="p-3 rounded-xl bg-black/80 border border-white/10 font-mono text-[11px] text-amber-300 flex items-center justify-between">
                    <span>https://creapp-web-page.vercel.app/api/telemetry-webhook</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('https://creapp-web-page.vercel.app/api/telemetry-webhook');
                        alert('URL de Webhook copiada');
                      }}
                      className="text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-white/5 text-[10px]"
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Cada vez que Sentry detecte un error no capturado, enviará un paquete con el stack trace, archivo culpable y los clics previos a CreAPP.
                  </p>
                </div>

                {/* SECCIÓN 3: ALTERNATIVA DIRECTA (SIN SENTRY) */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <h4 className="font-bold text-cyan-300 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px]">3</span>
                    <span>Reporter Directo (Opcional sin intermediarios)</span>
                  </h4>
                  <p className="text-zinc-400">
                    Si prefieres no usar Sentry y enviar los errores directamente a CreAPP, puedes llamar al endpoint desde cualquier componente o <code>window.onerror</code>:
                  </p>
                  <pre className="p-3 rounded-xl bg-black/80 border border-white/10 text-cyan-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`fetch("https://creapp-web-page.vercel.app/api/telemetry-webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    appId: "celebra-eventos",
    title: error.name + ": " + error.message,
    severity: "critical",
    stackTrace: error.stack,
    urlPath: window.location.pathname
  })
});`}
                  </pre>
                </div>

                {/* SECCIÓN 4: BASE DE DATOS */}
                <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-purple-200 text-xs">
                  <span className="font-bold">💾 Base de datos Supabase:</span> Ejecuta el script <code>supabase_telemetry_schema.sql</code> en el SQL Editor de tu proyecto Supabase cuando estés en casa para crear las tablas en la nube.
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => setShowSdkModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold transition-all shadow-md"
                >
                  Cerrar y continuar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. MODAL EDITAR URLS DE LA APP */}
      <AnimatePresence>
        {editingApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="bg-[#0b0e14] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Pencil size={18} className="text-amber-400" />
                  <h3 className="text-base font-bold text-white">
                    Configurar URLs de {editingApp.name}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingApp(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="py-4 space-y-4 text-xs">
                <div>
                  <label className="text-zinc-400 block mb-1.5 font-semibold">
                    URL de Producción / Dominio:
                  </label>
                  <input
                    type="text"
                    value={editAppUrl}
                    onChange={(e) => setEditAppUrl(e.target.value)}
                    placeholder="https://tudominio.com.ar"
                    className="w-full p-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Dirección real donde está alojada la aplicación.
                  </span>
                </div>

                <div>
                  <label className="text-zinc-400 block mb-1.5 font-semibold">
                    URL de Healthcheck (Ping de Uptime):
                  </label>
                  <input
                    type="text"
                    value={editHealthUrl}
                    onChange={(e) => setEditHealthUrl(e.target.value)}
                    placeholder="https://tudominio.com.ar/api/health"
                    className="w-full p-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Endpoint que CreAPP consultará periódicamente para medir latencia y salud.
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setEditingApp(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (!editingApp) return;
                    const updated = {
                      ...editingApp,
                      app_url: editAppUrl,
                      health_url: editHealthUrl,
                    };
                    await updateMonitoredApp(updated);
                    setApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
                    setEditingApp(null);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 shadow-md"
                >
                  Guardar Cambios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TelemetryTab;
