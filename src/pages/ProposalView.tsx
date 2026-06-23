import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import gsap from 'gsap';
import {
  Rocket,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
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
import { generateAndUploadContractBox, generateFullProposalPDF } from '@/lib/pdfService';
import creappLogoOfficial from '@/assets/CREAPP LOGO VECTOR.png';
import Lightfall from '@/components/backgrounds/Lightfall';

const getCurrencyFromTotal = (valString: string) => {
  const clean = (valString || '').trim().toUpperCase();
  if (clean.startsWith('ARS') || clean.includes('ARS')) return 'ARS';
  return 'USD';
};

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

const DEFAULT_METHODOLOGY = {
  intro_text: "Implementamos un proceso de desarrollo iterativo para asegurar lanzamientos predecibles y la validación constante de la usabilidad de la interfaz por parte del cliente.",
  scope_intro: "Detalle técnico del desarrollo y los entregables comprometidos para la ejecución del proyecto.",
  exclusions_intro: "Aspectos, integraciones y requerimientos no contemplados en el desarrollo de la presente propuesta.",
  phases_intro: "El plan de esfuerzo comprende un periodo de 4 meses (16 sprints semanales). Cada fase mensual concluye con un hito de control funcional y estético auditado antes de la liberación del siguiente incremento de software.",
  weekly_breakdown_intro_1_8: "Desglose técnico del esfuerzo de desarrollo correspondiente a las primeras 80 horas de programación de la aplicación.",
  weekly_breakdown_intro_9_16: "Desglose técnico de programación correspondiente a las últimas 80 horas de desarrollo enfocadas a utilidades, calculadoras y optimización de interacción.",
  incremental_title: "Desarrollo Incremental",
  incremental_text: "Cada sprint semanal se traduce en código estable. Esta metodología reduce la acumulación de errores estéticos y permite corregir flujos visuales incómodos directamente sobre el teléfono del usuario.",
  planning_title: "Planificación de Contenidos",
  planning_text: "Para cumplir con la línea de tiempo establecida, {client_name} proveerá los insumos audiovisuales (videos de 15s del wizard, listado de preguntas frecuentes) al Prestador antes de iniciar el sprint de su implementación.",
  schedule_monday_title: "LUN",
  schedule_monday_subtitle: "Sprint Kickoff (15 min)",
  schedule_monday_text: "Reunión ágil para definir el objetivo de la semana, validar assets multimedia y fijar entregables técnicos inmediatos.",
  schedule_tuesday_title: "MAR - JUE",
  schedule_tuesday_subtitle: "Desarrollo & Staging",
  schedule_tuesday_text: "Escritura de código e integración de componentes. Despliegues continuos en entorno de pruebas. Consultas por canal de comunicación directo.",
  schedule_friday_title: "VIE",
  schedule_friday_subtitle: "Demo Semanal & Aprobación",
  schedule_friday_text: "Liberación de la versión semanal en móvil. A las 16:00 hs se audita el feedback y se aprueba formalmente el incremento de software."
};

const SLIDES = ['Portada', 'Resumen', 'Incluye', 'No incluye', 'Metodología', 'Fases', 'Desglose', 'Presupuesto', 'Contrato'];

const WEEKS_BREAKDOWN_1_8 = [
  {
    id: 'W01',
    title: 'CIMIENTOS CORE',
    desc: 'Setup del proyecto en Next.js, Tailwind. Definición de variables de estilos y estructura del modelo relacional de base de datos para Suelos, Plantas y Acciones.',
    hours: 10
  },
  {
    id: 'W02',
    title: 'WELCOME SCREEN',
    desc: 'Maquetación de la pantalla de bienvenida dual ("¿Ya tenés un suelo?"). Lógica mobile-first, redireccionamiento condicional a tienda o asistente.',
    hours: 10
  },
  {
    id: 'W03',
    title: 'SETUP WIZARD',
    desc: 'Implementación del flujo de 4 pasos interactivos para el armado de la cama. Soporte para bucles de video cortos (15s) y almacenamiento temporal en localStorage.',
    hours: 10
  },
  {
    id: 'W04',
    title: 'DNI BIOLÓGICO',
    desc: 'Lógica algorítmica para determinar el nivel de XP del cultivador. Modelado e implementación de la tarjeta digital DNI del suelo y redirección al Dashboard.',
    hours: 10
  },
  {
    id: 'W05',
    title: 'HERO & FOTOPERIODO',
    desc: 'Maquetación de la cabecera inmersiva con luces reactivas. Componente inteligente de fotoperíodo automático según la hora local del dispositivo.',
    hours: 10
  },
  {
    id: 'W06',
    title: 'BLOQUEO DE CURADO',
    desc: 'Controlador lógico de estado temporal (21 días) para curado de suelos nuevos. Implementación de barra de progreso con cuenta regresiva para desbloqueo.',
    hours: 10
  },
  {
    id: 'W07',
    title: 'ACCIONES RÁPIDAS',
    desc: 'Diseño e integración de menú flotante (+). Despliegue de Bottom Sheet interactiva de carga para Riego, Té de Compost y Enmienda.',
    hours: 10
  },
  {
    id: 'W08',
    title: 'ADVERTENCIAS IA',
    desc: 'Algoritmo preventivo de dosificación según historial reciente (alertas de sobre-riego o saturación de té). Modales informativos con checks animados.',
    hours: 10
  }
];

const WEEKS_BREAKDOWN_9_16 = [
  {
    id: 'W09',
    title: 'TARJETAS SUELOS',
    desc: 'Desarrollo del panel alternativo de listado de Suelos. Tarjetas con desglose detallado de cultivo y selector dinámico de suelo activo para el Dashboard.',
    hours: 10
  },
  {
    id: 'W10',
    title: 'BITÁCORA FASES',
    desc: 'Línea de tiempo histórica y control de plantas (genéticas de cultivo). Modales para cambios biológicos manuales (Vegetativo, Flora, Descanso).',
    hours: 10
  },
  {
    id: 'W11',
    title: 'CALCULADORAS',
    desc: 'Integración de algoritmos de cálculo de riego (5% del volumen de maceta) y té de compost (10% + tabla dinámica de ingredientes). Guías ilustradas.',
    hours: 10
  },
  {
    id: 'W12',
    title: 'SUELOIA SUPPORT',
    desc: 'Estructuración de FAQ expandible, simulación de respuestas inmediatas mediante bot de chat local y redirección automatizada a WhatsApp con pre-cargas.',
    hours: 10
  },
  {
    id: 'W13',
    title: 'BENTO SPACING',
    desc: 'Homogeneización visual del Dashboard bajo formato de Bento UI. Alineación matemática de espaciados, fuentes y coherencia tipográfica general.',
    hours: 10
  },
  {
    id: 'W14',
    title: 'MICRO-INTERACTIONS',
    desc: 'Animaciones en interacciones de clicks (press-scale) en botones de acción. Suavizado en la carga entre pantallas y animaciones de entrada.',
    hours: 10
  },
  {
    id: 'W15',
    title: 'RESPONSIVE QA',
    desc: 'Pruebas en emuladores y celulares físicos de múltiples tamaños y reajuste de reglas CSS para evitar saltos o desbordes de texto.',
    hours: 10
  },
  {
    id: 'W16',
    title: 'E2E & DELIVERY',
    desc: 'Pruebas extremo a extremo simulando workflows de cultivo. Proceso de optimización de archivos finales de código y entrega formal de documentación.',
    hours: 10
  }
];

const CanvasParticles: React.FC<{ primaryColor: string; secondaryColor: string }> = ({ primaryColor, secondaryColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const mouse = { x: -1000, y: -1000, radius: 180 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const particles = Array.from({ length: 55 }).map((_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      size: Math.random() * 1.8 + 0.8,
      color: i % 2 === 0 ? primaryColor : secondaryColor,
      alpha: Math.random() * 0.35 + 0.15,
      pulseSpeed: Math.random() * 0.02 + 0.008,
      pulseValue: Math.random() * Math.PI
    }));

    let animationFrameId: number;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw interactive dot grid
      const gridSize = 50;
      for (let x = 25; x < width; x += gridSize) {
        for (let y = 25; y < height; y += gridSize) {
          let alpha = 0.035;
          let dotSize = 0.75;
          if (mouse.x > -1000) {
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 180) {
              const factor = 1 - dist / 180;
              alpha = 0.035 + factor * 0.18;
              dotSize = 0.75 + factor * 0.65;
            }
          }
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fill();
        }
      }

      // 2. Update & Draw Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Mouse repulsion
        if (mouse.x > -1000) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            p.x += (dx / dist) * force * 1.2;
            p.y += (dy / dist) * force * 1.2;
          }
        }

        p.pulseValue += p.pulseSpeed;
        const currentAlpha = p.alpha + Math.sin(p.pulseValue) * 0.08;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0.05, Math.min(0.65, currentAlpha));
        ctx.fill();
      });

      // 3. Draw constellation connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            const alpha = (1 - dist / 90) * 0.12;
            ctx.strokeStyle = p1.color;
            ctx.globalAlpha = alpha;
            ctx.stroke();
          }
        }

        // Connect to mouse
        if (mouse.x > -1000) {
          const dx = p1.x - mouse.x;
          const dy = p1.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius - 40) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouse.x, mouse.y);
            const alpha = (1 - dist / (mouse.radius - 40)) * 0.22;
            ctx.strokeStyle = p1.color;
            ctx.globalAlpha = alpha;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [primaryColor, secondaryColor]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    filter: 'blur(3px)'
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1]
    }
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
    filter: 'blur(3px)',
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1]
    }
  })
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
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [clientSignature, setClientSignature] = useState<string | null>(null);

  // Slide Deck States
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [activeScrumDay, setActiveScrumDay] = useState<'LUN' | 'MAR - JUE' | 'VIE'>('LUN');
  const [activeDesgloseTab, setActiveDesgloseTab] = useState<'w1-8' | 'w9-16'>('w1-8');

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

  // Synchronize signed state on load
  useEffect(() => {
    if (proposal && proposal.status === 'signed') {
      setIsConfirmed(true);
    }
  }, [proposal]);

  // Dynamically update document title based on proposal data
  useEffect(() => {
    if (proposal) {
      document.title = `Propuesta Comercial | ${proposal.client_name}`;
    } else {
      document.title = 'CreAPP - Propuesta Comercial Interactiva';
    }
  }, [proposal]);

  const slideRef = useRef<HTMLDivElement>(null);

  // GSAP slide transition micro-animations
  useEffect(() => {
    if (!slideRef.current) return;

    // Target elements to animate
    const upElements = slideRef.current.querySelectorAll('.gsap-reveal-up');
    const scaleElements = slideRef.current.querySelectorAll('.gsap-reveal-scale');
    const leftElements = slideRef.current.querySelectorAll('.gsap-reveal-left');
    const rightElements = slideRef.current.querySelectorAll('.gsap-reveal-right');
    const progressBars = slideRef.current.querySelectorAll('.gsap-progress-bar');

    // Kill any existing tweens to prevent concurrency issues
    gsap.killTweensOf([...upElements, ...scaleElements, ...leftElements, ...rightElements, ...progressBars]);

    // Initial states
    gsap.set(upElements, { opacity: 0, y: 35, filter: 'blur(6px)' });
    gsap.set(scaleElements, { opacity: 0, scale: 0.93, filter: 'blur(6px)' });
    gsap.set(leftElements, { opacity: 0, x: -35, filter: 'blur(6px)' });
    gsap.set(rightElements, { opacity: 0, x: 35, filter: 'blur(6px)' });
    if (progressBars.length > 0) {
      gsap.set(progressBars, { scaleX: 0 });
    }

    // Animation timeline with beautiful pacing and power3 easing
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.75 } });

    if (upElements.length > 0) {
      tl.to(upElements, { opacity: 1, y: 0, filter: 'blur(0px)', stagger: 0.07 }, 0);
    }
    if (scaleElements.length > 0) {
      tl.to(scaleElements, { opacity: 1, scale: 1, filter: 'blur(0px)', stagger: 0.08 }, 0.1);
    }
    if (leftElements.length > 0) {
      tl.to(leftElements, { opacity: 1, x: 0, filter: 'blur(0px)', stagger: 0.07 }, 0.05);
    }
    if (rightElements.length > 0) {
      tl.to(rightElements, { opacity: 1, x: 0, filter: 'blur(0px)', stagger: 0.07 }, 0.05);
    }
    if (progressBars.length > 0) {
      tl.to(progressBars, { scaleX: 1, duration: 1.1, ease: 'power2.out', stagger: 0.05 }, 0.25);
    }
  }, [currentSlide]);

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
        src={creappLogoOfficial}
        alt="CreAPP Logo"
        className="h-20 w-auto object-contain transition-all duration-700"
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
    
    // Save signature for the print template
    if (sigCanvasRef.current) {
      setClientSignature(sigCanvasRef.current.toDataURL());
    }
    
    // Wait for React to flush the state to the DOM so the UI swaps the inputs for the static text spans
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
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

  const downloadProposalPDF = async () => {
    if (!proposal) return;
    setIsDownloadingPDF(true);

    // If signed, capture signature state
    if (sigCanvasRef.current && !isSignatureEmpty) {
      setClientSignature(sigCanvasRef.current.toDataURL());
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const blob = await generateFullProposalPDF('full-proposal-print-template');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Propuesta-Comercial-${proposal.client_name.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Hubo un error al generar el PDF de la propuesta.');
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const nextSlide = () => {
    if (currentSlide < SLIDES.length - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  };

  const scrumSteps = [
    {
      day: 'LUN',
      title: proposal.methodology?.schedule_monday_title || DEFAULT_METHODOLOGY.schedule_monday_title,
      subtitle: proposal.methodology?.schedule_monday_subtitle || DEFAULT_METHODOLOGY.schedule_monday_subtitle,
      text: (proposal.methodology?.schedule_monday_text || DEFAULT_METHODOLOGY.schedule_monday_text).replace('{client_name}', proposal.client_name),
      angle: 0
    },
    {
      day: 'MAR - JUE',
      title: proposal.methodology?.schedule_tuesday_title || DEFAULT_METHODOLOGY.schedule_tuesday_title,
      subtitle: proposal.methodology?.schedule_tuesday_subtitle || DEFAULT_METHODOLOGY.schedule_tuesday_subtitle,
      text: (proposal.methodology?.schedule_tuesday_text || DEFAULT_METHODOLOGY.schedule_tuesday_text).replace('{client_name}', proposal.client_name),
      angle: 120
    },
    {
      day: 'VIE',
      title: proposal.methodology?.schedule_friday_title || DEFAULT_METHODOLOGY.schedule_friday_title,
      subtitle: proposal.methodology?.schedule_friday_subtitle || DEFAULT_METHODOLOGY.schedule_friday_subtitle,
      text: (proposal.methodology?.schedule_friday_text || DEFAULT_METHODOLOGY.schedule_friday_text).replace('{client_name}', proposal.client_name),
      angle: 240
    }
  ];

  const renderSlide = () => {
    switch (currentSlide) {
      case 0:
        return (
          <div className="flex flex-col items-center justify-center text-center py-6 min-h-[420px] relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none" style={{ backgroundColor: `${brandPrimary}15` }}></div>
            <div className="flex flex-col items-center gap-6 relative z-10">
              {/* Capsule pill badge */}
              <div className="px-4 py-1.5 rounded-full border text-[9px] font-black tracking-[0.25em] uppercase gsap-reveal-scale shadow-sm select-none"
                style={{ backgroundColor: `${brandPrimary}15`, color: brandPrimary, borderColor: `${brandPrimary}33` }}>
                Propuesta Comercial
              </div>
              
              {/* Massive Title */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-black text-white tracking-tighter max-w-4xl leading-[1.1] uppercase gsap-reveal-up select-none mt-2">
                Diseño y Desarrollo <span className="bg-clip-text text-transparent block mt-3" style={{ backgroundImage: gradientStyle }}>{proposal.hero_title || 'Ecosistema Digital'}</span>
              </h1>
              
              {/* Target client */}
              <p className="text-[12px] md:text-sm text-slate-400 font-light mt-4 gsap-reveal-up select-none">
                Preparado exclusivamente para <strong className="text-white font-black uppercase tracking-wider ml-1">{proposal.client_name}</strong>
              </p>
              
              {/* Date & Location */}
              <div className="flex gap-4 text-[9px] uppercase tracking-widest font-black text-slate-600 mt-1 gsap-reveal-up select-none">
                <span>{proposal.date}</span>
                <span>•</span>
                <span>{proposal.location}</span>
              </div>
              
              {/* CTA button */}
              <button
                onClick={nextSlide}
                className="mt-6 px-10 py-4.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-2xl flex items-center gap-3 transition-all hover:scale-105 cursor-pointer active:scale-95 border border-white/5 brand-btn-glow gsap-reveal-scale"
                style={{ background: gradientStyle }}
              >
                Explorar Propuesta <ArrowRight size={13} />
              </button>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="grid md:grid-cols-2 gap-10 items-center py-4 min-h-[420px]">
            <div className="gsap-reveal-left">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[9px] font-black tracking-widest mb-6 border uppercase"
                style={{ backgroundColor: `${brandPrimary}15`, color: brandPrimary, borderColor: `${brandPrimary}33` }}>
                <Rocket size={12} className="fill-current" />
                {proposal.hero_badge || 'Resumen'}
              </span>
              <h3 className="text-3xl md:text-4xl font-display font-black text-white mb-6 leading-tight tracking-tight">
                {proposal.hero_title ? (
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: gradientStyle }}>
                    {proposal.hero_title}
                  </span>
                ) : (
                  <>Llevamos tu sistema al <span className="bg-clip-text text-transparent" style={{ backgroundImage: gradientStyle }}>próximo nivel.</span></>
                )}
              </h3>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed font-light">{proposal.description}</p>
            </div>
            <div className="relative gsap-reveal-right">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent to-white/[0.02] border border-white/5 pointer-events-none"></div>
              <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/5 font-mono text-xs overflow-hidden shadow-inner">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/40"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/40"></div>
                  </div>
                  <span className="text-[9px] text-slate-700 font-bold uppercase tracking-widest">AppCore.ts</span>
                </div>
                <div className="space-y-2 text-slate-400">
                  <p style={{ color: brandSecondary }}>import <span className="text-white">App</span> from <span style={{ color: brandPrimary }}>'@creapp/core'</span>;</p>
                  <p className="text-slate-700 italic mt-3">// Inicializar infraestructura...</p>
                  <p style={{ color: brandSecondary }}>const <span className="text-blue-400">startSystem</span> = <span className="text-white">async</span> () =&gt; {'{'}</p>
                  <p className="text-white ml-4">await <span style={{ color: brandSecondary }}>App</span>.<span className="text-blue-300">deploy</span>({'{'}</p>
                  <p className="text-white ml-8">client: <span style={{ color: brandPrimary }}>'{proposal.client_name}'</span>,</p>
                  <p className="text-white ml-8">status: <span className="text-emerald-500">'active'</span>,</p>
                  <p className="text-white ml-4">{'}'})</p>
                  <p style={{ color: brandSecondary }}>{'}'}</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 min-h-[420px]">
            <div className="gsap-reveal-up">
              <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tight">
                Alcance del Desarrollo
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1.5 leading-relaxed">
                {(proposal.methodology || DEFAULT_METHODOLOGY).scope_intro || DEFAULT_METHODOLOGY.scope_intro}
              </p>
            </div>
            <div data-lenis-prevent className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
              {proposal.inclusions.map((item, i) => {
                const isTooltipActive = activeTooltip === `inclusion-${i}`;
                return (
                  <div
                    key={i}
                    onClick={() => setActiveTooltip(isTooltipActive ? null : `inclusion-${i}`)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    className="relative overflow-hidden p-5 rounded-2xl bg-white/[0.015] border border-white/5 md:hover:border-white/10 transition-all duration-300 group cursor-pointer shadow-sm grid [grid-template-areas:'stack'] items-center min-h-[85px] brand-hover-card gsap-reveal-scale"
                  >
                    <div className={`flex gap-4 relative z-10 transition-opacity duration-300 items-center [grid-area:stack] ${isTooltipActive ? 'opacity-0 pointer-events-none' : ''}`}>
                      <div className="shrink-0 rounded-xl flex items-center justify-center w-11 h-11 bg-white/5 border border-white/5">
                        <IconResolver name={item.icon_name} size={18} style={{ color: brandPrimary }} />
                      </div>
                      <div>
                        <h4 className="font-display font-bold text-base text-white flex items-center gap-1.5 tracking-tight">
                          {item.title}
                          <ChevronRight size={14} style={{ color: brandPrimary }} className="opacity-60" />
                        </h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-wider font-bold">{item.description}</p>
                      </div>
                    </div>
                    <div data-lenis-prevent className={`flex flex-col transition-[opacity,transform] duration-300 [grid-area:stack] relative z-20 h-full overflow-y-auto no-scrollbar ${isTooltipActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                      <div className="my-auto">
                        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: brandPrimary }}>Detalle Técnico</p>
                        <p className="text-xs text-slate-300 font-light leading-relaxed">{item.tooltip}</p>
                      </div>
                    </div>
                    <div className={`absolute inset-0 z-[15] md:backdrop-blur-sm transition-opacity duration-300 pointer-events-none ${isTooltipActive ? 'opacity-100' : 'opacity-0'}`} style={{ backgroundColor: 'var(--color-proposal-dark)' }}></div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 min-h-[420px]">
            <div className="gsap-reveal-up">
              <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tight">
                Exclusiones de Propuesta
              </h3>
              <p className="text-[10px] text-red-500/80 uppercase tracking-widest font-bold mt-1.5 leading-relaxed">
                {(proposal.methodology || DEFAULT_METHODOLOGY).exclusions_intro || DEFAULT_METHODOLOGY.exclusions_intro}
              </p>
            </div>
            <div data-lenis-prevent className="grid grid-cols-1 gap-3 max-h-[440px] overflow-y-auto pr-2 custom-scrollbar">
              {proposal.exclusions.map((item, i) => {
                const isTooltipActive = activeTooltip === `exclusion-${i}`;
                return (
                  <div
                    key={i}
                    onClick={() => setActiveTooltip(isTooltipActive ? null : `exclusion-${i}`)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    className="relative overflow-hidden p-4 rounded-xl bg-red-500/[0.015] border border-red-500/10 md:hover:border-red-500/20 transition-all duration-300 group cursor-pointer grid [grid-template-areas:'stack'] items-center min-h-[60px] brand-hover-card-excl gsap-reveal-up"
                  >
                    <div className={`flex items-center gap-4 relative z-10 transition-opacity duration-300 [grid-area:stack] ${isTooltipActive ? 'opacity-0 pointer-events-none' : ''}`}>
                      <XCircle size={18} className="text-red-500 shrink-0 opacity-60" />
                      <p className="text-sm text-slate-300 font-light tracking-wide italic">{item.title}</p>
                    </div>
                    <div data-lenis-prevent className={`flex flex-col transition-[opacity,transform] duration-300 [grid-area:stack] relative z-20 h-full overflow-y-auto no-scrollbar ${isTooltipActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                      <div className="my-auto">
                        <p className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-1">Aclaración de Exclusión</p>
                        <p className="text-xs text-red-200/80 font-light leading-relaxed">{item.tooltip}</p>
                      </div>
                    </div>
                    <div className={`absolute inset-0 z-[15] md:backdrop-blur-sm bg-red-950/90 transition-opacity duration-300 pointer-events-none ${isTooltipActive ? 'opacity-100' : 'opacity-0'}`}></div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="grid md:grid-cols-2 gap-10 items-center py-4 min-h-[420px]">
            <div className="space-y-4 gsap-reveal-left">
              <div>
                <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tight">
                  Ciclo Scrum Semanal
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1.5 leading-relaxed">
                  {(proposal.methodology || DEFAULT_METHODOLOGY).intro_text || DEFAULT_METHODOLOGY.intro_text}
                </p>
              </div>
              <div className="space-y-2.5">
                {scrumSteps.map((step, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveScrumDay(step.day as any)}
                    className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                      activeScrumDay === step.day
                        ? 'bg-white/[0.03] border-white/10 shadow-lg shadow-black/20'
                        : 'bg-transparent border-transparent hover:bg-white/[0.01]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border shrink-0"
                        style={
                          activeScrumDay === step.day
                            ? { backgroundColor: `${brandPrimary}15`, color: brandPrimary, borderColor: `${brandPrimary}33` }
                            : { backgroundColor: 'transparent', color: '#64748b', borderColor: 'rgba(255,255,255,0.05)' }
                        }
                      >
                        {step.day}
                      </span>
                      <span className="text-xs md:text-sm font-bold text-white uppercase tracking-tight">{step.title}</span>
                      <span className="text-[9px] text-slate-500">— {step.subtitle}</span>
                    </div>
                    {activeScrumDay === step.day && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-xs text-slate-400 font-light leading-relaxed mt-2"
                      >
                        {step.text}
                      </motion.p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center h-full">
              <div className="relative w-64 h-64 flex items-center justify-center gsap-reveal-scale mx-auto">
                <div
                  className="absolute top-1/2 left-1/2 w-full h-full rounded-full border-2 border-dashed pointer-events-none transition-transform duration-[1000ms] ease-out"
                  style={{
                    borderColor: `${brandPrimary}35`,
                    transform: `translate(-50%, -50%) rotate(${activeScrumDay === 'LUN' ? 0 : activeScrumDay === 'MAR - JUE' ? 120 : 240}deg)`,
                    boxShadow: `0 0 25px ${brandPrimary}15`
                  }}
                />
                <div
                  className="absolute top-1/2 left-1/2 w-[82%] h-[82%] rounded-full border border-dashed pointer-events-none transition-transform duration-[1000ms] ease-out"
                  style={{
                    borderColor: `${brandSecondary}50`,
                    transform: `translate(-50%, -50%) rotate(${activeScrumDay === 'LUN' ? 0 : activeScrumDay === 'MAR - JUE' ? -120 : -240}deg)`,
                    boxShadow: `0 0 30px ${brandSecondary}20`
                  }}
                />
                <div
                  className="absolute top-1/2 left-1/2 w-[65%] h-[65%] rounded-full flex flex-col items-center justify-center p-4 text-center border pointer-events-none transition-all duration-700"
                  style={{
                    background: `radial-gradient(circle, ${brandPrimary}25 0%, rgba(3,7,18,0.98) 90%)`,
                    borderColor: 'rgba(255,255,255,0.1)',
                    boxShadow: `0 0 35px ${brandPrimary}35, inset 0 0 20px ${brandPrimary}25`,
                    transform: `translate(-50%, -50%) scale(${activeScrumDay ? 1.02 : 1})`
                  }}
                >
                  <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="#ffffff" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className="animate-spin-slow mb-1"
                  >
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#f3f4f6]">
                    Ciclo Scrum
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-tight mt-0.5" style={{ color: brandPrimary }}>
                    {activeScrumDay}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 min-h-[420px]">
            <div className="gsap-reveal-up">
              <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tight">
                Cronograma de Fases
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1.5 leading-relaxed">
                {(proposal.methodology || DEFAULT_METHODOLOGY).phases_intro || DEFAULT_METHODOLOGY.phases_intro}
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
              {proposal.milestones.map((m, i) => (
                <div
                  key={i}
                  className="relative p-6 rounded-2xl border border-white/5 text-center transition-all bg-white/[0.01] group shadow-xl brand-hover-card gsap-reveal-scale"
                >
                  <div className="absolute top-2 right-3 text-[9px] font-bold text-slate-700">#{i + 1}</div>
                  <div className="mb-4 flex justify-center text-slate-500 group-hover:scale-110 transition-transform">
                    <IconResolver name={m.icon_name} size={18} />
                  </div>
                  <div className="flex flex-col items-center mb-1">
                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Semanas</span>
                    <p className="text-xs font-black tracking-widest leading-none" style={{ color: brandPrimary }}>
                      {m.week_range}
                    </p>
                  </div>
                  <p className="text-xs font-display font-black text-white leading-snug tracking-tight">{m.title}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6 min-h-[420px]">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 gsap-reveal-up">
              <div>
                <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tight">
                  Desglose Técnico de Horas
                </h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1.5 leading-relaxed max-w-lg">
                  {activeDesgloseTab === 'w1-8'
                    ? (proposal.methodology || DEFAULT_METHODOLOGY).weekly_breakdown_intro_1_8 || DEFAULT_METHODOLOGY.weekly_breakdown_intro_1_8
                    : (proposal.methodology || DEFAULT_METHODOLOGY).weekly_breakdown_intro_9_16 || DEFAULT_METHODOLOGY.weekly_breakdown_intro_9_16
                  }
                </p>
              </div>
              <div className="flex bg-white/5 rounded-xl border border-white/5 p-1 shrink-0 self-start md:self-end">
                <button
                  onClick={() => setActiveDesgloseTab('w1-8')}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeDesgloseTab === 'w1-8' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Semanas 1 - 8
                </button>
                <button
                  onClick={() => setActiveDesgloseTab('w9-16')}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    activeDesgloseTab === 'w9-16' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Semanas 9 - 16
                </button>
              </div>
            </div>

            <div data-lenis-prevent className="space-y-2 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
              {(activeDesgloseTab === 'w1-8' ? WEEKS_BREAKDOWN_1_8 : WEEKS_BREAKDOWN_9_16).map((week) => (
                <div key={week.id} className="p-4 rounded-xl bg-white/[0.01] border border-white/5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 brand-hover-card gsap-reveal-up">
                  <div className="flex gap-4 items-start">
                    <span className="text-xs font-black uppercase font-mono px-2 py-0.5 rounded border border-white/5 text-slate-500 bg-white/5">
                      {week.id}
                    </span>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-tight mb-0.5">{week.title}</h4>
                      <p className="text-xs text-slate-400 font-light leading-relaxed">{week.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden hidden md:block">
                      <div className="h-full rounded-full gsap-progress-bar origin-left" style={{ width: '100%', background: gradientStyle }}></div>
                    </div>
                    <span className="text-xs font-black font-mono" style={{ color: brandSecondary }}>{week.hours.toFixed(1)} hs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-6 min-h-[420px]">
            <div className="gsap-reveal-up">
              <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tight">
                Estructura de Inversión
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1.5 leading-relaxed">
                Presupuesto y estructura financiera con costos mensuales operativos del software.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between min-h-[200px] brand-hover-card gsap-reveal-left">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Presupuesto Final</p>
                  <h4 className="text-4xl lg:text-5xl font-display font-black text-white tracking-tighter mb-4 gsap-reveal-scale">{proposal.total_value}</h4>
                </div>
                <button
                  onClick={openContractModal}
                  disabled={isConfirmed}
                  className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 text-white shadow-lg active:scale-98 transition-all cursor-pointer brand-btn-glow"
                  style={!isConfirmed ? { background: gradientStyle } : { backgroundColor: 'var(--color-proposal-dark)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {isConfirmed ? 'Proyecto Confirmado' : 'Confirmar Proyecto'} <ChevronRight size={12} />
                </button>
              </div>
              <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] md:col-span-2 space-y-3 brand-hover-card gsap-reveal-right">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-4">Estructura de Desembolsos</p>
                <div className="space-y-2">
                  {proposal.payments.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.015] border border-white/5 hover:bg-white/[0.03] transition-all cursor-default">
                      <div>
                        <p className="text-xs font-black text-white uppercase tracking-wider mb-0.5">{p.label}</p>
                        <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">{p.description}</p>
                      </div>
                      <span className="text-base font-display font-black" style={{ color: brandPrimary }}>
                        {p.percentage}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      case 8:
        return (
          <div className="space-y-6 min-h-[420px]">
            <div className="gsap-reveal-up">
              <h3 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tight">
                Confirmación de Propuesta
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1.5 leading-relaxed">
                Formalizá la contratación firmando digitalmente el contrato de servicios comerciales.
              </p>
            </div>
            <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] relative overflow-hidden flex flex-col items-center justify-center text-center min-h-[260px] brand-hover-card gsap-reveal-scale">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/[0.01] pointer-events-none"></div>
              <div className="relative z-10 max-w-md mx-auto space-y-6">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto gsap-reveal-scale">
                  <ShieldCheck size={28} style={{ color: brandPrimary }} />
                </div>
                {isConfirmed ? (
                  <div className="space-y-2 gsap-reveal-up">
                    <h4 className="text-xl font-display font-black text-white tracking-tight uppercase">Propuesta Aceptada</h4>
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">
                      Contrato firmado digitalmente el {new Date().toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 gsap-reveal-up">
                    <h4 className="text-lg font-display font-black text-white uppercase tracking-tight">Contrato de Servicios Listo</h4>
                    <p className="text-xs text-slate-400 font-light leading-relaxed">
                      Al hacer clic en el botón a continuación, se abrirá la interfaz para firmar digitalmente y descargar el contrato formal.
                    </p>
                    <button
                      onClick={openContractModal}
                      className="px-8 py-4.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-2xl flex items-center gap-3 transition-all hover:scale-105 mx-auto cursor-pointer active:scale-95 mt-4 brand-btn-glow"
                      style={{ background: gradientStyle }}
                    >
                      Firmar Digitalmente <FileText size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="h-screen w-screen text-slate-200 font-body p-6 md:p-10 lg:p-12 overflow-hidden relative flex flex-col justify-between select-none"
      style={{ backgroundColor: 'var(--color-proposal-dark)' }}
    >
      <style>{`
        .brand-hover-card {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          background-color: rgba(255, 255, 255, 0.01) !important;
          backdrop-filter: blur(8px);
          border-color: rgba(255, 255, 255, 0.05) !important;
        }
        .brand-hover-card:hover {
          border-color: ${brandPrimary}38 !important;
          box-shadow: 0 20px 40px -15px ${brandPrimary}1c, inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
          background-color: rgba(255, 255, 255, 0.025) !important;
          transform: translateY(-3px);
        }
        .brand-hover-card-excl {
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          background-color: rgba(255, 255, 255, 0.01) !important;
          backdrop-filter: blur(8px);
          border-color: rgba(255, 255, 255, 0.05) !important;
        }
        .brand-hover-card-excl:hover {
          border-color: rgba(239, 68, 68, 0.28) !important;
          box-shadow: 0 20px 40px -15px rgba(239, 68, 68, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08) !important;
          background-color: rgba(239, 68, 68, 0.015) !important;
          transform: translateY(-3px);
        }
        .brand-btn-glow {
          box-shadow: 0 0 20px ${brandPrimary}25;
        }
        .brand-btn-glow:hover {
          box-shadow: 0 0 30px ${brandPrimary}55;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.01);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${brandPrimary}44;
        }
      `}</style>
      {/* Background Lightfall Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Lightfall
          colors={[brandPrimary, brandSecondary, brandPrimary]}
          backgroundColor="#030712"
          speed={0.45}
          streakCount={5}
          streakWidth={1.5}
          streakLength={1.0}
          glow={1.2}
          density={0.45}
          twinkle={0.8}
          zoom={2.2}
          backgroundGlow={0.2}
          opacity={0.35}
          mouseInteraction={true}
          mouseStrength={0.8}
          mouseRadius={0.7}
        />
      </div>

      {/* Decorative ambient gradient blobs */}
      <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] rounded-full blur-[140px] opacity-[0.08] pointer-events-none animate-pulse duration-[8s]" style={{ backgroundColor: brandPrimary }} />
      <div className="absolute bottom-[15%] right-[10%] w-[600px] h-[600px] rounded-full blur-[160px] opacity-[0.06] pointer-events-none animate-pulse duration-[12s]" style={{ backgroundColor: brandSecondary }} />
      <div className="absolute top-[40%] right-[30%] w-[400px] h-[400px] rounded-full blur-[130px] opacity-[0.04] pointer-events-none animate-pulse duration-[10s]" style={{ backgroundColor: brandPrimary }} />

      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto flex justify-between items-center z-20 relative px-2">
        <div className="flex items-center gap-2 select-none">
          <div className="w-2 h-2 rounded-full animate-pulse shadow-lg" style={{ backgroundColor: brandPrimary, boxShadow: `0 0 10px ${brandPrimary}` }} />
          <span className="text-[12px] font-black uppercase tracking-[0.25em] text-white">CREAPP</span>
        </div>
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right max-w-md hidden sm:block select-none">
          PLAN CREATIVO Y COPYWRITING WEB {proposal.client_name.toUpperCase()} APP V2
        </div>
      </header>

      {/* Main Slide Deck Viewport */}
      <main className="flex-1 flex flex-col justify-center items-center relative z-10 w-full max-w-6xl mx-auto my-6 overflow-hidden px-2">
        <div className="w-full h-full flex flex-col justify-center">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              ref={slideRef}
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full flex-grow flex flex-col justify-center"
            >
              {renderSlide()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Footer & Navigation */}
      <footer className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 z-20 relative border-t border-white/5 pt-6 px-2 pb-2">
        <div className="text-[10px] text-slate-600 tracking-wider select-none">
          Propuesta Comercial Interactiva
        </div>

        {/* Dynamic Navigation Dots */}
        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-full p-2 select-none">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          
          <div className="flex items-center gap-2 px-1">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDirection(idx > currentSlide ? 1 : -1);
                  setCurrentSlide(idx);
                }}
                className="w-2 h-2 rounded-full transition-all duration-300 cursor-pointer"
                style={{ 
                  backgroundColor: currentSlide === idx ? brandPrimary : 'rgba(255,255,255,0.15)',
                  transform: currentSlide === idx ? 'scale(1.3)' : 'scale(1)',
                  boxShadow: currentSlide === idx ? `0 0 8px ${brandPrimary}` : 'none'
                }}
                title={SLIDES[idx]}
              />
            ))}
          </div>

          <button
            onClick={nextSlide}
            disabled={currentSlide === SLIDES.length - 1}
            className="p-1 text-slate-400 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Action button & Copyright */}
        <div className="flex items-center gap-6 select-none">
          <button
            onClick={downloadProposalPDF}
            disabled={isDownloadingPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 text-white cursor-pointer"
          >
            {isDownloadingPDF ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText size={10} />
            )}
            PDF
          </button>
          
          <div className="text-[10px] text-slate-600 tracking-wider">
            © 2026 creapp.cc
          </div>
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
                      <button
                        onClick={downloadProposalPDF}
                        disabled={isDownloadingPDF}
                        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border transition-all text-sm font-bold uppercase tracking-widest cursor-pointer"
                        style={{ borderColor: `${brandPrimary}40`, color: brandPrimary, backgroundColor: `${brandPrimary}0A` }}
                      >
                        {isDownloadingPDF ? (
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FileText size={18} />
                        )}
                        {isDownloadingPDF ? 'Generando PDF...' : 'Descargar PDF completo'}
                      </button>
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
              <div data-lenis-prevent className="flex-1 overflow-y-auto flex flex-col relative" id="contract-content-box">

                {/* PDF Cover Page Header (Only visible in generated PDF) */}
                {isGeneratingPDF && (
                  <div className="w-full flex justify-center items-center pt-24 pb-16 bg-[#050505] border-b border-white/10 mb-4">
                    <div className="flex flex-col items-center">
                      <img src={creappLogoOfficial} alt="CreAPP Logo" className="h-20 md:h-28 mb-10 object-contain" />
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
                            className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:bg-slate-950/40 transition-all text-sm font-semibold"
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
                            className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:bg-slate-950/40 transition-all text-sm font-semibold"
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
                            className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:bg-slate-950/40 transition-all text-sm font-semibold"
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

      {/* Print Template (Hidden from screen but processed by html2canvas) */}
      <div
        id="full-proposal-print-template"
        className="absolute left-[-9999px] top-[-9999px] overflow-hidden"
        style={{ width: '794px', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#ffffff' }}
      >
        {/* PÁGINA 1: Portada */}
        <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
          {/* Top Brand Line */}
          <div style={{ position: 'absolute', top: '0', left: '0', right: '0', height: '8px', background: `linear-gradient(to right, ${brandPrimary}, ${brandSecondary})` }}></div>
          
          {/* Contenido centrado vertical y horizontalmente */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGrow: 1, gap: '65px', marginTop: '20px', textAlign: 'center' }}>
            {/* Logo Creapp */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
              <img src={creappLogoOfficial} alt="CreAPP Logo" style={{ height: '105px', objectFit: 'contain' }} />
            </div>

            {/* Título y Descripción */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: brandPrimary, letterSpacing: '3px', textTransform: 'uppercase' }}>
                {proposal.hero_badge || 'Propuesta Técnica Comercial'}
              </span>
              <h1 style={{ fontSize: '42px', fontWeight: '950', color: '#0f172a', margin: '15px 0 10px 0', lineHeight: '1.1', letterSpacing: '-1px', textAlign: 'center' }}>
                {proposal.hero_title || 'Desarrollo de Software Integrado'}
              </h1>
              <div style={{ height: '2px', width: '80px', backgroundColor: `${brandPrimary}44`, margin: '20px auto' }}></div>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', maxWidth: '560px', fontWeight: '300', textAlign: 'center' }}>
                {proposal.description}
              </p>
            </div>

            {/* Metadatos */}
            <div style={{ display: 'flex', gap: '60px', justifyContent: 'center', width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Preparado para</p>
                <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{proposal.client_name}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Fecha</p>
                <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{proposal.date}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Ubicación</p>
                <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{proposal.location}</p>
              </div>
            </div>
          </div>
          
          {/* Footer Fijo Portada */}
          <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '25px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>CreAPP Software & Automation</span>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Dossier Oficial de Propuesta</span>
          </div>
        </div>

        {/* PÁGINA 2: Alcance y Entregables */}
        <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
          {(() => {
            const totalVisibleInclusions = proposal.inclusions.slice(0, 6).length;
            const totalVisibleExclusions = proposal.exclusions.slice(0, 6).length;
            const totalItemsPage2 = totalVisibleInclusions + totalVisibleExclusions;

            // Intelligent spacing criteria to dynamically balance page density
            let p2Gap = '15px';
            let p2CardPadding = '12px';
            let p2TitleMarginTop = '15px';
            let p2MainGap = '20px';
            let p2DescriptionSize = '10px';
            let p2TitleSize = '28px';
            let p2SubTitleSize = '11px';
            let p2TextGap = '4px';

            if (totalItemsPage2 > 10) {
              p2Gap = '8px';
              p2CardPadding = '8px';
              p2TitleMarginTop = '4px';
              p2MainGap = '8px';
              p2DescriptionSize = '9px';
              p2TitleSize = '20px';
              p2SubTitleSize = '10px';
              p2TextGap = '2px';
            } else if (totalItemsPage2 > 8) {
              p2Gap = '10px';
              p2CardPadding = '10px';
              p2TitleMarginTop = '8px';
              p2MainGap = '14px';
              p2DescriptionSize = '9.5px';
              p2TitleSize = '24px';
              p2SubTitleSize = '10.5px';
              p2TextGap = '3px';
            } else if (totalItemsPage2 < 7) {
              p2Gap = '20px';
              p2CardPadding = '14px';
              p2TitleMarginTop = '25px';
              p2MainGap = '30px';
              p2DescriptionSize = '11px';
              p2TitleSize = '32px';
              p2SubTitleSize = '12px';
              p2TextGap = '6px';
            }

            return (
              <>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
                    <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{proposal.hero_title ? proposal.hero_title.toUpperCase() : 'CBKR APP V2'}</span>
                  </div>
                  <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>PROJECT_SCOPE // 02</span>
                </div>

                {/* Contenido */}
                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: p2MainGap }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h1 style={{ fontSize: p2TitleSize, fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
                      Alcance & <span style={{ fontStyle: 'italic', color: brandPrimary }}>Entregables</span>
                    </h1>
                    <p style={{ fontSize: p2SubTitleSize, color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
                      {(proposal.methodology || DEFAULT_METHODOLOGY).scope_intro || DEFAULT_METHODOLOGY.scope_intro}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: p2Gap, width: '100%' }}>
                    {proposal.inclusions.slice(0, 6).map((inc, index) => {
                      const totalVisible = proposal.inclusions.slice(0, 6).length;
                      const isLastAndOdd = totalVisible % 2 !== 0 && index === totalVisible - 1;
                      return (
                        <div key={index} style={{
                          padding: p2CardPadding,
                          borderRadius: '12px',
                          border: '1px solid #f1f5f9',
                          backgroundColor: '#f8fafc',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: p2TextGap,
                          gridColumn: isLastAndOdd ? 'span 2' : 'auto'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ color: brandPrimary, display: 'flex', alignItems: 'center' }}>
                              <IconResolver name={inc.icon_name || 'CheckCircle2'} className="w-4 h-4" />
                            </div>
                            <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', margin: '0', textTransform: 'uppercase' }}>{inc.title || 'Entregable'}</h4>
                          </div>
                          <p style={{ fontSize: p2DescriptionSize, color: '#475569', margin: '0', lineHeight: '1.4', fontWeight: '300' }}>{inc.description || 'Descripción del alcance.'}</p>
                          {inc.tooltip && <p style={{ fontSize: '9px', color: '#94a3b8', margin: '2px 0 0 0', fontStyle: 'italic' }}>{inc.tooltip}</p>}
                        </div>
                      );
                    })}
                  </div>

                  {proposal.exclusions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: p2MainGap === '8px' ? '4px' : '10px', marginTop: p2TitleMarginTop }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h1 style={{ fontSize: p2TitleSize, fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
                          Fuera de <span style={{ fontStyle: 'italic', color: '#e11d48' }}>Alcance</span>
                        </h1>
                        <p style={{ fontSize: p2SubTitleSize, color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
                          {(proposal.methodology || DEFAULT_METHODOLOGY).exclusions_intro || DEFAULT_METHODOLOGY.exclusions_intro}
                        </p>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: p2Gap, width: '100%' }}>
                        {proposal.exclusions.slice(0, 6).map((exc, index) => {
                          const totalVisible = proposal.exclusions.slice(0, 6).length;
                          const isLastAndOdd = totalVisible % 2 !== 0 && index === totalVisible - 1;
                          return (
                            <div key={index} style={{
                              padding: p2CardPadding,
                              borderRadius: '12px',
                              border: '1px solid #ffe4e6',
                              backgroundColor: '#fff5f5',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: p2TextGap,
                              gridColumn: isLastAndOdd ? 'span 2' : 'auto'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ color: '#e11d48', display: 'flex', alignItems: 'center' }}>
                                  <IconResolver name="XCircle" className="w-4 h-4" />
                                </div>
                                <h4 style={{ fontSize: '11px', fontWeight: '850', color: '#9f1239', margin: '0', textTransform: 'uppercase' }}>{exc.title || 'Exclusión'}</h4>
                              </div>
                              <p style={{ fontSize: p2DescriptionSize, color: '#b91c1c', margin: '0', lineHeight: '1.4', fontWeight: '300' }}>{exc.tooltip || 'No incluido en el presupuesto base.'}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Fijo */}
                <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
                  <span>Propuesta Comercial | {proposal.client_name}</span>
                  <span>Página 2 de 7</span>
                </div>
              </>
            );
          })()}
        </div>

        {/* PÁGINA 3: Cronograma de Fases & Entregas */}
        <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
              <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{proposal.hero_title ? proposal.hero_title.toUpperCase() : 'CBKR APP V2'}</span>
            </div>
            <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>PROJECT_ROADMAP // 02</span>
          </div>

          {/* Contenido */}
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '20px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
              CRONOGRAMA DE FASES & <span style={{ fontStyle: 'italic', color: brandPrimary }}>ENTREGAS</span>
            </h1>

            <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
              {(() => {
                const meth = proposal.methodology || DEFAULT_METHODOLOGY;
                const text = meth.phases_intro ?? DEFAULT_METHODOLOGY.phases_intro;
                if (text === DEFAULT_METHODOLOGY.phases_intro) {
                  return (
                    <>
                      El plan de esfuerzo comprende un periodo de <span style={{ fontWeight: 'bold', color: '#0f172a' }}>4 meses</span> (16 sprints semanales). Cada fase mensual concluye con un hito de control funcional y estético auditado antes de la liberación del siguiente incremento de software.
                    </>
                  );
                }
                return text;
              })()}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px', marginBottom: '5px' }}>
              <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Estructura de Sprints Mensuales</span>
              <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
            </div>

            {/* Listado de Fases (Fase 1 a 4) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {proposal.milestones && proposal.milestones.map((m, i) => (
                <div key={m.id || i} style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', minHeight: '95px' }}>
                  <div style={{ width: '80px', backgroundColor: '#000000', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#ffffff', gap: '4px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>Fase</span>
                    <span style={{ fontSize: '20px', fontWeight: '950' }}>{i + 1}</span>
                  </div>
                  <div style={{ flexGrow: 1, padding: '15px 20px', display: 'flex', flexDirection: 'column', gap: '5px', justifyContent: 'center' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', margin: '0', textTransform: 'uppercase' }}>{m.title}</h4>
                    <p style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                      {m.description || 'Sin descripción de entregables.'}
                    </p>
                  </div>
                  <div style={{ width: '120px', borderLeft: '1px solid #e2e8f0', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px', backgroundColor: '#fafafa' }}>
                    <span style={{ fontSize: '7px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hito Control</span>
                    <span style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.1' }}>
                      {m.control_milestone || 'VERIFICACIÓN'}
                    </span>
                  </div>
                  <div style={{ width: '110px', borderLeft: '1px solid #e2e8f0', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' }}>
                    <span style={{ fontSize: '16px', fontWeight: '950', color: '#000000' }}>${m.price || '0'}</span>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b' }}>{getCurrencyFromTotal(proposal.total_value)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Costos de Infraestructura (Mini-bloque compacto horizontal) */}
            {proposal.infrastructure_costs && proposal.infrastructure_costs.length > 0 && (
              <div style={{ marginTop: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Costos de Infraestructura Asociados</span>
                  <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {proposal.infrastructure_costs.map((infra, idx) => (
                    <div key={idx} style={{ flex: '1 1 180px', padding: '6px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{infra.provider}</span>
                        {infra.is_optional && (
                          <span style={{ fontSize: '7px', padding: '1px 4px', backgroundColor: '#fef3c7', color: '#d97706', borderRadius: '4px', fontWeight: '900', letterSpacing: '0.5px' }}>OPCIONAL</span>
                        )}
                        <span style={{ color: '#64748b' }}> — {infra.title}</span>
                      </div>
                      <span style={{ fontWeight: 'bold', color: brandPrimary, flexShrink: 0, marginLeft: '10px' }}>{infra.monthly_cost}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {proposal.payments && proposal.payments.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Esquema de Pagos / Hitos de Financiamiento</span>
                  <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
                  {proposal.payments.map((p, idx) => (
                    <div key={idx} style={{ flex: '1 1 0px', minWidth: '180px', padding: '8px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '5px' }}>
                        <span style={{ fontSize: '9px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', lineHeight: '1.2' }}>{p.label}</span>
                        <span style={{ fontSize: '12px', fontWeight: '950', color: brandPrimary, flexShrink: 0 }}>{p.percentage}</span>
                      </div>
                      <span style={{ fontSize: '9px', color: '#475569', fontWeight: '300', lineHeight: '1.3' }}>{p.description}</span>
                      {p.tooltip && (
                        <span style={{ fontSize: '8px', color: '#94a3b8', fontStyle: 'italic', lineHeight: '1.3', marginTop: '2px' }}>{p.tooltip}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Fijo */}
          <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
            <span>Presupuesto Consolidado: <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{proposal.total_value.toUpperCase().includes('ARS') || proposal.total_value.toUpperCase().includes('USD') ? proposal.total_value : `${getCurrencyFromTotal(proposal.total_value)} ${proposal.total_value}`} TOTAL</span></span>
            <span>Página 3 de 7</span>
          </div>
        </div>

        {/* PÁGINA 4: Desglose de Horas — Semanas 1 a 8 */}
        <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
              <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{proposal.hero_title ? proposal.hero_title.toUpperCase() : 'CBKR APP V2'}</span>
            </div>
            <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>TIME_ESTIMATION // MES 1 Y 2</span>
          </div>

          {/* Contenido */}
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '15px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
              DESGLOSE DE HORAS — <span style={{ fontStyle: 'italic', color: brandPrimary }}>SEMANAS 1 A 8</span>
            </h1>

            <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
              {(proposal.methodology || DEFAULT_METHODOLOGY).weekly_breakdown_intro_1_8 || DEFAULT_METHODOLOGY.weekly_breakdown_intro_1_8}
            </p>

            {/* Tabla */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '900', textAlign: 'left', letterSpacing: '1px', width: '10%' }}>SEMANA</th>
                  <th style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '900', textAlign: 'left', letterSpacing: '1px', width: '25%' }}>HITO / TAREA</th>
                  <th style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '900', textAlign: 'left', letterSpacing: '1px', width: '50%' }}>DETALLE TÉCNICO DE IMPLEMENTACIÓN</th>
                  <th style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '900', textAlign: 'right', letterSpacing: '1px', width: '15%', color: brandSecondary }}>ESFUERZO</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W01</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>CIMIENTOS CORE</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Setup del proyecto en Next.js, Tailwind v4. Definición de variables de estilos y estructura del modelo relacional de base de datos para Suelos, Plantas y Acciones.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W02</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>WELCOME SCREEN</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Maquetación de la pantalla de bienvenida dual ("¿Ya tenés un suelo?"). Lógica mobile-first, redireccionamiento condicional a tienda o asistente.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W03</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>SETUP WIZARD</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Implementación del flujo de 4 pasos interactivos para el armado de la cama. Soporte para bucles de video cortos (15s) y almacenamiento temporal en localStorage.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W04</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>DNI BIOLÓGICO</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Lógica algorítmica para determinar el nivel de XP del cultivador. Modelado e implementación de la tarjeta digital DNI del suelo y redirección al Dashboard.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a' }}>M01</td>
                  <td colSpan={2} style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>SUBTOTAL HITO: ESTRUCTURA DE ONBOARDING Y TARJETA DNI FINALIZADA</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '900', color: '#0f172a', textAlign: 'right' }}>40.0 hs</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W05</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>HERO & FOTOPERIODO</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Maquetación de la cabecera inmersiva con luces reactivas. Componente inteligente de fotoperíodo automático según la hora local del dispositivo.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W06</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>BLOQUEO DE CURADO</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Controlador lógico de estado temporal (21 días) para curado de suelos nuevos. Implementación de barra de progreso con cuenta regresiva para desbloqueo.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W07</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>ACCIONES RÁPIDAS</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Diseño e integración de menú flotante (+). Despliegue de Bottom Sheet interactiva de carga para Riego, Té de Compost y Enmienda.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W08</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>ADVERTENCIAS IA</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Algoritmo preventivo de dosificación según historial reciente (alertas de sobre-riego o saturación de té). Modales informativos con checks animados.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a' }}>M02</td>
                  <td colSpan={2} style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>SUBTOTAL HITO: DASHBOARD CENTRAL Y CONTROLES RÁPIDOS DE ACCIONES</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '900', color: '#0f172a', textAlign: 'right' }}>40.0 hs</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Fijo */}
          <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
            <span>CREAPP // ACCUMULATED_HOURS_80</span>
            <span>Página 4 de 7</span>
          </div>
        </div>

        {/* PÁGINA 5: Desglose de Horas — Semanas 9 a 16 */}
        <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
              <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{proposal.hero_title ? proposal.hero_title.toUpperCase() : 'CBKR APP V2'}</span>
            </div>
            <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>TIME_ESTIMATION // MES 3 Y 4</span>
          </div>

          {/* Contenido */}
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '15px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
              DESGLOSE DE HORAS — <span style={{ fontStyle: 'italic', color: brandPrimary }}>SEMANAS 9 A 16</span>
            </h1>

            <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
              {(proposal.methodology || DEFAULT_METHODOLOGY).weekly_breakdown_intro_9_16 || DEFAULT_METHODOLOGY.weekly_breakdown_intro_9_16}
            </p>

            {/* Tabla */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                  <th style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '900', textAlign: 'left', letterSpacing: '1px', width: '10%' }}>SEMANA</th>
                  <th style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '900', textAlign: 'left', letterSpacing: '1px', width: '25%' }}>HITO / TAREA</th>
                  <th style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '900', textAlign: 'left', letterSpacing: '1px', width: '50%' }}>DETALLE TÉCNICO DE IMPLEMENTACIÓN</th>
                  <th style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '900', textAlign: 'right', letterSpacing: '1px', width: '15%', color: brandSecondary }}>ESFUERZO</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W09</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>TARJETAS SUELOS</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Desarrollo del panel alternativo de listado de Suelos (icono Leaf). Tarjetas con desglose detallado de cultivo y selector dinámico de suelo activo para el Dashboard.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W10</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>BITÁCORA FASES</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Línea de tiempo histórica y control de plantas (genéticas de cultivo). Modales para cambios biológicos manuales (Vegetativo, Flora, Descanso).</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W11</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>CALCULADORAS</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Integración de algoritmos de cálculo de riego (5% del volumen de maceta) y té de compost (10% + tabla dinámica de ingredientes). Guías ilustradas.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W12</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>SUELOIA SUPPORT</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Estructuración de FAQ expandible, simulación de respuestas inmediatas mediante bot de chat local y redirección automatizada a WhatsApp con pre-cargas.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a' }}>M03</td>
                  <td colSpan={2} style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>SUBTOTAL HITO: PESTAÑA DE LISTADO DE SUELOS, CALCULADORAS Y SOPORTE BÁSICO</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '900', color: '#0f172a', textAlign: 'right' }}>40.0 hs</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W13</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>BENTO SPACING</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Homogeneización visual del Dashboard bajo formato de rejilla Bento UI. Alineación matemática de espaciados, fuentes y coherencia tipográfica general.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W14</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>MICRO-INTERACTIONS</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Animaciones en interacciones de clicks (press-scale) en botones de acción. Suavizado en la carga entre pantallas y animaciones de entrada.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W15</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>RESPONSIVE QA</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Pruebas en emuladores y celulares físicos de múltiples tamaños (iPhone SE a tablets) y reajuste de reglas CSS para evitar saltos o desbordes de texto.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>W16</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>E2E & DELIVERY</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>Pruebas extremo a extremo simulando workflows de cultivo. Proceso de optimización de archivos finales de código y entrega formal de documentación.</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>10.0 hs</td>
                </tr>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a' }}>M04</td>
                  <td colSpan={2} style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>SUBTOTAL HITO: QA FINAL, DEPURACIÓN DE CÓDIGO Y ENTREGA DEL SISTEMA</td>
                  <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '900', color: '#0f172a', textAlign: 'right' }}>40.0 hs</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer Fijo */}
          <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
            <span>CREAPP // ESTIMATED_HOURS_160_TOTAL</span>
            <span>Página 5 de 7</span>
          </div>
        </div>

        {/* PÁGINA 6: Metodología de Trabajo & Plan de Acción */}
        <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
              <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{proposal.hero_title ? proposal.hero_title.toUpperCase() : 'CBKR APP V2'}</span>
            </div>
            <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>AGILE_METHODOLOGY // 04</span>
          </div>

          {/* Contenido */}
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '20px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
              METODOLOGÍA DE TRABAJO & <span style={{ fontStyle: 'italic', color: brandPrimary }}>PLAN DE ACCIÓN</span>
            </h1>

            <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
              {(proposal.methodology || DEFAULT_METHODOLOGY).intro_text || DEFAULT_METHODOLOGY.intro_text}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '5px' }}>
              {/* Desarrollo Incremental */}
              <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#faf5ff', border: '1px solid #f3e8ff' }}>
                <h4 style={{ fontSize: '10px', fontWeight: '900', color: brandPrimary, margin: '0 0 6px 0', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  {(() => {
                    const meth = proposal.methodology || DEFAULT_METHODOLOGY;
                    return meth.incremental_title || DEFAULT_METHODOLOGY.incremental_title;
                  })()}
                </h4>
                <p style={{ fontSize: '11px', color: '#581c87', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                  {(() => {
                    const meth = proposal.methodology || DEFAULT_METHODOLOGY;
                    return (meth.incremental_text || DEFAULT_METHODOLOGY.incremental_text).replace('{client_name}', proposal.client_name || 'el cliente');
                  })()}
                </p>
              </div>

              {/* Planificación de Contenidos */}
              <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#fdf2f8', border: '1px solid #fce7f3' }}>
                <h4 style={{ fontSize: '10px', fontWeight: '900', color: brandSecondary, margin: '0 0 6px 0', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                  {(() => {
                    const meth = proposal.methodology || DEFAULT_METHODOLOGY;
                    return meth.planning_title || DEFAULT_METHODOLOGY.planning_title;
                  })()}
                </h4>
                <p style={{ fontSize: '11px', color: '#9d174d', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                  {(() => {
                    const meth = proposal.methodology || DEFAULT_METHODOLOGY;
                    return (meth.planning_text || DEFAULT_METHODOLOGY.planning_text).replace('{client_name}', proposal.client_name || 'el cliente');
                  })()}
                </p>
              </div>

              {/* Agenda Semanal */}
              <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #0f172a', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <h5 style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {(() => {
                      const meth = proposal.methodology || DEFAULT_METHODOLOGY;
                      return meth.schedule_monday_title || DEFAULT_METHODOLOGY.schedule_monday_title;
                    })()}
                  </h5>
                  <h6 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
                    {(() => {
                      const meth = proposal.methodology || DEFAULT_METHODOLOGY;
                      return meth.schedule_monday_subtitle || DEFAULT_METHODOLOGY.schedule_monday_subtitle;
                    })()}
                  </h6>
                  <p style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                    {(() => {
                      const meth = proposal.methodology || DEFAULT_METHODOLOGY;
                      return (meth.schedule_monday_text || DEFAULT_METHODOLOGY.schedule_monday_text).replace('{client_name}', proposal.client_name || 'el cliente');
                    })()}
                  </p>
                </div>
                
                <div style={{ height: '1px', backgroundColor: '#e2e8f0' }}></div>
                
                <div>
                  <h5 style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {(() => {
                      const meth = proposal.methodology || DEFAULT_METHODOLOGY;
                      return meth.schedule_tuesday_title || DEFAULT_METHODOLOGY.schedule_tuesday_title;
                    })()}
                  </h5>
                  <h6 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
                    {(() => {
                      const meth = proposal.methodology || DEFAULT_METHODOLOGY;
                      return meth.schedule_tuesday_subtitle || DEFAULT_METHODOLOGY.schedule_tuesday_subtitle;
                    })()}
                  </h6>
                  <p style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                    {(() => {
                      const meth = proposal.methodology || DEFAULT_METHODOLOGY;
                      return (meth.schedule_tuesday_text || DEFAULT_METHODOLOGY.schedule_tuesday_text).replace('{client_name}', proposal.client_name || 'el cliente');
                    })()}
                  </p>
                </div>

                <div style={{ height: '1px', backgroundColor: '#e2e8f0' }}></div>

                <div>
                  <h5 style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    {(() => {
                      const meth = proposal.methodology || DEFAULT_METHODOLOGY;
                      return meth.schedule_friday_title || DEFAULT_METHODOLOGY.schedule_friday_title;
                    })()}
                  </h5>
                  <h6 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
                    {(() => {
                      const meth = proposal.methodology || DEFAULT_METHODOLOGY;
                      return meth.schedule_friday_subtitle || DEFAULT_METHODOLOGY.schedule_friday_subtitle;
                    })()}
                  </h6>
                  <p style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                    {(() => {
                      const meth = proposal.methodology || DEFAULT_METHODOLOGY;
                      return (meth.schedule_friday_text || DEFAULT_METHODOLOGY.schedule_friday_text).replace('{client_name}', proposal.client_name || 'el cliente');
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Fijo */}
          <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
            <span>Propuesta Comercial | {proposal.client_name}</span>
            <span>Página 6 de 7</span>
          </div>
        </div>

        {/* PÁGINA 7: Acuerdo de Servicios */}
        <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
              <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{proposal.hero_title ? proposal.hero_title.toUpperCase() : 'CBKR APP V2'}</span>
            </div>
            <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>LEGAL_AGREEMENT // 05</span>
          </div>

          {/* Contenido */}
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '20px', marginBottom: '60px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
              CONTRATO Y <span style={{ fontStyle: 'italic', color: brandPrimary }}>FIRMAS</span>
            </h1>

            <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
              {proposal.contract_description || 'Acuerdo formal que establece las bases y condiciones legales para la ejecución del proyecto de desarrollo de software detallado en esta propuesta.'}
            </p>

            <div style={{ fontSize: '10px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', maxHeight: '350px', overflow: 'hidden', marginTop: '5px' }}>
              {proposal.contract_text ? (
                proposal.contract_text
                  .replace(/\{location\}/g, proposal.location)
                  .replace(/\{date\}/g, proposal.date)
                  .replace(/\{client_name\}/g, proposal.client_name)
                  .replace(/\{total_value\}/g, proposal.total_value)
                  .replace(/\[input:Representante Legal\]/g, clientRepName || '________________________')
                  .replace(/\[input:DNI\]/g, clientDNI || '________________________')
                  .replace(/\[input:Cargo del Firmante\]/g, clientRole || '________________________')
                  .replace(/\[input:[^\]]+\]/g, '________________________')
              ) : (
                `CONTRATO DE DESARROLLO DE SOFTWARE
 
Entre Creapp Software Lab y ${proposal.client_name}, se acuerda el desarrollo integral del sistema conforme a los alcances y términos especificados en esta propuesta comercial por un valor total de ${proposal.total_value}.
 
Este contrato entra en vigencia a partir de la firma del presente documento el día ${proposal.date} en la localidad de ${proposal.location}.`
              )}
            </div>

            {/* Firmas a tres columnas */}
            <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
              {/* Desarrollador 1 - Seba */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Por CreAPP Software Lab</p>
                <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '8px' }}>
                  <img src="/firmaseba.png" alt="Firma Seba" style={{ height: '100%', objectFit: 'contain' }} />
                </div>
                <div style={{ fontSize: '10px' }}>
                  <p style={{ fontWeight: '800', color: '#0f172a' }}>Sebastián Maza</p>
                  <p style={{ color: '#64748b', fontSize: '9px' }}>Chief Technology Officer</p>
                </div>
              </div>

              {/* Desarrollador 2 - Facundo Marceca */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Por CreAPP Software Lab</p>
                <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', padding: '8px' }}>
                  {/* Vacío para firma manual */}
                </div>
                <div style={{ fontSize: '10px' }}>
                  <p style={{ fontWeight: '800', color: '#0f172a' }}>Facundo Marceca</p>
                  <p style={{ color: '#64748b', fontSize: '9px' }}>Project Manager</p>
                </div>
              </div>

              {/* Cliente */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Por {proposal.client_name}</p>
                {clientSignature ? (
                  <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '8px' }}>
                    <img src={clientSignature} alt="Firma Cliente" style={{ height: '100%', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '10px', textAlign: 'center' }}>
                    Pendiente de Firma
                  </div>
                )}
                <div style={{ fontSize: '10px' }}>
                  <p style={{ fontWeight: '800', color: '#0f172a' }}>{clientRepName || '________________________'}</p>
                  <p style={{ color: '#64748b', fontSize: '9px' }}>{clientRole || 'Representante Autorizado'}</p>
                  {clientDNI && <p style={{ color: '#94a3b8', fontSize: '8px', marginTop: '1px' }}>DNI: {clientDNI}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Fijo */}
          <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
            <span>Propuesta Comercial | {proposal.client_name}</span>
            <span>Página 7 de 7</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProposalView;
