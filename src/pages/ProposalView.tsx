import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  Rocket,
  ArrowRight,
  ChevronRight,
  XCircle,
  Clock,
  DollarSign,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Eraser,
  ExternalLink,
  Github,
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { getProposalBySlug } from '@/lib/proposalService';
import type { FullProposal } from '@/lib/proposalTypes';
import IconResolver from '@/components/ui/IconResolver';
import ContractRenderer from '@/components/ui/ContractRenderer';
import { generateAndUploadContractBox } from '@/lib/pdfService';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const ProposalView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [proposal, setProposal] = useState<FullProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('alcance');
  const [logoError, setLogoError] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientRepName, setClientRepName] = useState('');
  const [clientDNI, setClientDNI] = useState('');
  const [clientRole, setClientRole] = useState('');
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isContractTextValid, setIsContractTextValid] = useState(true);

  // New states for PDF generation flow
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfSuccessUrl, setPdfSuccessUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getProposalBySlug(slug)
      .then((data) => {
        if (!data) {
          setError('Propuesta no encontrada.');
        } else {
          setProposal(data);
        }
      })
      .catch(() => setError('Error al cargar la propuesta.'))
      .finally(() => setLoading(false));
  }, [slug]);

  // Dynamically update document title based on proposal data
  useEffect(() => {
    if (proposal) {
      document.title = `Propuesta Comercial | ${proposal.client_name}`;
    } else {
      document.title = 'CreAPP - Propuesta Comercial Interactiva';
    }
  }, [proposal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-proposal-dark)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-10 h-10 border-2 border-[var(--color-proposal-brand)] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-xs uppercase tracking-[0.3em] font-black">Cargando Propuesta...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-[var(--color-proposal-dark)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black text-white mb-4">404</h1>
          <p className="text-slate-400">{error || 'Propuesta no encontrada.'}</p>
        </div>
      </div>
    );
  }

  // Dynamic color styles from proposal data
  const brandPrimary = proposal.brand_color_primary;
  const brandSecondary = proposal.brand_color_secondary;
  const gradientStyle = `linear-gradient(to right, ${brandPrimary}, ${brandSecondary})`;

  const CreAPPLogo = () => {
    if (logoError) {
      return (
        <div className="flex items-center gap-3 group select-none">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: gradientStyle }}
          >
            <Rocket className="text-white fill-current" size={22} />
          </div>
          <div className="flex items-baseline italic">
            <span className="text-2xl font-black tracking-tighter text-white">cre</span>
            <span className="text-2xl font-black tracking-tighter" style={{ color: brandPrimary }}>app</span>
          </div>
        </div>
      );
    }
    return (
      <img
        src="/logocreapp_new.png"
        alt="CreAPP Logo"
        className="h-28 md:h-40 w-auto object-contain transition-all duration-700"
        onError={() => setLogoError(true)}
      />
    );
  };

  const openContractModal = () => {
    setIsModalOpen(true);
    setIsSignatureEmpty(true);
    setTimeout(() => {
      if (sigCanvasRef.current) sigCanvasRef.current.clear();
    }, 100);
  };

  const clearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
      setIsSignatureEmpty(true);
    }
  };

  const handleFinalSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientRepName || !clientDNI || !clientRole || isSignatureEmpty || !isContractTextValid) return;
    if (!proposal) return;

    setIsGeneratingPDF(true);
    
    // Wait for React to flush the state to the DOM so the UI swaps the inputs for the static text spans
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      // The generateAndUploadContractBox requires an ID to target the DOM element.
      // E.g 'contract-content-box'. It handles canvas screenshotting, jsPDF generation, and Supabase upload.
      const url = await generateAndUploadContractBox(
        'contract-content-box',
        proposal.id,
        proposal.slug
      );
      
      setPdfSuccessUrl(url);
      setIsConfirmed(true);

    } catch (error) {
      console.error("Failed to generate and upload contract:", error);
      alert("Hubo un error al procesar el contrato. Por favor, intente nuevamente.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Helper: get style variant classes for project option cards
  const getOptionStyles = (variant: string) => {
    if (variant === 'premium') {
      return {
        borderColor: `border-[${brandPrimary}]/40 hover:border-[${brandPrimary}]`,
        badgeBg: `bg-[${brandPrimary}]/10 text-[${brandPrimary}] border-[${brandPrimary}]/20`,
        buttonBg: gradientStyle,
      };
    }
    return {
      borderColor: 'border-blue-500/40 hover:border-blue-500',
      badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      buttonBg: '#2563eb',
    };
  };

  return (
    <div
      className="min-h-screen text-slate-200 font-body p-4 md:p-6 lg:p-10 overflow-hidden relative"
      style={{ backgroundColor: 'var(--color-proposal-dark)' }}
    >
      {/* Background Subtle Grid */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none"></div>

      {/* Header */}
      <motion.header
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="max-w-6xl mx-auto flex flex-col items-center text-center mb-8 md:mb-20 gap-6 md:gap-8 relative z-10 pt-4 md:pt-8"
      >
        {/* Emisor: CreAPP */}
        <div className="flex flex-col items-center gap-2">
          <CreAPPLogo />
          <p className="text-[11px] text-slate-500 font-medium tracking-[0.2em] uppercase">Software & Automation Lab</p>
        </div>

        {/* Divider + Tipo de documento */}
        <div className="flex flex-col items-center gap-4">
          <div className="h-[2px] w-12 rounded-full" style={{ backgroundColor: `${brandPrimary}66` }}></div>
          <p className="text-[13px] uppercase tracking-[0.45em] font-black leading-none" style={{ color: brandPrimary }}>
            Propuesta Técnica
          </p>
        </div>

        {/* Conector direccional */}
        <p className="text-[11px] text-slate-600 uppercase tracking-[0.3em] font-bold italic">preparada para</p>

        {/* Destinatario: Cliente (protagonista) */}
        <div className="flex flex-col items-center gap-3">
          {proposal.client_logo_url && (
            <img src={proposal.client_logo_url} alt={proposal.client_name} className="h-14 md:h-16 w-auto object-contain" />
          )}
          {!proposal.client_logo_url && (
            <h2 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight">{proposal.client_name}</h2>
          )}
        </div>

        {/* Contexto temporal */}
        <div className="flex gap-4 text-[11px] uppercase tracking-widest font-black" style={{ color: `${brandPrimary}99` }}>
          <span>{proposal.date}</span>
          <span>•</span>
          <span>{proposal.location}</span>
        </div>
      </motion.header>

      <main className="max-w-6xl mx-auto space-y-4 md:space-y-14 pb-12 md:pb-24 relative z-10">
        {/* Resumen Ejecutivo */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="relative overflow-hidden rounded-[2.5rem] md:rounded-[3rem] border border-white/5 p-6 md:p-12 lg:p-20 shadow-2xl group"
          style={{ backgroundColor: 'var(--color-proposal-panel)' }}
        >
          <div
            className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none transition-colors duration-1000"
            style={{ backgroundColor: `${brandPrimary}1A` }}
          ></div>
          <div className="relative z-10 grid md:grid-cols-2 gap-16 items-center">
            <div className="text-center md:text-left flex flex-col items-center md:items-start">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest mb-8 border"
                style={{ backgroundColor: `${brandPrimary}1A`, color: brandPrimary, borderColor: `${brandPrimary}33` }}
              >
                {!proposal.hero_badge && <Rocket size={14} className="fill-current" />}
                {proposal.hero_badge || 'MÁS QUE UNA APP'}
              </div>
              <h3 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-white mb-6 md:mb-10 leading-[1.05] tracking-tighter mx-auto md:mx-0">
                {proposal.hero_title ? (
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: gradientStyle }}>
                    {proposal.hero_title}
                  </span>
                ) : (
                  <>
                    Llevamos tu sistema de gestión <br />
                    <span className="bg-clip-text text-transparent" style={{ backgroundImage: gradientStyle }}>
                      al próximo nivel.
                    </span>
                  </>
                )}
              </h3>
              <p className="text-slate-400 text-lg md:text-xl leading-relaxed font-light max-w-lg mx-auto md:mx-0">{proposal.description}</p>
            </div>
            <div className="hidden md:block">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-[#121212] border border-white/5 rounded-[2rem] p-8 shadow-inner font-mono text-sm overflow-hidden relative"
              >
                <div className="absolute top-4 right-6 text-[10px] text-slate-700 font-bold uppercase tracking-widest">AppCore.ts</div>
                <div className="flex gap-2 mb-8">
                  <div className="w-3 h-3 rounded-full bg-red-500/40"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/40"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/40"></div>
                </div>
                <div className="space-y-1.5">
                  <p style={{ color: brandSecondary }}>import <span className="text-white">App</span> from <span style={{ color: brandPrimary }}>'@creapp/core'</span>;</p>
                  <p className="text-slate-600 italic mt-4">// Inicializar infraestructura escalable</p>
                  <p style={{ color: brandSecondary }}>const <span className="text-blue-400">startSystem</span> = <span className="text-white">async</span> () =&gt; {'{'}</p>
                  <p className="text-white ml-6">await <span style={{ color: brandSecondary }}>App</span>.<span className="text-blue-300">deploy</span>({'{'}</p>
                  <p className="text-white ml-10">client: <span style={{ color: brandPrimary }}>'{proposal.client_name}'</span>,</p>
                  <p className="text-white ml-6">{'}'})</p>
                  <p style={{ color: brandSecondary }}>{'}'}</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Prototipos Disponibles */}
        {proposal.project_options.length > 0 && (
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="space-y-12"
          >
            <motion.div variants={fadeUp} className="flex flex-col items-center text-center">
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white uppercase tracking-tighter mb-4">
                Prototipos{' '}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: gradientStyle }}>
                  Disponibles
                </span>
              </h3>
              <p className="text-slate-400 max-w-2xl font-light text-base md:text-lg">
                Evaluá las alternativas interactivas construidas para tu proyecto y elegí la arquitectura que mejor se adapte a tus
                objetivos comerciales.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 relative z-10">
              {proposal.project_options.map((option, i) => {
                const styles = getOptionStyles(option.style_variant);
                const features = typeof option.features === 'string' ? JSON.parse(option.features as string) : option.features;
                return (
                  <motion.div
                    variants={fadeUp}
                    key={i}
                    whileHover={{ y: -10 }}
                    className={`relative overflow-hidden rounded-[2.5rem] border flex flex-col transition-all duration-500 group shadow-2xl ${styles.borderColor}`}
                    style={{ backgroundColor: 'var(--color-proposal-panel)' }}
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.02] rounded-full blur-[80px] group-hover:bg-white/[0.04] transition-colors pointer-events-none"></div>
                    <div className="p-6 md:p-10 flex flex-col h-full relative z-10">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                          <IconResolver name={option.style_variant === 'premium' ? 'Box' : 'LayoutDashboard'} size={24} className={option.style_variant === 'premium' ? '' : 'text-blue-500'} />
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles.badgeBg}`}>
                          {option.tagline}
                        </div>
                      </div>
                      <div className="mb-8 flex-grow">
                        <h4 className="text-2xl font-display font-black text-white tracking-tight mb-4">{option.title}</h4>
                        <p className="text-sm text-slate-400 leading-relaxed font-light mb-8">{option.description}</p>
                        <div className="space-y-3">
                          {features.map((feature: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-3">
                              <CheckCircle2 size={16} className="text-slate-500 opacity-60 shrink-0" />
                              <span className="text-sm text-slate-300 font-bold">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-4 mt-auto">
                        {option.demo_url && (
                          <a
                            href={option.demo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 transition-transform hover:-translate-y-1 text-white shadow-lg"
                            style={{ background: styles.buttonBg }}
                          >
                            Ver Prototipo Interactivo <ExternalLink size={16} />
                          </a>
                        )}
                        {option.github_url && (
                          <a
                            href={option.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 transition-colors"
                          >
                            <Github size={16} /> Repositorio en Github
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Alcance Tabs & Inversión */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
            className="lg:col-span-2 space-y-4 md:space-y-8"
          >
            <div className="flex bg-white/5 rounded-2xl border border-white/5 w-full md:w-fit shadow-inner overflow-hidden p-1 p-1.5 md:p-2 mb-2">
              <button
                onClick={() => setActiveTab('alcance')}
                className={`flex-1 md:flex-none px-4 md:px-10 py-3 md:py-3.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest md:tracking-[0.2em] transition-all duration-500 whitespace-nowrap ${activeTab === 'alcance' ? 'text-white shadow-2xl -translate-y-0.5' : 'text-slate-500 hover:text-slate-300'}`}
                style={activeTab === 'alcance' ? { background: gradientStyle } : {}}
              >
                Incluye
              </button>
              <button
                onClick={() => setActiveTab('exclusiones')}
                className={`flex-1 md:flex-none px-4 md:px-10 py-3 md:py-3.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest md:tracking-[0.2em] transition-all duration-500 whitespace-nowrap ${activeTab === 'exclusiones' ? 'bg-red-900/40 text-red-200 border border-red-500/20 shadow-2xl -translate-y-0.5' : 'text-slate-500 hover:text-slate-300'}`}
              >
                No incluye
              </button>
            </div>

            <div
              className="border border-white/5 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 min-h-[500px] shadow-2xl relative overflow-hidden"
              style={{ backgroundColor: 'var(--color-proposal-panel)' }}
            >
              <AnimatePresence mode="wait">
                {activeTab === 'alcance' ? (
                  <motion.div
                    key="alcance"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 relative z-10"
                  >
                    {proposal.inclusions.map((item, i) => {
                      const isTooltipActive = activeTooltip === `inclusion-${i}`;
                      return (
                        <div
                          key={i}
                          onClick={() => setActiveTooltip(isTooltipActive ? null : `inclusion-${i}`)}
                          onMouseLeave={() => setActiveTooltip(null)}
                          className="relative overflow-hidden p-5 md:p-7 rounded-3xl bg-white/[0.015] md:hover:bg-white/[0.05] md:hover:scale-[1.03] transition-[background-color,transform] duration-300 border border-transparent group cursor-pointer shadow-sm grid [grid-template-areas:'stack'] items-center"
                        >
                          <div className={`flex gap-6 relative z-10 transition-opacity duration-300 items-center [grid-area:stack] ${isTooltipActive ? 'opacity-0 pointer-events-none' : 'md:group-hover:opacity-0'}`}>
                            <div className="shrink-0 rounded-2xl flex items-center justify-center w-14 h-14 shadow-inner" style={{ backgroundColor: `${brandPrimary}0D` }}>
                              <IconResolver name={item.icon_name} size={20} className="" style={{ color: brandPrimary }} />
                            </div>
                            <div>
                              <h4 className="font-display font-bold text-lg text-white mb-1.5 flex items-center gap-2 tracking-tight">
                                {item.title}
                                <ChevronRight size={16} style={{ color: brandPrimary }} className="opacity-60" />
                              </h4>
                              <p className="text-xs text-slate-500 leading-relaxed uppercase tracking-widest font-bold opacity-80">{item.description}</p>
                            </div>
                          </div>
                          <div className={`flex flex-col transition-[opacity,transform] duration-300 [grid-area:stack] relative z-20 h-full overflow-y-auto no-scrollbar ${isTooltipActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 md:group-hover:opacity-100 md:group-hover:translate-y-0 pointer-events-none'}`}>
                            <div className="my-auto py-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full animate-pulse shadow-lg" style={{ backgroundColor: brandPrimary }}></div>
                                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: brandPrimary }}>Detalle Técnico</p>
                              </div>
                              <p className="text-[13px] text-slate-300 font-light leading-relaxed">{item.tooltip}</p>
                            </div>
                          </div>
                          <div className={`absolute inset-0 z-[15] md:backdrop-blur-md transition-opacity duration-300 pointer-events-none ${isTooltipActive ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`} style={{ backgroundColor: 'var(--color-proposal-dark)' }}></div>
                        </div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    key="exclusiones"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 md:space-y-5 relative z-10"
                  >
                    {proposal.exclusions.map((item, i) => {
                      const isTooltipActive = activeTooltip === `exclusion-${i}`;
                      return (
                        <div
                          key={i}
                          onClick={() => setActiveTooltip(isTooltipActive ? null : `exclusion-${i}`)}
                          onMouseLeave={() => setActiveTooltip(null)}
                          className="relative overflow-hidden p-6 rounded-[1.5rem] bg-red-500/[0.02] border border-red-500/10 md:hover:border-red-500/20 md:hover:scale-[1.02] transition-[border-color,transform] duration-300 group cursor-pointer grid [grid-template-areas:'stack'] items-center"
                        >
                          <div className={`flex items-center gap-6 relative z-10 transition-opacity duration-300 [grid-area:stack] ${isTooltipActive ? 'opacity-0 pointer-events-none' : 'md:group-hover:opacity-0'}`}>
                            <XCircle size={22} className="text-red-500 shrink-0 opacity-60" />
                            <p className="text-base text-slate-400 tracking-wide font-light italic">{item.title}</p>
                          </div>
                          <div className={`flex flex-col transition-[opacity,transform] duration-300 [grid-area:stack] relative z-20 h-full overflow-y-auto no-scrollbar ${isTooltipActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 md:group-hover:opacity-100 md:group-hover:translate-y-0 pointer-events-none'}`}>
                            <div className="my-auto py-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.6)]"></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Aclaración</p>
                              </div>
                              <p className="text-[13px] text-red-200/80 font-light leading-relaxed">{item.tooltip}</p>
                            </div>
                          </div>
                          <div className={`absolute inset-0 z-[15] md:backdrop-blur-md bg-[#160505]/95 transition-opacity duration-300 pointer-events-none ${isTooltipActive ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}></div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Tarjeta Inversión */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={fadeUp}
            className="rounded-[2.5rem] p-8 md:p-12 flex flex-col justify-between shadow-2xl relative"
            style={{ backgroundColor: 'var(--color-proposal-dark)', borderColor: `${brandPrimary}4D`, borderWidth: '1px' }}
          >
            <div className="absolute top-0 left-0 w-full h-1 opacity-40 rounded-t-[2.5rem]" style={{ background: gradientStyle }}></div>
            <div>
              <div className="flex items-center justify-center md:justify-start gap-4 mb-10" style={{ color: brandPrimary }}>
                <div className="p-2.5 rounded-xl shadow-inner" style={{ backgroundColor: `${brandPrimary}1A` }}>
                  <DollarSign size={20} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.35em]">Presupuesto Final</span>
              </div>
              <div className="mb-12 text-center md:text-left">
                <h4 className="text-7xl font-display font-black text-white tracking-tighter">{proposal.total_value}</h4>
                <div className="flex items-center justify-center md:justify-start mt-4">
                  <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] italic">Costo de desarrollo</p>
                </div>
              </div>

              <div className="space-y-5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mb-6 px-1 text-center md:text-left">Estructura de Desembolsos</p>
                {proposal.payments.map((p, i) => (
                  <div
                    key={i}
                    className="relative overflow-visible flex items-center justify-between p-5 rounded-3xl bg-white/[0.02] border border-white/5 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/10 group cursor-default min-h-[80px]"
                  >
                    <div className="flex items-center justify-between w-full relative z-10">
                      <div>
                        <p className="text-[11px] font-black text-white uppercase mb-1 tracking-wider">{p.label}</p>
                        <p className="text-[10px] text-slate-600 uppercase tracking-[0.1em] font-bold">{p.description}</p>
                      </div>
                      <span className="text-2xl font-display font-black" style={{ color: brandPrimary }}>
                        {p.percentage}
                      </span>
                    </div>

                    {/* Floating Detail Tooltip Popover */}
                    <div 
                      className="absolute opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 z-30 bg-[#050505]/98 backdrop-blur-xl p-5 rounded-2xl border shadow-2xl text-left
                        lg:right-full lg:left-auto lg:top-1/2 lg:-translate-y-1/2 lg:bottom-auto lg:mb-0 lg:mr-4 lg:w-80
                        bottom-full left-0 right-0 mb-3 w-auto"
                      style={{ borderColor: `${brandPrimary}4D` }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-display font-black" style={{ color: brandPrimary }}>
                          {p.percentage}
                        </span>
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">{p.label}</p>
                      </div>
                      <p className="text-[11px] text-slate-300 font-light leading-relaxed">{p.tooltip}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={openContractModal}
              disabled={isConfirmed}
              className={`mt-14 w-full py-6 rounded-[1.5rem] font-black uppercase tracking-[0.25em] text-[11px] flex items-center justify-center gap-4 transition-all group ${isConfirmed ? 'bg-emerald-600 text-white shadow-lg cursor-default' : 'hover:opacity-90 text-white shadow-lg active:scale-[0.96] cursor-pointer'}`}
              style={!isConfirmed ? { background: gradientStyle } : {}}
            >
              {isConfirmed ? (
                <>
                  Proyecto Confirmado <CheckCircle2 size={18} />
                </>
              ) : (
                <>
                  Confirmar Proyecto <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform duration-500" />
                </>
              )}
            </button>
          </motion.div>
        </div>

        {/* Cronograma */}
        {proposal.milestones.length > 0 && (
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="space-y-12"
          >
            <motion.div variants={fadeUp} className="flex flex-col md:flex-row items-center gap-3 md:gap-5 text-center md:text-left">
              <div className="p-3 rounded-xl bg-white/5 shadow-inner">
                <Clock style={{ color: brandPrimary }} size={22} />
              </div>
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white uppercase tracking-tighter">Workflow Estratégico</h3>
            </motion.div>
            <div className={`grid grid-cols-2 lg:grid-cols-${Math.min(proposal.milestones.length, 6)} gap-4 md:gap-6 lg:gap-8`}>
              {proposal.milestones.map((m, i) => (
                <motion.div
                  variants={fadeUp}
                  key={i}
                  whileHover={{ y: -5 }}
                  className="relative p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-white/5 text-center transition-all group overflow-hidden shadow-xl"
                  style={{ backgroundColor: 'var(--color-proposal-panel)' }}
                >
                  <div className="absolute -top-1 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-all duration-700" style={{ background: gradientStyle }}></div>
                  <div className="absolute top-3 right-4 text-[10px] font-black text-slate-800 italic group-hover:text-slate-600 transition-colors">
                    #{i + 1}
                  </div>
                  <div className="mb-6 flex justify-center text-slate-700 group-hover:scale-125 transition-all duration-700 ease-out">
                    <IconResolver name={m.icon_name} size={20} />
                  </div>
                  <div className="flex flex-col items-center mb-2">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">Semana</span>
                    <p className="text-[12px] font-black tracking-widest leading-none" style={{ color: brandPrimary }}>
                      {m.week_range}
                    </p>
                  </div>
                  <p className="text-[13px] font-display font-black text-white leading-snug tracking-tight">{m.title}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Costos de Infraestructura */}
        {proposal.infrastructure_costs && proposal.infrastructure_costs.length > 0 && (
          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="space-y-12"
          >
            <motion.div variants={fadeUp} className="flex flex-col md:flex-row items-center gap-6 md:gap-5 text-center md:text-left md:justify-between mb-4">
              <div className="flex flex-col md:flex-row items-center gap-4 md:gap-5">
                <div className="p-3 rounded-xl bg-white/5 shadow-inner">
                  <DollarSign style={{ color: brandPrimary }} size={22} />
                </div>
                <div>
                  <h3 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white uppercase tracking-tighter">Costos de Infraestructura</h3>
                  <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Costos fijos mensuales de operación</p>
                </div>
              </div>
              {/* Monthly Total */}
              {(() => {
                const totalMonthly = proposal.infrastructure_costs
                  .filter(c => !c.is_optional)
                  .reduce((sum, c) => {
                    const match = c.monthly_cost.match(/[\d.,]+/);
                    return sum + (match ? parseFloat(match[0].replace(',', '.')) : 0);
                  }, 0);
                return totalMonthly > 0 ? (
                  <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 px-6 py-4 md:py-3 rounded-2xl border border-white/5" style={{ backgroundColor: `${brandPrimary}0D` }}>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center md:text-left">Estimado mensual</span>
                    <span className="text-2xl md:text-xl font-display font-black" style={{ color: brandPrimary }}>USD {totalMonthly.toFixed(0)}/mes</span>
                  </div>
                ) : null;
              })()}
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proposal.infrastructure_costs.map((cost, i) => (
                <motion.div
                  variants={fadeUp}
                  key={i}
                  whileHover={{ y: -5 }}
                  className="relative p-8 rounded-[2rem] border border-white/5 transition-all group overflow-hidden shadow-xl flex flex-col items-center text-center md:items-start md:text-left"
                  style={{ backgroundColor: 'var(--color-proposal-panel)' }}
                >
                  <div className="absolute -top-1 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-all duration-700" style={{ background: gradientStyle }}></div>

                  {/* Provider Badge */}
                  <div className="flex items-center justify-center md:justify-between w-full mb-6 gap-2 flex-wrap">
                    {cost.provider && (
                      <span
                        className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border"
                        style={{ backgroundColor: `${brandPrimary}0D`, color: brandPrimary, borderColor: `${brandPrimary}26` }}
                      >
                        {cost.provider}
                      </span>
                    )}
                    {cost.is_optional && (
                      <span className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Opcional
                      </span>
                    )}
                  </div>

                  {/* Cost */}
                  <p className="text-3xl md:text-2xl font-display font-black tracking-tight mb-2" style={{ color: brandPrimary }}>
                    {cost.monthly_cost}
                  </p>

                  {/* Title */}
                  <h4 className="text-xl md:text-base font-display font-black text-white tracking-tight mb-3">{cost.title}</h4>

                  {/* Description */}
                  {cost.description && (
                    <p className="text-[13px] md:text-xs text-slate-400 md:text-slate-500 leading-relaxed font-light">{cost.description}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Términos y Garantía */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeUp}
          className="grid grid-cols-1 md:grid-cols-2 gap-10"
        >
          <div className="p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden flex flex-col items-center text-center md:items-start md:text-left" style={{ backgroundColor: 'var(--color-proposal-panel)' }}>
            <div className="absolute bottom-0 left-0 w-full h-[3px] bg-emerald-500/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-1000"></div>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-5 mb-6 md:mb-8">
              <div className="p-3 rounded-2xl bg-emerald-500/10 shadow-inner w-fit"><ShieldCheck className="text-emerald-500" size={22} /></div>
              <h4 className="font-black text-white uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-[11px] underline decoration-emerald-500/40 underline-offset-[12px] decoration-2">Garantía de Código</h4>
            </div>
            <p className="text-base md:text-lg text-slate-500 leading-relaxed font-light">
              Respaldamos nuestro desarrollo con <span className="text-emerald-400 font-bold">30 días de soporte integral</span> sin costo.
              Garantizamos la estabilidad operativa tras el despliegue final.
            </p>
          </div>
          <div className="p-8 md:p-12 rounded-[2.5rem] md:rounded-[3rem] bg-[#0d0d0d] border border-white/5 shadow-2xl relative group overflow-hidden flex flex-col items-center text-center md:items-start md:text-left">
            <div className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-500/20 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-1000"></div>
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-5 mb-6 md:mb-8">
              <div className="p-3 rounded-2xl bg-blue-500/10 shadow-inner w-fit"><FileText className="text-blue-500" size={22} /></div>
              <h4 className="font-black text-white uppercase tracking-[0.2em] md:tracking-[0.3em] text-[10px] md:text-[11px] underline decoration-blue-500/40 underline-offset-[12px] decoration-2">Rondas de Optimización</h4>
            </div>
            <p className="text-base md:text-lg text-slate-500 leading-relaxed font-light">
              Cada etapa cuenta con <span className="text-blue-400 font-bold">tres ciclos de revisiones técnicas</span>.
              Aseguramos que el producto final supere las expectativas del cliente.
            </p>
          </div>

        </motion.section>

        {/* Firmas */}
        <motion.section
          id="signature-section"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={fadeUp}
          className="pt-24 border-t border-white/10"
        >
          <div className="flex flex-col gap-16 md:gap-24 max-w-2xl mx-auto">
            <div className="space-y-8 text-center">
              <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.5em] px-2 text-center">
                Aceptación {proposal.client_name}
              </p>
              <AnimatePresence mode="wait">
                {!isConfirmed ? (
                  <motion.div
                    key="unsigned"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={openContractModal}
                    className="h-40 w-full bg-white/[0.015] rounded-[2rem] border-2 border-dashed border-white/10 flex items-center justify-center group cursor-pointer transition-all"
                  >
                    <div className="text-center group-hover:scale-105 transition-transform duration-500">
                      <span className="text-slate-300 text-[11px] font-black uppercase tracking-[0.3em] transition-colors" style={{ ['--hover-color' as string]: brandPrimary }}>
                        Firmar Digitalmente
                      </span>
                      <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest">Representante Legal</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="signed"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-40 w-full bg-emerald-900/10 border border-emerald-500/20 rounded-[2rem] flex items-center justify-center relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-3 mb-2 text-emerald-400">
                        <CheckCircle2 size={24} />
                        <span className="text-[12px] font-black uppercase tracking-[0.3em]">Propuesta Aceptada</span>
                      </div>
                      <p className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest mt-2">
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex flex-col items-center justify-center">
              <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.5em] mb-8 px-2 text-center">Validación CreAPP</p>
              <div className="flex flex-col md:flex-row items-center md:items-start justify-center gap-12 md:gap-24 w-full">
                {/* Sebastián Maza */}
                <div className="text-center">
                  <div className="relative mb-4 inline-block">
                    <p className="font-display font-black text-xl md:text-2xl opacity-95 select-none tracking-tighter uppercase" style={{ color: brandPrimary }}>
                      Sebastián Maza
                    </p>
                    <div className="h-[2px] w-full mt-3" style={{ background: gradientStyle }}></div>
                  </div>
                  <p className="text-[12px] font-display font-black text-white uppercase tracking-[0.25em]">Chief Technology Officer</p>
                  <p className="text-[10px] text-slate-600 uppercase mt-2 tracking-widest italic font-bold">Innovación & Arquitectura de Software</p>
                </div>

                {/* Facundo Marceca */}
                <div className="text-center">
                  <div className="relative mb-4 inline-block">
                    <p className="font-display font-black text-xl md:text-2xl opacity-95 select-none tracking-tighter uppercase" style={{ color: brandPrimary }}>
                      Facundo Marceca
                    </p>
                    <div className="h-[2px] w-full mt-3" style={{ background: gradientStyle }}></div>
                  </div>
                  <p className="text-[12px] font-display font-black text-white uppercase tracking-[0.25em]">Project Manager</p>
                  <p className="text-[10px] text-slate-600 uppercase mt-2 tracking-widest italic font-bold">Gestión y Estructura de proyecto</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      <footer className="max-w-6xl mx-auto py-10 md:py-20 border-t border-white/5 flex flex-col md:flex-row justify-center md:justify-between items-center gap-6 md:gap-8 mt-10 md:mt-0">
        <div className="opacity-20 hover:opacity-100 transition-all duration-1000">
          <CreAPPLogo />
        </div>
        <div className="flex flex-col items-center md:items-end gap-2 text-slate-700 text-[10px] tracking-[0.6em] uppercase font-black text-center md:text-right">
          <p>© 2026 CreAPP Lab</p>
          <p>Elevando el estándar tecnológico</p>
        </div>
      </footer>

      {/* Interactive Legal Contract Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-black/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#050505] border border-white/10 rounded-2xl md:rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative"
            >
              {/* Modal Header */}
              <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h2 className="text-base md:text-2xl font-display font-black text-white uppercase tracking-wider flex items-center gap-2 md:gap-3">
                  <ShieldCheck style={{ color: brandPrimary }} size={22} className="md:w-[26px] md:h-[26px]" />
                  Contrato de Servicios
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                  <XCircle size={28} />
                </button>
              </div>

              {/* PDF Loading Overlay (Positioned outside scroll to lock viewport) */}
              <AnimatePresence>
                {isGeneratingPDF && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-[#050505]/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                  >
                    <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mb-6" style={{ borderColor: brandPrimary, borderTopColor: 'transparent' }}></div>
                    <h3 className="text-xl font-display font-black text-white mb-2 tracking-tight">Generando Documento Legal Criptográfico...</h3>
                    <p className="text-sm text-slate-400 font-light">Este proceso puede demorar unos segundos para aplicar la seguridad necesaria.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* PDF Success State */}
              <AnimatePresence>
                {pdfSuccessUrl && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 z-50 bg-[#050505] flex flex-col items-center justify-center p-6 md:p-12 text-center"
                  >
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-2xl" style={{ backgroundColor: `${brandPrimary}15` }}>
                      <CheckCircle2 size={40} style={{ color: brandPrimary }} />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-display font-black text-white mb-4 tracking-tighter">Contrato Firmado Exitosamente</h3>
                    <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto mb-10 leading-relaxed">
                      El ecosistema digital ya está en marcha. Hemos guardado una copia cifrada del contrato en nuestros servidores.
                    </p>
                    
                    <div className="space-y-4 w-full max-w-sm">
                      <a
                        href={pdfSuccessUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border transition-all text-sm font-bold uppercase tracking-widest"
                        style={{ borderColor: `${brandPrimary}40`, color: brandPrimary, backgroundColor: `${brandPrimary}0A` }}
                      >
                        <FileText size={18} />
                        Descargar PDF
                      </a>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white text-sm font-bold uppercase tracking-widest text-center"
                      >
                        Cerrar Contrato
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Modal Body & Footer Wrapper to handle scrolling */}
              <div className="flex-1 overflow-y-auto flex flex-col relative" id="contract-content-box">

                {/* PDF Cover Page Header (Only visible in generated PDF) */}
                {isGeneratingPDF && (
                  <div className="w-full flex justify-center items-center pt-24 pb-16 bg-[#050505] border-b border-white/10 mb-4">
                    <div className="flex flex-col items-center">
                      <img src="/logocreapp_new.png" alt="CreAPP Logo" className="h-20 md:h-28 mb-10 object-contain" />
                      <h1 className="text-2xl md:text-4xl font-display font-black text-white uppercase tracking-[0.2em] text-center">
                        Contrato de Servicios
                      </h1>
                      <div className="h-1 w-24 mt-8 rounded-full" style={{ background: gradientStyle }}></div>
                    </div>
                  </div>
                )}

                {/* Modal Body */}
                <div className="flex-1 p-6 md:p-10 text-slate-300 text-sm md:text-base leading-relaxed font-light space-y-6 text-center md:text-left">
                  <ContractRenderer
                    template={proposal.contract_text || `En la localidad de {location}, a los {date} días del mes, se reúnen por una parte {client_name}, en adelante denominado "EL CLIENTE", representado por [input:Escriba su Nombre], con DNI/CUIT N° [input:Escriba su DNI/CUIT]; y por la otra parte Creapp, representada por Sebastián Maza, en adelante denominado "EL DESARROLLADOR".`}
                    variables={{
                      location: proposal.location,
                      date: proposal.date,
                      client_name: proposal.client_name
                    }}
                    onValidityChange={setIsContractTextValid}
                    brandPrimary={brandPrimary}
                    isGeneratingPDF={isGeneratingPDF}
                  />

                  {/* Signature area inside modal */}
                  <div className="flex flex-col gap-8 md:gap-10 pt-6 mt-6 border-t border-white/10">
                    <div className="space-y-4">
                      <p className="font-bold text-white uppercase tracking-widest text-xs mb-6">Por EL CLIENTE ({proposal.client_name}):</p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-slate-500 uppercase tracking-widest">Firma</p>
                          {!isSignatureEmpty && (
                            <button
                              onClick={clearSignature}
                              className="text-[10px] hover:text-white flex items-center gap-1 uppercase tracking-widest transition-colors"
                              style={{ color: brandPrimary }}
                            >
                              <Eraser size={12} /> Limpiar
                            </button>
                          )}
                        </div>
                        <div className="bg-white/5 border border-white/10 border-dashed rounded-xl overflow-hidden relative">
                          <SignatureCanvas
                            ref={sigCanvasRef}
                            penColor="#f43f5e"
                            canvasProps={{ className: 'w-full min-h-[140px] cursor-crosshair touch-none' }}
                            onEnd={() => setIsSignatureEmpty(sigCanvasRef.current?.isEmpty() ?? true)}
                          />
                          {isSignatureEmpty && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                              <p className="text-slate-600/50 text-xs uppercase tracking-widest font-black rotate-[-5deg]">Firmar aquí</p>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest block">Aclaración (Nombre Completo)</label>
                        {isGeneratingPDF ? (
                          <div className="w-full py-1 text-white font-bold text-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {clientRepName}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Ej. Juan Pérez"
                            value={clientRepName}
                            onChange={(e) => setClientRepName(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-slate-600 focus:outline-none transition-colors"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest block">DNI / CUIT</label>
                        {isGeneratingPDF ? (
                          <div className="w-full py-1 text-white font-bold text-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {clientDNI}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Ej. 20-12345678-9"
                            value={clientDNI}
                            onChange={(e) => setClientDNI(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-slate-600 focus:outline-none transition-colors"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] text-slate-500 uppercase tracking-widest block">Cargo</label>
                        {isGeneratingPDF ? (
                          <div className="w-full py-1 text-white font-bold text-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
                            {clientRole}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Ej. CEO / Director Organizacional"
                            value={clientRole}
                            onChange={(e) => setClientRole(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-slate-600 focus:outline-none transition-colors"
                          />
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-4 pt-6 border-t border-white/5">
                      <p className="font-bold text-white uppercase tracking-widest text-xs mb-6">Por EL DESARROLLADOR (CreAPP):</p>
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Firma</p>
                        <div className="bg-white/5 border border-white/10 border-dashed rounded-xl p-4 flex items-center justify-center h-28 md:h-32">
                          <img
                            src="/firmaseba.png"
                            alt="Firma Sebastián Maza"
                            className="h-full w-auto object-contain"
                            style={{ filter: 'brightness(0) saturate(100%) invert(35%) sepia(81%) saturate(4145%) hue-rotate(336deg) brightness(96%) contrast(96%)' }}
                          />
                        </div>
                      </div>
                      <div className="space-y-2 pt-2 md:pt-4">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Aclaración</p>
                        <p className="text-xl font-display font-black uppercase tracking-tight" style={{ color: brandPrimary }}>Sebastián Maza</p>
                      </div>
                      <div className="space-y-1 pt-6">
                        <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Cargo</p>
                        <p className="text-sm font-bold text-white uppercase tracking-widest">Desarrollador de Software / Titular</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 md:p-8 border-t border-white/5 bg-[#050505] sticky bottom-0 z-10 w-full mt-auto" data-html2canvas-ignore>
                  <button
                    onClick={handleFinalSignature}
                    disabled={!clientRepName || !clientDNI || !clientRole || isSignatureEmpty || !isContractTextValid || isGeneratingPDF}
                    className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-[0.25em] text-[11px] flex items-center justify-center gap-4 transition-all group ${!clientRepName || !clientDNI || !clientRole || isSignatureEmpty || !isContractTextValid || isGeneratingPDF ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'hover:opacity-90 text-white shadow-lg active:scale-[0.98]'}`}
                    style={clientRepName && clientDNI && clientRole && !isSignatureEmpty && isContractTextValid && !isGeneratingPDF ? { background: gradientStyle } : {}}
                  >
                    {isGeneratingPDF ? 'Procesando...' : 'Confirmar y Enviar Contrato'} <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform duration-500" />
                  </button>
                  {(!clientRepName || !clientDNI || !clientRole || isSignatureEmpty || !isContractTextValid) && (
                    <p className="text-center text-[10px] mt-3 tracking-widest uppercase" style={{ color: brandPrimary }}>
                      Completa TODOS los campos y firmas requeridos para confirmar
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProposalView;
