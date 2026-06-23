import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Eye,
  Plus,
  Trash2,
  GripVertical,
  ShieldCheck,
  Video,
  Download,
  Loader2,
  FileText,
  Film,
  Settings,
  BookOpen,
  CheckCircle2,
  Target,
  Calendar,
  Clock,
  Scale,
  FileSignature,
  ZoomIn,
  ZoomOut,
  Upload,
} from 'lucide-react';
import { ProposalVideoPlayer } from '@/components/video/ProposalVideoPlayer';
import { supabase } from '@/lib/supabaseClient';
import {
  createProposal,
  updateProposal,
  upsertChildItems,
} from '@/lib/proposalService';
import type {
  Proposal,
  ProposalInclusion,
  ProposalExclusion,
  ProposalMilestone,
  ProposalPayment,
  ProposalProjectOption,
  ProposalInfrastructureCost,
} from '@/lib/proposalTypes';
import { generateFullProposalPDF } from '@/lib/pdfService';
import IconResolver from '@/components/ui/IconResolver';
import creappLogoOfficial from '@/assets/CREAPP LOGO VECTOR.png';
import { importProposalFromDocument } from '@/lib/geminiService';

const getCurrencyFromTotal = (valString: string) => {
  const clean = (valString || '').trim().toUpperCase();
  if (clean.startsWith('ARS') || clean.includes('ARS')) return 'ARS';
  return 'USD';
};

// =========================================================
// Reusable Section Component
// =========================================================

interface SectionProps {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  disabledAdd?: boolean;
}

