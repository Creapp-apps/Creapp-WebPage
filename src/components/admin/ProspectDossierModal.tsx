import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Star,
  MapPin,
  Phone,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Send,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
  DollarSign,
  MessageSquare,
  PhoneCall,
  Mail,
  UserCheck,
  Compass,
  ExternalLink,
  Target,
  FileText,
  ShieldAlert,
  Bot,
  RefreshCw,
  Instagram,
  Facebook,
  Search,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { 
  ScrapedProspect, 
  generateColdPitchWithAI, 
  generateConversationalHookPitch,
  getInstagramHandle, 
  formatWhatsAppUrl 
} from '@/lib/scraperService';
import { PipelineStage, STAGE_CONFIG } from '@/lib/pipelineService';

interface ProspectDossierModalProps {
  prospect: ScrapedProspect | null;
  onClose: () => void;
  onImportToPipeline?: (prospect: ScrapedProspect) => void;
  isImported?: boolean;
  onFocusOnMap?: (prospect: ScrapedProspect) => void;
  pipelineMode?: boolean;
  currentStage?: PipelineStage;
  onStageChange?: (newStage: PipelineStage) => void;
  onDeleteLead?: () => void;
  onCreateProposal?: () => void;
}

export const ProspectDossierModal: React.FC<ProspectDossierModalProps> = ({
  prospect,
  onClose,
  onImportToPipeline,
  isImported,
  onFocusOnMap,
  pipelineMode,
  currentStage,
  onStageChange,
  onDeleteLead,
  onCreateProposal,
}) => {
  const [activeTab, setActiveTab] = useState<'strategy' | 'pitches' | 'audit'>('pitches');
  const [pitchChannel, setPitchChannel] = useState<'conversational' | 'whatsapp' | 'call' | 'email' | 'visit'>('conversational');
  const [pitchContent, setPitchContent] = useState<string>('');
  const [step1Text, setStep1Text] = useState<string>('');
  const [step2Text, setStep2Text] = useState<string>('');
  const [loadingPitch, setLoadingPitch] = useState(false);
  const [copiedStep, setCopiedStep] = useState<'step1' | 'step2' | 'main' | null>(null);

  // Cargar pitch inicial al abrir el prospecto
  useEffect(() => {
    if (prospect) {
      loadPitchForChannel(prospect, pitchChannel);
    }
  }, [prospect, pitchChannel]);

  const loadPitchForChannel = async (
    p: ScrapedProspect,
    channel: 'conversational' | 'whatsapp' | 'call' | 'email' | 'visit'
  ) => {
    setLoadingPitch(true);
    try {
      if (channel === 'conversational') {
        const conv = generateConversationalHookPitch(p);
        setStep1Text(conv.step1);
        setStep2Text(conv.step2);
      } else if (channel === 'call') {
        setPitchContent(
          `📞 GUION DE LLAMADA TELEFÓNICA (30 Segundos):\n\n` +
          `1. Apertura: "Hola, ¿cómo estás? Te llamo rápido de CreApp Software Lab. Estuvimos viendo la excelente reputación que tienen en Google Maps en ${p.city} con más de ${p.reviewCount} reseñas..."\n` +
          `2. Gancho: "Notamos que hoy no cuentan con un sistema directo de pedidos/reservas propio, y que probablemente estén perdiendo clientes o pagando comisiones altas a intermediarios."\n` +
          `3. Propuesta de Valor: "Desarrollamos una plataforma exclusiva para que sus clientes pidan en 2 clics directo por WhatsApp o web, ahorrándose todas las comisiones."\n` +
          `4. Cierre: "¿Con quién podría conversar 5 minutos esta semana para mostrarles una demo personalizada sin costo?"`
        );
      } else if (channel === 'visit') {
        setPitchContent(
          `🚶 GUION DE VISITA PRESENCIAL AL LOCAL:\n\n` +
          `• Objetivo: Hablar con el dueño o encargado en un horario de baja concurrencia (11:00 a 12:30 o 16:30 a 18:00).\n` +
          `• Introducción: "Buenas tardes, vengo siguiendo el movimiento que tienen acá en ${p.address}, felicidades por las ${p.reviewCount} valoraciones en Google."\n` +
          `• Diagnóstico: "Quería dejarles una propuesta rápida porque desarrollamos soluciones de software para negocios de ${p.category} que les permiten recibir pedidos sin pagar comisiones de apps externas."\n` +
          `• Dejar tarjeta / Demo: "Les preparé un prototipo interactivo en el celular para que vean cómo funcionaría su menú/catálogo propio. ¿Te puedo dejar el número del responsable para enviárselo por WhatsApp?"`
        );
      } else {
        const text = await generateColdPitchWithAI(p, channel === 'whatsapp' ? 'whatsapp' : 'email');
        setPitchContent(text);
      }
    } catch (e) {
      console.error(e);
      setPitchContent('Error generando argumento con IA. Por favor reintenta.');
    }
    setLoadingPitch(false);
  };

  if (!prospect) return null;

  const cleanPhone = prospect.phone?.replace(/[^0-9]/g, '') || '';
  const instagramUrl = prospect.socialLinks?.instagram || (prospect.website?.includes('instagram.com') ? prospect.website : undefined);
  const igHandle = getInstagramHandle(instagramUrl);
  const facebookUrl = prospect.socialLinks?.facebook || (prospect.website?.includes('facebook.com') ? prospect.website : undefined);
  const tiktokUrl = prospect.socialLinks?.tiktok || (prospect.website?.includes('tiktok.com') ? prospect.website : undefined);
  const isInstagramAsWebsite = Boolean(prospect.website && prospect.website.includes('instagram.com'));
  const isFacebookAsWebsite = Boolean(prospect.website && prospect.website.includes('facebook.com'));
  const hasRealWebsite = Boolean(prospect.website && !isInstagramAsWebsite && !isFacebookAsWebsite);
  const hasNoWeb = !hasRealWebsite;

  const handleCopyStep = (step: 'step1' | 'step2' | 'main', text: string) => {
    let textToCopy = text.replace(/\*\*(.*?)\*\*/g, '*$1*').replace(/[\uFE0E\uFE0F]/g, '').replace(/🗓/g, '📅');
    navigator.clipboard.writeText(textToCopy);
    setCopiedStep(step);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const getEncodedWhatsAppUrl = () => {
    return formatWhatsAppUrl(prospect.phone || '', pitchContent);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative w-full max-w-4xl bg-[#0c0c14] border border-purple-500/30 rounded-3xl shadow-2xl shadow-purple-950/40 z-10 flex flex-col max-h-[92vh] overflow-hidden my-auto"
        >
          {/* TOP HEADER: BRANDING, STATUS & CLOSE */}
          <div className="p-6 bg-gradient-to-r from-purple-950/40 via-[#10101a] to-zinc-950 border-b border-white/10 flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {prospect.category}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/5 text-zinc-400 border border-white/10">
                  Google Maps Verified
                </span>
                {hasNoWeb ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                    <ShieldAlert size={11} /> Sin Sitio Web (Lead Caliente)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 size={11} /> Con Web Activa
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>{prospect.name}</span>
                {prospect.rating > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold flex items-center gap-1">
                    <Star size={12} className="fill-amber-400" />
                    {prospect.rating} ({prospect.reviewCount} reviews)
                  </span>
                )}
              </h2>

              <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                <MapPin size={13} className="text-purple-400 shrink-0" />
                <span>{prospect.address} • <strong>{prospect.city}</strong></span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* QUICK ACTION BAR */}
          <div className="px-6 py-3 bg-[#08080d] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 text-zinc-400 flex-wrap">
              {prospect.phone ? (
                <a
                  href={`tel:${cleanPhone}`}
                  className="flex items-center gap-1.5 text-zinc-300 hover:text-purple-400 font-mono transition-colors"
                >
                  <Phone size={13} className="text-purple-400" />
                  <span>{prospect.phone}</span>
                </a>
              ) : (
                <span className="text-zinc-500 flex items-center gap-1">
                  <Phone size={13} /> Sin teléfono público
                </span>
              )}

              {hasRealWebsite ? (
                <a
                  href={prospect.website?.startsWith('http') ? prospect.website : `https://${prospect.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-emerald-400 hover:underline truncate max-w-[200px]"
                >
                  <Globe size={13} />
                  <span>{prospect.website}</span>
                  <ExternalLink size={10} />
                </a>
              ) : isInstagramAsWebsite ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={13} /> Usa Instagram como web (Sin software propio)
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertTriangle size={13} /> Sin web registrada
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {pipelineMode ? (
                <>
                  {/* Stage Switcher */}
                  {currentStage && onStageChange && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/30">
                      <span className="text-[11px] text-zinc-400 font-semibold">Etapa:</span>
                      <select
                        value={currentStage}
                        onChange={(e) => onStageChange(e.target.value as PipelineStage)}
                        className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
                      >
                        {(Object.keys(STAGE_CONFIG) as PipelineStage[]).map((st) => (
                          <option key={st} value={st} className="bg-[#111] text-white">
                            {STAGE_CONFIG[st].label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Create Proposal Button */}
                  {onCreateProposal && (
                    <button
                      onClick={() => {
                        onClose();
                        onCreateProposal();
                      }}
                      className="px-3.5 py-1.5 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileSpreadsheet size={13} />
                      <span>Generar Propuesta</span>
                    </button>
                  )}

                  {/* Delete Lead Button */}
                  {onDeleteLead && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar este lead de "${prospect.name}" del pipeline?`)) {
                          onClose();
                          onDeleteLead();
                        }
                      }}
                      className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Eliminar lead del pipeline"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </>
              ) : (
                <>
                  {onFocusOnMap && (
                    <button
                      onClick={() => {
                        onFocusOnMap(prospect);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Compass size={13} className="text-purple-400" />
                      <span>Enfocar en Radar</span>
                    </button>
                  )}

                  {onImportToPipeline && (
                    <button
                      onClick={() => onImportToPipeline(prospect)}
                      disabled={isImported}
                      className={`px-3.5 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isImported
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md hover:opacity-90'
                      }`}
                    >
                      {isImported ? (
                        <>
                          <CheckCircle2 size={13} />
                          <span>En Pipeline CRM</span>
                        </>
                      ) : (
                        <>
                          <ArrowRight size={13} />
                          <span>Mover al Pipeline CRM</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* SOCIAL MEDIA & DIGITAL PRESENCE BAR */}
          <div className="px-6 py-2.5 bg-[#0a0a0f] border-b border-white/5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-zinc-500 font-medium text-[11px] flex items-center gap-1">
                <span>Redes Sociales:</span>
              </span>

              {/* Instagram Direct Link or 1-Click Search */}
              {instagramUrl ? (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-amber-500/20 text-pink-300 border border-pink-500/35 hover:border-pink-500/60 font-medium text-xs transition-all shadow-sm group"
                  title="Abrir perfil de Instagram"
                >
                  <Instagram size={13} className="text-pink-400 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold">{igHandle || 'Instagram'}</span>
                  {isInstagramAsWebsite && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-pink-500/30 text-pink-200 font-mono">Web Oficial</span>
                  )}
                  <ExternalLink size={10} className="text-pink-400/70" />
                </a>
              ) : (
                <a
                  href={`https://www.google.com/search?q=site:instagram.com+"${encodeURIComponent(prospect.name)}"+${encodeURIComponent(prospect.city)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-pink-300 border border-white/5 hover:border-pink-500/30 text-xs transition-colors"
                  title="Rastrear perfil de Instagram en Google con 1 clic"
                >
                  <Instagram size={12} className="text-zinc-500" />
                  <span>Buscar Instagram ↗</span>
                </a>
              )}

              {/* Facebook Direct Link or 1-Click Search */}
              {facebookUrl ? (
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 font-medium text-xs transition-all"
                  title="Abrir página de Facebook"
                >
                  <Facebook size={13} className="text-blue-400" />
                  <span>Facebook</span>
                  <ExternalLink size={10} />
                </a>
              ) : (
                <a
                  href={`https://www.google.com/search?q=site:facebook.com+"${encodeURIComponent(prospect.name)}"+${encodeURIComponent(prospect.city)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-blue-300 border border-white/5 hover:border-blue-500/30 text-xs transition-colors"
                  title="Rastrear Facebook en Google"
                >
                  <Facebook size={12} className="text-zinc-500" />
                  <span>Buscar Facebook ↗</span>
                </a>
              )}

              {/* TikTok if exists */}
              {tiktokUrl && (
                <a
                  href={tiktokUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 text-xs transition-colors"
                >
                  <span>TikTok</span>
                  <ExternalLink size={10} />
                </a>
              )}
            </div>

            {/* Google Search Link */}
            <a
              href={`https://www.google.com/search?q="${encodeURIComponent(prospect.name)}"+${encodeURIComponent(prospect.city)}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-zinc-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              <Search size={11} />
              <span>Ver ficha en Google</span>
              <ExternalLink size={9} />
            </a>
          </div>


          {/* TAB NAVIGATION */}
          <div className="flex items-center gap-2 px-6 pt-4 border-b border-white/5 bg-[#0c0c14]">
            <button
              onClick={() => setActiveTab('strategy')}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 transition-all border-b-2 ${
                activeTab === 'strategy'
                  ? 'text-purple-400 border-purple-500'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
            >
              <Target size={14} />
              <span>Estrategia de Venta & Solución</span>
            </button>

            <button
              onClick={() => setActiveTab('pitches')}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 transition-all border-b-2 ${
                activeTab === 'pitches'
                  ? 'text-purple-400 border-purple-500'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
            >
              <Sparkles size={14} />
              <span>Playbook de Pitch (WhatsApp / Llamada)</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 transition-all border-b-2 ${
                activeTab === 'audit'
                  ? 'text-purple-400 border-purple-500'
                  : 'text-zinc-400 border-transparent hover:text-zinc-200'
              }`}
            >
              <FileText size={14} />
              <span>Auditoría Digital de Gemini</span>
            </button>
          </div>

          {/* BODY CONTENT BY TAB */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* 1. STRATEGY TAB */}
            {activeTab === 'strategy' && (
              <div className="space-y-6">
                {/* Proposed Solution Card */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900/20 via-[#12111d] to-indigo-950/20 border border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      Solución CreApp Recomendada
                    </span>
                    <h3 className="text-lg font-bold text-white">
                      {prospect.digitalHealth.suggestedSolution}
                    </h3>
                    <p className="text-zinc-300 text-xs max-w-xl leading-relaxed">
                      {prospect.category === 'Gastronomía'
                        ? 'Menú interactivo con pedidos en 2 clics directos a WhatsApp, pasarela de cobro sin comisiones a terceros y panel de despacho en cocina.'
                        : prospect.category.includes('Dental') || prospect.category.includes('Salud')
                        ? 'Sistema de turnos automáticos 24/7 integrado con WhatsApp IA y recordatorios automatizados para reducir el ausentismo.'
                        : 'Software a medida y landing page orientada a captar clientes locales en su zona de influencia.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-right shrink-0">
                    <div className="text-[10px] text-zinc-400 uppercase font-bold">Propuesta Comercial</div>
                    <div className="text-base font-bold text-white font-mono text-purple-300">
                      A definir s/ alcance
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Diagnóstico personalizado
                    </div>
                  </div>
                </div>

                {/* Pain Points & Opportunities Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[#101018] border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-bold">
                      <TrendingUp size={15} />
                      <span>Fuga de Ingresos</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-[11px]">
                      {hasNoWeb
                        ? 'Al no tener web ni sistema propio, dependen 100% de que el cliente los busque en apps de delivery o redes, perdiendo un 25-30% en comisiones por venta.'
                        : 'Su presencia web actual carece de embudo directo de conversión hacia ventas o agendamiento inmediato.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#101018] border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <DollarSign size={15} />
                      <span>Argumento de Cierre</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-[11px]">
                      "Si vendes $1.000.000 al mes por apps externas, estás regalando $250.000 en comisiones. Con nuestra plataforma CreApp, tu inversión se recupera en las primeras 3 semanas."
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#101018] border border-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 font-bold">
                      <UserCheck size={15} />
                      <span>Perfil del Decisor</span>
                    </div>
                    <p className="text-zinc-400 leading-relaxed text-[11px]">
                      Dueño, socio fundador o encargado operativo del local. Suelen estar saturados en hora pico atendiendo mensajes y valoran la automatización inmediata.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. PITCHES TAB */}
            {activeTab === 'pitches' && (
              <div className="space-y-4">
                {/* Channel / Strategy Selector */}
                <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 w-fit">
                  {[
                    { id: 'conversational', label: 'Estrategia 2 Pasos (Fricción Real)', icon: Sparkles, badge: 'Recomendado' },
                    { id: 'whatsapp', label: 'WhatsApp Directo (Consultivo)', icon: MessageSquare },
                    { id: 'call', label: 'Llamada Fría (Script)', icon: PhoneCall },
                    { id: 'email', label: 'Correo B2B', icon: Mail },
                    { id: 'visit', label: 'Visita al Local', icon: UserCheck },
                  ].map((ch) => {
                    const Icon = ch.icon;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => {
                          setPitchChannel(ch.id as any);
                          loadPitchForChannel(prospect, ch.id as any);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all text-xs ${
                          pitchChannel === ch.id
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-semibold'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon size={13} className={pitchChannel === ch.id ? 'text-white' : 'text-purple-400'} />
                        <span>{ch.label}</span>
                        {ch.badge && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                            pitchChannel === ch.id ? 'bg-white/20 text-white' : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {ch.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* ESTRATEGIA 2 PASOS (CONVERSACIONAL) */}
                {pitchChannel === 'conversational' ? (
                  <div className="space-y-4">
                    {/* Strategy info banner */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#12111d] to-indigo-950/30 border border-purple-500/30 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 shrink-0 mt-0.5">
                        <Sparkles size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-white flex items-center gap-2">
                          <span>Estrategia de Entrada No Frontal (Fricción Real)</span>
                          <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">Tasa de respuesta estimada: +85%</span>
                        </h4>
                        <p className="text-[11px] text-zinc-300 leading-relaxed">
                          En vez de sonar a vendedor frío, entrás con la consulta inocente de un paciente/cliente que buscó en Google y se encontró con la falta de web/turnos. Al validar que el número responde, hacés la transición empática para presentar Dental-IA / CreApp.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* CARD PASO 1 */}
                      <div className="p-4 rounded-2xl bg-[#09090f] border border-white/10 flex flex-col justify-between gap-3 shadow-lg">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold">
                                PASO 1
                              </span>
                              <span className="text-xs font-bold text-white">Gancho de Apertura</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 font-medium">Primer mensaje</span>
                          </div>

                          <p className="text-[10px] text-zinc-400">
                            🎯 <strong>Objetivo:</strong> Que contesten <em>"Hola sí, es acá"</em>. Cero presión de venta.
                          </p>

                          <textarea
                            rows={6}
                            value={step1Text}
                            onChange={(e) => setStep1Text(e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-black/40 border border-white/5 text-zinc-200 text-xs leading-relaxed focus:outline-none focus:border-purple-500 resize-none font-sans"
                          />
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleCopyStep('step1', step1Text)}
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors text-xs"
                          >
                            {copiedStep === 'step1' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            <span>{copiedStep === 'step1' ? 'Copiado' : 'Copiar Paso 1'}</span>
                          </button>

                          {cleanPhone && (
                            <a
                              href={formatWhatsAppUrl(prospect.phone || '', step1Text)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all text-xs"
                            >
                              <Send size={12} />
                              <span>Enviar Paso 1</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* CARD PASO 2 */}
                      <div className="p-4 rounded-2xl bg-[#09090f] border border-purple-500/20 flex flex-col justify-between gap-3 shadow-lg">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                                PASO 2
                              </span>
                              <span className="text-xs font-bold text-white">Transición & Propuesta</span>
                            </div>
                            <span className="text-[10px] text-amber-400/90 font-medium font-mono">Al recibir respuesta</span>
                          </div>

                          <p className="text-[10px] text-zinc-400">
                            🎯 <strong>Objetivo:</strong> Conectar la fricción real con Dental-IA / CreApp y agendar demo de 2 min.
                          </p>

                          <textarea
                            rows={6}
                            value={step2Text}
                            onChange={(e) => setStep2Text(e.target.value)}
                            className="w-full p-2.5 rounded-xl bg-black/40 border border-white/5 text-zinc-200 text-xs leading-relaxed focus:outline-none focus:border-purple-500 resize-none font-sans"
                          />
                        </div>

                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleCopyStep('step2', step2Text)}
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors text-xs"
                          >
                            {copiedStep === 'step2' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            <span>{copiedStep === 'step2' ? 'Copiado' : 'Copiar Paso 2'}</span>
                          </button>

                          {cleanPhone && (
                            <a
                              href={formatWhatsAppUrl(prospect.phone || '', step2Text)}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all text-xs"
                            >
                              <Send size={12} />
                              <span>Enviar Paso 2</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* PITCH GENERAL (WHATSAPP DIRECTO, LLAMADA, EMAIL, VISITA) */
                  <div className="relative p-4 rounded-2xl bg-[#09090f] border border-purple-500/20">
                    {loadingPitch ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
                        <RefreshCw size={20} className="animate-spin text-purple-400" />
                        <span>Generando guion personalizado con IA...</span>
                      </div>
                    ) : (
                      <textarea
                        rows={11}
                        value={pitchContent}
                        onChange={(e) => setPitchContent(e.target.value)}
                        placeholder="Redactando mensaje para el lead..."
                        className="w-full bg-transparent text-zinc-200 text-xs leading-relaxed focus:outline-none resize-none font-sans"
                      />
                    )}

                    {/* Actions inside pitch */}
                    {!loadingPitch && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyStep('main', pitchContent)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1.5 transition-colors font-sans text-xs"
                          >
                            {copiedStep === 'main' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            <span>{copiedStep === 'main' ? 'Copiado al portapapeles' : 'Copiar Guion'}</span>
                          </button>
                          <button
                            onClick={() => loadPitchForChannel(prospect, pitchChannel)}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-purple-300 border border-white/10 flex items-center gap-1.5 transition-colors font-sans text-xs"
                            title="Volver a generar mensaje con IA"
                          >
                            <RefreshCw size={12} />
                            <span>Regenerar con IA</span>
                          </button>
                        </div>

                        {pitchChannel === 'whatsapp' && cleanPhone && (
                          <a
                            href={getEncodedWhatsAppUrl()}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all font-sans text-xs"
                          >
                            <Send size={13} />
                            <span>Abrir WhatsApp con este Mensaje</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. AUDIT TAB */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#101018] border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-purple-400 font-bold">
                    <Bot size={16} />
                    <span>Diagnóstico Detallado de Salud Digital (CreApp AI)</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed text-xs">
                    {prospect.digitalHealth.diagnosis}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold">Velocidad / Rendimiento Web</span>
                    <div className="text-sm font-bold text-white">{prospect.digitalHealth.loadSpeed}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold">Seguridad SSL</span>
                    <div className={`text-sm font-bold ${prospect.digitalHealth.hasSSL ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {prospect.digitalHealth.hasSSL ? 'Certificado Activo (HTTPS)' : 'Inexistente o Sin SSL'}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold">Optimización Móvil</span>
                    <div className={`text-sm font-bold ${prospect.digitalHealth.isMobileFriendly ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {prospect.digitalHealth.isMobileFriendly ? 'Adaptado a Celulares' : 'Fricción en Navegación Móvil'}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold">ID Único de Google Places</span>
                    <div className="text-[11px] font-mono text-zinc-400 truncate">{prospect.id}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
