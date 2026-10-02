import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radar,
  Search,
  MapPin,
  Sparkles,
  Globe,
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
  Send,
  ArrowRight,
  Filter,
  Layers,
  Star,
  ExternalLink,
  MessageSquare,
  Bot,
  RefreshCw,
  X,
  Settings,
  Key,
  ShieldCheck,
  CheckCircle2,
  Map,
  Crosshair,
  History,
  Download,
  Trash2,
  Clock,
  RotateCcw,
  Bookmark,
  Instagram,
  Facebook,
  ArrowUpDown,
  Flame,
  Phone,
  SlidersHorizontal,
  Activity,
} from 'lucide-react';
import {
  ScrapedProspect,
  searchProspects,
  generateColdPitchWithAI,
  formatWhatsAppUrl,
  importProspectToPipeline,
  getApiStatus,
  setStoredApiKeys,
  getGeminiApiKey,
  getGoogleMapsApiKey,
  SavedScrapeSession,
  getStoredScraperSession,
  saveStoredScraperSession,
  clearStoredScraperSession,
  getScrapeHistory,
  addScrapeToHistory,
  deleteScrapeFromHistory,
  clearAllScrapeHistory,
  getInstagramHandle,
} from '@/lib/scraperService';
import { Lead, getLeads } from '@/lib/pipelineService';
import { GoogleRadarMap } from './GoogleRadarMap';
import { ProspectDossierModal } from './ProspectDossierModal';

interface ScraperTabProps {
  onLeadImported: (newLead: Lead) => void;
  onNavigateToPipeline: () => void;
}