const Section: React.FC<SectionProps> = ({ title, children, onAdd, addLabel = 'Agregar', disabledAdd }) => (
  <div className="glass rounded-2xl p-6 space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="text-sm font-display font-black text-white uppercase tracking-widest">{title}</h3>
      {onAdd && (
        <button
          onClick={onAdd}
          disabled={disabledAdd}
          className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
            disabledAdd 
              ? 'text-slate-600 cursor-not-allowed opacity-50' 
              : 'text-primary hover:text-white'
          }`}
          title={disabledAdd ? 'Límite máximo alcanzado (máx 6)' : undefined}
        >
          <Plus size={14} /> {addLabel}
        </button>
      )}
    </div>
    {children}
  </div>
);

// =========================================================
// Custom Icon Picker for Inclusions
// =========================================================

const AVAILABLE_ICONS = [
  { name: 'CheckCircle2', label: 'Check / Tarea' },
  { name: 'LayoutDashboard', label: 'Dashboard / Interfaz' },
  { name: 'Box', label: 'Módulo / Objeto' },
  { name: 'Cpu', label: 'Backend / Servidor / CPU' },
  { name: 'Database', label: 'Base de Datos / Storage' },
  { name: 'ShieldCheck', label: 'Seguridad / Permisos' },
  { name: 'Clock', label: 'Tiempo / Cronograma / Historial' },
  { name: 'Rocket', label: 'Lanzamiento / Despliegue' },
  { name: 'MessageSquare', label: 'Chat / Mensajería / Feedback' },
  { name: 'FileText', label: 'Documento / Reporte / PDF' },
  { name: 'DollarSign', label: 'Moneda / Pagos / Finanzas' },
];

const IconPicker: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-lg text-primary hover:bg-white/10 hover:border-white/20 transition-all shrink-0"
        title="Seleccionar ícono"
      >
        <IconResolver name={value} size={18} />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 mt-1 w-48 grid grid-cols-4 gap-1 bg-[#18181b] border border-white/10 rounded-lg shadow-2xl p-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          {AVAILABLE_ICONS.map((icon) => (
            <button
              key={icon.name}
              type="button"
              onClick={() => {
                onChange(icon.name);
                setIsOpen(false);
              }}
              className={`aspect-square flex items-center justify-center rounded-md transition-all ${
                icon.name === value
                  ? 'bg-primary/20 text-white font-bold'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
              title={icon.label}
            >
              <IconResolver name={icon.name} size={18} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};


const DEFAULT_WEEKLY_BREAKDOWN = [
  { id: 'W01', type: 'week', title: 'CIMIENTOS CORE', detail: 'Setup del proyecto en Next.js, Tailwind v4. Definición de variables de estilos y estructura del modelo relacional de base de datos para Suelos, Plantas y Acciones.', hours: '10.0' },
  { id: 'W02', type: 'week', title: 'WELCOME SCREEN', detail: 'Maquetación de la pantalla de bienvenida dual ("¿Ya tenés un suelo?"). Lógica mobile-first, redireccionamiento condicional a tienda o asistente.', hours: '10.0' },
  { id: 'W03', type: 'week', title: 'SETUP WIZARD', detail: 'Implementación del flujo de 4 pasos interactivos para el armado de la cama. Soporte para bucles de video cortos (15s) y almacenamiento temporal en localStorage.', hours: '10.0' },
  { id: 'W04', type: 'week', title: 'DNI BIOLÓGICO', detail: 'Lógica algorítmica para determinar el XP del cultivador. Modelado e implementación de la tarjeta digital DNI del suelo y redirección al Dashboard.', hours: '10.0' },
  { id: 'M01', type: 'milestone', title: 'SUBTOTAL HITO: ESTRUCTURA DE ONBOARDING Y TARJETA DNI FINALIZADA', hours: '40.0' },
  { id: 'W05', type: 'week', title: 'HERO & FOTOPERIODO', detail: 'Maquetación de la cabecera inmersiva con luces reactivas. Componente inteligente de fotoperíodo automático según la hora local del dispositivo.', hours: '10.0' },
  { id: 'W06', type: 'week', title: 'BLOQUEO DE CURADO', detail: 'Controlador lógico de estado temporal (21 días) para curado de suelos nuevos. Implementación de barra de progreso con cuenta regresiva para desbloqueo.', hours: '10.0' },
  { id: 'W07', type: 'week', title: 'ACCIONES RÁPIDAS', detail: 'Diseño e integración de menú flotante (+). Despliegue de Bottom Sheet interactiva de carga para Riego, Té de Compost y Enmienda.', hours: '10.0' },
  { id: 'W08', type: 'week', title: 'ADVERTENCIAS IA', detail: 'Algoritmo preventivo de dosificación según historial reciente (alertas de sobre-riego o saturación de té). Modales informativos con checks animados.', hours: '10.0' },
  { id: 'M02', type: 'milestone', title: 'SUBTOTAL HITO: DASHBOARD CENTRAL Y CONTROLES RÁPIDOS DE ACCIONES', hours: '40.0' },
  { id: 'W09', type: 'week', title: 'TARJETAS SUELOS', detail: 'Desarrollo del panel alternativo de listado de Suelos (icono Leaf). Tarjetas con desglose detallado de cultivo y selector dinámico de suelo activo para el Dashboard.', hours: '10.0' },
  { id: 'W10', type: 'week', title: 'BITÁCORA FASES', detail: 'Línea de tiempo histórica y control de plantas (genéticas de cultivo). Modales para cambios biológicos manuales (Vegetativo, Flora, Descanso).', hours: '10.0' },
  { id: 'W11', type: 'week', title: 'CALCULADORAS', detail: 'Integración de algoritmos de cálculo de riego (5% del volumen de maceta) y té de compost (10% + tabla dinámica de ingredientes). Guías ilustradas.', hours: '10.0' },
  { id: 'W12', type: 'week', title: 'SUELOIA SUPPORT', detail: 'Estructuración de FAQ expandible, simulación de respuestas inmediatas mediante bot de chat local y redirección automatizada a WhatsApp con pre-cargas.', hours: '10.0' },
  { id: 'M03', type: 'milestone', title: 'SUBTOTAL HITO: PESTAÑA DE LISTADO DE SUELOS, CALCULADORAS Y SOPORTE BÁSICO', hours: '40.0' },
  { id: 'W13', type: 'week', title: 'BENTO SPACING', detail: 'Homogeneización visual del Dashboard bajo formato de rejilla Bento UI. Alineación matemática de espaciados, fuentes y coherencia tipográfica general.', hours: '10.0' },
  { id: 'W14', type: 'week', title: 'MICRO-INTERACTIONS', detail: 'Animaciones en interacciones de clicks (press-scale) en botones de acción. Suavizado en la carga entre pantallas y animaciones de entrada.', hours: '10.0' },
  { id: 'W15', type: 'week', title: 'RESPONSIVE QA', detail: 'Pruebas en emuladores y celulares físicos de múltiples tamaños (iPhone SE a tablets) y reajuste de reglas CSS para evitar saltos o desbordes de texto.', hours: '10.0' },
  { id: 'W16', type: 'week', title: 'E2E & DELIVERY', detail: 'Pruebas extremo a extremo simulando workflows de cultivo. Proceso de optimización de archivos finales de código y entrega formal de documentación.', hours: '10.0' },
  { id: 'M04', type: 'milestone', title: 'SUBTOTAL HITO: QA FINAL, DEPURACIÓN DE CÓDIGO Y ENTREGA DEL SISTEMA', hours: '40.0' }
];

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

const ProposalEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'nueva';

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setExtractedData(null);

    try {
      const reader = new FileReader();
      const isPdf = file.type === 'application/pdf';
      const isText = file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md');

      if (!isPdf && !isText) {
        throw new Error("Formato no soportado. Por favor sube un archivo PDF (.pdf) o Texto Plano (.txt, .md).");
      }

      reader.onload = async () => {
        try {
          let base64Content = '';
          if (isPdf) {
            const resultStr = reader.result as string;
            base64Content = resultStr.split(',')[1];
          } else {
            base64Content = reader.result as string;
          }

          const parsedData = await importProposalFromDocument(
            base64Content,
            file.type,
            isText
          );

          if (!parsedData || typeof parsedData !== 'object') {
            throw new Error("No se pudo estructurar la información del documento.");
          }

          setExtractedData(parsedData);
        } catch (err: any) {
          setImportError(err.message || "Error al procesar el archivo con la IA.");
        } finally {
          setImporting(false);
        }
      };

      if (isPdf) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    } catch (err: any) {
      setImportError(err.message);
      setImporting(false);
    }
  };

  const handleApplyImport = () => {
    if (!extractedData) return;

    if (extractedData.client_name) setClientName(extractedData.client_name);
    if (extractedData.hero_title) setHeroTitle(extractedData.hero_title);
    if (extractedData.hero_badge) setHeroBadge(extractedData.hero_badge);
    if (extractedData.description) setDescription(extractedData.description);
    if (extractedData.contract_description) setContractDescription(extractedData.contract_description);
    if (extractedData.total_value) setTotalValue(extractedData.total_value);
    if (extractedData.brand_color_primary) setBrandPrimary(extractedData.brand_color_primary);
    if (extractedData.brand_color_secondary) setBrandSecondary(extractedData.brand_color_secondary);

    if (Array.isArray(extractedData.inclusions)) {
      setInclusions(extractedData.inclusions);
    }
    if (Array.isArray(extractedData.exclusions)) {
      setExclusions(extractedData.exclusions);
    }
    if (Array.isArray(extractedData.milestones)) {
      setMilestones(extractedData.milestones);
    }
    if (Array.isArray(extractedData.payments)) {
      setPayments(extractedData.payments);
    }
    if (Array.isArray(extractedData.infrastructure_costs)) {
      setInfrastructureCosts(extractedData.infrastructure_costs);
    }
    if (Array.isArray(extractedData.weekly_breakdown)) {
      setWeeklyBreakdown(extractedData.weekly_breakdown);
    }
    if (extractedData.methodology) {
      setMethodology(extractedData.methodology);
    }

    setIsImportModalOpen(false);
    setExtractedData(null);
    alert("¡Propuesta importada con éxito! Revisa los campos y guárdala.");
  };

  // Main proposal fields
  const [slug, setSlug] = useState('');
  const [clientName, setClientName] = useState('');
  const [date, setDate] = useState('Marzo 2026');
  const [location, setLocation] = useState('Buenos Aires, Argentina');
  const [description, setDescription] = useState('');
  const [totalValue, setTotalValue] = useState('USD 0');
  const [brandPrimary, setBrandPrimary] = useState('#ff007f');
  const [brandSecondary, setBrandSecondary] = useState('#9d00ff');
  const [clientLogoUrl, setClientLogoUrl] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'signed'>('draft');
  const [contractText, setContractText] = useState('');
  const [contractDescription, setContractDescription] = useState('Acuerdo formal que establece las bases y condiciones legales para la ejecución del proyecto de desarrollo de software detallado en esta propuesta.');
  const [heroBadge, setHeroBadge] = useState('');
  const [heroTitle, setHeroTitle] = useState('');

  // Child items
  const [inclusions, setInclusions] = useState<Partial<ProposalInclusion>[]>([]);
  const [exclusions, setExclusions] = useState<Partial<ProposalExclusion>[]>([]);
  const [milestones, setMilestones] = useState<Partial<ProposalMilestone>[]>([]);
  const [payments, setPayments] = useState<Partial<ProposalPayment>[]>([]);
  const [projectOptions, setProjectOptions] = useState<Partial<ProposalProjectOption>[]>([]);
  const [infrastructureCosts, setInfrastructureCosts] = useState<Partial<ProposalInfrastructureCost>[]>([]);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<any[]>(DEFAULT_WEEKLY_BREAKDOWN);
  const [methodology, setMethodology] = useState<any>(DEFAULT_METHODOLOGY);

  const updateMethodologyField = (key: string, value: string) => {
    setMethodology((prev: any) => ({
      ...(prev || DEFAULT_METHODOLOGY),
      [key]: value
    }));
  };

  const [exportingPDF, setExportingPDF] = useState(false);
  const [renderingVertical, setRenderingVertical] = useState(false);
  const [renderingHorizontal, setRenderingHorizontal] = useState(false);
  const [videoProgressVertical, setVideoProgressVertical] = useState(0);
  const [videoProgressHorizontal, setVideoProgressHorizontal] = useState(0);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Tab navigation state
  type EditorTab = 'config' | 'portada' | 'alcance' | 'hitos' | 'sem1-6' | 'sem9-16' | 'metodologia' | 'legal' | 'video';
  const [activeEditorTab, setActiveEditorTab] = useState<EditorTab>('config');
  const [zoom, setZoom] = useState<number>(0.6);

  useEffect(() => {
    if (isNew) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: proposal } = await supabase.from('proposals').select('*').eq('id', id).single();
      if (!proposal) {
        navigate('/admin');
        return;
      }

      setSlug(proposal.slug);
      setClientName(proposal.client_name);
      setDate(proposal.date);
      setLocation(proposal.location);
      setDescription(proposal.description);
      setTotalValue(proposal.total_value);
      setBrandPrimary(proposal.brand_color_primary);
      setBrandSecondary(proposal.brand_color_secondary);
      setClientLogoUrl(proposal.client_logo_url || '');
      setStatus(proposal.status);
      setContractText(proposal.contract_text || '');
      if (proposal.contract_description !== undefined && proposal.contract_description !== null) {
        setContractDescription(proposal.contract_description);
      }
      setHeroBadge(proposal.hero_badge || '');
      setHeroTitle(proposal.hero_title || '');
      if (proposal.weekly_breakdown) {
        setWeeklyBreakdown(proposal.weekly_breakdown);
      } else {
        setWeeklyBreakdown(DEFAULT_WEEKLY_BREAKDOWN);
      }
      if (proposal.methodology) {
        setMethodology(proposal.methodology);
      } else {
        setMethodology(DEFAULT_METHODOLOGY);
      }

      const [inc, exc, mil, pay, opt, infra] = await Promise.all([
        supabase.from('proposal_inclusions').select('*').eq('proposal_id', id).order('sort_order'),
        supabase.from('proposal_exclusions').select('*').eq('proposal_id', id).order('sort_order'),
        supabase.from('proposal_milestones').select('*').eq('proposal_id', id).order('sort_order'),
        supabase.from('proposal_payments').select('*').eq('proposal_id', id).order('sort_order'),
        supabase.from('proposal_project_options').select('*').eq('proposal_id', id).order('sort_order'),
        supabase.from('proposal_infrastructure_costs').select('*').eq('proposal_id', id).order('sort_order'),
      ]);

      setInclusions(inc.data || []);
      setExclusions(exc.data || []);
      setMilestones(mil.data || []);
      setPayments(pay.data || []);
      setProjectOptions(opt.data || []);
      setInfrastructureCosts(infra.data || []);
      setLoading(false);
    };

    fetchData();
  }, [id, isNew, navigate]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const blob = await generateFullProposalPDF('full-proposal-print-template-editor');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Propuesta-Comercial-${clientName.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Hubo un error al generar el PDF de la propuesta.');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportVideo = async (ratio: '16:9' | '9:16') => {
    const isVertical = ratio === '9:16';
    const setRendering = isVertical ? setRenderingVertical : setRenderingHorizontal;
    const setProgress = isVertical ? setVideoProgressVertical : setVideoProgressHorizontal;

    setRendering(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          clearInterval(interval);
          return 92;
        }
        return prev + Math.floor(Math.random() * 4) + 1;
      });
    }, 450);

    try {
      const response = await fetch('/api/render-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName,
          brandPrimary,
          brandSecondary,
          heroTitle,
          inclusions,
          exclusions,
          milestones,
          payments,
          totalValue: parseFloat(totalValue.replace(/[^0-9.]/g, '')) || 0,
          clientLogoUrl,
          aspectRatio: ratio,
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fallo en la compilación del video.');
      }

      const data = await response.json();
      setProgress(100);

      const link = document.createElement('a');
      link.href = data.videoUrl;
      const suffix = isVertical ? 'vertical' : 'horizontal';
      link.setAttribute('download', `propuesta-${suffix}-${clientName.toLowerCase().replace(/\s+/g, '-')}.mp4`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      clearInterval(interval);
      alert('Error rendering video: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setRendering(false);
      setProgress(0);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${slug || 'client'}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('contracts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('contracts')
        .getPublicUrl(data.path);

      setClientLogoUrl(publicUrl);
    } catch (err: any) {
      console.error('Error uploading logo:', err);
      alert('Error al subir el logo: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const proposalData = {
        slug: slug || generateSlug(clientName),
        client_name: clientName,
        date,
        location,
        description,
        total_value: totalValue,
        brand_color_primary: brandPrimary,
        brand_color_secondary: brandSecondary,
        client_logo_url: clientLogoUrl || null,
        developer_signature_url: null,
        status,
        contract_text: contractText || null,
        contract_description: contractDescription || null,
        hero_badge: heroBadge || null,
        hero_title: heroTitle || null,
        weekly_breakdown: weeklyBreakdown.length > 0 ? weeklyBreakdown : null,
        methodology: methodology || null,
      };

      let proposalId = id;

      if (isNew) {
        const created = await createProposal(proposalData);
        proposalId = created.id;
      } else {
        await updateProposal(id!, proposalData);
      }

      // Save child items
      await Promise.all([
        upsertChildItems('proposal_inclusions', proposalId!, inclusions as Record<string, unknown>[]),
        upsertChildItems('proposal_exclusions', proposalId!, exclusions as Record<string, unknown>[]),
        upsertChildItems('proposal_milestones', proposalId!, milestones as Record<string, unknown>[]),
        upsertChildItems('proposal_payments', proposalId!, payments as Record<string, unknown>[]),
        upsertChildItems('proposal_project_options', proposalId!, projectOptions as Record<string, unknown>[]),
        upsertChildItems('proposal_infrastructure_costs', proposalId!, infrastructureCosts as Record<string, unknown>[]),
      ]);

      navigate('/admin');
    } catch (err) {
      console.error('Error saving:', err);
      const message = err instanceof Error ? err.message : (err as any)?.message || 'Error desconocido';
      alert(`Error al guardar: ${message}`);
    }
    setSaving(false);
  };

  // Generic update helpers
  const updateItem = <T extends Record<string, unknown>>(
    items: T[],
    setItems: React.Dispatch<React.SetStateAction<T[]>>,
    index: number,
    field: string,
    value: unknown
  ) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const removeItem = <T,>(items: T[], setItems: React.Dispatch<React.SetStateAction<T[]>>, index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Page rendering helper functions for print & preview
  const renderPage1 = () => (
    <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
      <div style={{ position: 'absolute', top: '0', left: '0', right: '0', height: '8px', background: `linear-gradient(to right, ${brandPrimary}, ${brandSecondary})` }}></div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGrow: 1, gap: '65px', marginTop: '20px', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
          <img src={creappLogoOfficial} alt="CreAPP Logo" style={{ height: '105px', objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', color: brandPrimary, letterSpacing: '3px', textTransform: 'uppercase' }}>
            {heroBadge || 'Propuesta Técnica Comercial'}
          </span>
          <h1 style={{ fontSize: '42px', fontWeight: '950', color: '#0f172a', margin: '15px 0 10px 0', lineHeight: '1.1', letterSpacing: '-1px', textAlign: 'center' }}>
            {heroTitle || 'Desarrollo de Software Integrado'}
          </h1>
          <div style={{ height: '2px', width: '80px', backgroundColor: `${brandPrimary}44`, margin: '20px auto' }}></div>
          <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', maxWidth: '560px', fontWeight: '300', textAlign: 'center' }}>
            {description}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '60px', justifyContent: 'center', width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Preparado para</p>
            <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{clientName}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Fecha</p>
            <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{date}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Ubicación</p>
            <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{location}</p>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '25px' }}>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>CreAPP Software & Automation</span>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Dossier Oficial de Propuesta</span>
      </div>
    </div>
  );

  const renderPage2 = () => {
    const totalVisibleInclusions = inclusions.slice(0, 6).length;
    const totalVisibleExclusions = exclusions.slice(0, 6).length;
    const totalItemsPage2 = totalVisibleInclusions + totalVisibleExclusions;

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
      <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
            <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{heroTitle ? heroTitle.toUpperCase() : 'CBKR APP V2'}</span>
          </div>
          <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>PROJECT_SCOPE // 02</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: p2MainGap }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h1 style={{ fontSize: p2TitleSize, fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
              Alcance & <span style={{ fontStyle: 'italic', color: brandPrimary }}>Entregables</span>
            </h1>
            <p style={{ fontSize: p2SubTitleSize, color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
              {(methodology || DEFAULT_METHODOLOGY).scope_intro || DEFAULT_METHODOLOGY.scope_intro}
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: p2Gap, width: '100%' }}>
            {inclusions.slice(0, 6).map((inc, index) => {
              const totalVisible = inclusions.slice(0, 6).length;
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
          {exclusions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: p2MainGap === '8px' ? '4px' : '10px', marginTop: p2TitleMarginTop }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h1 style={{ fontSize: p2TitleSize, fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
                  Fuera de <span style={{ fontStyle: 'italic', color: '#e11d48' }}>Alcance</span>
                </h1>
                <p style={{ fontSize: p2SubTitleSize, color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
                  {(methodology || DEFAULT_METHODOLOGY).exclusions_intro || DEFAULT_METHODOLOGY.exclusions_intro}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: p2Gap, width: '100%' }}>
                {exclusions.slice(0, 6).map((exc, index) => {
                  const totalVisible = exclusions.slice(0, 6).length;
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
        <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
          <span>Propuesta Comercial | {clientName}</span>
          <span>Página 2 de 7</span>
        </div>
      </div>
    );
  };

  const renderPage3 = () => {
    const currency = getCurrencyFromTotal(totalValue);
    return (
      <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
          <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{heroTitle ? heroTitle.toUpperCase() : 'CBKR APP V2'}</span>
        </div>
        <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>PROJECT_ROADMAP // 02</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
          CRONOGRAMA DE FASES & <span style={{ fontStyle: 'italic', color: brandPrimary }}>ENTREGAS</span>
        </h1>
        <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
          {(() => {
            const meth = methodology || DEFAULT_METHODOLOGY;
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {milestones && milestones.map((m, i) => (
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
                <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b' }}>{currency}</span>
              </div>
            </div>
          ))}
        </div>

        {infrastructureCosts && infrastructureCosts.length > 0 && (
          <div style={{ marginTop: '5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
              <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Costos de Infraestructura Asociados</span>
              <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {infrastructureCosts.map((infra, idx) => (
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

        {payments && payments.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
              <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Esquema de Pagos / Hitos de Financiamiento</span>
              <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
              {payments.map((p, idx) => (
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
      <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
        <span>Presupuesto Consolidado: <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{totalValue.toUpperCase().includes('ARS') || totalValue.toUpperCase().includes('USD') ? totalValue : `${currency} ${totalValue}`} TOTAL</span></span>
        <span>Página 3 de 7</span>
      </div>
    </div>
    );
  };

  const renderPage4 = () => {
    const list = weeklyBreakdown && weeklyBreakdown.length >= 10 ? weeklyBreakdown.slice(0, 10) : DEFAULT_WEEKLY_BREAKDOWN.slice(0, 10);
    return (
      <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
            <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{heroTitle ? heroTitle.toUpperCase() : 'CBKR APP V2'}</span>
          </div>
          <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>TIME_ESTIMATION // MES 1 Y 2</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '15px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
            DESGLOSE DE HORAS — <span style={{ fontStyle: 'italic', color: brandPrimary }}>SEMANAS 1 A 8</span>
          </h1>
          <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
            {(methodology || DEFAULT_METHODOLOGY).weekly_breakdown_intro_1_8 || DEFAULT_METHODOLOGY.weekly_breakdown_intro_1_8}
          </p>
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
              {list.map((item: any) => {
                if (item.type === 'milestone') {
                  return (
                    <tr key={item.id} style={{ backgroundColor: '#f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a' }}>{item.id}</td>
                      <td colSpan={2} style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>{item.title}</td>
                      <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '900', color: '#0f172a', textAlign: 'right' }}>{item.hours} hs</td>
                    </tr>
                  );
                }
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>{item.id}</td>
                    <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>{item.title}</td>
                    <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>{item.detail}</td>
                    <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>{item.hours} hs</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
          <span>CREAPP // ACCUMULATED_HOURS_80</span>
          <span>Página 4 de 7</span>
        </div>
      </div>
    );
  };

  const renderPage5 = () => {
    const list = weeklyBreakdown && weeklyBreakdown.length >= 20 ? weeklyBreakdown.slice(10, 20) : DEFAULT_WEEKLY_BREAKDOWN.slice(10, 20);
    return (
      <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
            <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{heroTitle ? heroTitle.toUpperCase() : 'CBKR APP V2'}</span>
          </div>
          <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>TIME_ESTIMATION // MES 3 Y 4</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '15px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
            DESGLOSE DE HORAS — <span style={{ fontStyle: 'italic', color: brandPrimary }}>SEMANAS 9 A 16</span>
          </h1>
          <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
            {(methodology || DEFAULT_METHODOLOGY).weekly_breakdown_intro_9_16 || DEFAULT_METHODOLOGY.weekly_breakdown_intro_9_16}
          </p>
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
              {list.map((item: any) => {
                if (item.type === 'milestone') {
                  return (
                    <tr key={item.id} style={{ backgroundColor: '#f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a' }}>{item.id}</td>
                      <td colSpan={2} style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>{item.title}</td>
                      <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '900', color: '#0f172a', textAlign: 'right' }}>{item.hours} hs</td>
                    </tr>
                  );
                }
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>{item.id}</td>
                    <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>{item.title}</td>
                    <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>{item.detail}</td>
                    <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>{item.hours} hs</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
          <span>CREAPP // ESTIMATED_HOURS_160_TOTAL</span>
          <span>Página 5 de 7</span>
        </div>
      </div>
    );
  };

  const renderPage6 = () => {
    const meth = methodology || DEFAULT_METHODOLOGY;
    const clientNameReplacer = (text: string) => (text || '').replace('{client_name}', clientName || 'el cliente');

    return (
      <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
            <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{heroTitle ? heroTitle.toUpperCase() : 'CBKR APP V2'}</span>
          </div>
          <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>AGILE_METHODOLOGY // 04</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
            METODOLOGÍA DE TRABAJO & <span style={{ fontStyle: 'italic', color: brandPrimary }}>PLAN DE ACCIÓN</span>
          </h1>
          <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
            {meth.intro_text || DEFAULT_METHODOLOGY.intro_text}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '5px' }}>
            <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#faf5ff', border: '1px solid #f3e8ff' }}>
              <h4 style={{ fontSize: '10px', fontWeight: '900', color: brandPrimary, margin: '0 0 6px 0', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                {meth.incremental_title || DEFAULT_METHODOLOGY.incremental_title}
              </h4>
              <p style={{ fontSize: '11px', color: '#581c87', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                {clientNameReplacer(meth.incremental_text || DEFAULT_METHODOLOGY.incremental_text)}
              </p>
            </div>
            <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#fdf2f8', border: '1px solid #fce7f3' }}>
              <h4 style={{ fontSize: '10px', fontWeight: '900', color: brandSecondary, margin: '0 0 6px 0', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                {meth.planning_title || DEFAULT_METHODOLOGY.planning_title}
              </h4>
              <p style={{ fontSize: '11px', color: '#9d174d', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                {clientNameReplacer(meth.planning_text || DEFAULT_METHODOLOGY.planning_text)}
              </p>
            </div>
            <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #0f172a', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <h5 style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {meth.schedule_monday_title || DEFAULT_METHODOLOGY.schedule_monday_title}
                </h5>
                <h6 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
                  {meth.schedule_monday_subtitle || DEFAULT_METHODOLOGY.schedule_monday_subtitle}
                </h6>
                <p style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                  {clientNameReplacer(meth.schedule_monday_text || DEFAULT_METHODOLOGY.schedule_monday_text)}
                </p>
              </div>
              <div style={{ height: '1px', backgroundColor: '#e2e8f0' }}></div>
              <div>
                <h5 style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {meth.schedule_tuesday_title || DEFAULT_METHODOLOGY.schedule_tuesday_title}
                </h5>
                <h6 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
                  {meth.schedule_tuesday_subtitle || DEFAULT_METHODOLOGY.schedule_tuesday_subtitle}
                </h6>
                <p style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                  {clientNameReplacer(meth.schedule_tuesday_text || DEFAULT_METHODOLOGY.schedule_tuesday_text)}
                </p>
              </div>
              <div style={{ height: '1px', backgroundColor: '#e2e8f0' }}></div>
              <div>
                <h5 style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {meth.schedule_friday_title || DEFAULT_METHODOLOGY.schedule_friday_title}
                </h5>
                <h6 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
                  {meth.schedule_friday_subtitle || DEFAULT_METHODOLOGY.schedule_friday_subtitle}
                </h6>
                <p style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                  {clientNameReplacer(meth.schedule_friday_text || DEFAULT_METHODOLOGY.schedule_friday_text)}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
          <span>Propuesta Comercial | {clientName}</span>
          <span>Página 6 de 7</span>
        </div>
      </div>
    );
  };

  const renderPage7 = () => (
    <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
          <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{heroTitle ? heroTitle.toUpperCase() : 'CBKR APP V2'}</span>
        </div>
        <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>LEGAL_AGREEMENT // 05</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '20px', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
          CONTRATO Y <span style={{ fontStyle: 'italic', color: brandPrimary }}>FIRMAS</span>
        </h1>
        <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
          {contractDescription || 'Acuerdo formal que establece las bases y condiciones legales para la ejecución del proyecto de desarrollo de software detallado en esta propuesta.'}
        </p>
        <div style={{ fontSize: '10px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', maxHeight: '350px', overflow: 'hidden', marginTop: '5px' }}>
          {contractText ? (
            contractText
              .replace(/\{location\}/g, location)
              .replace(/\{date\}/g, date)
              .replace(/\{client_name\}/g, clientName)
              .replace(/\{total_value\}/g, totalValue)
              .replace(/\[input:[^\]]+\]/g, '________________________')
          ) : (
            `CONTRATO DE DESARROLLO DE SOFTWARE
 
Entre Creapp Software Lab y ${clientName}, se acuerda el desarrollo integral del sistema conforme a los alcances y términos especificados en esta propuesta comercial por un valor total de ${totalValue}.
 
Este contrato entra en vigencia a partir de la firma del presente documento el día ${date} en la localidad de ${location}.`
          )}
        </div>
        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
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
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Por CreAPP Software Lab</p>
            <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', padding: '8px' }}>
            </div>
            <div style={{ fontSize: '10px' }}>
              <p style={{ fontWeight: '800', color: '#0f172a' }}>Facundo Marceca</p>
              <p style={{ color: '#64748b', fontSize: '9px' }}>Project Manager</p>
            </div>
          </div>
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Por {clientName}</p>
            <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '10px', textAlign: 'center' }}>
              Pendiente de Firma
            </div>
            <div style={{ fontSize: '10px' }}>
              <p style={{ fontWeight: '800', color: '#0f172a' }}>________________________</p>
              <p style={{ color: '#64748b', fontSize: '9px' }}>Representante Autorizado</p>
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
        <span>Propuesta Comercial | {clientName}</span>
        <span>Página 7 de 7</span>
      </div>
    </div>
  );

  const getPageNumber = (tab: EditorTab) => {
    switch (tab) {
      case 'config':
      case 'portada':
        return 1;
      case 'alcance':
        return 2;
      case 'hitos':
        return 3;
      case 'sem1-6':
        return 4;
      case 'sem9-16':
        return 5;
      case 'metodologia':
        return 6;
      case 'legal':
        return 7;
      default:
        return 1;
    }
  };

  const renderPreviewPage = (tab: EditorTab) => {
    switch (tab) {
      case 'config':
      case 'portada':
        return renderPage1();
      case 'alcance':
        return renderPage2();
      case 'hitos':
        return renderPage3();
      case 'sem1-6':
        return renderPage4();
      case 'sem9-16':
        return renderPage5();
      case 'metodologia':
        return renderPage6();
      case 'legal':
        return renderPage7();
      default:
        return renderPage1();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark text-slate-200 font-body">
      {/* Header */}
      <header className="border-b border-white/5 bg-surface-dark/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-3 text-slate-400 hover:text-white text-xs uppercase tracking-widest font-bold transition-colors"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
          <div className="flex items-center flex-wrap gap-3">
            {!isNew && slug && (
              <>
                <a
                  href={`/propuesta/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white text-[11px] uppercase tracking-widest font-bold transition-all hover:bg-white/10"
                >
                  <Eye size={14} /> Ver Online
                </a>
                <button
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white text-[11px] uppercase tracking-widest font-bold transition-all hover:bg-white/10 disabled:opacity-50"
                >
                  {exportingPDF ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Exportando PDF...
                    </>
                  ) : (
                    <>
                      <FileText size={14} />
                      Exportar PDF
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleExportVideo('9:16')}
                  disabled={renderingVertical}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white text-[11px] uppercase tracking-widest font-bold transition-all hover:bg-white/10 disabled:opacity-50"
                >
                  {renderingVertical ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-primary" />
                      Vertical ({videoProgressVertical}%)
                    </>
                  ) : (
                    <>
                      <Video size={14} className="rotate-90" />
                      Exportar Vertical
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleExportVideo('16:9')}
                  disabled={renderingHorizontal}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white text-[11px] uppercase tracking-widest font-bold transition-all hover:bg-white/10 disabled:opacity-50"
                >
                  {renderingHorizontal ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-primary" />
                      Horizontal ({videoProgressHorizontal}%)
                    </>
                  ) : (
                    <>
                      <Video size={14} />
                      Exportar Horizontal
                    </>
                  )}
                </button>
              </>
            )}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white text-[11px] uppercase tracking-widest font-bold transition-all hover:bg-white/10 cursor-pointer"
            >
              <Upload size={14} className="text-secondary" />
              Importar PDF/DOC
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !clientName}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-white font-black uppercase tracking-widest text-[11px] hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {([
            { id: 'config' as EditorTab, label: 'Config', icon: Settings },
            { id: 'portada' as EditorTab, label: 'Portada (P1)', icon: BookOpen },
            { id: 'alcance' as EditorTab, label: 'Alcance (P2)', icon: CheckCircle2 },
            { id: 'hitos' as EditorTab, label: 'Hitos (P3)', icon: Target },
            { id: 'sem1-6' as EditorTab, label: 'Sem 1-6 (P4)', icon: Calendar },
            { id: 'sem9-16' as EditorTab, label: 'Sem 9-16 (P5)', icon: Clock },
            { id: 'metodologia' as EditorTab, label: 'Metodol. (P6)', icon: Scale },
            { id: 'legal' as EditorTab, label: 'Legal (P7)', icon: FileSignature },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveEditorTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 border ${
                activeEditorTab === id
                  ? 'bg-white/10 text-white border-white/20 shadow-lg'
                  : 'text-slate-500 hover:text-slate-300 border-transparent hover:border-white/5'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
          <button
            onClick={() => setActiveEditorTab('video')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 border ${
              activeEditorTab === 'video'
                ? 'bg-primary text-white border-primary/30 shadow-lg shadow-primary/20'
                : 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20'
            }`}
          >
            <Film size={14} />
            Video
          </button>
        </div>

        {/* Split Layout: Left (Tab Content) + Right (Video / PDF Real-time Previews) */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[480px_1fr]">
          {/* Left Panel: Tab Content */}
          <div className="space-y-6">

        {/* CONFIG TAB */}
        {activeEditorTab === 'config' && (
          <div className="space-y-6">
            <h2 className="text-xl font-display font-black text-white">
              Configuración General de la Propuesta
            </h2>

            <div className="glass rounded-2xl p-6 border border-white/5 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Slug */}
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Slug de la Propuesta (URL)
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="astillero-vision"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-sm font-mono transition-all"
                  />
                </div>

                {/* Estado */}
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Estado Comercial
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'signed')}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 text-sm transition-all"
                  >
                    <option value="draft" className="bg-slate-950 text-white">Borrador</option>
                    <option value="published" className="bg-slate-950 text-white">Publicada</option>
                    <option value="signed" className="bg-slate-950 text-white">Firmada</option>
                  </select>
                </div>
              </div>

              {/* Logo Uploader */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                  Logo del Cliente
                </label>
                
                {clientLogoUrl ? (
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/10">
                    <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-2 overflow-hidden shrink-0">
                      <img src={clientLogoUrl} alt="Logo Cliente" className="max-w-full max-h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">{clientLogoUrl.split('/').pop()}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">URL del Logo Cargada</p>
                    </div>
                    <button
                      onClick={() => setClientLogoUrl('')}
                      className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                      title="Eliminar logo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="border-2 border-dashed border-white/10 group-hover:border-primary/40 rounded-xl p-8 text-center transition-all duration-300 bg-white/[0.01]">
                      {uploadingLogo ? (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Subiendo logo...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="text-slate-500 group-hover:text-primary transition-colors mb-1" size={24} />
                          <p className="text-xs text-slate-300 font-semibold">
                            Haz clic o arrastra un archivo de imagen
                          </p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                            PNG, JPG, SVG o WebP
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PORTADA TAB */}
        {activeEditorTab === 'portada' && (
          <div className="space-y-6">
            <h2 className="text-xl font-display font-black text-white">
              Portada (P1) — Contenido
            </h2>

            <div className="glass rounded-2xl p-8 border border-white/5 space-y-8 flex flex-col items-stretch relative overflow-hidden">
              {/* Top accent line resembling the cover page */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary"></div>

              {/* Cover Page Input Mockup */}
              <div className="flex flex-col items-center text-center gap-6 mt-4 p-6 rounded-2xl bg-slate-950/40 border border-white/5 shadow-inner">
                {/* Visual Header Logo */}
                <div className="opacity-80 flex flex-col items-center">
                  <div className="h-10 text-[10px] text-slate-600 uppercase tracking-[0.2em] font-black border border-white/5 px-3 py-1.5 rounded bg-white/[0.02]">
                    [ LOGO CREAPP ]
                  </div>
                </div>

                {/* Subtitle Badge Input */}
                <div className="w-full max-w-xs space-y-1.5">
                  <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">
                    Tipo de Propuesta / Badge (ej: Propuesta Técnica Comercial)
                  </label>
                  <input
                    type="text"
                    value={heroBadge}
                    onChange={(e) => setHeroBadge(e.target.value)}
                    placeholder="PROPUESTA TÉCNICA COMERCIAL"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-center text-primary placeholder-primary/40 focus:outline-none focus:border-primary/50 text-[11px] font-black uppercase tracking-widest transition-all"
                  />
                </div>

                {/* Hero Title Input */}
                <div className="w-full space-y-1.5">
                  <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">
                    Título Principal
                  </label>
                  <input
                    type="text"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="Ej. CANNABUNKER APP"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-base font-black transition-all"
                  />
                </div>

                {/* Separator line */}
                <div className="w-16 h-[2px] bg-white/10 my-1"></div>

                {/* Description Textarea */}
                <div className="w-full space-y-1.5">
                  <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">
                    Texto Descriptivo
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Desarrollo e integración de cbkr App v2, una solución móvil..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary/50 text-xs leading-relaxed resize-none transition-all font-light"
                  />
                </div>

                {/* Bottom details block mimicking cover page columns */}
                <div className="w-full grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5 text-left">
                  {/* Nombre del Cliente */}
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">
                      Nombre del Cliente
                    </label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => {
                        setClientName(e.target.value);
                        if (isNew) setSlug(generateSlug(e.target.value));
                      }}
                      placeholder="Ej. Astillero Vision"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-xs font-bold transition-all"
                    />
                  </div>

                  {/* Fecha de Presentación */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">
                      Fecha de Presentación
                    </label>
                    <input
                      type="text"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      placeholder="Ej. Junio 2026"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-xs font-bold transition-all"
                    />
                  </div>

                  {/* Location Input */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">
                      Ubicación
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Buenos Aires, Argentina"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-xs font-bold transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Branding / Colores preview */}
              <div className="space-y-4 border-t border-white/5 pt-6">
                <h4 className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                  Colores del Branding
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Color Primario</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent shrink-0" />
                      <input type="text" value={brandPrimary} onChange={(e) => setBrandPrimary(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Color Secundario</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={brandSecondary} onChange={(e) => setBrandSecondary(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent shrink-0" />
                      <input type="text" value={brandSecondary} onChange={(e) => setBrandSecondary(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ALCANCE TAB */}
        {activeEditorTab === 'alcance' && (
          <div className="space-y-6">
            <Section title="Introducciones de Alcance & Exclusiones">
              <div className="p-4 rounded-xl bg-[#090d16] border border-white/5 shadow-lg space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Párrafo Principal de Alcance (Inclusiones)</label>
                  <textarea
                    value={methodology?.scope_intro ?? DEFAULT_METHODOLOGY.scope_intro}
                    onChange={(e) => updateMethodologyField('scope_intro', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[60px]"
                    placeholder="Detalle técnico del desarrollo y los entregables comprometidos..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Párrafo Principal de Exclusiones (Fuera de Alcance)</label>
                  <textarea
                    value={methodology?.exclusions_intro ?? DEFAULT_METHODOLOGY.exclusions_intro}
                    onChange={(e) => updateMethodologyField('exclusions_intro', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[60px]"
                    placeholder="Aspectos, integraciones y requerimientos no contemplados..."
                  />
                </div>
              </div>
            </Section>

            <Section 
              title={`Inclusiones (${inclusions.length})`} 
              onAdd={() => {
                if (inclusions.length < 6) {
                  setInclusions([...inclusions, { title: '', description: '', tooltip: '', icon_name: 'CheckCircle2' }]);
                }
              }}
              disabledAdd={inclusions.length >= 6}
              addLabel="Agregar Inclusión"
            >
              <div className="space-y-4 mt-4">
                {inclusions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                    No hay inclusiones agregadas. Haz clic en "Agregar Inclusión" para empezar.
                  </div>
                ) : (
                  inclusions.map((item, i) => {
                    const titleLen = item.title?.length || 0;
                    const descLen = item.description?.length || 0;
                    const tooltipLen = item.tooltip?.length || 0;

                    return (
                      <div key={i} className="flex gap-4 items-start p-4 rounded-xl bg-[#090d16] border border-white/5 shadow-lg relative">
                        {/* Index & Drag handle on the left */}
                        <div className="flex flex-col items-center gap-1.5 mt-2.5 shrink-0 select-none">
                          <GripVertical size={14} className="text-slate-700" />
                          <span className="text-xs text-slate-600 font-bold font-mono">#{i + 1}</span>
                        </div>

                        {/* Input elements */}
                        <div className="flex-grow space-y-3">
                          {/* Row 1: IconPicker + Title + Trash */}
                          <div className="flex items-center gap-2">
                            {/* Icon Picker (Square Button) */}
                            <div className="shrink-0">
                              <IconPicker 
                                value={item.icon_name || 'CheckCircle2'} 
                                onChange={(name) => updateItem(inclusions, setInclusions, i, 'icon_name', name)} 
                              />
                            </div>

                            {/* Title Input */}
                            <div className="flex-grow min-w-0 relative">
                              <input 
                                type="text" 
                                value={item.title || ''} 
                                onChange={(e) => updateItem(inclusions, setInclusions, i, 'title', e.target.value)} 
                                placeholder="Título del Entregable (ej: Frontend Mobile-First)" 
                                className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg pl-3 pr-14 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all" 
                              />
                              <span className={`absolute right-3 top-2.5 text-[9px] font-mono font-bold select-none ${
                                titleLen > 30 ? 'text-red-400' : 'text-slate-500'
                              }`}>
                                {titleLen}/30
                              </span>
                            </div>

                            {/* Trash Button */}
                            <button 
                              onClick={() => removeItem(inclusions, setInclusions, i)} 
                              className="text-slate-600 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                              title="Eliminar inclusión"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {/* Row 2: Description */}
                          <div className="relative">
                            <textarea 
                              value={item.description || ''} 
                              onChange={(e) => updateItem(inclusions, setInclusions, i, 'description', e.target.value)} 
                              placeholder="Descripción corta del entregable (ej: Interfaz fluida y optimizada)" 
                              rows={1}
                              ref={(el) => {
                                if (el) {
                                  el.style.height = 'auto';
                                  el.style.height = `${el.scrollHeight}px`;
                                }
                              }}
                              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg pl-3 pr-14 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all resize-none overflow-hidden" 
                            />
                            <span className={`absolute right-3 top-2.5 text-[9px] font-mono font-bold select-none ${
                              descLen > 80 ? 'text-red-400' : 'text-slate-500'
                            }`}>
                              {descLen}/80
                            </span>
                          </div>

                          {/* Row 3: Technical Details */}
                          <div className="relative">
                            <textarea 
                              value={item.tooltip || ''} 
                              onChange={(e) => updateItem(inclusions, setInclusions, i, 'tooltip', e.target.value)} 
                              placeholder="Especificación técnica / Detalle en Tooltip (Opcional - ej: Next.js + Tailwind CSS v4)" 
                              rows={1} 
                              ref={(el) => {
                                if (el) {
                                  el.style.height = 'auto';
                                  el.style.height = `${el.scrollHeight}px`;
                                }
                              }}
                              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg pl-3 pr-14 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all resize-none overflow-hidden" 
                            />
                            <span className={`absolute right-3 bottom-2.5 text-[9px] font-mono font-bold select-none ${
                              tooltipLen > 120 ? 'text-red-400' : 'text-slate-500'
                            }`}>
                              {tooltipLen}/120
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Section>

            <Section 
              title={`Exclusiones (${exclusions.length})`} 
              onAdd={() => {
                if (exclusions.length < 6) {
                  setExclusions([...exclusions, { title: '', tooltip: '' }]);
                }
              }}
              disabledAdd={exclusions.length >= 6}
              addLabel="Agregar Exclusión"
            >
              <div className="space-y-4 mt-4">
                {exclusions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                    No hay exclusiones agregadas. Haz clic en "Agregar Exclusión" para empezar.
                  </div>
                ) : (
                  exclusions.map((item, i) => {
                    const titleLen = item.title?.length || 0;
                    const tooltipLen = item.tooltip?.length || 0;

                    return (
                      <div key={i} className="flex gap-4 items-start p-4 rounded-xl bg-[#090d16] border border-white/5 shadow-lg relative">
                        {/* Index & Drag handle on the left */}
                        <div className="flex flex-col items-center gap-1.5 mt-2.5 shrink-0 select-none">
                          <GripVertical size={14} className="text-slate-700" />
                          <span className="text-xs text-slate-600 font-bold font-mono">#{i + 1}</span>
                        </div>

                        {/* Input elements */}
                        <div className="flex-grow space-y-3">
                          {/* Row 1: Title + Trash */}
                          <div className="flex items-center gap-2">
                            <div className="flex-grow min-w-0 relative">
                              <input 
                                type="text" 
                                value={item.title || ''} 
                                onChange={(e) => updateItem(exclusions, setExclusions, i, 'title', e.target.value)} 
                                placeholder="Título de la Exclusión (ej: Costos de servidores)" 
                                className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg pl-3 pr-14 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all" 
                              />
                              <span className={`absolute right-3 top-2.5 text-[9px] font-mono font-bold select-none ${
                                titleLen > 45 ? 'text-red-400' : 'text-slate-500'
                              }`}>
                                {titleLen}/45
                              </span>
                            </div>

                            {/* Trash Button */}
                            <button 
                              onClick={() => removeItem(exclusions, setExclusions, i)} 
                              className="text-slate-600 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                              title="Eliminar exclusión"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {/* Row 2: Detail */}
                          <div className="relative">
                            <textarea 
                              value={item.tooltip || ''} 
                              onChange={(e) => updateItem(exclusions, setExclusions, i, 'tooltip', e.target.value)} 
                              placeholder="Detalle / Aclaración de la Exclusión (ej: Licencias de APIs de terceros no incluidas)" 
                              rows={1} 
                              ref={(el) => {
                                if (el) {
                                  el.style.height = 'auto';
                                  el.style.height = `${el.scrollHeight}px`;
                                }
                              }}
                              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg pl-3 pr-14 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all resize-none overflow-hidden" 
                            />
                            <span className={`absolute right-3 bottom-2.5 text-[9px] font-mono font-bold select-none ${
                              tooltipLen > 120 ? 'text-red-400' : 'text-slate-500'
                            }`}>
                              {tooltipLen}/120
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Section>
          </div>
        )}

        {/* HITOS TAB */}
        {activeEditorTab === 'hitos' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h2 className="text-xl font-display font-black text-white">
                Finanzas & Cronograma (P3 / P7)
              </h2>
              {/* Presupuesto Consolidado */}
              <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Consolidado:</span>
                <input
                  type="text"
                  value={totalValue}
                  onChange={(e) => setTotalValue(e.target.value)}
                  placeholder="USD 2.200"
                  className="bg-transparent text-primary text-sm font-black w-24 focus:outline-none text-right font-mono"
                />
              </div>
            </div>

            <Section title="Introducción de Cronograma">
              <div className="p-4 rounded-xl bg-[#090d16] border border-white/5 shadow-lg space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Párrafo Principal de Fases & Entregas</label>
                  <textarea
                    value={methodology?.phases_intro ?? DEFAULT_METHODOLOGY.phases_intro}
                    onChange={(e) => updateMethodologyField('phases_intro', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[60px]"
                    placeholder="El plan de esfuerzo comprende un periodo de 4 meses..."
                  />
                </div>
              </div>
            </Section>

            {/* CRONOGRAMA DE FASES */}
            <Section 
              title="Cronograma de Sprints / Fases" 
              onAdd={() => setMilestones([...milestones, { week_range: '', title: '', icon_name: 'Rocket', description: '', control_milestone: '', price: '' }])}
              disabledAdd={milestones.length >= 4}
            >
              <p className="text-slate-500 text-xs -mt-2 mb-4">Mapea las fases semanales que se muestran en el documento y el video (máx 4).</p>
              <div className="space-y-4">
                {milestones.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                    No hay fases agregadas. Haz clic en "Agregar" para empezar.
                  </div>
                ) : (
                  milestones.map((item, i) => {
                    const titleLen = item.title?.length || 0;
                    const descLen = item.description?.length || 0;
                    const controlLen = item.control_milestone?.length || 0;
                    const priceLen = item.price?.length || 0;

                    return (
                      <div key={i} className="flex gap-4 items-start p-4 rounded-xl bg-[#090d16] border border-white/5 shadow-lg relative">
                        {/* Index & Drag handle on the left */}
                        <div className="flex flex-col items-center gap-1.5 mt-2.5 shrink-0 select-none">
                          <GripVertical size={14} className="text-slate-700" />
                          <span className="text-xs text-slate-600 font-bold font-mono">#{i + 1}</span>
                        </div>

                        {/* Input fields container */}
                        <div className="flex-grow space-y-3">
                          {/* Row 1: IconPicker + Title + Week Range + Trash Button */}
                          <div className="flex items-center gap-2">
                            <div className="shrink-0">
                              <IconPicker 
                                value={item.icon_name || 'Rocket'} 
                                onChange={(name) => updateItem(milestones, setMilestones, i, 'icon_name', name)} 
                              />
                            </div>

                            <div className="flex-grow min-w-0 relative">
                              <input 
                                type="text" 
                                value={item.title || ''} 
                                onChange={(e) => updateItem(milestones, setMilestones, i, 'title', e.target.value)} 
                                placeholder="Título de la Fase (ej: CORE SETUP, ONBOARDING & DNI)" 
                                className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg pl-3 pr-14 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all" 
                              />
                              <span className={`absolute right-3 top-2.5 text-[9px] font-mono font-bold select-none ${
                                titleLen > 40 ? 'text-red-400' : 'text-slate-500'
                              }`}>
                                {titleLen}/40
                              </span>
                            </div>



                            <button 
                              onClick={() => removeItem(milestones, setMilestones, i)} 
                              className="text-slate-600 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                              title="Eliminar fase"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>

                          {/* Row 2: Description Textarea */}
                          <div className="relative">
                            <textarea 
                              value={item.description || ''} 
                              onChange={(e) => updateItem(milestones, setMilestones, i, 'description', e.target.value)} 
                              placeholder="Descripción detallada de los entregables y alcance de esta fase..." 
                              rows={1}
                              ref={(el) => {
                                if (el) {
                                  el.style.height = 'auto';
                                  el.style.height = `${el.scrollHeight}px`;
                                }
                              }}
                              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg pl-3 pr-14 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all resize-none overflow-hidden" 
                            />
                            <span className={`absolute right-3 top-2.5 text-[9px] font-mono font-bold select-none ${
                              descLen > 240 ? 'text-red-400' : 'text-slate-500'
                            }`}>
                              {descLen}/240
                            </span>
                          </div>

                          {/* Row 3: Control Milestone + Price */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                              <input 
                                type="text" 
                                value={item.control_milestone || ''} 
                                onChange={(e) => updateItem(milestones, setMilestones, i, 'control_milestone', e.target.value)} 
                                placeholder="Hito Control (ej: ONBOARDING COMPLETO)" 
                                className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg pl-3 pr-14 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all" 
                              />
                              <span className={`absolute right-3 top-2.5 text-[9px] font-mono font-bold select-none ${
                                controlLen > 40 ? 'text-red-400' : 'text-slate-500'
                              }`}>
                                {controlLen}/40
                              </span>
                            </div>

                            <div className="relative">
                              <input 
                                type="text" 
                                value={item.price || ''} 
                                onChange={(e) => updateItem(milestones, setMilestones, i, 'price', e.target.value)} 
                                placeholder="Precio/Costo de Fase (ej: 550)" 
                                className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg pl-3 pr-14 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all" 
                              />
                              <span className={`absolute right-3 top-2.5 text-[9px] font-mono font-bold select-none ${
                                priceLen > 10 ? 'text-red-400' : 'text-slate-500'
                              }`}>
                                {priceLen}/10
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Section>

            {/* COSTOS DE INFRAESTRUCTURA */}
            <Section
              title="Costos de Infraestructura Asociados"
              onAdd={() => setInfrastructureCosts([...infrastructureCosts, { title: '', provider: '', monthly_cost: 'USD 0', description: '', is_optional: false }])}
            >
              <p className="text-slate-500 text-xs -mt-2 mb-4">Costos mensuales proyectados de servicios de terceros para el cliente.</p>
              <div className="space-y-3">
                {infrastructureCosts.map((item, i) => (
                  <div key={i} className="flex gap-4 items-start p-4 rounded-xl bg-[#090d16] border border-white/5 hover:border-white/10 transition-colors relative">
                    {/* Left side: Grip & Index */}
                    <div className="flex flex-col items-center gap-1.5 mt-2.5 shrink-0 select-none">
                      <GripVertical size={14} className="text-slate-700 cursor-grab" />
                      <span className="text-xs text-slate-600 font-bold font-mono">#{i + 1}</span>
                    </div>

                    {/* Form Fields */}
                    <div className="flex-grow space-y-3.5">
                      {/* Row 1: Provider & Service */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Proveedor</label>
                          <input 
                            type="text" 
                            value={item.provider || ''} 
                            onChange={(e) => updateItem(infrastructureCosts, setInfrastructureCosts, i, 'provider', e.target.value)} 
                            placeholder="ej: Supabase" 
                            className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Servicio / Concepto</label>
                          <input 
                            type="text" 
                            value={item.title || ''} 
                            onChange={(e) => updateItem(infrastructureCosts, setInfrastructureCosts, i, 'title', e.target.value)} 
                            placeholder="ej: Base de datos" 
                            className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all" 
                          />
                        </div>
                      </div>

                      {/* Row 2: Cost & Optional flag */}
                      <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Costo Mensual</label>
                          <input 
                            type="text" 
                            value={item.monthly_cost || ''} 
                            onChange={(e) => updateItem(infrastructureCosts, setInfrastructureCosts, i, 'monthly_cost', e.target.value)} 
                            placeholder="ej: USD 25/mes" 
                            className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-mono transition-all" 
                          />
                        </div>
                        
                        <label className="flex items-center gap-2 cursor-pointer select-none shrink-0 bg-white/5 border border-white/10 hover:border-white/20 px-3 py-2 rounded-lg transition-all h-[38px] mb-[1px]">
                          <input
                            type="checkbox"
                            checked={item.is_optional || false}
                            onChange={(e) => updateItem(infrastructureCosts, setInfrastructureCosts, i, 'is_optional', e.target.checked)}
                            className="accent-primary w-4 h-4 rounded cursor-pointer"
                          />
                          <span className="text-[10px] text-slate-300 font-black uppercase tracking-wider">Opcional</span>
                        </label>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button 
                      onClick={() => removeItem(infrastructureCosts, setInfrastructureCosts, i)} 
                      className="text-slate-600 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-all shrink-0 mt-2"
                      title="Eliminar costo"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </Section>

            {/* ESQUEMA DE PAGOS */}
            <Section 
              title="Esquema de Pagos / Hitos de Financiamiento" 
              onAdd={() => setPayments([...payments, { percentage: '', label: '', description: '', tooltip: '' }])}
            >
              <p className="text-slate-500 text-xs -mt-2 mb-4">Etapas de desembolso para el proyecto, visible en la firma e interactiva.</p>
              <div className="space-y-4">
                {payments.map((item, i) => (
                  <div key={i} className="flex gap-4 items-start p-4 rounded-xl bg-[#090d16] border border-white/5 hover:border-white/10 transition-colors relative">
                    {/* Left side: Grip & Index */}
                    <div className="flex flex-col items-center gap-1.5 mt-2.5 shrink-0 select-none">
                      <GripVertical size={14} className="text-slate-700 cursor-grab" />
                      <span className="text-xs text-slate-600 font-bold font-mono">#{i + 1}</span>
                    </div>

                    {/* Form Fields */}
                    <div className="flex-grow space-y-3.5">
                      {/* Row 1: Percentage, Hito Title, Condition */}
                      <div className="grid grid-cols-1 md:grid-cols-[100px_1fr_1fr] gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Porcentaje</label>
                          <input 
                            type="text" 
                            value={item.percentage || ''} 
                            onChange={(e) => updateItem(payments, setPayments, i, 'percentage', e.target.value)} 
                            placeholder="ej: 25%" 
                            className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-semibold font-mono transition-all" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Etiqueta de Hito</label>
                          <input 
                            type="text" 
                            value={item.label || ''} 
                            onChange={(e) => updateItem(payments, setPayments, i, 'label', e.target.value)} 
                            placeholder="ej: Kick-off / Anticipo" 
                            className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all" 
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Condición / Descripción</label>
                          <input 
                            type="text" 
                            value={item.description || ''} 
                            onChange={(e) => updateItem(payments, setPayments, i, 'description', e.target.value)} 
                            placeholder="ej: Inicio de Fase" 
                            className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all" 
                          />
                        </div>
                      </div>

                      {/* Row 2: Detail Tooltip (auto-expanding textarea) */}
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Detalle Técnico (Tooltip)</label>
                        <textarea 
                          value={item.tooltip || ''} 
                          onChange={(e) => updateItem(payments, setPayments, i, 'tooltip', e.target.value)} 
                          placeholder="Información técnica detallada de este hito de pago..." 
                          rows={1}
                          ref={(el) => {
                            if (el) {
                              el.style.height = 'auto';
                              el.style.height = `${el.scrollHeight}px`;
                            }
                          }}
                          className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all resize-none overflow-hidden" 
                        />
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button 
                      onClick={() => removeItem(payments, setPayments, i)} 
                      className="text-slate-600 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg transition-all shrink-0 mt-1"
                      title="Eliminar hito de pago"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* SEM 1-6 TAB */}
        {activeEditorTab === 'sem1-6' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-display font-black text-white uppercase tracking-wider">
                Desglose Semanas 1-8 (Mes 1 y 2)
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                Configuración de tareas, hitos intermedios y estimación de horas para el primer bloque del proyecto.
              </p>
            </div>

            <Section title="Introducción de Desglose Semanas 1-8">
              <div className="p-4 rounded-xl bg-[#090d16] border border-white/5 shadow-lg space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Párrafo Principal de Desglose (Semanas 1-8)</label>
                  <textarea
                    value={methodology?.weekly_breakdown_intro_1_8 ?? DEFAULT_METHODOLOGY.weekly_breakdown_intro_1_8}
                    onChange={(e) => updateMethodologyField('weekly_breakdown_intro_1_8', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[60px]"
                    placeholder="Desglose técnico del esfuerzo de desarrollo correspondiente a las primeras 80 horas..."
                  />
                </div>
              </div>
            </Section>

            <div className="space-y-4">
              {(weeklyBreakdown && weeklyBreakdown.length >= 10 ? weeklyBreakdown.slice(0, 10) : DEFAULT_WEEKLY_BREAKDOWN.slice(0, 10)).map((item: any, localIndex: number) => {
                const globalIndex = localIndex;
                const isMilestone = item.type === 'milestone';
                return (
                  <div 
                    key={item.id} 
                    className={`p-4 rounded-xl border transition-all ${
                      isMilestone 
                        ? 'bg-primary/5 border-primary/20 hover:border-primary/30' 
                        : 'bg-[#090d16] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex gap-4 items-start">
                      {/* Left: Indicator Badge */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0 select-none">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black font-mono tracking-wider ${
                          isMilestone ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white'
                        }`}>
                          {item.id}
                        </span>
                      </div>

                      {/* Right: Inputs */}
                      <div className="flex-grow space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
                          {/* Title */}
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
                              {isMilestone ? 'Título del Hito (Subtotal)' : 'Título de la Semana / Tarea'}
                            </label>
                            <input 
                              type="text" 
                              value={item.title || ''} 
                              onChange={(e) => {
                                const newBreakdown = [...weeklyBreakdown];
                                newBreakdown[globalIndex] = { ...newBreakdown[globalIndex], title: e.target.value };
                                setWeeklyBreakdown(newBreakdown);
                              }} 
                              placeholder={isMilestone ? 'Ej: SUBTOTAL HITO' : 'Ej: Setup Core'} 
                              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-semibold transition-all" 
                            />
                          </div>

                          {/* Hours */}
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Horas Est.</label>
                            <input 
                              type="text" 
                              value={item.hours || ''} 
                              onChange={(e) => {
                                const newBreakdown = [...weeklyBreakdown];
                                newBreakdown[globalIndex] = { ...newBreakdown[globalIndex], hours: e.target.value };
                                setWeeklyBreakdown(newBreakdown);
                              }} 
                              placeholder="10.0" 
                              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-mono text-center transition-all" 
                            />
                          </div>
                        </div>

                        {/* Detail text - only for week type */}
                        {!isMilestone && (
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Detalle de Entregable</label>
                            <textarea 
                              value={item.detail || ''} 
                              onChange={(e) => {
                                const newBreakdown = [...weeklyBreakdown];
                                newBreakdown[globalIndex] = { ...newBreakdown[globalIndex], detail: e.target.value };
                                setWeeklyBreakdown(newBreakdown);
                              }} 
                              placeholder="Escribe el alcance y entregable detallado para esta semana..." 
                              rows={1}
                              ref={(el) => {
                                if (el) {
                                  el.style.height = 'auto';
                                  el.style.height = `${el.scrollHeight}px`;
                                }
                              }}
                              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all resize-none overflow-hidden" 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SEM 9-16 TAB */}
        {activeEditorTab === 'sem9-16' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-display font-black text-white uppercase tracking-wider">
                Desglose Semanas 9-16 (Mes 3 y 4)
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                Configuración de tareas, hitos intermedios y estimación de horas para el segundo bloque del proyecto.
              </p>
            </div>

            <Section title="Introducción de Desglose Semanas 9-16">
              <div className="p-4 rounded-xl bg-[#090d16] border border-white/5 shadow-lg space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Párrafo Principal de Desglose (Semanas 9-16)</label>
                  <textarea
                    value={methodology?.weekly_breakdown_intro_9_16 ?? DEFAULT_METHODOLOGY.weekly_breakdown_intro_9_16}
                    onChange={(e) => updateMethodologyField('weekly_breakdown_intro_9_16', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[60px]"
                    placeholder="Desglose técnico de programación correspondiente a las últimas 80 horas..."
                  />
                </div>
              </div>
            </Section>

            <div className="space-y-4">
              {(weeklyBreakdown && weeklyBreakdown.length >= 20 ? weeklyBreakdown.slice(10, 20) : DEFAULT_WEEKLY_BREAKDOWN.slice(10, 20)).map((item: any, localIndex: number) => {
                const globalIndex = 10 + localIndex;
                const isMilestone = item.type === 'milestone';
                return (
                  <div 
                    key={item.id} 
                    className={`p-4 rounded-xl border transition-all ${
                      isMilestone 
                        ? 'bg-primary/5 border-primary/20 hover:border-primary/30' 
                        : 'bg-[#090d16] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex gap-4 items-start">
                      {/* Left: Indicator Badge */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0 select-none">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-black font-mono tracking-wider ${
                          isMilestone ? 'bg-primary/20 text-primary' : 'bg-white/10 text-white'
                        }`}>
                          {item.id}
                        </span>
                      </div>

                      {/* Right: Inputs */}
                      <div className="flex-grow space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3">
                          {/* Title */}
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
                              {isMilestone ? 'Título del Hito (Subtotal)' : 'Título de la Semana / Tarea'}
                            </label>
                            <input 
                              type="text" 
                              value={item.title || ''} 
                              onChange={(e) => {
                                const newBreakdown = [...weeklyBreakdown];
                                newBreakdown[globalIndex] = { ...newBreakdown[globalIndex], title: e.target.value };
                                setWeeklyBreakdown(newBreakdown);
                              }} 
                              placeholder={isMilestone ? 'Ej: SUBTOTAL HITO' : 'Ej: Setup Core'} 
                              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-semibold transition-all" 
                            />
                          </div>

                          {/* Hours */}
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Horas Est.</label>
                            <input 
                              type="text" 
                              value={item.hours || ''} 
                              onChange={(e) => {
                                const newBreakdown = [...weeklyBreakdown];
                                newBreakdown[globalIndex] = { ...newBreakdown[globalIndex], hours: e.target.value };
                                setWeeklyBreakdown(newBreakdown);
                              }} 
                              placeholder="10.0" 
                              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-mono text-center transition-all" 
                            />
                          </div>
                        </div>

                        {/* Detail text - only for week type */}
                        {!isMilestone && (
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Detalle de Entregable</label>
                            <textarea 
                              value={item.detail || ''} 
                              onChange={(e) => {
                                const newBreakdown = [...weeklyBreakdown];
                                newBreakdown[globalIndex] = { ...newBreakdown[globalIndex], detail: e.target.value };
                                setWeeklyBreakdown(newBreakdown);
                              }} 
                              placeholder="Escribe el alcance y entregable detallado para esta semana..." 
                              rows={1}
                              ref={(el) => {
                                if (el) {
                                  el.style.height = 'auto';
                                  el.style.height = `${el.scrollHeight}px`;
                                }
                              }}
                              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all resize-none overflow-hidden" 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* METODOLOGIA TAB */}
        {activeEditorTab === 'metodologia' && (
          <div className="space-y-6">
            <Section title="Introducción de Metodología">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Texto Introductorio / Párrafo Principal</label>
                <textarea
                  value={methodology?.intro_text ?? DEFAULT_METHODOLOGY.intro_text}
                  onChange={(e) => updateMethodologyField('intro_text', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[60px]"
                  placeholder="Implementamos un proceso de desarrollo iterativo para asegurar lanzamientos predecibles..."
                />
              </div>
            </Section>

            <Section title="Pilares de Metodología">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Pilar 1 (Morado)
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Título</label>
                    <input
                      type="text"
                      value={methodology?.incremental_title ?? DEFAULT_METHODOLOGY.incremental_title}
                      onChange={(e) => updateMethodologyField('incremental_title', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Descripción</label>
                    <textarea
                      value={methodology?.incremental_text ?? DEFAULT_METHODOLOGY.incremental_text}
                      onChange={(e) => updateMethodologyField('incremental_text', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[60px]"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-wider">
                    <div className="w-1.5 h-1.5 rounded-full bg-secondary" />
                    Pilar 2 (Rosa)
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Título</label>
                    <input
                      type="text"
                      value={methodology?.planning_title ?? DEFAULT_METHODOLOGY.planning_title}
                      onChange={(e) => updateMethodologyField('planning_title', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Descripción</label>
                    <textarea
                      value={methodology?.planning_text ?? DEFAULT_METHODOLOGY.planning_text}
                      onChange={(e) => updateMethodologyField('planning_text', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[60px]"
                    />
                    <span className="text-[9px] text-slate-500 block mt-1">Usa <code>{"{client_name}"}</code> para insertar el nombre del cliente automáticamente.</span>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Agenda Semanal (Lun - Vie)">
              <div className="space-y-4">
                {/* Lunes */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="text-white font-bold text-xs uppercase tracking-wider">Día 1</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Día</label>
                      <input
                        type="text"
                        value={methodology?.schedule_monday_title ?? DEFAULT_METHODOLOGY.schedule_monday_title}
                        onChange={(e) => updateMethodologyField('schedule_monday_title', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Actividad</label>
                      <input
                        type="text"
                        value={methodology?.schedule_monday_subtitle ?? DEFAULT_METHODOLOGY.schedule_monday_subtitle}
                        onChange={(e) => updateMethodologyField('schedule_monday_subtitle', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Descripción</label>
                    <textarea
                      value={methodology?.schedule_monday_text ?? DEFAULT_METHODOLOGY.schedule_monday_text}
                      onChange={(e) => updateMethodologyField('schedule_monday_text', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[50px]"
                    />
                  </div>
                </div>

                {/* Martes - Jueves */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="text-white font-bold text-xs uppercase tracking-wider">Días Intermedios</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Día</label>
                      <input
                        type="text"
                        value={methodology?.schedule_tuesday_title ?? DEFAULT_METHODOLOGY.schedule_tuesday_title}
                        onChange={(e) => updateMethodologyField('schedule_tuesday_title', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Actividad</label>
                      <input
                        type="text"
                        value={methodology?.schedule_tuesday_subtitle ?? DEFAULT_METHODOLOGY.schedule_tuesday_subtitle}
                        onChange={(e) => updateMethodologyField('schedule_tuesday_subtitle', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Descripción</label>
                    <textarea
                      value={methodology?.schedule_tuesday_text ?? DEFAULT_METHODOLOGY.schedule_tuesday_text}
                      onChange={(e) => updateMethodologyField('schedule_tuesday_text', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[50px]"
                    />
                  </div>
                </div>

                {/* Viernes */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="text-white font-bold text-xs uppercase tracking-wider">Último Día</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Día</label>
                      <input
                        type="text"
                        value={methodology?.schedule_friday_title ?? DEFAULT_METHODOLOGY.schedule_friday_title}
                        onChange={(e) => updateMethodologyField('schedule_friday_title', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Actividad</label>
                      <input
                        type="text"
                        value={methodology?.schedule_friday_subtitle ?? DEFAULT_METHODOLOGY.schedule_friday_subtitle}
                        onChange={(e) => updateMethodologyField('schedule_friday_subtitle', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Descripción</label>
                    <textarea
                      value={methodology?.schedule_friday_text ?? DEFAULT_METHODOLOGY.schedule_friday_text}
                      onChange={(e) => updateMethodologyField('schedule_friday_text', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[50px]"
                    />
                  </div>
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* LEGAL TAB */}
        {activeEditorTab === 'legal' && (
          <Section title="Plantilla de Contrato Dinámico">
            <div className="flex flex-col gap-2 mb-6">
              <label className="text-slate-300 text-xs font-bold uppercase tracking-wider">Texto Descriptivo / Introducción</label>
              <textarea
                value={contractDescription}
                onChange={(e) => setContractDescription(e.target.value)}
                placeholder="Acuerdo formal que establece las bases y condiciones legales para la ejecución del proyecto..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 min-h-[80px] text-sm leading-relaxed"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-slate-300 text-xs font-bold uppercase tracking-wider">Cuerpo del Contrato</label>
              <p className="text-slate-400 text-xs mb-2">
                Puede usar variables como <code>{'{client_name}'}</code>, <code>{'{date}'}</code>, <code>{'{location}'}</code> y definir campos interactivos usando <code>{'[input:Etiqueta del Campo]'}</code>.
              </p>
              <textarea
                value={contractText}
                onChange={(e) => setContractText(e.target.value)}
                placeholder={`Si se deja vacío, se utilizará la plantilla genérica por defecto:\nEn la localidad de {location}, a los {date}... [input:Nombre]...`}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 min-h-[300px] font-mono text-sm leading-relaxed"
              />
            </div>
          </Section>
        )}

        {/* VIDEO TAB - Left panel info */}
        {activeEditorTab === 'video' && (
          <div className="space-y-4">
            <div className="glass rounded-2xl p-5 border border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <Film size={16} className="text-primary" />
                <h3 className="text-xs font-display font-black text-white uppercase tracking-widest">Previsualización del Video Comercial</h3>
              </div>
              <p className="text-emerald-400/80 text-xs leading-relaxed">
                Esta pestaña te permite previsualizar la presentación de video animada de la propuesta que creaste en tiempo real.
              </p>
            </div>
            <div className="glass rounded-2xl p-5 text-slate-400 text-xs leading-relaxed space-y-3">
              <p>El video utiliza los mismos datos ingresados en las pestañas anteriores: el nombre del cliente, las características de branding (colores de la propuesta), el alcance con sus entregables y el plan de pagos estructurado.</p>
              <p>Cualquier cambio que realices en el alcance o en los hitos financieros se reflejará de forma automática e inmediata en la previsualización del video.</p>
            </div>
            <div className="glass rounded-2xl p-5 border border-white/5">
              <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Consejos para la presentación:</h4>
              <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                <li>Usa títulos cortos en los entregables para que se visualicen correctamente en las tarjetas.</li>
                <li>Asegúrate de que los colores primarios y secundarios tengan buen contraste para los gradientes de fondo.</li>
                <li>El video tiene una duración óptima de 21 segundos dividida en 5 secciones automáticas.</li>
              </ul>
            </div>
          </div>
        )}

          </div>{/* end Left Panel */}

          {/* Right Panel: Sticky Live Previews */}
          <div className="space-y-4 lg:sticky lg:top-[90px] h-[calc(100vh-140px)] flex flex-col">
            {activeEditorTab === 'video' ? (
              <div className="glass rounded-2xl p-4 border border-white/5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Presentación Dinámica (Video Remotion)</span>
                </div>
                <p className="text-[10px] text-slate-600 mb-4">Previsualización animada 16:9 en tiempo real.</p>
                <div className="flex-1 flex items-center justify-center bg-black/20 rounded-xl p-4 overflow-hidden">
                  <ProposalVideoPlayer
                    clientName={clientName}
                    brandPrimary={brandPrimary}
                    brandSecondary={brandSecondary}
                    heroTitle={heroTitle || clientName}
                    inclusions={inclusions as any[]}
                    exclusions={exclusions as any[]}
                    milestones={milestones as any[]}
                    payments={payments as any[]}
                    totalValue={parseFloat(totalValue.replace(/[^0-9.]/g, '')) || 0}
                    clientLogoUrl={clientLogoUrl}
                    currency={getCurrencyFromTotal(totalValue)}
                  />
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-4 border border-white/5 flex-1 flex flex-col overflow-hidden">
                {/* Document Header & Zoom Controls */}
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      Vista Previa del Documento (Pág. {getPageNumber(activeEditorTab)} / 7)
                    </span>
                    <p className="text-[10px] text-slate-600">Representación en tiempo real del PDF final.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
                    <button
                      onClick={() => setZoom(Math.max(0.3, zoom - 0.1))}
                      className="p-1.5 text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded"
                      title="Alejar"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span className="text-[10px] font-mono font-bold text-slate-300 w-12 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
                      className="p-1.5 text-slate-400 hover:text-white transition-colors hover:bg-white/5 rounded"
                      title="Acercar"
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>
                </div>

                {/* Page Preview Container */}
                <div data-lenis-prevent className="flex-1 overflow-auto min-h-0 min-w-0 bg-slate-950/40 border border-white/5 rounded-xl p-4 scrollbar-thin scrollbar-thumb-white/10">
                  <div
                    style={{
                      width: `${794 * zoom}px`,
                      height: `${1123 * zoom}px`,
                      position: 'relative',
                      overflow: 'hidden',
                      margin: '0 auto'
                    }}
                    className="shadow-2xl rounded bg-white"
                  >
                    <div
                      style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                        width: '794px',
                        height: '1123px',
                        position: 'absolute',
                        top: 0,
                        left: 0
                      }}
                    >
                      {renderPreviewPage(activeEditorTab)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>{/* end grid */}
      </main>

      {/* Print Template (Hidden from screen but processed by html2canvas) */}
      <div
        id="full-proposal-print-template-editor"
        className="absolute left-[-9999px] top-[-9999px] overflow-hidden"
        style={{ width: '794px', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#ffffff' }}
      >
        {/* PÁGINA 1: Portada */}
        <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '0', left: '0', right: '0', height: '8px', background: `linear-gradient(to right, ${brandPrimary}, ${brandSecondary})` }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGrow: 1, gap: '65px', marginTop: '20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
              <img src={creappLogoOfficial} alt="CreAPP Logo" style={{ height: '105px', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: brandPrimary, letterSpacing: '3px', textTransform: 'uppercase' }}>
                {heroBadge || 'Propuesta Técnica Comercial'}
              </span>
              <h1 style={{ fontSize: '42px', fontWeight: '950', color: '#0f172a', margin: '15px 0 10px 0', lineHeight: '1.1', letterSpacing: '-1px', textAlign: 'center' }}>
                {heroTitle || 'Desarrollo de Software Integrado'}
              </h1>
              <div style={{ height: '2px', width: '80px', backgroundColor: `${brandPrimary}44`, margin: '20px auto' }}></div>
              <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', maxWidth: '560px', fontWeight: '300', textAlign: 'center' }}>
                {description}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '60px', justifyContent: 'center', width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Preparado para</p>
                <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{clientName}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Fecha</p>
                <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{date}</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Ubicación</p>
                <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{location}</p>
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '25px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>CreAPP Software & Automation</span>
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Dossier Oficial de Propuesta</span>
          </div>
        </div>

        {/* PÁGINA 2: Alcance y Entregables */}
        <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
          {(() => {
            const totalVisibleInclusions = inclusions.slice(0, 6).length;
            const totalVisibleExclusions = exclusions.slice(0, 6).length;
            const totalItemsPage2 = totalVisibleInclusions + totalVisibleExclusions;

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
                    <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{heroTitle ? heroTitle.toUpperCase() : 'CBKR APP V2'}</span>
                  </div>
                  <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>PROJECT_SCOPE // 02</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: p2MainGap }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h1 style={{ fontSize: p2TitleSize, fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
                      Alcance & <span style={{ fontStyle: 'italic', color: brandPrimary }}>Entregables</span>
                    </h1>
                    <p style={{ fontSize: p2SubTitleSize, color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
                      {(methodology || DEFAULT_METHODOLOGY).scope_intro || DEFAULT_METHODOLOGY.scope_intro}
                    </p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: p2Gap, width: '100%' }}>
                    {inclusions.slice(0, 6).map((inc, index) => {
                      const totalVisible = inclusions.slice(0, 6).length;
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
                  {exclusions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: p2MainGap === '8px' ? '4px' : '10px', marginTop: p2TitleMarginTop }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h1 style={{ fontSize: p2TitleSize, fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
                          Fuera de <span style={{ fontStyle: 'italic', color: '#e11d48' }}>Alcance</span>
                        </h1>
                        <p style={{ fontSize: p2SubTitleSize, color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
                          {(methodology || DEFAULT_METHODOLOGY).exclusions_intro || DEFAULT_METHODOLOGY.exclusions_intro}
                        </p>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: p2Gap, width: '100%' }}>
                        {exclusions.slice(0, 6).map((exc, index) => {
                          const totalVisible = exclusions.slice(0, 6).length;
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
                <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
                  <span>Propuesta Comercial | {clientName}</span>
                  <span>Página 2 de 7</span>
                </div>
              </>
            );
          })()}
        </div>

        {/* PÁGINA 3: Cronograma de Fases & Entregas */}
        <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
              <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{heroTitle ? heroTitle.toUpperCase() : 'CBKR APP V2'}</span>
            </div>
            <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>PROJECT_ROADMAP // 02</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '20px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
              CRONOGRAMA DE FASES & <span style={{ fontStyle: 'italic', color: brandPrimary }}>ENTREGAS</span>
            </h1>
            <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
              {(() => {
                const meth = methodology || DEFAULT_METHODOLOGY;
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {milestones && milestones.map((m, i) => (
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
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b' }}>{getCurrencyFromTotal(totalValue)}</span>
                  </div>
                </div>
              ))}
            </div>
            {infrastructureCosts && infrastructureCosts.length > 0 && (
              <div style={{ marginTop: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Costos de Infraestructura Asociados</span>
                  <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {infrastructureCosts.map((infra, idx) => (
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

            {payments && payments.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Esquema de Pagos / Hitos de Financiamiento</span>
                  <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
                  {payments.map((p, idx) => (
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
          <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
            <span>Presupuesto Consolidado: <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{totalValue.toUpperCase().includes('ARS') || totalValue.toUpperCase().includes('USD') ? totalValue : `${getCurrencyFromTotal(totalValue)} ${totalValue}`} TOTAL</span></span>
            <span>Página 3 de 7</span>
          </div>
        </div>

        {/* PÁGINA 4: Desglose de Horas — Semanas 1 a 8 */}
        <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
              <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{heroTitle ? heroTitle.toUpperCase() : 'CBKR APP V2'}</span>
            </div>
            <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>TIME_ESTIMATION // MES 1 Y 2</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '15px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
              DESGLOSE DE HORAS — <span style={{ fontStyle: 'italic', color: brandPrimary }}>SEMANAS 1 A 8</span>
            </h1>
            <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
              {(methodology || DEFAULT_METHODOLOGY).weekly_breakdown_intro_1_8 || DEFAULT_METHODOLOGY.weekly_breakdown_intro_1_8}
            </p>
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
                {(weeklyBreakdown && weeklyBreakdown.length >= 10 ? weeklyBreakdown.slice(0, 10) : DEFAULT_WEEKLY_BREAKDOWN.slice(0, 10)).map((item: any) => {
                  if (item.type === 'milestone') {
                    return (
                      <tr key={item.id} style={{ backgroundColor: '#f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a' }}>{item.id}</td>
                        <td colSpan={2} style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>{item.title}</td>
                        <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '900', color: '#0f172a', textAlign: 'right' }}>{item.hours} hs</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>{item.id}</td>
                      <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>{item.title}</td>
                      <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>{item.detail}</td>
                      <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>{item.hours} hs</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
            <span>CREAPP // ACCUMULATED_HOURS_80</span>
            <span>Página 4 de 7</span>
          </div>
        </div>

        {/* PÁGINA 5: Desglose de Horas — Semanas 9 a 16 */}
        <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
              <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{heroTitle ? heroTitle.toUpperCase() : 'CBKR APP V2'}</span>
            </div>
            <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>TIME_ESTIMATION // MES 3 Y 4</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '15px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
              DESGLOSE DE HORAS — <span style={{ fontStyle: 'italic', color: brandPrimary }}>SEMANAS 9 A 16</span>
            </h1>
            <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
              {(methodology || DEFAULT_METHODOLOGY).weekly_breakdown_intro_9_16 || DEFAULT_METHODOLOGY.weekly_breakdown_intro_9_16}
            </p>
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
                {(weeklyBreakdown && weeklyBreakdown.length >= 20 ? weeklyBreakdown.slice(10, 20) : DEFAULT_WEEKLY_BREAKDOWN.slice(10, 20)).map((item: any) => {
                  if (item.type === 'milestone') {
                    return (
                      <tr key={item.id} style={{ backgroundColor: '#f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a' }}>{item.id}</td>
                        <td colSpan={2} style={{ padding: '10px 12px', fontSize: '9px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>{item.title}</td>
                        <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '900', color: '#0f172a', textAlign: 'right' }}>{item.hours} hs</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>{item.id}</td>
                      <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: '800', color: '#0f172a' }}>{item.title}</td>
                      <td style={{ padding: '10px 12px', fontSize: '10px', color: '#475569', lineHeight: '1.4', fontWeight: '300' }}>{item.detail}</td>
                      <td style={{ padding: '10px 12px', fontSize: '10px', fontWeight: 'bold', color: brandSecondary, textAlign: 'right' }}>{item.hours} hs</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
            <span>CREAPP // ESTIMATED_HOURS_160_TOTAL</span>
            <span>Página 5 de 7</span>
          </div>
        </div>

        {/* PÁGINA 6: Metodología de Trabajo & Plan de Acción */}
        {(() => {
          const meth = methodology || DEFAULT_METHODOLOGY;
          const clientNameReplacer = (text: string) => (text || '').replace('{client_name}', clientName || 'el cliente');
          return (
            <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
                  <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{heroTitle ? heroTitle.toUpperCase() : 'CBKR APP V2'}</span>
                </div>
                <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>AGILE_METHODOLOGY // 04</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '20px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
                  METODOLOGÍA DE TRABAJO & <span style={{ fontStyle: 'italic', color: brandPrimary }}>PLAN DE ACCIÓN</span>
                </h1>
                <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
                  {meth.intro_text || DEFAULT_METHODOLOGY.intro_text}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '5px' }}>
                  <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#faf5ff', border: '1px solid #f3e8ff' }}>
                    <h4 style={{ fontSize: '10px', fontWeight: '900', color: brandPrimary, margin: '0 0 6px 0', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                      {meth.incremental_title || DEFAULT_METHODOLOGY.incremental_title}
                    </h4>
                    <p style={{ fontSize: '11px', color: '#581c87', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                      {clientNameReplacer(meth.incremental_text || DEFAULT_METHODOLOGY.incremental_text)}
                    </p>
                  </div>
                  <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#fdf2f8', border: '1px solid #fce7f3' }}>
                    <h4 style={{ fontSize: '10px', fontWeight: '900', color: brandSecondary, margin: '0 0 6px 0', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                      {meth.planning_title || DEFAULT_METHODOLOGY.planning_title}
                    </h4>
                    <p style={{ fontSize: '11px', color: '#9d174d', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                      {clientNameReplacer(meth.planning_text || DEFAULT_METHODOLOGY.planning_text)}
                    </p>
                  </div>
                  <div style={{ padding: '20px', borderRadius: '12px', border: '1px solid #0f172a', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <h5 style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        {meth.schedule_monday_title || DEFAULT_METHODOLOGY.schedule_monday_title}
                      </h5>
                      <h6 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
                        {meth.schedule_monday_subtitle || DEFAULT_METHODOLOGY.schedule_monday_subtitle}
                      </h6>
                      <p style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                        {clientNameReplacer(meth.schedule_monday_text || DEFAULT_METHODOLOGY.schedule_monday_text)}
                      </p>
                    </div>
                    <div style={{ height: '1px', backgroundColor: '#e2e8f0' }}></div>
                    <div>
                      <h5 style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        {meth.schedule_tuesday_title || DEFAULT_METHODOLOGY.schedule_tuesday_title}
                      </h5>
                      <h6 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
                        {meth.schedule_tuesday_subtitle || DEFAULT_METHODOLOGY.schedule_tuesday_subtitle}
                      </h6>
                      <p style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                        {clientNameReplacer(meth.schedule_tuesday_text || DEFAULT_METHODOLOGY.schedule_tuesday_text)}
                      </p>
                    </div>
                    <div style={{ height: '1px', backgroundColor: '#e2e8f0' }}></div>
                    <div>
                      <h5 style={{ fontSize: '10px', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        {meth.schedule_friday_title || DEFAULT_METHODOLOGY.schedule_friday_title}
                      </h5>
                      <h6 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0', textTransform: 'uppercase' }}>
                        {meth.schedule_friday_subtitle || DEFAULT_METHODOLOGY.schedule_friday_subtitle}
                      </h6>
                      <p style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4', margin: '0', fontWeight: '300' }}>
                        {clientNameReplacer(meth.schedule_friday_text || DEFAULT_METHODOLOGY.schedule_friday_text)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
                <span>Propuesta Comercial | {clientName}</span>
                <span>Página 6 de 7</span>
              </div>
            </div>
          );
        })()}

        {/* PÁGINA 7: Acuerdo de Servicios */}
        <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '25px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
              <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{heroTitle ? heroTitle.toUpperCase() : 'CBKR APP V2'}</span>
            </div>
            <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>LEGAL_AGREEMENT // 05</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: '20px', marginBottom: '60px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
              CONTRATO Y <span style={{ fontStyle: 'italic', color: brandPrimary }}>FIRMAS</span>
            </h1>
            <p style={{ fontSize: '11px', color: '#475569', lineHeight: '1.5', fontWeight: '300', margin: '0' }}>
              {contractDescription || 'Acuerdo formal que establece las bases y condiciones legales para la ejecución del proyecto de desarrollo de software detallado en esta propuesta.'}
            </p>
            <div style={{ fontSize: '10px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0', maxHeight: '350px', overflow: 'hidden', marginTop: '5px' }}>
              {contractText ? (
                contractText
                  .replace(/\{location\}/g, location)
                  .replace(/\{date\}/g, date)
                  .replace(/\{client_name\}/g, clientName)
                  .replace(/\{total_value\}/g, totalValue)
                  .replace(/\[input:[^\]]+\]/g, '________________________')
              ) : (
                `CONTRATO DE DESARROLLO DE SOFTWARE
 
Entre Creapp Software Lab y ${clientName}, se acuerda el desarrollo integral del sistema conforme a los alcances y términos especificados en esta propuesta comercial por un valor total de ${totalValue}.
 
Este contrato entra en vigencia a partir de la firma del presente documento el día ${date} en la localidad de ${location}.`
              )}
            </div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
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
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Por CreAPP Software Lab</p>
                <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', padding: '8px' }}>
                </div>
                <div style={{ fontSize: '10px' }}>
                  <p style={{ fontWeight: '800', color: '#0f172a' }}>Facundo Marceca</p>
                  <p style={{ color: '#64748b', fontSize: '9px' }}>Project Manager</p>
                </div>
              </div>
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Por {clientName}</p>
                <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '10px', textAlign: 'center' }}>
                  Pendiente de Firma
                </div>
                <div style={{ fontSize: '10px' }}>
                  <p style={{ fontWeight: '800', color: '#0f172a' }}>________________________</p>
                  <p style={{ color: '#64748b', fontSize: '9px' }}>Representante Autorizado</p>
                </div>
              </div>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
            <span>Propuesta Comercial | {clientName}</span>
            <span>Página 7 de 7</span>
          </div>
        </div>
      </div>

      {/* Import PDF/DOC Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900 shadow-2xl p-6 relative overflow-hidden">
            <button
              onClick={() => {
                setIsImportModalOpen(false);
                setExtractedData(null);
                setImportError(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all cursor-pointer"
            >
              ✕
            </button>

            <h3 className="text-lg font-display font-black text-white uppercase tracking-widest mb-2 flex items-center gap-2">
              <Upload size={18} className="text-secondary" /> Importar propuesta con IA
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Sube un documento PDF de requerimientos, pliego técnico o propuesta comercial en texto/markdown. Nuestro asistente inteligente Gemini analizará el contenido para rellenar los inputs del generador automáticamente.
            </p>

            <div className="flex flex-col gap-4">
              {/* File dropzone */}
              <div className="border-2 border-dashed border-white/10 hover:border-secondary/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-white/5 hover:bg-secondary/5 transition-all relative">
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileImport}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={importing}
                />
                <FileText size={40} className="text-slate-400 group-hover:text-secondary transition-all" />
                <div className="text-center">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">
                    {importing ? "Analizando documento..." : "Selecciona o arrastra un archivo"}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Formatos soportados: PDF, TXT, MD
                  </p>
                </div>
              </div>

              {/* Progress / Loading */}
              {importing && (
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/5 items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-secondary mb-2" />
                  <span className="text-xs text-slate-300 font-bold uppercase tracking-wider animate-pulse text-center">Gemini procesando y estructurando propuesta...</span>
                  <span className="text-[10px] text-slate-500">Esto puede tomar de 3 a 5 segundos</span>
                </div>
              )}

              {/* Error display */}
              {importError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed font-semibold">
                  ⚠️ Error: {importError}
                </div>
              )}

              {/* Success Preview */}
              {extractedData && (
                <div className="flex flex-col gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    ✓ Documento analizado con éxito
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-300">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 uppercase font-black block">Cliente</span>
                      <strong className="text-white">{extractedData.client_name || 'No especificado'}</strong>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 uppercase font-black block">Valor Total</span>
                      <strong className="text-white">{extractedData.total_value || 'No especificado'}</strong>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 uppercase font-black block">Entregables (Alcance)</span>
                      <span className="text-white">{(extractedData.inclusions || []).length} ítems</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-500 uppercase font-black block">Hitos</span>
                      <span className="text-white">{(extractedData.milestones || []).length} fases</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleApplyImport}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg mt-2 font-bold"
                  >
                    Aplicar Propuesta a los Inputs
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalEditor;