export const ScraperTab: React.FC<ScraperTabProps> = ({
  onLeadImported,
  onNavigateToPipeline,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('Burger');
  const [selectedCity, setSelectedCity] = useState('Carapachay, Vicente López');
  const [onlyWithoutWeb, setOnlyWithoutWeb] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prospects, setProspects] = useState<ScrapedProspect[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 360 Dossier Modal
  const [dossierProspect, setDossierProspect] = useState<ScrapedProspect | null>(null);
  const [dossierInitialTab, setDossierInitialTab] = useState<'strategy' | 'pitches' | 'audit'>('strategy');

  // Google Maps Radar state
  const [showRadarMap, setShowRadarMap] = useState(true);
  const [geoCenter, setGeoCenter] = useState<{ lat: number; lng: number }>({
    lat: -34.5303,
    lng: -58.5303,
  });
  const [radiusMeters, setRadiusMeters] = useState(2500);
  const [selectedProspect, setSelectedProspect] = useState<ScrapedProspect | null>(null);

  // API Status & Configuration Modal
  const [apiStatus, setApiStatus] = useState<{
    gemini: { hasKey: boolean; connected: boolean; model: string; error?: string };
    googleMaps: { hasKey: boolean };
  }>({
    gemini: { hasKey: false, connected: false, model: 'gemini-3.6-flash' },
    googleMaps: { hasKey: false },
  });
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [customGeminiKey, setCustomGeminiKey] = useState(getGeminiApiKey());
  const [customMapsKey, setCustomMapsKey] = useState(getGoogleMapsApiKey());
  const [savingKeys, setSavingKeys] = useState(false);

  // Historial de Búsquedas & Sesión Persistente
  const [scrapeHistory, setScrapeHistory] = useState<SavedScrapeSession[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Pitch Modal State
  const [activePitchProspect, setActivePitchProspect] = useState<ScrapedProspect | null>(null);
  const [pitchChannel, setPitchChannel] = useState<'whatsapp' | 'email' | 'linkedin'>('whatsapp');
  const [pitchText, setPitchText] = useState('');
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  // Buscador interno y filtros avanzados sobre los leads levantados
  const [internalSearch, setInternalSearch] = useState('');
  const [filterWeb, setFilterWeb] = useState<'all' | 'without_web' | 'ig_only' | 'with_web'>('all');
  const [filterCrm, setFilterCrm] = useState<'all' | 'pending' | 'in_crm'>('all');
  const [filterSolution, setFilterSolution] = useState<string>('all');
  const [filterHotLeads, setFilterHotLeads] = useState(false);
  const [filterHighRating, setFilterHighRating] = useState(false);
  const [filterHasPhone, setFilterHasPhone] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'reviews_desc' | 'rating_desc' | 'name_asc' | 'budget_desc'>('default');

  // Conteos dinámicos para badges / pastillas
  const counts = useMemo(() => {
    let withoutWeb = 0;
    let igOnly = 0;
    let withWeb = 0;
    let inCrm = 0;
    let pendingCrm = 0;
    let hotLeads = 0;
    let hasPhone = 0;

    prospects.forEach((p) => {
      const isIgAsWeb = Boolean(p.website && /instagram\.com/i.test(p.website));
      const hasRealWeb = Boolean(p.digitalHealth?.hasWebsite && !isIgAsWeb);
      const isWithoutWeb = !p.digitalHealth?.hasWebsite && !isIgAsWeb;

      if (isWithoutWeb) withoutWeb++;
      if (isIgAsWeb) igOnly++;
      if (hasRealWeb) withWeb++;

      if (importedIds.has(p.id)) {
        inCrm++;
      } else {
        pendingCrm++;
      }

      if ((isWithoutWeb || isIgAsWeb) && (p.reviewCount || 0) >= 50) {
        hotLeads++;
      }

      if (p.phone && p.phone.trim().length > 0) {
        hasPhone++;
      }
    });

    return {
      total: prospects.length,
      withoutWeb,
      igOnly,
      withWeb,
      inCrm,
      pendingCrm,
      hotLeads,
      hasPhone,
    };
  }, [prospects, importedIds]);

  // Colección filtrada y ordenada en tiempo real
  const filteredProspects = useMemo(() => {
    return prospects
      .filter((p) => {
        // 1. Omnibox search (nombre, rubro, calle, localidad, teléfono, diagnóstico, solución)
        if (internalSearch.trim()) {
          const q = internalSearch.toLowerCase().trim();
          const matchName = p.name?.toLowerCase().includes(q);
          const matchAddress = p.address?.toLowerCase().includes(q);
          const matchCity = p.city?.toLowerCase().includes(q);
          const matchCategory = p.category?.toLowerCase().includes(q);
          const matchPhone = p.phone?.toLowerCase().includes(q);
          const matchDiagnosis = p.digitalHealth?.diagnosis?.toLowerCase().includes(q);
          const matchSolution = p.digitalHealth?.suggestedSolution?.toLowerCase().includes(q);
          if (!matchName && !matchAddress && !matchCity && !matchCategory && !matchPhone && !matchDiagnosis && !matchSolution) {
            return false;
          }
        }

        const isIgAsWeb = Boolean(p.website && /instagram\.com/i.test(p.website));
        const hasRealWeb = Boolean(p.digitalHealth?.hasWebsite && !isIgAsWeb);
        const isWithoutWeb = !p.digitalHealth?.hasWebsite && !isIgAsWeb;

        // 2. Hot leads filter (+50 reseñas y sin web propia o solo IG)
        if (filterHotLeads) {
          if (!((isWithoutWeb || isIgAsWeb) && (p.reviewCount || 0) >= 50)) {
            return false;
          }
        }

        // 3. Web presence filter
        if (filterWeb === 'without_web' && !isWithoutWeb) return false;
        if (filterWeb === 'ig_only' && !isIgAsWeb) return false;
        if (filterWeb === 'with_web' && !hasRealWeb) return false;

        // 4. CRM pipeline filter
        const isImported = importedIds.has(p.id);
        if (filterCrm === 'pending' && isImported) return false;
        if (filterCrm === 'in_crm' && !isImported) return false;

        // 5. Suggested Solution filter
        if (filterSolution !== 'all' && p.digitalHealth?.suggestedSolution !== filterSolution) {
          return false;
        }

        // 6. Rating filter
        if (filterHighRating && (p.rating || 0) < 4.5) return false;

        // 7. Phone filter
        if (filterHasPhone && (!p.phone || p.phone.trim().length === 0)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'reviews_desc') {
          return (b.reviewCount || 0) - (a.reviewCount || 0);
        }
        if (sortBy === 'rating_desc') {
          return (b.rating || 0) - (a.rating || 0);
        }
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'budget_desc') {
          return (b.digitalHealth?.estimatedBudget || 0) - (a.digitalHealth?.estimatedBudget || 0);
        }
        return 0;
      });
  }, [
    prospects,
    internalSearch,
    filterWeb,
    filterCrm,
    filterSolution,
    filterHotLeads,
    filterHighRating,
    filterHasPhone,
    sortBy,
    importedIds,
  ]);

  const hasActiveInternalFilters =
    internalSearch.trim() !== '' ||
    filterWeb !== 'all' ||
    filterCrm !== 'all' ||
    filterSolution !== 'all' ||
    filterHotLeads ||
    filterHighRating ||
    filterHasPhone ||
    sortBy !== 'default';

  const resetInternalFilters = () => {
    setInternalSearch('');
    setFilterWeb('all');
    setFilterCrm('all');
    setFilterSolution('all');
    setFilterHotLeads(false);
    setFilterHighRating(false);
    setFilterHasPhone(false);
    setSortBy('default');
  };

  const checkStatus = async () => {
    try {
      const status = await getApiStatus();
      setApiStatus(status);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    checkStatus();
    setCustomGeminiKey(getGeminiApiKey());
    setCustomMapsKey(getGoogleMapsApiKey());

    // Cargar historial de búsquedas
    const history = getScrapeHistory();
    setScrapeHistory(history);

    // Restaurar última búsqueda activa para no perder resultados al navegar entre pestañas
    const lastSession = getStoredScraperSession();
    if (lastSession && lastSession.prospects && lastSession.prospects.length > 0) {
      setSearchKeyword(lastSession.keyword);
      setSelectedCity(lastSession.city);
      setOnlyWithoutWeb(lastSession.onlyWithoutWeb);
      if (lastSession.geoCenter) setGeoCenter(lastSession.geoCenter);
      if (lastSession.radiusMeters) setRadiusMeters(lastSession.radiusMeters);
      setProspects(lastSession.prospects);
      setHasSearched(true);
      if (lastSession.prospects.length > 0) {
        setSelectedProspect(lastSession.prospects[0]);
      }
    }
  }, []);

  // Sincronizar importedIds con los leads del Pipeline CRM para pintar sus pines en el Radar
  useEffect(() => {
    try {
      const pipelineLeads = getLeads();
      const pipelineNames = new Set(
        pipelineLeads.map((l) => (l.company || l.name || '').toLowerCase().trim())
      );
      const matchedIds = new Set<string>();
      prospects.forEach((p) => {
        if (pipelineNames.has(p.name.toLowerCase().trim())) {
          matchedIds.add(p.id);
        }
      });
      if (matchedIds.size > 0) {
        setImportedIds((prev) => new Set([...prev, ...matchedIds]));
      }
    } catch (e) {
      console.error('Error synchronizing pipeline leads with map pins:', e);
    }
  }, [prospects]);

  const handleSaveApiKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKeys(true);
    setStoredApiKeys({
      geminiKey: customGeminiKey,
      mapsKey: customMapsKey,
    });
    await checkStatus();
    setSavingKeys(false);
    setIsConfigModalOpen(false);
  };

  const handleSearch = async () => {
    const keyword = searchKeyword.trim() || 'Comercios';
    const queryCity = selectedCity.trim() || 'Zona Seleccionada';
    setErrorMessage('');
    setLoading(true);
    setHasSearched(true);
    try {
      const results = await searchProspects(
        keyword,
        queryCity,
        onlyWithoutWeb,
        {
          lat: geoCenter.lat,
          lng: geoCenter.lng,
          radiusMeters,
        }
      );
      setProspects(results);
      if (results.length > 0) {
        setSelectedProspect(results[0]);
      }

      // Persistir automáticamente en la sesión del navegador e historial
      const newSession: SavedScrapeSession = {
        id: `scrape-${Date.now()}`,
        keyword,
        city: queryCity,
        onlyWithoutWeb,
        timestamp: new Date().toISOString(),
        geoCenter,
        radiusMeters,
        prospects: results,
      };
      saveStoredScraperSession(newSession);
      const updatedHist = addScrapeToHistory(newSession);
      setScrapeHistory(updatedHist);
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'Error durante la búsqueda de prospectos.');
    }
    setLoading(false);
  };

  const handleRestoreSession = (session: SavedScrapeSession) => {
    setSearchKeyword(session.keyword);
    setSelectedCity(session.city);
    setOnlyWithoutWeb(session.onlyWithoutWeb);
    if (session.geoCenter) setGeoCenter(session.geoCenter);
    if (session.radiusMeters) setRadiusMeters(session.radiusMeters);
    setProspects(session.prospects);
    setHasSearched(true);
    setSelectedProspect(session.prospects[0] || null);
    saveStoredScraperSession(session);
    setIsHistoryModalOpen(false);
  };

  const handleClearCurrentSession = () => {
    clearStoredScraperSession();
    setProspects([]);
    setHasSearched(false);
    setSelectedProspect(null);
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = deleteScrapeFromHistory(id);
    setScrapeHistory(updated);
  };

  const handleClearAllHistory = () => {
    if (confirm('¿Eliminar todo el historial de búsquedas guardadas?')) {
      clearAllScrapeHistory();
      setScrapeHistory([]);
      setProspects([]);
      setHasSearched(false);
      setSelectedProspect(null);
      setIsHistoryModalOpen(false);
    }
  };

  const exportProspectsToCSV = (prospectsToExport: ScrapedProspect[], queryInfo = 'creapp_scraped') => {
    if (!prospectsToExport || prospectsToExport.length === 0) return;
    const headers = [
      'Nombre',
      'Categoría',
      'Ciudad',
      'Dirección',
      'Teléfono',
      'Email',
      'Sitio Web',
      'Tiene Web',
      'Diagnóstico Digital',
      'Solución Sugerida',
      'Presupuesto USD Estimado',
      'Rating',
      'Cantidad Reseñas',
      'Fuente',
    ];

    const rows = prospectsToExport.map((p) => [
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      `"${(p.city || '').replace(/"/g, '""')}"`,
      `"${(p.address || '').replace(/"/g, '""')}"`,
      `"${(p.phone || '').replace(/"/g, '""')}"`,
      `"${(p.email || '').replace(/"/g, '""')}"`,
      `"${(p.website || '').replace(/"/g, '""')}"`,
      p.digitalHealth.hasWebsite ? 'Sí' : 'No',
      `"${(p.digitalHealth.diagnosis || '').replace(/"/g, '""')}"`,
      `"${p.digitalHealth.suggestedSolution}"`,
      p.digitalHealth.estimatedBudget || 0,
      p.rating || 0,
      p.reviewCount || 0,
      p.source,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    const safeName = queryInfo.toLowerCase().replace(/[^a-z0-9]/gi, '_');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `leads_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenPitchModal = async (prospect: ScrapedProspect) => {
    setActivePitchProspect(prospect);
    setPitchText('');
    setGeneratingPitch(true);
    try {
      const generated = await generateColdPitchWithAI(prospect, pitchChannel);
      setPitchText(generated);
    } catch (e) {
      console.error(e);
    }
    setGeneratingPitch(false);
  };

  const handleRegeneratePitch = async (channel: 'whatsapp' | 'email' | 'linkedin') => {
    if (!activePitchProspect) return;
    setPitchChannel(channel);
    setGeneratingPitch(true);
    try {
      const generated = await generateColdPitchWithAI(activePitchProspect, channel);
      setPitchText(generated);
    } catch (e) {
      console.error(e);
    }
    setGeneratingPitch(false);
  };

  const handleCopyPitch = () => {
    let textToCopy = pitchText;
    if (pitchChannel === 'whatsapp') {
      textToCopy = textToCopy.replace(/\*\*(.*?)\*\*/g, '*$1*').replace(/[\uFE0E\uFE0F]/g, '').replace(/🗓/g, '📅');
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportToPipeline = (prospect: ScrapedProspect) => {
    const newLead = importProspectToPipeline(prospect);
    setImportedIds(new Set([...importedIds, prospect.id]));
    onLeadImported(newLead);
  };

  const getCleanPhone = (phone: string) => phone.replace(/[^0-9]/g, '');

  return (
    <div className="space-y-6">
      {/* HEADER WITH REAL API CONNECTIVITY STATUS */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-purple-950/30 via-[#0e0e14] to-zinc-950 border border-purple-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Radar size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Scraper B2B de Negocios & Lead Intelligence
            </h2>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Rastreo geográfico mediante Google Places API y evaluación de salud digital automatizada con Google Gemini 3.6 Flash para detectar comercios sin web y generar pitches de venta.
          </p>
        </div>

        {/* Real Live API Status Badges */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Gemini Status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
              apiStatus.gemini.connected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
            title={apiStatus.gemini.connected ? 'Gemini 3.6 Flash autenticado y listo' : apiStatus.gemini.error}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                apiStatus.gemini.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span>
              {apiStatus.gemini.connected ? 'Gemini 3.6 Flash: En línea' : 'Gemini: Desconectado'}
            </span>
          </div>

          {/* Google Places Status */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
              apiStatus.googleMaps.hasKey
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                apiStatus.googleMaps.hasKey ? 'bg-blue-400' : 'bg-amber-400'
              }`}
            />
            <span>{apiStatus.googleMaps.hasKey ? 'Google Places: Activo' : 'Google Places: Opcional'}</span>
          </div>

          {/* Historial / Búsquedas Guardadas Button */}
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors cursor-pointer"
            title="Ver búsquedas y scraps guardados"
          >
            <History size={14} className="text-indigo-400" />
            <span>Búsquedas Guardadas</span>
            {scrapeHistory.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-white font-mono text-[10px] font-bold">
                {scrapeHistory.length}
              </span>
            )}
          </button>

          {/* Export CSV Button */}
          {prospects.length > 0 && (
            <button
              onClick={() => exportProspectsToCSV(prospects, `${searchKeyword}_${selectedCity}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer"
              title="Descargar prospectos actuales en formato CSV"
            >
              <Download size={14} className="text-emerald-400" />
              <span>Exportar CSV</span>
            </button>
          )}

          {/* Clear current search */}
          {prospects.length > 0 && (
            <button
              onClick={handleClearCurrentSession}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 text-xs transition-colors cursor-pointer"
              title="Limpiar resultados actuales"
            >
              <RotateCcw size={13} />
              <span>Limpiar</span>
            </button>
          )}

          {/* Config Button */}
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Configurar claves de API"
          >
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* SEARCH FILTER BAR */}
      <div className="p-5 rounded-2xl bg-[#0e0e12] border border-white/5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Buscador de Palabras Clave / Keywords */}
          <div>
            <label className="block text-zinc-400 mb-1 font-medium flex items-center justify-between">
              <span>Palabra Clave / Negocio *</span>
              <span className="text-[10px] text-purple-400 font-mono">Búsqueda libre</span>
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ej: Burger, consultorio, odontológico, pizzería..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500 text-xs"
              />
            </div>
          </div>

          {/* Localidad */}
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Ciudad / Localidad *</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ej: Córdoba, Rosario, Buenos Aires..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Filtro Sólo sin web */}
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
              <input
                type="checkbox"
                checked={onlyWithoutWeb}
                onChange={(e) => setOnlyWithoutWeb(e.target.checked)}
                className="rounded accent-purple-500"
              />
              <span className="text-zinc-300 text-xs">Solo negocios sin sitio web</span>
            </label>
          </div>

          {/* Botón Ejecutar Scrapeo */}
          <div className="flex flex-col justify-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-90 transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Rastreando locales...</span>
                </>
              ) : (
                <>
                  <Search size={14} />
                  <span>Rastrear Oportunidades</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Keyword Preset Pills */}
        <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 flex-wrap text-[11px]">
          <span className="text-zinc-500 font-medium mr-1 flex items-center gap-1">
            <Sparkles size={11} className="text-purple-400" />
            <span>Keywords rápidas:</span>
          </span>
          {[
            { label: '🍔 Burger', val: 'Burger' },
            { label: '🍔 Burgers', val: 'Burgers' },
            { label: '🦷 Odontológico', val: 'Consultorio Odontológico' },
            { label: '🏥 Consultorio', val: 'Consultorio' },
            { label: '🍕 Pizzería', val: 'Pizzería' },
            { label: '☕ Cafetería', val: 'Cafetería' },
            { label: '🍣 Sushi', val: 'Sushi' },
            { label: '💪 Gimnasio', val: 'Gimnasio' },
            { label: '🐾 Veterinaria', val: 'Veterinaria' },
            { label: '💈 Barbería', val: 'Barbería' },
          ].map((chip) => (
            <button
              key={chip.val}
              type="button"
              onClick={() => {
                setSearchKeyword(chip.val);
              }}
              className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer border ${
                searchKeyword.toLowerCase() === chip.val.toLowerCase()
                  ? 'bg-purple-600/30 text-purple-300 border-purple-500/50 shadow-sm font-semibold'
                  : 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border-white/5'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Búsquedas Guardadas Recientes (Quick Access) */}
        {scrapeHistory.length > 0 && (
          <div className="pt-2.5 border-t border-white/5 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-zinc-500 font-medium flex items-center gap-1 shrink-0 text-[11px]">
              <Bookmark size={11} className="text-indigo-400" />
              <span>Búsquedas Guardadas:</span>
            </span>
            {scrapeHistory.slice(0, 4).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleRestoreSession(item)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/25 text-[11px] transition-all cursor-pointer group"
                title={`Recuperar búsqueda: ${item.keyword} en ${item.city} (${item.prospects.length} resultados)`}
              >
                <Clock size={10} className="text-indigo-400" />
                <span className="font-semibold">{item.keyword}</span>
                <span className="text-zinc-400 font-normal">en {item.city.split(',')[0]}</span>
                <span className="font-mono px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-200 text-[10px] font-bold">
                  {item.prospects.length}
                </span>
              </button>
            ))}
            {scrapeHistory.length > 4 && (
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(true)}
                className="text-[11px] text-purple-400 hover:text-purple-300 underline underline-offset-2 ml-1 cursor-pointer font-medium"
              >
                Ver todas ({scrapeHistory.length})
              </button>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* GOOGLE RADAR MAP VIEW */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400">
              <Map size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Radar Geográfico Interactivo</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300">
                  Google Maps SDK
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Arrastra el pin central o haz clic en el mapa para delimitar tu zona de prospección.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowRadarMap(!showRadarMap)}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <Crosshair size={14} className={showRadarMap ? 'text-purple-400' : 'text-zinc-500'} />
            <span>{showRadarMap ? 'Ocultar Radar' : 'Mostrar Radar'}</span>
          </button>
        </div>

        {showRadarMap && (
          <GoogleRadarMap
            apiKey={customMapsKey}
            center={geoCenter}
            radiusMeters={radiusMeters}
            prospects={filteredProspects}
            selectedProspect={selectedProspect}
            importedIds={importedIds}
            onCenterChange={(newCenter, addressName) => {
              setGeoCenter(newCenter);
              if (addressName) {
                setSelectedCity(addressName);
              }
            }}
            onRadiusChange={(newRadius) => setRadiusMeters(newRadius)}
            onSelectProspect={(prospect) => setSelectedProspect(prospect)}
            onOpenPitch={(prospect) => handleOpenPitchModal(prospect)}
            onOpenDossier={(prospect) => setDossierProspect(prospect)}
            onImportToPipeline={(prospect) => handleImportToPipeline(prospect)}
          />
        )}
      </div>

      {/* RESULTADOS LIST */}
      <div>
        {!hasSearched ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-white/10 bg-[#0e0e12]/40">
            <Radar size={40} className="mx-auto text-zinc-600 mb-3 animate-pulse" />
            <h3 className="text-sm font-semibold text-zinc-300">Explorador de Mercado Listo</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
              Ingresa una ciudad (ej: <strong>Córdoba</strong> o <strong>Rosario</strong>) y haz clic en "Rastrear Oportunidades".
            </p>
          </div>
        ) : prospects.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-white/5 bg-[#0e0e12]">
            <p className="text-sm text-zinc-400">
              No se encontraron prospectos en <strong>{selectedCity}</strong> con esos filtros.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* BARRA DE BÚSQUEDA INTERNA Y CONTROL DE FILTROS */}
            <div className="p-4 rounded-2xl bg-[#0e0e12] border border-white/10 shadow-2xl backdrop-blur-xl space-y-3.5">
              {/* Fila 1: Omnibox de Búsqueda + Selector de Orden + Exportar Filtrados */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Omnibox Input */}
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                  <input
                    type="text"
                    value={internalSearch}
                    onChange={(e) => setInternalSearch(e.target.value)}
                    placeholder={`Buscar en los ${prospects.length} leads por nombre, rubro, calle, teléfono o diagnóstico...`}
                    className="w-full pl-10 pr-9 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                  />
                  {internalSearch && (
                    <button
                      onClick={() => setInternalSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      title="Limpiar búsqueda"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Ordenar Por Dropdown */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300">
                    <ArrowUpDown size={14} className="text-purple-400 shrink-0" />
                    <span className="text-[11px] text-zinc-500 hidden md:inline">Ordenar:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="default" className="bg-[#121218] text-white">Por Defecto</option>
                      <option value="reviews_desc" className="bg-[#121218] text-white">Más Reseñas (Tracción)</option>
                      <option value="rating_desc" className="bg-[#121218] text-white">Mejor Rating (★)</option>
                      <option value="name_asc" className="bg-[#121218] text-white">Nombre (A - Z)</option>
                      <option value="budget_desc" className="bg-[#121218] text-white">Mayor Presupuesto</option>
                    </select>
                  </div>

                  {/* Exportar Filtrados Button */}
                  {filteredProspects.length > 0 && filteredProspects.length !== prospects.length && (
                    <button
                      onClick={() => exportProspectsToCSV(filteredProspects, `${searchKeyword}_filtrados`)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-all whitespace-nowrap cursor-pointer"
                      title="Exportar únicamente los prospectos que cumplen el filtro"
                    >
                      <Download size={13} className="text-emerald-400" />
                      <span>Exportar ({filteredProspects.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Fila 2: Chips / Pastillas de Filtrado Rápido */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                {/* Hot Leads Button */}
                <button
                  onClick={() => setFilterHotLeads(!filterHotLeads)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    filterHotLeads
                      ? 'bg-amber-500/20 border border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
                      : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-amber-400 hover:bg-white/10'
                  }`}
                  title="Negocios con más de 50 reseñas sin web propia"
                >
                  <Flame size={13} className={filterHotLeads ? 'text-amber-400 fill-amber-400' : 'text-zinc-500'} />
                  <span>🔥 Hot Leads</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
                    {counts.hotLeads}
                  </span>
                </button>

                <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

                {/* Filtro Presencia Web */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFilterWeb('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      filterWeb === 'all'
                        ? 'bg-purple-600/30 border border-purple-500 text-purple-200'
                        : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>Todos ({counts.total})</span>
                  </button>

                  <button
                    onClick={() => setFilterWeb(filterWeb === 'without_web' ? 'all' : 'without_web')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      filterWeb === 'without_web'
                        ? 'bg-rose-500/20 border border-rose-500 text-rose-300'
                        : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-rose-400 hover:bg-white/10'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span>Sin Web ({counts.withoutWeb})</span>
                  </button>

                  <button
                    onClick={() => setFilterWeb(filterWeb === 'ig_only' ? 'all' : 'ig_only')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      filterWeb === 'ig_only'
                        ? 'bg-pink-500/20 border border-pink-500 text-pink-300'
                        : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-pink-400 hover:bg-white/10'
                    }`}
                  >
                    <Instagram size={12} className="text-pink-400" />
                    <span>Solo IG ({counts.igOnly})</span>
                  </button>

                  <button
                    onClick={() => setFilterWeb(filterWeb === 'with_web' ? 'all' : 'with_web')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      filterWeb === 'with_web'
                        ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300'
                        : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-emerald-400 hover:bg-white/10'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Con Web ({counts.withWeb})</span>
                  </button>
                </div>

                <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

                {/* Filtro Pipeline CRM */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setFilterCrm(filterCrm === 'pending' ? 'all' : 'pending')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      filterCrm === 'pending'
                        ? 'bg-indigo-500/20 border border-indigo-500 text-indigo-200'
                        : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span>⚪ Pendientes ({counts.pendingCrm})</span>
                  </button>
                  <button
                    onClick={() => setFilterCrm(filterCrm === 'in_crm' ? 'all' : 'in_crm')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      filterCrm === 'in_crm'
                        ? 'bg-purple-500/20 border border-purple-500 text-purple-200'
                        : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-purple-300 hover:bg-white/10'
                    }`}
                  >
                    <span>🟣 En CRM ({counts.inCrm})</span>
                  </button>
                </div>

                <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

                {/* Filtro Teléfono */}
                <button
                  onClick={() => setFilterHasPhone(!filterHasPhone)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filterHasPhone
                      ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300'
                      : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Prospectos con teléfono/WhatsApp disponible"
                >
                  <Phone size={12} className={filterHasPhone ? 'text-emerald-400' : 'text-zinc-500'} />
                  <span>Con Teléfono ({counts.hasPhone})</span>
                </button>

                {/* Filtro Rating */}
                <button
                  onClick={() => setFilterHighRating(!filterHighRating)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    filterHighRating
                      ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                      : 'bg-white/5 border border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Star size={12} className={filterHighRating ? 'fill-amber-400 text-amber-400' : 'text-zinc-500'} />
                  <span>★ 4.5+</span>
                </button>

                {/* Dropdown Solución Sugerida */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
                  <span className="text-[11px] text-zinc-500">Solución:</span>
                  <select
                    value={filterSolution}
                    onChange={(e) => setFilterSolution(e.target.value)}
                    className="bg-transparent text-xs text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-[#121218] text-white">Todas</option>
                    <option value="Desarrollo a Medida" className="bg-[#121218] text-white">Desarrollo a Medida</option>
                    <option value="Landing & Growth" className="bg-[#121218] text-white">Landing & Growth</option>
                    <option value="Stacked SaaS" className="bg-[#121218] text-white">Stacked SaaS</option>
                    <option value="Dental IA" className="bg-[#121218] text-white">Dental IA</option>
                    <option value="TrazApp" className="bg-[#121218] text-white">TrazApp</option>
                  </select>
                </div>
              </div>

              {/* Fila 3: Barra de Estado / Reset */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span>
                    Mostrando <strong className="text-white font-mono">{filteredProspects.length}</strong> de{' '}
                    <span className="font-mono">{prospects.length}</span> prospectos encontrados
                  </span>
                  {hasActiveInternalFilters && (
                    <span className="text-purple-400 font-medium">
                      (Filtros activos)
                    </span>
                  )}
                </div>

                {hasActiveInternalFilters && (
                  <button
                    onClick={resetInternalFilters}
                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors font-medium cursor-pointer"
                  >
                    <RotateCcw size={11} />
                    <span>Restablecer Filtros</span>
                  </button>
                )}
              </div>
            </div>

            {/* Empty State de Filtros o Grilla de Resultados */}
            {filteredProspects.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-white/5 bg-[#0e0e12]/60 backdrop-blur-md space-y-3">
                <Search size={32} className="mx-auto text-purple-400/60" />
                <p className="text-sm font-medium text-zinc-300">
                  No se encontraron prospectos que coincidan con la búsqueda o filtros aplicados
                </p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Prueba modificando las palabras clave o restablece los filtros para ver los {prospects.length} prospectos levantados.
                </p>
                <button
                  onClick={resetInternalFilters}
                  className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer mt-2"
                >
                  <RotateCcw size={13} />
                  <span>Restablecer Filtros ({prospects.length} disponibles)</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProspects.map((p) => {
              const isImported = importedIds.has(p.id);
              const cleanPhone = getCleanPhone(p.phone);
              const igUrl = p.socialLinks?.instagram || (p.website && /instagram\.com/i.test(p.website) ? p.website : null);
              const igHandle = igUrl ? getInstagramHandle(igUrl) : null;
              const isIgAsWeb = Boolean(p.website && /instagram\.com/i.test(p.website));

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setDossierProspect(p)}
                  className="p-5 rounded-2xl bg-[#0e0e12] border border-white/5 hover:border-purple-500/40 hover:bg-[#111119] transition-all shadow-lg flex flex-col justify-between space-y-4 cursor-pointer group"
                >
                  <div className="space-y-3">
                    {/* Header: Title, Reviews, City & Source Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white tracking-tight group-hover:text-purple-300 transition-colors">
                            {p.name}
                          </h3>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                            {p.source === 'google_places' ? 'Google Maps' : 'Gemini AI'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <MapPin size={12} className="text-purple-400 shrink-0" />
                          <span>{p.city} • {p.address}</span>
                        </p>
                      </div>

                      {p.rating > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold shrink-0">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <span>{p.rating}</span>
                          <span className="text-[10px] text-zinc-500">({p.reviewCount})</span>
                        </div>
                      )}
                    </div>

                    {/* Digital Health Status */}
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Presencia Web:</span>
                        {isIgAsWeb ? (
                          <span className="text-pink-400 font-medium flex items-center gap-1">
                            <Instagram size={12} /> Usa Instagram como Web
                          </span>
                        ) : (p.digitalHealth?.websiteUnlinkedInMaps || (p.digitalHealth?.hasWebsite && p.digitalHealth?.hasWebsiteInMaps === false)) ? (
                          <span className="text-amber-400 font-medium flex items-center gap-1 truncate max-w-[210px]" title="Posee sitio web oficial pero no está cargado en su ficha de Google Maps">
                            <AlertTriangle size={12} /> {p.website ? `${p.website} (No en Maps)` : 'Web no vinculada en Maps'}
                          </span>
                        ) : p.digitalHealth?.hasWebsite ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1 truncate max-w-[200px]">
                            <CheckCircle size={12} /> {p.website || 'Web Activa'}
                          </span>
                        ) : (
                          <span className="text-rose-400 font-medium flex items-center gap-1">
                            <AlertTriangle size={12} /> Sin Sitio Web Propio
                          </span>
                        )}
                      </div>

                      {/* Social Presence Quick Pill */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-zinc-500 text-[11px]">Redes Sociales:</span>
                        {igUrl ? (
                          <a
                            href={igUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-semibold text-pink-300 hover:text-pink-200 flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-500/10 border border-pink-500/20 hover:border-pink-500/40 transition-colors"
                          >
                            <Instagram size={11} className="text-pink-400" />
                            <span>{igHandle || 'Instagram'}</span>
                            <ExternalLink size={9} />
                          </a>
                        ) : (
                          <a
                            href={`https://www.google.com/search?q=site:instagram.com+"${encodeURIComponent(p.name)}"+${encodeURIComponent(p.city)}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-zinc-500 hover:text-pink-300 flex items-center gap-1 transition-colors"
                            title="Rastrear perfil de Instagram en Google"
                          >
                            <Instagram size={10} />
                            <span>Buscar perfil ↗</span>
                          </a>
                        )}
                      </div>

                      <div className="text-[11px] text-zinc-300 italic leading-relaxed pt-1 border-t border-white/5">
                        🔍 <strong>Diagnóstico:</strong> {p.digitalHealth?.diagnosis}
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">Solución de CreApp sugerida:</span>
                        <span className="font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                          {p.digitalHealth?.suggestedSolution}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div
                    className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDossierInitialTab('strategy');
                          setDossierProspect(p);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                        title="Ver ficha 360° y estrategia de venta"
                      >
                        <Bot size={13} className="text-purple-400" />
                        <span>Ficha 360°</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDossierInitialTab('audit');
                          setDossierProspect(p);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                        title="Auditoría Web Técnica & CRO"
                      >
                        <Activity size={13} className="text-emerald-400" />
                        <span>Auditoría</span>
                      </button>

                      {igUrl ? (
                        <a
                          href={igUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/20 text-xs flex items-center gap-1 transition-colors"
                          title="Abrir Instagram"
                        >
                          <Instagram size={12} className="text-pink-400" />
                          <span>{igHandle || 'IG'}</span>
                        </a>
                      ) : (
                        <a
                          href={`https://www.google.com/search?q=site:instagram.com+"${encodeURIComponent(p.name)}"+${encodeURIComponent(p.city)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-pink-300 border border-white/10 text-xs flex items-center gap-1 transition-colors"
                          title="Rastrear Instagram en Google"
                        >
                          <Instagram size={11} className="text-zinc-500" />
                          <span className="text-[11px]">IG ↗</span>
                        </a>
                      )}

                      {cleanPhone && (
                        <a
                          href={formatWhatsAppUrl(p.phone, '')}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs flex items-center gap-1.5 transition-colors"
                          title="Abrir WhatsApp directo"
                        >
                          <Send size={12} />
                          <span>WhatsApp</span>
                        </a>
                      )}

                      {p.lat && p.lng && (
                        <button
                          onClick={() => {
                            setSelectedProspect(p);
                            setShowRadarMap(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs flex items-center gap-1.5 transition-colors"
                          title="Ubicar en el mapa de radar"
                        >
                          <Crosshair size={12} className="text-purple-400" />
                          <span>Radar</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenPitchModal(p)}
                        className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs flex items-center gap-1 transition-colors"
                      >
                        <Sparkles size={12} />
                        <span>Pitch</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleImportToPipeline(p)}
                      disabled={isImported}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isImported
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {isImported ? (
                        <>
                          <Check size={12} />
                          <span>En Pipeline</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight size={12} />
                          <span>Importar a CRM</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 360 DOSSIER INTELLIGENCE MODAL */}
      <ProspectDossierModal
        prospect={dossierProspect}
        onClose={() => setDossierProspect(null)}
        onImportToPipeline={(p) => handleImportToPipeline(p)}
        isImported={dossierProspect ? importedIds.has(dossierProspect.id) : false}
        initialTab={dossierInitialTab}
        onFocusOnMap={(p) => {
          setSelectedProspect(p);
          setShowRadarMap(true);
        }}
        onProspectUpdate={(updated) => {
          setProspects((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
          setDossierProspect(updated);
        }}
      />

      {/* PITCH GENERATOR MODAL */}
      <AnimatePresence>
        {activePitchProspect && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePitchProspect(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-[#0f0f15] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Bot size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Pitch de Prospección con Gemini 3.6 Flash
                    </h3>
                    <p className="text-[11px] text-zinc-400">
                      Para: <strong className="text-zinc-200">{activePitchProspect.name}</strong> ({activePitchProspect.city})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActivePitchProspect(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Selector de canal */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-medium">Canal:</span>
                {(['whatsapp', 'email', 'linkedin'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => handleRegeneratePitch(ch)}
                    className={`px-3 py-1 rounded-lg text-xs capitalize transition-all ${
                      pitchChannel === ch
                        ? 'bg-purple-600 text-white font-semibold shadow-sm'
                        : 'bg-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>

              {/* Mensaje generado */}
              <div className="relative">
                {generatingPitch ? (
                  <div className="h-44 rounded-xl bg-black/40 border border-white/5 flex flex-col items-center justify-center gap-2 text-zinc-400 text-xs">
                    <RefreshCw size={18} className="animate-spin text-purple-400" />
                    <span>Gemini 3.6 Flash redactando pitch persuasivo...</span>
                  </div>
                ) : (
                  <textarea
                    rows={7}
                    value={pitchText}
                    onChange={(e) => setPitchText(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-black/50 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-sans leading-relaxed resize-none"
                  />
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyPitch}
                    disabled={generatingPitch}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-colors"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copied ? 'Copiado' : 'Copiar Texto'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {activePitchProspect.phone && pitchChannel === 'whatsapp' && (
                    <a
                      href={formatWhatsAppUrl(activePitchProspect.phone, pitchText)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all shadow-md"
                    >
                      <Send size={14} />
                      <span>Enviar WhatsApp</span>
                    </a>
                  )}

                  <button
                    onClick={() => {
                      handleImportToPipeline(activePitchProspect);
                      setActivePitchProspect(null);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-semibold transition-all shadow-md"
                  >
                    <ArrowRight size={14} />
                    <span>Importar al Pipeline</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIG MODAL: GOOGLE PLACES & GEMINI API KEYS */}
      <AnimatePresence>
        {isConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfigModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#0f0f15] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                    <Key size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Configuración de APIs</h3>
                    <p className="text-[11px] text-zinc-400">
                      Gestiona tus conexiones de Google Cloud Places y Gemini AI Studio
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsConfigModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveApiKeys} className="space-y-4 text-xs">
                {/* Gemini Key */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-semibold flex items-center gap-1.5">
                      <span>Google AI Studio Key (Gemini)</span>
                      {apiStatus.gemini.connected && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                          <CheckCircle2 size={11} /> Activa
                        </span>
                      )}
                    </label>
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <span>Obtener Key</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={customGeminiKey}
                    onChange={(e) => setCustomGeminiKey(e.target.value)}
                    placeholder="Pega tu Gemini API Key..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-zinc-500 block mt-1">
                    Utiliza el modelo <strong>gemini-3.6-flash</strong> para análisis de negocios y pitches de venta.
                  </span>
                </div>

                {/* Google Places Key */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-semibold flex items-center gap-1.5">
                      <span>Google Maps Places API Key</span>
                      {apiStatus.googleMaps.hasKey && (
                        <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
                          <CheckCircle2 size={11} /> Configurada
                        </span>
                      )}
                    </label>
                    <a
                      href="https://console.cloud.google.com/google/maps-apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <span>Google Cloud Console</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                  <input
                    type="password"
                    value={customMapsKey}
                    onChange={(e) => setCustomMapsKey(e.target.value)}
                    placeholder="Pega tu Google Maps API Key..."
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[10px] text-zinc-500 block mt-1">
                    Permite extraer comercios reales directamente desde Google Maps con teléfonos y reseñas.
                  </span>
                </div>

                <div className="pt-3 border-t border-white/10 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingKeys}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold text-white shadow-md active:scale-95"
                  >
                    {savingKeys ? 'Guardando...' : 'Guardar y Conectar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL HISTORIAL DE BÚSQUEDAS GUARDADAS */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-2xl bg-[#0e0e14] border border-white/10 rounded-3xl p-6 shadow-2xl relative space-y-4 max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                    <History size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Búsquedas Guardadas & Scraps</span>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {scrapeHistory.length}
                      </span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Accede a tus prospecciones anteriores sin volver a consumir consultas de API.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {scrapeHistory.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 text-xs border border-dashed border-white/5 rounded-2xl flex flex-col items-center gap-2">
                    <History size={28} className="text-zinc-600" />
                    <span>No hay búsquedas guardadas aún.</span>
                    <span className="text-[11px] text-zinc-600">
                      Cada vez que rastrees oportunidades con el scraper, se almacenarán aquí automáticamente.
                    </span>
                  </div>
                ) : (
                  scrapeHistory.map((item) => {
                    const withoutWebCount = item.prospects.filter((p) => !p.digitalHealth.hasWebsite).length;
                    const dateFormatted = new Date(item.timestamp).toLocaleDateString([], {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });
                    const timeFormatted = new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white">{item.keyword}</span>
                            <span className="text-xs text-zinc-400 flex items-center gap-1 font-medium">
                              <MapPin size={11} className="text-purple-400" />
                              {item.city}
                            </span>
                            {item.onlyWithoutWeb && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                Sólo sin web
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock size={10} />
                              {dateFormatted} {timeFormatted}
                            </span>
                            <span>•</span>
                            <span className="text-indigo-300 font-semibold font-mono">
                              {item.prospects.length} locales
                            </span>
                            <span>•</span>
                            <span className="text-amber-400/90 font-medium">
                              {withoutWebCount} sin web
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          <button
                            onClick={() => handleRestoreSession(item)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            title="Cargar esta búsqueda en el tablero y mapa"
                          >
                            <RotateCcw size={12} />
                            <span>Cargar</span>
                          </button>
                          <button
                            onClick={() => exportProspectsToCSV(item.prospects, `${item.keyword}_${item.city}`)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors cursor-pointer"
                            title="Exportar esta búsqueda a CSV"
                          >
                            <Download size={13} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 border border-white/5 transition-colors cursor-pointer"
                            title="Eliminar de historial"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                {scrapeHistory.length > 0 ? (
                  <button
                    onClick={handleClearAllHistory}
                    className="text-xs text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Limpiar todo el historial</span>
                  </button>
                ) : (
                  <div />
                )}
                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ScraperTab;
