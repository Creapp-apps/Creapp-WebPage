import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Eye,
  EyeOff,
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
  Sparkles,
  Minus,
  Maximize2,
  Briefcase,
  Zap,
  Server,
  RefreshCw,
  Building2,
  DollarSign,
  MapPin,
  Copy,
  Check,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  FileCheck,
  PenTool,
  Mail,
  Phone,
  UserCheck,
} from 'lucide-react';
import { ProposalVideoPlayer } from '@/components/video/ProposalVideoPlayer';
import { parseProposalNumericValue } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import {
  createProposal,
  updateProposal,
  upsertChildItems,
} from '@/lib/proposalService';
import {
  getPillars,
  type Proposal,
  type ProposalInclusion,
  type ProposalExclusion,
  type ProposalMilestone,
  type ProposalPayment,
  type ProposalProjectOption,
  type ProposalInfrastructureCost,
  type MethodologyPillar,
  type ServiceDetails,
} from '@/lib/proposalTypes';
import {
  DEFAULT_SERVICE_DETAILS,
  STACKED_CONTRACT_DESCRIPTION,
  STACKED_SERVICE_CONTRACT_TEMPLATE,
  DEVELOPMENT_CONTRACT_DESCRIPTION,
  DEVELOPMENT_CONTRACT_TEMPLATE,
  CREAPP_PRODUCTS,
  getCreappProductPreset,
  STACKED_PRESET,
  TRAZAPP_PRESET,
  DENTALIA_PRESET,
  type CreappProductId,
} from '@/lib/serviceContractTemplates';
import { generateFullProposalPDF } from '@/lib/pdfService';
import IconResolver from '@/components/ui/IconResolver';
import creappLogoOfficial from '@/assets/CREAPP LOGO VECTOR.png';
import { importProposalFromDocument, optimizeText } from '@/lib/geminiService';

export interface ClientLegalData {
  company_name?: string;
  tax_id?: string;
  legal_address?: string;
  representative_name?: string;
  representative_dni?: string;
  representative_role?: string;
  contact_email?: string;
  contact_phone?: string;
}

export const DEFAULT_CLIENT_LEGAL_DATA: ClientLegalData = {
  company_name: '',
  tax_id: '',
  legal_address: '',
  representative_name: '',
  representative_dni: '',
  representative_role: '',
  contact_email: '',
  contact_phone: '',
};

export const cleanNumberString = (val: string | number | null | undefined): string => {
  if (!val) return '';
  return String(val)
    .replace(/USD|ARS|EUR|CLP|MXN|UYU|BRL|PEN|COP/gi, '')
    .replace(/\$/g, '')
    .trim();
};

export const formatCurrencyDisplay = (val: string | number | null | undefined, currency: 'USD' | 'ARS' | string = 'ARS'): string => {
  const clean = cleanNumberString(val);
  if (!clean || clean === '0') return `$0 ${currency}`;
  return `$${clean} ${currency}`;
};

const getCurrencyFromTotal = (valString: string) => {
  const clean = (valString || '').trim().toUpperCase();
  if (clean.includes('ARS')) return 'ARS';
  if (clean.includes('USD')) return 'USD';
  if (clean.includes('EUR')) return 'EUR';
  const currencies = ['USD', 'ARS', 'EUR', 'CLP', 'MXN', 'UYU', 'BRL', 'PEN', 'COP'];
  for (const curr of currencies) {
    if (clean.includes(curr)) return curr;
  }
  const match = clean.match(/^([A-Z]{3})/);
  if (match) {
    return match[1];
  }
  return 'ARS';
};

const formatMilestonePrice = (val: string | undefined | null) => {
  if (!val) return '0';
  const trimmed = cleanNumberString(val);
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed).toLocaleString('es-AR');
  }
  return trimmed || '0';
};

const getValueFromTotal = (valString: string) => {
  return cleanNumberString(valString);
};

const formatTotalValue = (valString: string, currency?: string) => {
  const clean = cleanNumberString(valString);
  const curr = currency || getCurrencyFromTotal(valString) || 'ARS';
  return `$${clean} ${curr}`;
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
  headerRight?: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children, onAdd, addLabel = 'Agregar', disabledAdd, headerRight }) => (
  <div className="glass rounded-2xl p-6 space-y-4">
    <div className="flex flex-wrap justify-between items-center gap-3">
      <h3 className="text-sm font-display font-black text-white uppercase tracking-widest">{title}</h3>
      <div className="flex items-center gap-3">
        {headerRight}
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
  currency: 'ARS',
  legal_currency: 'ARS',
  video_currency: 'ARS',
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
  const [showToast, setShowToast] = useState(false);
  const skipNextFetchRef = useRef(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);

  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const [isVideoNoticeModalOpen, setIsVideoNoticeModalOpen] = useState(false);
  const [targetVideoRatio, setTargetVideoRatio] = useState<'16:9' | '9:16'>('16:9');

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

    if (extractedData.client_name) {
      setClientName(extractedData.client_name);
      setClientLegalData(prev => ({ ...prev, company_name: extractedData.client_name }));
    }
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
  const [clientLegalData, setClientLegalData] = useState<ClientLegalData>(DEFAULT_CLIENT_LEGAL_DATA);

  const updateClientLegalData = (field: keyof ClientLegalData, value: string) => {
    setClientLegalData((prev) => ({ ...prev, [field]: value }));
    if (field === 'company_name') {
      setClientName(value);
      if (isNew) setSlug(generateSlug(value));
    }
  };

  const [date, setDate] = useState('Marzo 2026');
  const [location, setLocation] = useState('Buenos Aires, Argentina');
  const [description, setDescription] = useState('');
  const [totalValue, setTotalValue] = useState('USD 0');
  const [brandPrimary, setBrandPrimary] = useState('#ff007f');
  const [brandSecondary, setBrandSecondary] = useState('#9d00ff');
  const [clientLogoUrl, setClientLogoUrl] = useState('');
  const [clientLogoScale, setClientLogoScale] = useState<number>(100);
  const [status, setStatus] = useState<'draft' | 'published' | 'signed'>('draft');

  const updateLogoScale = (newScale: number) => {
    const scale = Math.min(250, Math.max(30, newScale));
    setClientLogoScale(scale);
    setMethodology((prev: any) => ({
      ...(prev || DEFAULT_METHODOLOGY),
      client_logo_scale: scale,
    }));
  };

  const [videoLogoScale, setVideoLogoScale] = useState<number>(140);

  const updateVideoLogoScale = (newScale: number) => {
    const scale = Math.min(350, Math.max(40, newScale));
    setVideoLogoScale(scale);
    setMethodology((prev: any) => ({
      ...(prev || DEFAULT_METHODOLOGY),
      video_logo_scale: scale,
    }));
  };
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

  const updateMethodologyField = (key: string, value: any) => {
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

  // AI Optimization state
  const [optimizingFieldId, setOptimizingFieldId] = useState<string | null>(null);

  const handleOptimizeField = async (fieldId: string, currentText: string, setter: (newVal: string) => void) => {
    if (!currentText || !currentText.trim()) return;
    setOptimizingFieldId(fieldId);
    try {
      const result = await optimizeText(currentText, heroTitle || clientName);
      setter(result);
    } catch (err: any) {
      alert("Error al optimizar el texto con la IA: " + (err.message || err));
    } finally {
      setOptimizingFieldId(null);
    }
  };


  // Proposal Type and Service Contract state
  const [searchParams] = useSearchParams();
  const initialTypeFromUrl = searchParams.get('type') === 'service' ? 'service' : 'project';
  const initialProductFromUrl = (searchParams.get('product') as CreappProductId) || 'stacked';
  const [proposalType, setProposalType] = useState<'project' | 'service'>(initialTypeFromUrl);
  const [selectedProductId, setSelectedProductId] = useState<CreappProductId>(initialProductFromUrl);
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails>(() => {
    const p = getCreappProductPreset(initialProductFromUrl);
    return p.default_service_details;
  });

  const updateServiceDetailField = (key: keyof ServiceDetails, value: any) => {
    setServiceDetails((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'min_term_months' ? { minimum_commitment: value } : {}),
      ...(key === 'minimum_commitment' as any ? { min_term_months: value } : {}),
    }));
    if (key === 'recurring_fee') {
      setTotalValue(value);
    }
  };

  const handleUpdateTotalValue = (value: string) => {
    setTotalValue(value);
    if (proposalType === 'service') {
      setServiceDetails((prev) => ({
        ...prev,
        recurring_fee: value,
      }));
    }
  };

  // Divisa independiente para las Fases (Pág. 3 / Cronograma)
  const activeMilestoneCurrency: 'USD' | 'ARS' = (methodology?.currency as 'USD' | 'ARS') || 'ARS';

  const handleMilestoneCurrencyChange = (newCurr: 'USD' | 'ARS') => {
    setMethodology((prev: any) => ({
      ...(prev || DEFAULT_METHODOLOGY),
      currency: newCurr,
    }));
  };

  // Divisa independiente para el Contrato & Aspectos Legales (Pág. 5/7 / Legal)
  const activeLegalCurrency: 'USD' | 'ARS' = (() => {
    if (methodology?.legal_currency === 'ARS' || methodology?.legal_currency === 'USD') {
      return methodology.legal_currency;
    }
    const txt = ((contractText || '') + ' ' + (totalValue || '')).toLowerCase();
    if (txt.includes('ars') || txt.includes('pesos')) return 'ARS';
    return 'USD';
  })();

  const handleLegalCurrencyChange = (newCurr: 'USD' | 'ARS') => {
    setMethodology((prev: any) => ({
      ...(prev || DEFAULT_METHODOLOGY),
      legal_currency: newCurr,
    }));
  };

  // Divisa para el Video Comercial (Slide de Presupuesto):
  // 100% coincidente por defecto con la divisa configurada en el Contrato (activeLegalCurrency).
  // Si el usuario decide personalizarla específicamente en la pestaña de Video, usa methodology.video_currency.
  const activeVideoCurrency: 'USD' | 'ARS' = (() => {
    if (methodology?.video_currency === 'ARS' || methodology?.video_currency === 'USD') {
      return methodology.video_currency;
    }
    return activeLegalCurrency || 'ARS';
  })();

  const handleVideoCurrencyChange = (newCurr: 'USD' | 'ARS') => {
    setMethodology((prev: any) => ({
      ...(prev || DEFAULT_METHODOLOGY),
      video_currency: newCurr,
    }));
  };

  const milestoneSum = useMemo(() => {
    return (milestones || []).reduce((acc, m) => {
      const num = parseFloat((m.price || '').replace(/[^0-9.]/g, ''));
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
  }, [milestones]);

  const updateServiceLimitField = (limitKey: string, value: string) => {
    setServiceDetails((prev) => ({
      ...prev,
      limits: {
        ...(prev.limits || {}),
        [limitKey]: value,
      },
    }));
  };

  // Enhanced Contract Editor state and helpers
  const [contractViewMode, setContractViewMode] = useState<'clauses' | 'full' | 'preview'>('clauses');
  const [expandedClauseId, setExpandedClauseId] = useState<number | null>(null);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const contractTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to split contract into parsed clauses
  const parsedContract = React.useMemo(() => {
    if (!contractText) return null;
    const clauseRegex = /\n\n(?=(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA):)/i;
    const parts = contractText.split(clauseRegex);
    if (parts.length <= 1) return null;

    const header = parts[0].trim();
    const clauses = parts.slice(1).map((raw, idx) => {
      const trimmed = raw.trim();
      const firstLineEnd = trimmed.indexOf('\n');
      let titleLine = '';
      let content = '';

      if (firstLineEnd !== -1) {
        titleLine = trimmed.substring(0, firstLineEnd).trim();
        content = trimmed.substring(firstLineEnd + 1).trim();
      } else {
        titleLine = trimmed;
        content = '';
      }

      // Detect clause type
      const upper = titleLine.toUpperCase();
      let icon = '📜';
      let tag = 'General';
      if (upper.includes('OBJETO') || upper.includes('LICENCIA')) {
        icon = '💻';
        tag = 'Objeto & Licencia';
      } else if (upper.includes('ECONÓMICA') || upper.includes('PAGO') || upper.includes('CONDICIONES')) {
        icon = '💳';
        tag = 'Precio & Pagos';
      } else if (upper.includes('SLA') || upper.includes('DISPONIBILIDAD') || upper.includes('TELEMETRÍA')) {
        icon = '⚡';
        tag = 'SLA & Uptime';
      } else if (upper.includes('SOPORTE') || upper.includes('INCIDENCIAS')) {
        icon = '🛠️';
        tag = 'Soporte Técnico';
      } else if (upper.includes('CONFIDENCIAL') || upper.includes('DATOS') || upper.includes('SALUD') || upper.includes('CUSTODIA')) {
        icon = '🔒';
        tag = 'Privacidad & Datos';
      } else if (upper.includes('VIGENCIA') || upper.includes('RESCISIÓN') || upper.includes('PLAZO')) {
        icon = '⏳';
        tag = 'Vigencia & Baja';
      } else if (upper.includes('RESPONSABILIDAD') || upper.includes('JURISDICCIÓN') || upper.includes('REGULATORIA')) {
        icon = '⚖️';
        tag = 'Legal & Fuero';
      } else if (upper.includes('INTEGRACIONES') || upper.includes('META') || upper.includes('MERCADO PAGO')) {
        icon = '🔌';
        tag = 'Integraciones';
      }

      return {
        id: idx,
        title: titleLine,
        content,
        icon,
        tag
      };
    });

    return { header, clauses };
  }, [contractText]);

  const handleUpdateClause = (clauseIndex: number, newContent: string) => {
    if (!parsedContract) return;
    const updatedClauses = [...parsedContract.clauses];
    updatedClauses[clauseIndex] = {
      ...updatedClauses[clauseIndex],
      content: newContent
    };
    const newContractText = `${parsedContract.header}\n\n` + 
      updatedClauses.map(c => `${c.title}\n${c.content}`).join('\n\n');
    setContractText(newContractText);
  };

  const handleUpdateContractHeader = (newHeader: string) => {
    if (!parsedContract) {
      setContractText(newHeader);
      return;
    }
    const newContractText = `${newHeader.trim()}\n\n` + 
      parsedContract.clauses.map(c => `${c.title}\n${c.content}`).join('\n\n');
    setContractText(newContractText);
  };

  const insertVariableIntoContract = (varTag: string) => {
    const el = contractTextareaRef.current;
    if (!el) {
      setContractText(prev => (prev ? `${prev} ${varTag}` : varTag));
      setCopiedVar(varTag);
      setTimeout(() => setCopiedVar(null), 1500);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const val = el.value;
    const updated = val.substring(0, start) + varTag + val.substring(end);
    setContractText(updated);
    setCopiedVar(varTag);
    setTimeout(() => {
      setCopiedVar(null);
      el.focus();
      el.setSelectionRange(start + varTag.length, start + varTag.length);
    }, 20);
  };

  const handleApplyProductPreset = (productId: CreappProductId) => {
    const preset = getCreappProductPreset(productId);
    setSelectedProductId(productId);
    setProposalType('service');
    setBrandPrimary(preset.brand_color_primary);
    setBrandSecondary(preset.brand_color_secondary);
    setHeroBadge(preset.hero_badge);
    setHeroTitle(preset.hero_title);
    setContractDescription(preset.contract_description);
    setContractText(preset.contract_template);
    setClientLogoUrl(preset.logo_url);
    setServiceDetails(preset.default_service_details);
    if (preset.default_service_details.recurring_fee) {
      setTotalValue(preset.default_service_details.recurring_fee);
    }
    setDescription(preset.contract_description);

    setMethodology((prev: any) => ({
      ...(prev || DEFAULT_METHODOLOGY),
      proposal_type: 'service',
      product_id: productId,
      hidden_pages: ['alcance', 'hitos', 'sem1-6', 'sem9-16', 'metodologia'],
    }));

    if (productId === 'stacked') {
      setInclusions([
        { title: 'Licencia SaaS Stacked', description: 'Acceso a la plataforma cloud 24/7.', tooltip: 'Licencia multiusuario para gestión gastronómica integral.', icon_name: 'Box' },
        { title: 'KDS & Comanderas en Vivo', description: 'Gestión de cocina y salón sincronizados.', tooltip: 'Control en tiempo real de estados de preparación y despacho.', icon_name: 'Layers' },
        { title: 'SLA Uptime 99.5%', description: 'Alta disponibilidad garantizada.', tooltip: 'Infraestructura redundante con monitorización continua.', icon_name: 'ShieldCheck' },
        { title: 'Soporte WhatsApp Prioritario', description: 'Canal directo para incidentes en servicio.', tooltip: 'Respuesta P1 en menos de 2 horas para incidencias operativas.', icon_name: 'MessageSquare' }
      ]);
      setExclusions([
        { title: 'Hardware físico en comodato', tooltip: 'Tablets, impresoras térmicas y dispositivos de red son provistos o adquiridos por el cliente.' },
        { title: 'Desarrollos fuera de roadmap', tooltip: 'Nuevas funcionalidades complejas o custom se cotizan por separado vía Change Requests.' }
      ]);
    } else if (productId === 'trazapp') {
      setInclusions([
        { title: 'Licencia SaaS Trazapp', description: 'Acceso cloud para gestión agronómica.', tooltip: 'Trazabilidad genealógica, lotes, fenotipos y plantas.', icon_name: 'Box' },
        { title: 'Telemetría IoT & Sensores', description: 'Monitoreo ambiental de salas 24/7.', tooltip: 'Registro de temperatura, humedad, VPD y fotoperiodo en tiempo real.', icon_name: 'Activity' },
        { title: 'Dispensario & Reprocann', description: 'Control de socios y pesajes auditables.', tooltip: 'Cumplimiento normativo y resguardo histórico de movimientos.', icon_name: 'ShieldCheck' },
        { title: 'SLA & Soporte Agrotech', description: 'Guardias de respuesta rápida P1 < 2hs.', tooltip: 'Atención directa con ingenieros de CreAPP Software Lab.', icon_name: 'MessageSquare' }
      ]);
      setExclusions([
        { title: 'Sensores y hardware IoT en campo', tooltip: 'Los sensores físicos y microcontroladores se adquieren e instalan según las dimensiones del predio.' },
        { title: 'Asesoría legal/médica externa', tooltip: 'CreAPP provee la plataforma tecnológica; la responsabilidad legal de la actividad recae en el club/titular.' }
      ]);
    } else if (productId === 'dental-ia') {
      setInclusions([
        { title: 'Licencia SaaS Dental-IA', description: 'Sistema operativo clínico y agenda.', tooltip: 'Turnero público online con cobro de señas Mercado Pago 0% comisión Dental-IA.', icon_name: 'Box' },
        { title: 'Agente IA WhatsApp 24/7', description: 'Atención oficial en Meta Cloud API.', tooltip: 'Responde preguntas, agenda turnos y envía recordatorios automáticos sin intervención humana.', icon_name: 'Bot' },
        { title: 'Odontograma FDI 32 Piezas', description: 'Odontograma multicapa de alta precisión.', tooltip: '5 caras por diente, catálogo de tratamientos codificados y presupuestos instantáneos.', icon_name: 'Layers' },
        { title: 'Historia Clínica & Radiografías', description: 'Almacenamiento cloud encriptado.', tooltip: 'Guarda tomografías, fotografías intraorales y consentimientos digitales seguros.', icon_name: 'Database' }
      ]);
      setExclusions([
        { title: 'Consumos de WhatsApp Meta Cloud API', tooltip: 'Las tarifas por conversación de Meta se liquidan directo entre Meta y la clínica sin intermediación.' },
        { title: 'Equipamiento odontológico físico', tooltip: 'Sillones, compresores y radiovisiógrafos físicos son provistos por la clínica.' }
      ]);
    }
  };

  const handleSelectProposalType = (type: 'project' | 'service') => {
    setProposalType(type);
    if (type === 'service') {
      handleApplyProductPreset(selectedProductId || 'stacked');
      if (activeEditorTab !== 'config' && activeEditorTab !== 'portada' && activeEditorTab !== 'legal') {
        setActiveEditorTab('legal');
      }
    } else {
      setMethodology((prev: any) => ({
        ...(prev || DEFAULT_METHODOLOGY),
        proposal_type: 'project',
        hidden_pages: [],
      }));
      if (!contractText || contractText.includes('PLATAFORMA STACKED') || contractText.includes('PLATAFORMA TRAZAPP') || contractText.includes('PLATAFORMA DENTAL-IA')) {
        setContractText(DEVELOPMENT_CONTRACT_TEMPLATE);
        setContractDescription(DEVELOPMENT_CONTRACT_DESCRIPTION);
      }
    }
  };

  // Tab navigation state
  type EditorTab = 'config' | 'portada' | 'alcance' | 'hitos' | 'sem1-6' | 'sem9-16' | 'metodologia' | 'legal' | 'legal2' | 'video';
  const [activeEditorTab, setActiveEditorTab] = useState<EditorTab>('config');
  const [zoom, setZoom] = useState<number>(0.6);

  // Initialize service defaults if creating a new service contract
  useEffect(() => {
    if (isNew && searchParams.get('type') === 'service') {
      handleApplyProductPreset(initialProductFromUrl);
    }
  }, [isNew, searchParams]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  useEffect(() => {
    if (isNew) return;
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

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
      const rawTotal = proposal.total_value || '';
      const cleanNum = cleanNumberString(rawTotal);
      setTotalValue(cleanNum || rawTotal || '0');
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
        const detectedLegalCurr = proposal.methodology.legal_currency || (
          (proposal.contract_text || '').toLowerCase().includes('ars') || rawTotal.toLowerCase().includes('ars')
            ? 'ARS'
            : 'USD'
        );
        const detectedMilestoneCurr = proposal.methodology.currency || (
          rawTotal.toLowerCase().includes('ars') ? 'ARS' : 'USD'
        );
        const detectedVideoCurr = proposal.methodology.video_currency || detectedLegalCurr;
        setMethodology({
          ...proposal.methodology,
          currency: detectedMilestoneCurr,
          legal_currency: detectedLegalCurr,
          video_currency: detectedVideoCurr,
        });
        if (proposal.methodology.client_logo_scale !== undefined) {
          setClientLogoScale(Number(proposal.methodology.client_logo_scale) || 100);
        }
        if (proposal.methodology.video_logo_scale !== undefined) {
          setVideoLogoScale(Number(proposal.methodology.video_logo_scale) || 140);
        }
        if (proposal.methodology.client_legal_data) {
          setClientLegalData({
            ...DEFAULT_CLIENT_LEGAL_DATA,
            ...proposal.methodology.client_legal_data,
            company_name: proposal.methodology.client_legal_data.company_name || proposal.client_name || '',
          });
        } else {
          setClientLegalData({
            ...DEFAULT_CLIENT_LEGAL_DATA,
            company_name: proposal.client_name || '',
          });
        }
      } else {
        const detectedLegalCurr = (proposal.contract_text || '').toLowerCase().includes('ars') || rawTotal.toLowerCase().includes('ars') ? 'ARS' : 'USD';
        setMethodology({
          ...DEFAULT_METHODOLOGY,
          currency: rawTotal.toLowerCase().includes('ars') ? 'ARS' : 'USD',
          legal_currency: detectedLegalCurr,
          video_currency: detectedLegalCurr,
        });
        setClientLogoScale(100);
        setClientLegalData({
          ...DEFAULT_CLIENT_LEGAL_DATA,
          company_name: proposal.client_name || '',
        });
      }

      const loadedType = (proposal.proposal_type || proposal.methodology?.proposal_type || 'project') as 'project' | 'service';
      setProposalType(loadedType);
      if (proposal.methodology?.service_details) {
        const rawSD = proposal.methodology.service_details;
        const fee = (proposal.total_value && proposal.total_value !== '$350 USD / mes')
          ? cleanNumberString(proposal.total_value)
          : (cleanNumberString(rawSD.recurring_fee) || cleanNumberString(proposal.total_value) || '');
        setServiceDetails({
          ...rawSD,
          recurring_fee: fee,
        });
        if (fee) setTotalValue(fee);
      } else {
        setServiceDetails(DEFAULT_SERVICE_DETAILS);
        if (cleanNum) setTotalValue(cleanNum);
      }
      if (proposal.methodology?.product_id) {
        setSelectedProductId(proposal.methodology.product_id);
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
    if (!isLocalhost) {
      setTargetVideoRatio(ratio);
      setIsVideoNoticeModalOpen(true);
      return;
    }

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
          totalValue: parseProposalNumericValue(totalValue),
          monthlyFee: parseProposalNumericValue(methodology?.monthly_fee || serviceDetails?.recurring_fee || totalValue),
          videoBadgeText: methodology?.video_badge_text,
          clientLogoUrl,
          clientLogoScale: videoLogoScale,
          videoLogoScale: videoLogoScale,
          currency: activeVideoCurrency,
          pillars: getPillars(methodology, brandPrimary, brandSecondary),
          methodologyIntro: methodology?.intro_text,
          hideWeeklySchedule: methodology?.hide_weekly_schedule,
          aspectRatio: ratio,
        }),
      });

      clearInterval(interval);

      const contentType = response.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`El servidor devolvió un error (${response.status}): ${text.slice(0, 120)}`);
      }

      if (!response.ok) {
        throw new Error(data.details ? `${data.error}: ${data.details}` : (data.error || 'Fallo en la compilación del video.'));
      }

      setProgress(100);

      const link = document.createElement('a');
      link.href = data.videoUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      clearInterval(interval);
      alert('Error renderizando video: ' + (error instanceof Error ? error.message : String(error)));
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
      const finalClientName = clientLegalData.company_name?.trim() || clientName;
      const finalFee = (totalValue || serviceDetails?.recurring_fee || '').trim();
      const finalServiceDetails = proposalType === 'service' ? {
        ...serviceDetails,
        recurring_fee: finalFee || serviceDetails?.recurring_fee,
      } : serviceDetails;

      const proposalData = {
        slug: slug || generateSlug(finalClientName),
        client_name: finalClientName,
        date,
        location,
        description,
        total_value: proposalType === 'service' ? (finalFee || totalValue) : totalValue,
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
        methodology: {
          ...(methodology || DEFAULT_METHODOLOGY),
          client_logo_scale: clientLogoScale,
          video_logo_scale: videoLogoScale,
          proposal_type: proposalType,
          service_details: finalServiceDetails,
          product_id: selectedProductId,
          client_legal_data: clientLegalData,
          legal_currency: activeLegalCurrency,
          video_currency: activeVideoCurrency,
        },
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

      if (isNew) {
        skipNextFetchRef.current = true;
        navigate(`/admin/propuesta/${proposalId}`, { replace: true });
      }

      setShowToast(true);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px', justifyContent: 'center', minHeight: '110px' }}>
          {proposalType === 'service' ? (
            clientLogoUrl && (
              <img
                src={clientLogoUrl}
                alt={heroTitle || "Logo Producto"}
                style={{
                  height: `${125 * (clientLogoScale / 100)}px`,
                  maxHeight: '170px',
                  maxWidth: '320px',
                  objectFit: 'contain'
                }}
              />
            )
          ) : (
            <>
              <img src={creappLogoOfficial} alt="CreAPP Logo" style={{ height: '105px', objectFit: 'contain' }} />
              {clientLogoUrl && (
                <>
                  <span style={{ fontSize: '24px', fontWeight: '900', color: '#cbd5e1' }}>✕</span>
                  <img
                    src={clientLogoUrl}
                    alt="Logo Cliente"
                    style={{
                      height: `${105 * (clientLogoScale / 100)}px`,
                      maxHeight: '160px',
                      maxWidth: '260px',
                      objectFit: 'contain'
                    }}
                  />
                </>
              )}
            </>
          )}
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
            <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{clientLegalData.company_name || clientName}</p>
            {clientLegalData.tax_id && (
              <p style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>CUIT: {clientLegalData.tax_id}</p>
            )}
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
          <span>{getPageFooter('alcance')}</span>
        </div>
      </div>
    );
  };

  const renderPage3 = () => {
    const currency = methodology?.currency || getCurrencyFromTotal(totalValue) || 'USD';
    const isCompact = (milestones && milestones.length >= 4) || (payments && payments.length >= 4);
    return (
      <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: isCompact ? '15px' : '25px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
            <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{heroTitle ? heroTitle.toUpperCase() : 'CBKR APP V2'}</span>
          </div>
          <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>PROJECT_ROADMAP // 02</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: isCompact ? '8px' : '20px' }}>
          <h1 style={{ fontSize: isCompact ? '24px' : '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
            CRONOGRAMA DE FASES & <span style={{ fontStyle: 'italic', color: brandPrimary }}>ENTREGAS</span>
          </h1>
          <p style={{ fontSize: isCompact ? '10px' : '11px', color: '#475569', lineHeight: '1.35', fontWeight: '300', margin: '0' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '2px', marginBottom: '2px' }}>
            <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Estructura de Sprints Mensuales</span>
            <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: isCompact ? '6px' : '15px' }}>
            {milestones && milestones.map((m, i) => (
              <div key={m.id || i} style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', minHeight: isCompact ? '68px' : '95px', boxSizing: 'border-box' }}>
                <div style={{ width: isCompact ? '65px' : '80px', flexShrink: 0, flexGrow: 0, backgroundColor: '#000000', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#ffffff', gap: '2px', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>Fase</span>
                  <span style={{ fontSize: isCompact ? '16px' : '20px', fontWeight: '950' }}>{i + 1}</span>
                </div>
                <div style={{ flexGrow: 1, flexShrink: 1, minWidth: 0, padding: isCompact ? '6px 12px' : '15px 20px', display: 'flex', flexDirection: 'column', gap: '3px', justifyContent: 'center', boxSizing: 'border-box' }}>
                  <h4 style={{ fontSize: isCompact ? '11px' : '12px', fontWeight: '900', color: '#0f172a', margin: '0', textTransform: 'uppercase' }}>{m.title}</h4>
                  <p style={{ fontSize: isCompact ? '9px' : '10px', color: '#475569', lineHeight: '1.2', margin: '0', fontWeight: '300' }}>
                    {m.description || 'Sin descripción de entregables.'}
                  </p>
                </div>
                <div style={{ width: isCompact ? '105px' : '120px', flexShrink: 0, flexGrow: 0, borderLeft: '1px solid #e2e8f0', padding: isCompact ? '6px 10px' : '15px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '2px', backgroundColor: '#fafafa', boxSizing: 'border-box' }}>
                  <span style={{ fontSize: '7px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hito Control</span>
                  <span style={{ fontSize: isCompact ? '9px' : '10px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.1' }}>
                    {m.control_milestone || 'VERIFICACIÓN'}
                  </span>
                </div>
                {!methodology?.hide_milestone_prices && (
                  <div style={{ width: isCompact ? '105px' : '120px', flexShrink: 0, flexGrow: 0, borderLeft: '1px solid #e2e8f0', padding: isCompact ? '6px 10px' : '15px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '2px', backgroundColor: '#fafafa', boxSizing: 'border-box' }}>
                    <span style={{ fontSize: '7px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inversión</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                      <span style={{ fontSize: isCompact ? '13px' : '14px', fontWeight: '950', color: '#000000', lineHeight: '1.1' }}>${formatMilestonePrice(m.price)}</span>
                      <span style={{ fontSize: '8px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', lineHeight: '1.1' }}>{currency}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {infrastructureCosts && infrastructureCosts.length > 0 && (
            <div style={{ marginTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '4px' }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Costos de Infraestructura Asociados</span>
                <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {infrastructureCosts.map((infra, idx) => (
                  <div key={idx} style={{ flex: '1 1 180px', padding: '5px 10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px' }}>
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
            <div style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '6px' }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Esquema de Pagos / Hitos de Financiamiento</span>
                <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${payments.length}, minmax(0, 1fr))`, gap: payments.length > 3 ? '8px' : '10px', width: '100%' }}>
                {payments.map((p, idx) => (
                  <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: payments.length > 3 ? '8px 10px' : '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: payments.length > 3 ? '8.5px' : '9px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', lineHeight: '1.2' }}>{p.label}</span>
                      <span style={{ fontSize: payments.length > 3 ? '11px' : '12px', fontWeight: '950', color: brandPrimary, flexShrink: 0 }}>{p.percentage}</span>
                    </div>
                    <span style={{ fontSize: payments.length > 3 ? '8px' : '9px', color: '#475569', fontWeight: '300', lineHeight: '1.3' }}>{p.description}</span>
                    {p.tooltip && (
                      <span style={{ fontSize: payments.length > 3 ? '7.5px' : '8px', color: '#94a3b8', fontStyle: 'italic', lineHeight: '1.3', marginTop: '2px' }}>{p.tooltip}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
          <span>Presupuesto Consolidado: <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{formatTotalValue(totalValue)} TOTAL</span></span>
          <span>{getPageFooter('hitos')}</span>
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
          <span>{getPageFooter('sem1-6')}</span>
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
          <span>{getPageFooter('sem9-16')}</span>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: meth.hide_weekly_schedule ? '16px' : (getPillars(meth, brandPrimary, brandSecondary).length >= 4 ? '10px' : '15px'), marginTop: '5px' }}>
            {getPillars(meth, brandPrimary, brandSecondary).map((pillar, idx) => {
              const mainColor = pillar.color || (idx % 2 === 0 ? brandPrimary : brandSecondary);
              const isCompact = !meth.hide_weekly_schedule && getPillars(meth, brandPrimary, brandSecondary).length >= 4;
              return (
                <div
                  key={pillar.id || idx}
                  style={{
                    padding: meth.hide_weekly_schedule ? '18px 22px' : (isCompact ? '12px 16px' : '18px 20px'),
                    borderRadius: '12px',
                    backgroundColor: `${mainColor}0A`,
                    border: `1px solid ${mainColor}33`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <h4 style={{ fontSize: '10px', fontWeight: '900', color: mainColor, margin: '0', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                    {pillar.title}
                  </h4>
                  <p style={{ fontSize: meth.hide_weekly_schedule ? '11px' : (isCompact ? '10px' : '11px'), color: '#475569', lineHeight: '1.5', margin: '0', fontWeight: '300' }}>
                    {clientNameReplacer(pillar.description)}
                  </p>
                </div>
              );
            })}

            {!meth.hide_weekly_schedule && (
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
            )}
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
          <span>Propuesta Comercial | {clientName}</span>
          <span>{getPageFooter('metodologia')}</span>
        </div>
      </div>
    );
  };

  // =========================================================
  // HELPER: PROCESAMIENTO INTELIGENTE DEL TEXTO DEL CONTRATO
  // =========================================================
  const getProcessedContractText = (rawTemplate: string) => {
    const isService = proposalType === 'service';
    const repName = clientLegalData.representative_name?.trim() || '';
    const repDni = clientLegalData.representative_dni?.trim() || clientLegalData.tax_id?.trim() || '';
    const repRole = clientLegalData.representative_role?.trim() || '';
    const company = clientLegalData.company_name?.trim() || clientName || 'EL CLIENTE';
    const cuit = clientLegalData.tax_id?.trim() || '';
    const address = clientLegalData.legal_address?.trim() || '';
    const vigencia = (serviceDetails?.min_term_months || serviceDetails?.minimum_commitment || '6 Meses').trim();

    let template = rawTemplate || '';
    if (cuit || address) {
      const extraLegalInfo = [
        cuit ? `CUIT N° ${cuit}` : '',
        address ? `con domicilio legal en ${address}` : ''
      ].filter(Boolean).join(', ');

      template = template.replace(
        /Por la otra parte,\s*\{client_name\}(?:,)?/i,
        `Por la otra parte, {client_name} (${extraLegalInfo}),`
      );
    }

    return template
      .replace(/\{location\}/g, location || 'Buenos Aires, Argentina')
      .replace(/\{date\}/g, date || 'Fecha')
      .replace(/\{client_name\}/g, company)
      .replace(/\{client_cuit\}/g, cuit)
      .replace(/\{client_address\}/g, address)
      .replace(/\{client_representative\}/g, repName || '________________________')
      .replace(/\{client_representative_dni\}/g, repDni || '________________________')
      .replace(/\{client_representative_role\}/g, repRole || 'Representante Legal')
      .replace(/\{total_value\}/g, formatCurrencyDisplay(totalValue || serviceDetails?.recurring_fee, activeLegalCurrency))
      .replace(/\{recurring_fee\}/g, `${formatCurrencyDisplay(methodology?.monthly_fee || serviceDetails?.recurring_fee || totalValue, activeLegalCurrency)} / mes`)
      .replace(/\{monthly_fee\}/g, `${formatCurrencyDisplay(methodology?.monthly_fee || serviceDetails?.recurring_fee || totalValue, activeLegalCurrency)} / mes`)
      .replace(/\{setup_fee\}/g, formatCurrencyDisplay(serviceDetails?.setup_fee, activeLegalCurrency))
      .replace(/\{plan_name\}/g, serviceDetails?.plan_name || (selectedProductId ? selectedProductId.toUpperCase() : 'Stacked'))
      .replace(/\{min_term_months\}/g, vigencia)
      .replace(/\{minimum_commitment\}/g, vigencia)
      .replace(/\{contract_term\}/g, vigencia)
      .replace(/\{vigencia\}/g, vigencia)
      .replace(/vigencia mínima inicial de \d+ \([^\)]+\) meses/gi, `vigencia mínima inicial de ${vigencia}`)
      .replace(/vigencia mínima inicial de 6 meses/gi, `vigencia mínima inicial de ${vigencia}`)
      .replace(/plazo inicial de \d+ \([^\)]+\) meses/gi, `plazo inicial de ${vigencia}`)
      .replace(/período inicial de \d+ \([^\)]+\) meses/gi, `período inicial de ${vigencia}`)
      .replace(/\[input:Representante Legal\]/g, repName || '________________________')
      .replace(/\[input:DNI\/CUIT\]/g, repDni || '________________________')
      .replace(/\[input:DNI\]/g, repDni || '________________________')
      .replace(/\[input:Cargo del Firmante\]/g, repRole || '________________________')
      .replace(/\[input:[^\]]+\]/g, '________________________');
  };

  // =========================================================
  // RENDER PÁGINA LEGAL 1 (Contrato de Servicios - Cláusulas 1 a 3)
  // =========================================================
  const renderPageLegalPart1 = () => {
    const isService = proposalType === 'service';
    const activeContractTemplate = contractText || (isService ? getCreappProductPreset(selectedProductId).contract_template : '');
    const replacedText = getProcessedContractText(activeContractTemplate);

    // Separar proemio y cláusulas
    const clauseRegex = /\n\n(?=(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA):)/i;
    const parts = replacedText.split(clauseRegex);
    const header = parts.length > 1 ? parts[0].trim() : '';
    const allClauses = parts.slice(1).map(raw => {
      const trimmed = raw.trim();
      const firstLineEnd = trimmed.indexOf('\n');
      if (firstLineEnd !== -1) {
        return {
          title: trimmed.substring(0, firstLineEnd).trim(),
          content: trimmed.substring(firstLineEnd + 1).trim()
        };
      }
      return { title: trimmed, content: '' };
    });

    // Balanceo equilibrado de 2 páginas:
    // Pág 1: Cláusulas 1 a 3 (Objeto SaaS, Condiciones Económicas, SLA y Disponibilidad)
    // Pág 2: Cláusulas 4 a 7 (Soporte Técnico, Confidencialidad, Vigencia y Rescisión, Jurisdicción) + Cuadro de Resumen Ejecutivo + Cierre + Firmas
    const part1Clauses = allClauses.length > 0 ? allClauses.slice(0, 3) : [];

    return (
      <div style={{
        width: '794px',
        height: '1123px',
        padding: '38px 65px 35px 65px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '8px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
            <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>
              {heroTitle ? heroTitle.toUpperCase() : (selectedProductId ? selectedProductId.toUpperCase() + ' PLATFORM' : 'SOFTWARE LAB')}
            </span>
          </div>
          <span style={{ fontSize: '8.5px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>
            SERVICE_AGREEMENT // PÁG. 1 DE 2
          </span>
        </div>

        {/* Title & Description */}
        <div style={{ marginBottom: '12px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
            CONTRATO DE SERVICIO & <span style={{ fontStyle: 'italic', color: brandPrimary }}>LICENCIA SAAS</span>
          </h1>
          <p style={{ fontSize: '9.5px', color: '#475569', lineHeight: '1.45', fontWeight: '300', margin: '4px 0 0 0' }}>
            {contractDescription || getCreappProductPreset(selectedProductId).contract_description}
          </p>
        </div>

        {/* Proemio / Comparecencia */}
        {header ? (
          <div style={{
            fontSize: '9.5px',
            color: '#1e293b',
            lineHeight: '1.55',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '12px 16px',
            marginBottom: '14px',
            whiteSpace: 'pre-wrap',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}>
            {header}
          </div>
        ) : null}

        {/* Cláusulas 1 a 3 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {part1Clauses.map((clause, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{
                fontSize: '10px',
                fontWeight: '900',
                color: '#0f172a',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'baseline',
                gap: '6px'
              }}>
                <span style={{ color: brandPrimary, fontWeight: '900', fontSize: '11px' }}>§</span>
                <span>{clause.title}</span>
              </div>
              <p style={{
                fontSize: '9.5px',
                color: '#334155',
                lineHeight: '1.6',
                textAlign: 'justify',
                margin: '0',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: '400'
              }}>
                {clause.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: '30px', left: '65px', right: '65px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '9px', color: '#94a3b8' }}>
          <span>Contrato de Servicio | {clientName}</span>
          <span>{getPageFooter('legal')}</span>
        </div>
      </div>
    );
  };

  // =========================================================
  // RENDER PÁGINA LEGAL 2 (Contrato de Servicios - Cláusulas 4 a 7, Resumen y Firmas)
  // =========================================================
  const renderPageLegalPart2 = () => {
    const isService = proposalType === 'service';
    const activeContractTemplate = contractText || (isService ? getCreappProductPreset(selectedProductId).contract_template : '');
    const replacedText = getProcessedContractText(activeContractTemplate);

    // Separar proemio y cláusulas
    const clauseRegex = /\n\n(?=(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SÉPTIMA|OCTAVA|NOVENA|DÉCIMA):)/i;
    const parts = replacedText.split(clauseRegex);
    const allClauses = parts.slice(1).map(raw => {
      const trimmed = raw.trim();
      const firstLineEnd = trimmed.indexOf('\n');
      if (firstLineEnd !== -1) {
        return {
          title: trimmed.substring(0, firstLineEnd).trim(),
          content: trimmed.substring(firstLineEnd + 1).trim()
        };
      }
      return { title: trimmed, content: '' };
    });

    // Parte 2 toma a partir de la cláusula 4 (índice 3) en adelante
    const part2Clauses = allClauses.length > 3 ? allClauses.slice(3) : allClauses.slice(2);

    return (
      <div style={{
        width: '794px',
        height: '1123px',
        padding: '38px 65px 35px 65px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '8px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
            <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>
              {heroTitle ? heroTitle.toUpperCase() : (selectedProductId ? selectedProductId.toUpperCase() + ' PLATFORM' : 'SOFTWARE LAB')}
            </span>
          </div>
          <span style={{ fontSize: '8.5px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>
            SERVICE_AGREEMENT // PÁG. 2 DE 2
          </span>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '12px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
            TÉRMINOS GENERALES & <span style={{ fontStyle: 'italic', color: brandPrimary }}>FIRMAS</span>
          </h1>
          <p style={{ fontSize: '9.5px', color: '#475569', lineHeight: '1.45', fontWeight: '300', margin: '4px 0 0 0' }}>
            Soporte técnico, confidencialidad de datos, vigencia contractual y suscripción fehaciente.
          </p>
        </div>

        {/* Cláusulas 4 a fin */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {part2Clauses.map((clause, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{
                fontSize: '9.5px',
                fontWeight: '900',
                color: '#0f172a',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'baseline',
                gap: '5px'
              }}>
                <span style={{ color: brandPrimary, fontWeight: '900', fontSize: '10.5px' }}>§</span>
                <span>{clause.title}</span>
              </div>
              <p style={{
                fontSize: '9px',
                color: '#334155',
                lineHeight: '1.55',
                textAlign: 'justify',
                margin: '0',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontWeight: '400'
              }}>
                {clause.content}
              </p>
            </div>
          ))}
        </div>

        {/* Resumen Ejecutivo del Servicio (Llena de manera profesional y útil el espacio) */}
        <div style={{
          marginTop: '12px',
          padding: '10px 14px',
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px'
        }}>
          <div>
            <span style={{ fontSize: '7.5px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Tarifa Mensual</span>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>{totalValue || serviceDetails?.recurring_fee || '$350 USD / mes'}</span>
          </div>
          <div>
            <span style={{ fontSize: '7.5px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Disponibilidad SLA</span>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#059669' }}>{serviceDetails?.sla_uptime || '99.5% Uptime'}</span>
          </div>
          <div>
            <span style={{ fontSize: '7.5px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Vigencia Inicial</span>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>{serviceDetails?.min_term_months || serviceDetails?.minimum_commitment || '6 Meses'}</span>
          </div>
          <div>
            <span style={{ fontSize: '7.5px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Jurisdicción</span>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a' }}>{location || 'Buenos Aires, ARG'}</span>
          </div>
        </div>

        {/* Cierre Formal */}
        <div style={{
          fontSize: '8.5px',
          color: '#475569',
          fontStyle: 'italic',
          lineHeight: '1.45',
          marginTop: '10px',
          marginBottom: '12px',
          paddingTop: '8px',
          borderTop: '1px solid #e2e8f0'
        }}>
          En prueba de conformidad de todas las cláusulas precedentes, las partes suscriben digitalmente el presente contrato de servicios en la fecha y localidad consignadas al comienzo del documento.
        </div>

        {/* Firmas a 3 columnas */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <p style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '1px' }}>Por CreAPP Software Lab</p>
            <div style={{ height: '56px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '5px' }}>
              <img src="/firmaseba.png" alt="Firma Seba" style={{ height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ fontSize: '9px' }}>
              <p style={{ fontWeight: '800', color: '#0f172a' }}>Sebastián Maza</p>
              <p style={{ color: '#64748b', fontSize: '8px' }}>Chief Technology Officer</p>
            </div>
          </div>
          {(methodology?.show_facundo_signature ?? true) && (
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <p style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '1px' }}>Por CreAPP Software Lab</p>
              <div style={{ height: '56px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', padding: '5px' }}>
              </div>
              <div style={{ fontSize: '9px' }}>
                <p style={{ fontWeight: '800', color: '#0f172a' }}>Facundo Marceca</p>
                <p style={{ color: '#64748b', fontSize: '8px' }}>Project Manager</p>
              </div>
            </div>
          )}
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <p style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '1px' }}>
              Por {clientLegalData.company_name || clientName || 'EL CLIENTE'}
            </p>
            <div style={{ height: '56px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '9px', textAlign: 'center' }}>
              Pendiente de Firma
            </div>
            <div style={{ fontSize: '9px' }}>
              <p style={{ fontWeight: '800', color: '#0f172a' }}>
                {clientLegalData.representative_name || '________________________'}
              </p>
              <p style={{ color: '#64748b', fontSize: '8px' }}>
                {clientLegalData.representative_role || 'Representante Autorizado'}
              </p>
              {(clientLegalData.representative_dni || clientLegalData.tax_id) && (
                <p style={{ color: '#94a3b8', fontSize: '7.5px', marginTop: '1px' }}>
                  {clientLegalData.representative_dni ? `DNI: ${clientLegalData.representative_dni}` : `CUIT: ${clientLegalData.tax_id}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: '30px', left: '65px', right: '65px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '9px', color: '#94a3b8' }}>
          <span>Contrato de Servicio | {clientLegalData.company_name || clientName}</span>
          <span>{getPageFooter('legal2')}</span>
        </div>
      </div>
    );
  };

  // =========================================================
  // =========================================================
  // RENDER PÁGINA 7 (Contrato de Proyectos de Desarrollo a Medida)
  // =========================================================
  const renderPage7 = () => {
    const processedText = getProcessedContractText(contractText || DEVELOPMENT_CONTRACT_TEMPLATE);
    const textLength = processedText.length;

    // Cálculos limpios con divisa legal independiente
    const cleanTotal = formatCurrencyDisplay(totalValue, activeLegalCurrency);
    const numericTotal = parseFloat(cleanNumberString(totalValue).replace(/\./g, '').replace(/,/g, '.')) || 0;
    const halfFormatted = numericTotal > 0
      ? `$${Math.round(numericTotal * 0.5).toLocaleString('es-AR')} ${activeLegalCurrency}`
      : `50% ${activeLegalCurrency}`;
    const monthlyFeeFormatted = methodology?.monthly_fee
      ? formatCurrencyDisplay(methodology.monthly_fee, activeLegalCurrency)
      : cleanTotal;

    // Tipografía adaptativa
    let fontSize = '9.8px';
    let lineHeight = '1.65';
    let padding = '18px 22px';
    let minContractHeight = '220px';
    let maxContractHeight = '315px';

    if (textLength > 2800) {
      fontSize = '8px';
      lineHeight = '1.38';
      padding = '12px 16px';
      maxContractHeight = '370px';
    } else if (textLength > 2100) {
      fontSize = '8.6px';
      lineHeight = '1.48';
      padding = '14px 18px';
      maxContractHeight = '340px';
    } else if (textLength > 1400) {
      fontSize = '9.2px';
      lineHeight = '1.55';
      padding = '16px 20px';
      maxContractHeight = '325px';
    }

    return (
      <div style={{
        width: '794px',
        height: '1123px',
        padding: '38px 60px 26px 60px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        position: 'relative',
        justifyContent: 'space-between'
      }}>
        {/* 1. Header de Página */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: '2px solid #0f172a',
          paddingBottom: '8px',
          marginBottom: '6px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
            <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>
              {heroTitle ? heroTitle.toUpperCase() : 'DEVELOPMENT LAB'}
            </span>
          </div>
          <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>
            LEGAL_AGREEMENT // 05
          </span>
        </div>

        {/* 2. Título & Introducción */}
        <div style={{ marginBottom: '6px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
            CONTRATO Y <span style={{ fontStyle: 'italic', color: brandPrimary }}>FIRMAS</span>
          </h1>
          <p style={{ fontSize: '9.5px', color: '#475569', lineHeight: '1.35', fontWeight: '300', margin: '2px 0 0 0' }}>
            {contractDescription || 'Acuerdo formal que establece las bases y condiciones legales para la ejecución del proyecto de desarrollo de software detallado en esta propuesta.'}
          </p>
        </div>

        {/* 3. Cuerpo del Contrato */}
        <div style={{
          fontSize,
          color: '#334155',
          lineHeight,
          whiteSpace: 'pre-wrap',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding,
          backgroundColor: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          minHeight: minContractHeight,
          maxHeight: maxContractHeight,
          overflowY: 'auto',
          textAlign: 'justify'
        }}>
          {processedText}
        </div>

        {/* 4. Ficha Ejecutiva del Proyecto (Grid de 4 Métricas Clave) */}
        <div style={{
          padding: '9px 14px',
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px'
        }}>
          <div>
            <span style={{ fontSize: '7.5px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Inversión Total</span>
            <span style={{ fontSize: '11.5px', fontWeight: '900', color: '#0f172a', display: 'block', marginTop: '1px' }}>
              {cleanTotal}
            </span>
            <span style={{ fontSize: '7.5px', color: '#64748b' }}>Esquema por hitos</span>
          </div>
          <div>
            <span style={{ fontSize: '7.5px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Garantía Técnica</span>
            <span style={{ fontSize: '11.5px', fontWeight: '900', color: '#059669', display: 'block', marginTop: '1px' }}>
              30 Días Cobertura
            </span>
            <span style={{ fontSize: '7.5px', color: '#64748b' }}>Resolución incidencias</span>
          </div>
          <div>
            <span style={{ fontSize: '7.5px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Metodología</span>
            <span style={{ fontSize: '11.5px', fontWeight: '900', color: '#0f172a', display: 'block', marginTop: '1px' }}>
              Sprints Ágiles
            </span>
            <span style={{ fontSize: '7.5px', color: '#64748b' }}>Entregas continuas</span>
          </div>
          <div>
            <span style={{ fontSize: '7.5px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Jurisdicción</span>
            <span style={{ fontSize: '11.5px', fontWeight: '900', color: '#0f172a', display: 'block', marginTop: '1px' }}>
              {location || 'Buenos Aires, ARG'}
            </span>
            <span style={{ fontSize: '7.5px', color: '#64748b' }}>Ley N° 25.506 & CCCN</span>
          </div>
        </div>

        {/* 5. Esquema de Desembolsos & Hitos Comerciales (Llena con alto valor comercial) */}
        <div style={{
          padding: '10px 14px',
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div style={{ borderLeft: `3px solid ${brandPrimary}`, paddingLeft: '8px' }}>
            <span style={{ fontSize: '8px', fontWeight: '900', color: brandPrimary, textTransform: 'uppercase', display: 'block' }}>Hito 1 · Anticipo Inicial ({halfFormatted})</span>
            <p style={{ fontSize: '8.5px', color: '#334155', margin: '2px 0 0 0', lineHeight: '1.35', fontWeight: '500' }}>
              Firma del acuerdo y reserva de squad técnico. Inicio inmediato de arquitectura, modelado y prototipo UI.
            </p>
          </div>
          <div style={{ borderLeft: '3px solid #0f172a', paddingLeft: '8px' }}>
            <span style={{ fontSize: '8px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', display: 'block' }}>Hito 2 · Pase a Producción ({halfFormatted})</span>
            <p style={{ fontSize: '8.5px', color: '#334155', margin: '2px 0 0 0', lineHeight: '1.35', fontWeight: '500' }}>
              Auditoría y aprobación en entorno Staging. Despliegue en salones, capacitación y entrega de accesos finales.
            </p>
          </div>
          <div style={{ borderLeft: '3px solid #059669', paddingLeft: '8px' }}>
            <span style={{ fontSize: '8px', fontWeight: '900', color: '#059669', textTransform: 'uppercase', display: 'block' }}>Abono Operativo & SLA ({monthlyFeeFormatted})</span>
            <p style={{ fontSize: '8.5px', color: '#334155', margin: '2px 0 0 0', lineHeight: '1.35', fontWeight: '500' }}>
              Soporte de incidentes, guardias operativas en salones y mantenimiento continuo a partir del día 30 post-lanzamiento.
            </p>
          </div>
        </div>

        {/* 6. Protocolo de Validez Jurídica y Consentimiento Digital */}
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px dashed #cbd5e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px' }}>🔒</span>
            <span style={{ fontSize: '8.5px', color: '#475569', lineHeight: '1.35' }}>
              <strong style={{ color: '#0f172a' }}>Consentimiento & Eficacia Jurídica: </strong>
              Las partes reconocen plena validez legal a las firmas digitales aquí estampadas conforme a la Ley N° 25.506 y Art. 288 del CCCN. Cada suscripción certifica IP de origen, sello temporal UTC y huella criptográfica inmutable.
            </span>
          </div>
          <span style={{
            fontSize: '8px',
            fontFamily: 'monospace',
            color: brandPrimary,
            fontWeight: 'bold',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            padding: '3px 8px',
            borderRadius: '4px',
            whiteSpace: 'nowrap'
          }}>
            SHA256::VERIFIED_CONTRACT
          </span>
        </div>

        {/* 7. Bloque de Firmas y Footer */}
        <div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold', margin: '0 0 2px 0' }}>Por CreAPP Software Lab</p>
              <div style={{ height: '62px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '6px' }}>
                <img src="/firmaseba.png" alt="Firma Seba" style={{ height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: '9.5px', marginTop: '2px' }}>
                <p style={{ fontWeight: '800', color: '#0f172a', margin: '0' }}>Sebastián Maza</p>
                <p style={{ color: '#64748b', fontSize: '8px', margin: '1px 0 0 0' }}>Chief Technology Officer</p>
              </div>
            </div>
            {(methodology?.show_facundo_signature ?? true) && (
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold', margin: '0 0 2px 0' }}>Por CreAPP Software Lab</p>
                <div style={{ height: '62px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', padding: '6px' }}>
                </div>
                <div style={{ fontSize: '9.5px', marginTop: '2px' }}>
                  <p style={{ fontWeight: '800', color: '#0f172a', margin: '0' }}>Facundo Marceca</p>
                  <p style={{ color: '#64748b', fontSize: '8px', margin: '1px 0 0 0' }}>Project Manager</p>
                </div>
              </div>
            )}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p style={{ fontSize: '8px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 'bold', margin: '0 0 2px 0' }}>
                Por {clientLegalData.company_name || clientName || 'EL CLIENTE'}
              </p>
              <div style={{ height: '62px', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#94a3b8', fontSize: '9px', textAlign: 'center' }}>
                Pendiente de Firma
              </div>
              <div style={{ fontSize: '9.5px', marginTop: '2px' }}>
                <p style={{ fontWeight: '800', color: '#0f172a', margin: '0' }}>
                  {clientLegalData.representative_name || '________________________'}
                </p>
                <p style={{ color: '#64748b', fontSize: '8px', margin: '1px 0 0 0' }}>
                  {clientLegalData.representative_role || 'Representante Autorizado'}
                </p>
                {(clientLegalData.representative_dni || clientLegalData.tax_id) && (
                  <p style={{ color: '#94a3b8', fontSize: '7.5px', margin: '1px 0 0 0' }}>
                    {clientLegalData.representative_dni ? `DNI: ${clientLegalData.representative_dni}` : `CUIT: ${clientLegalData.tax_id}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 8. Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '8px',
            marginTop: '8px',
            fontSize: '9px',
            color: '#94a3b8'
          }}>
            <span>Propuesta Comercial | {clientLegalData.company_name || clientName}</span>
            <span>{getPageFooter('legal')}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderClientLegalCard = () => (
    <div className="glass rounded-2xl p-6 border border-white/10 space-y-6 relative overflow-hidden bg-gradient-to-b from-slate-900/60 to-slate-950/60 shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0 shadow-inner">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Ficha Legal y Fiscal del Cliente
              </h3>
              <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Auto-Sync Contrato
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Datos de la empresa y del firmante que se inyectan automáticamente en la Portada, el Proemio Legal y el Cuadro de Firmas.
            </p>
          </div>
        </div>
      </div>

      {/* Bloque 1: Empresa / Razón Social */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Building2 size={13} className="text-primary" />
          <span>1. Datos de la Empresa o Comercio</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Razón Social / Nombre Comercial */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black flex items-center justify-between">
              <span>Razón Social o Nombre Comercial *</span>
              <span className="text-[9px] text-primary/70 lowercase font-normal">(visible en portada y contratos)</span>
            </label>
            <input
              type="text"
              value={clientLegalData.company_name || clientName}
              onChange={(e) => updateClientLegalData('company_name', e.target.value)}
              placeholder="Ej. La Trattoria Gourmet S.R.L. / CannaBunker Club"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-xs font-bold transition-all"
            />
          </div>

          {/* CUIT / Identificación Fiscal */}
          <div className="space-y-1.5">
            <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
              CUIT / N° Identificación Tributaria
            </label>
            <input
              type="text"
              value={clientLegalData.tax_id || ''}
              onChange={(e) => updateClientLegalData('tax_id', e.target.value)}
              placeholder="Ej. 30-71829384-9"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-xs font-mono transition-all"
            />
          </div>

          {/* Domicilio Legal / Fiscal */}
          <div className="space-y-1.5">
            <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
              Domicilio Legal / Fiscal
            </label>
            <input
              type="text"
              value={clientLegalData.legal_address || ''}
              onChange={(e) => updateClientLegalData('legal_address', e.target.value)}
              placeholder="Ej. Av. Corrientes 1450, Piso 3, CABA"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-xs transition-all"
            />
          </div>
        </div>
      </div>

      {/* Bloque 2: Representante Legal / Firmante */}
      <div className="space-y-3 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <FileSignature size={13} className="text-primary" />
          <span>2. Representante Legal & Firmante del Contrato</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Nombre y Apellido */}
          <div className="space-y-1.5">
            <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
              Nombre y Apellido
            </label>
            <input
              type="text"
              value={clientLegalData.representative_name || ''}
              onChange={(e) => updateClientLegalData('representative_name', e.target.value)}
              placeholder="Ej. Carlos Eduardo Gómez"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-xs font-bold transition-all"
            />
          </div>

          {/* DNI del Firmante */}
          <div className="space-y-1.5">
            <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
              DNI / CUIT Personal
            </label>
            <input
              type="text"
              value={clientLegalData.representative_dni || ''}
              onChange={(e) => updateClientLegalData('representative_dni', e.target.value)}
              placeholder="Ej. 34.567.890"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-xs font-mono transition-all"
            />
          </div>

          {/* Cargo / Rol */}
          <div className="space-y-1.5">
            <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black">
              Cargo o Carácter
            </label>
            <input
              type="text"
              value={clientLegalData.representative_role || ''}
              onChange={(e) => updateClientLegalData('representative_role', e.target.value)}
              placeholder="Ej. Socio Gerente / Titular"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-xs transition-all"
            />
          </div>
        </div>
      </div>

      {/* Bloque 3: Contacto & Notificaciones */}
      <div className="space-y-3 pt-2 border-t border-white/5">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <ShieldCheck size={13} className="text-primary" />
          <span>3. Notificaciones & Contacto Operativo</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-1.5">
              <Mail size={11} className="text-slate-500" />
              <span>Email de Notificaciones Oficiales</span>
            </label>
            <input
              type="email"
              value={clientLegalData.contact_email || ''}
              onChange={(e) => updateClientLegalData('contact_email', e.target.value)}
              placeholder="administracion@cliente.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-xs transition-all"
            />
          </div>

          {/* Teléfono / WhatsApp */}
          <div className="space-y-1.5">
            <label className="text-[9px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-1.5">
              <Phone size={11} className="text-slate-500" />
              <span>WhatsApp / Teléfono de Guardia</span>
            </label>
            <input
              type="text"
              value={clientLegalData.contact_phone || ''}
              onChange={(e) => updateClientLegalData('contact_phone', e.target.value)}
              placeholder="+54 9 11 4567-8900"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-xs transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const ALL_PAGES = proposalType === 'service' ? [
    { id: 'portada', name: 'Portada' },
    { id: 'legal', name: 'Cláusulas 1 a 3' },
    { id: 'legal2', name: 'Cláusulas 4 a 7 & Firmas' }
  ] : [
    { id: 'portada', name: 'Portada' },
    { id: 'alcance', name: 'Alcance & Entregables' },
    { id: 'hitos', name: 'Cronograma & Pagos' },
    { id: 'sem1-6', name: 'Desglose 1-8' },
    { id: 'sem9-16', name: 'Desglose 9-16' },
    { id: 'metodologia', name: 'Metodología' },
    { id: 'legal', name: 'Legal' }
  ];

  const isPageHidden = (pageId: string) => {
    const currentHidden = methodology?.hidden_pages || [];
    return currentHidden.includes(pageId);
  };

  const togglePageVisibility = (pageId: string) => {
    const currentHidden = methodology?.hidden_pages || [];
    let updatedHidden: string[];
    if (currentHidden.includes(pageId)) {
      updatedHidden = currentHidden.filter(id => id !== pageId);
    } else {
      updatedHidden = [...currentHidden, pageId];
    }
    setMethodology((prev: any) => ({
      ...(prev || DEFAULT_METHODOLOGY),
      hidden_pages: updatedHidden
    }));
  };

  const getPageFooter = (pageId: string) => {
    const hiddenPages = methodology?.hidden_pages || [];
    const visiblePages = ALL_PAGES.filter(p => !hiddenPages.includes(p.id));
    const pageIndex = visiblePages.findIndex(p => p.id === pageId);
    if (pageIndex === -1) {
      const conceptualIndex = ALL_PAGES.findIndex(p => p.id === pageId);
      return `Página ${conceptualIndex + 1} (Oculta)`;
    }
    return `Página ${pageIndex + 1} de ${visiblePages.length}`;
  };

  const getPageNumber = (tab: EditorTab) => {
    const hiddenPages = methodology?.hidden_pages || [];
    const visiblePages = ALL_PAGES.filter(p => !hiddenPages.includes(p.id));
    
    const targetId = tab === 'config' ? 'portada' : tab;
    const pageIndex = visiblePages.findIndex(p => p.id === targetId);
    
    if (pageIndex === -1) {
      const conceptualIndex = ALL_PAGES.findIndex(p => p.id === targetId);
      return `${conceptualIndex + 1} (Oculta)`;
    }
    
    return pageIndex + 1;
  };

  const renderVisibilityCard = (pageId: string, pageName: string) => {
    const isHidden = isPageHidden(pageId);
    return (
      <div className={`glass rounded-2xl p-4 border transition-all duration-300 flex items-center justify-between mb-6 ${
        isHidden 
          ? 'border-rose-500/30 bg-rose-500/[0.02] shadow-lg shadow-rose-500/[0.02]' 
          : 'border-white/5 bg-slate-900/40'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isHidden ? 'bg-rose-500/10 text-rose-400' : 'bg-white/5 text-slate-400'}`}>
            {isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
              Visibilidad de la Página
            </h4>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {isHidden 
                ? `La página "${pageName}" está oculta. No se exportará al PDF.` 
                : `La página "${pageName}" está activa y se incluirá en el PDF.`}
            </p>
          </div>
        </div>
        <button
          onClick={() => togglePageVisibility(pageId)}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
            isHidden 
              ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30' 
              : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
          }`}
        >
          {isHidden ? 'Mostrar Página' : 'Ocultar Página'}
        </button>
      </div>
    );
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
        return proposalType === 'service' ? renderPageLegalPart1() : renderPage7();
      case 'legal2':
        return renderPageLegalPart2();
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
                  title={!isLocalhost ? 'Información sobre renderizado Remotion MP4 local y previsualización en vivo' : 'Exportar video vertical 9:16'}
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
                  title={!isLocalhost ? 'Información sobre renderizado Remotion MP4 local y previsualización en vivo' : 'Exportar video horizontal 16:9'}
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
          {(proposalType === 'service' ? [
            { id: 'config' as EditorTab, label: 'Config', icon: Settings, pageId: null },
            { id: 'portada' as EditorTab, label: 'Portada (P1)', icon: BookOpen, pageId: 'portada' },
            { id: 'legal' as EditorTab, label: 'Cláusulas 1-4 (P2)', icon: FileSignature, pageId: 'legal' },
            { id: 'legal2' as EditorTab, label: 'Cláusulas 5-8 & Firmas (P3)', icon: FileCheck, pageId: 'legal2' },
          ] : [
            { id: 'config' as EditorTab, label: 'Config', icon: Settings, pageId: null },
            { id: 'portada' as EditorTab, label: 'Portada (P1)', icon: BookOpen, pageId: 'portada' },
            { id: 'alcance' as EditorTab, label: 'Alcance (P2)', icon: CheckCircle2, pageId: 'alcance' },
            { id: 'hitos' as EditorTab, label: 'Hitos (P3)', icon: Target, pageId: 'hitos' },
            { id: 'sem1-6' as EditorTab, label: 'Sem 1-6 (P4)', icon: Calendar, pageId: 'sem1-6' },
            { id: 'sem9-16' as EditorTab, label: 'Sem 9-16 (P5)', icon: Clock, pageId: 'sem9-16' },
            { id: 'metodologia' as EditorTab, label: 'Metodol. (P6)', icon: Scale, pageId: 'metodologia' },
            { id: 'legal' as EditorTab, label: 'Legal (P7)', icon: FileSignature, pageId: 'legal' },
          ]).map(({ id, label, icon: Icon, pageId }) => {
            const isHidden = pageId ? isPageHidden(pageId) : false;
            return (
              <button
                key={id}
                onClick={() => setActiveEditorTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300 border ${
                  activeEditorTab === id
                    ? 'bg-white/10 text-white border-white/20 shadow-lg'
                    : isHidden
                      ? 'text-rose-500/50 hover:text-rose-400 border-dashed border-rose-500/10 hover:border-rose-500/20 line-through bg-rose-500/[0.01]'
                      : 'text-slate-500 hover:text-slate-300 border-transparent hover:border-white/5'
                }`}
              >
                {isHidden ? <EyeOff size={14} className="text-rose-500/80" /> : <Icon size={14} />}
                {label}
              </button>
            );
          })}
          {proposalType !== 'service' && (
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
          )}
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
              {/* Modalidad / Tipo de Documento */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                  Tipo de Documento Comercial
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectProposalType('project')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      proposalType === 'project'
                        ? 'border-primary bg-primary/15 text-white shadow-lg shadow-primary/10'
                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm text-white mb-1">
                      <Briefcase size={16} className={proposalType === 'project' ? 'text-primary' : 'text-slate-400'} />
                      Proyecto de Desarrollo
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Desarrollo de software a medida por hitos, semanas de desarrollo y cronograma de sprints.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectProposalType('service')}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      proposalType === 'service'
                        ? 'border-purple-500 bg-purple-500/20 text-white shadow-lg shadow-purple-500/15'
                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm text-white mb-1">
                      <Zap size={16} className={proposalType === 'service' ? 'text-purple-400' : 'text-slate-400'} />
                      Contrato de Servicio
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Suscripción a plataforma, licencia de uso mensual recurrente y SLA de soporte técnico.
                    </p>
                  </button>
                </div>
              </div>

              {/* Selector de Producto CreAPP cuando es modo Servicio */}
              {proposalType === 'service' && (
                <div className="space-y-4 p-5 rounded-2xl bg-white/[0.02] border border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                        ¿Para qué producto es el contrato de servicio?
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Seleccioná la plataforma para aplicar automáticamente su paleta de colores, logotipo y contrato específico:
                      </p>
                    </div>
                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 shrink-0 shadow-sm self-start sm:self-auto">
                      <img src={creappLogoOfficial} alt="CreAPP" className="h-4.5 w-auto object-contain drop-shadow-[0_0_8px_rgba(255,45,120,0.4)]" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-200 whitespace-nowrap">
                        CreAPP <span className="text-primary font-bold">Software Lab</span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    {CREAPP_PRODUCTS.map((prod) => {
                      const isSelected = selectedProductId === prod.id;
                      return (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => handleApplyProductPreset(prod.id)}
                          className={`w-full p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer relative overflow-hidden group ${
                            isSelected
                              ? 'bg-gradient-to-r from-white/[0.09] to-white/[0.03] border-white/40 shadow-2xl ring-1'
                              : 'bg-white/[0.02] border-white/10 hover:border-white/25 hover:bg-white/[0.05]'
                          }`}
                          style={isSelected ? { borderColor: `${prod.brand_color_primary}aa`, boxShadow: `0 10px 30px -10px ${prod.brand_color_primary}33` } : {}}
                        >
                          {/* Accent top gradient line */}
                          <div
                            className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-300"
                            style={{
                              background: `linear-gradient(90deg, ${prod.brand_color_primary}, ${prod.brand_color_secondary})`,
                              opacity: isSelected ? 1 : 0.45,
                            }}
                          />

                          <div className="flex items-start justify-between gap-3.5">
                            {/* Logo + Titles */}
                            <div className="flex items-start gap-3.5 min-w-0 flex-1">
                              <div
                                className="w-12 h-12 rounded-xl bg-black/60 border border-white/10 p-2 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 shadow-inner"
                                style={{
                                  borderColor: isSelected ? `${prod.brand_color_primary}66` : 'rgba(255,255,255,0.1)',
                                  boxShadow: isSelected ? `0 0 15px ${prod.brand_color_primary}22` : undefined,
                                }}
                              >
                                <img
                                  src={prod.logo_url}
                                  alt={prod.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-black text-white tracking-tight whitespace-nowrap">
                                    {prod.name}
                                  </h4>
                                  <span
                                    className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap"
                                    style={{
                                      backgroundColor: `${prod.brand_color_primary}18`,
                                      color: prod.brand_color_primary,
                                      borderColor: `${prod.brand_color_primary}33`,
                                    }}
                                  >
                                    {prod.category}
                                  </span>
                                </div>
                                <p className="text-[11.5px] text-slate-300 mt-1 leading-relaxed">
                                  {prod.tagline}
                                </p>
                              </div>
                            </div>

                            {/* Color swatches */}
                            <div className="flex gap-1.5 items-center shrink-0 pt-0.5">
                              <span
                                className="w-3 h-3 rounded-full border border-black/60 shadow-sm"
                                style={{ backgroundColor: prod.brand_color_primary }}
                                title={`Primario: ${prod.brand_color_primary}`}
                              />
                              <span
                                className="w-3 h-3 rounded-full border border-black/60 shadow-sm"
                                style={{ backgroundColor: prod.brand_color_secondary }}
                                title={`Secundario: ${prod.brand_color_secondary}`}
                              />
                            </div>
                          </div>

                          {/* Footer with feature chips & selection action */}
                          <div className="mt-3.5 pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {prod.id === 'stacked' && (
                                <>
                                  <span className="text-[9px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">🍔 Comandas & KDS</span>
                                  <span className="text-[9px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">📱 Carta Digital QR</span>
                                  <span className="text-[9px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">🛵 Delivery Propio</span>
                                </>
                              )}
                              {prod.id === 'trazapp' && (
                                <>
                                  <span className="text-[9px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">🌿 Trazabilidad Reprocann</span>
                                  <span className="text-[9px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">📡 Telemetría IoT</span>
                                  <span className="text-[9px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">🏷️ Lotes & QR</span>
                                </>
                              )}
                              {prod.id === 'dental-ia' && (
                                <>
                                  <span className="text-[9px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">🤖 WhatsApp IA 24/7</span>
                                  <span className="text-[9px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">🦷 Odontograma FDI</span>
                                  <span className="text-[9px] font-semibold text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">📅 Turnero Clínico</span>
                                </>
                              )}
                            </div>

                            <div className="shrink-0 ml-auto">
                              {isSelected ? (
                                <span
                                  className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-xl border shadow-md whitespace-nowrap"
                                  style={{
                                    backgroundColor: `${prod.brand_color_primary}25`,
                                    color: prod.brand_color_primary,
                                    borderColor: `${prod.brand_color_primary}66`,
                                  }}
                                >
                                  ✓ Seleccionado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-white px-2.5 py-1 rounded-xl bg-white/5 group-hover:bg-white/10 border border-white/10 transition-all whitespace-nowrap">
                                  Aplicar preset <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                  {proposalType === 'service' ? 'Logo Oficial del Producto (SaaS)' : 'Logo del Cliente'}
                </label>
                
                {clientLogoUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/10">
                      <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-2 overflow-hidden shrink-0">
                        <img
                          src={clientLogoUrl}
                          alt="Logo Cliente"
                          className="max-w-full max-h-full object-contain transition-transform"
                          style={{ transform: `scale(${clientLogoScale / 100})` }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium truncate">{clientLogoUrl.split('/').pop()}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">URL del Logo Cargada</p>
                      </div>
                      <button
                        onClick={() => setClientLogoUrl('')}
                        className="p-2 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar logo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Controlador de Escala del Logo */}
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                          <Maximize2 size={12} className="text-primary" /> Tamaño / Escala del Logo
                        </span>
                        <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                          {clientLogoScale}%
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updateLogoScale(clientLogoScale - 10)}
                          className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="Reducir"
                        >
                          <Minus size={12} />
                        </button>

                        <input
                          type="range"
                          min="30"
                          max="250"
                          step="5"
                          value={clientLogoScale}
                          onChange={(e) => updateLogoScale(Number(e.target.value))}
                          className="w-full accent-primary bg-white/10 h-1.5 rounded-lg appearance-none cursor-pointer"
                        />

                        <button
                          type="button"
                          onClick={() => updateLogoScale(clientLogoScale + 10)}
                          className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                          title="Aumentar"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Botones de Presets Rápido */}
                      <div className="flex gap-1.5 pt-1">
                        {[50, 75, 100, 125, 150, 200].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => updateLogoScale(s)}
                            className={`flex-1 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                              clientLogoScale === s
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {s}%
                          </button>
                        ))}
                      </div>
                    </div>
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

            {/* Ficha Legal y Fiscal del Cliente */}
            {renderClientLegalCard()}
          </div>
        )}

        {/* PORTADA TAB */}
        {activeEditorTab === 'portada' && (
          <div className="space-y-6">
            {renderVisibilityCard('portada', 'Portada')}
            <h2 className="text-xl font-display font-black text-white">
              Portada (P1) — Contenido
            </h2>

            <div className="glass rounded-2xl p-8 border border-white/5 space-y-8 flex flex-col items-stretch relative overflow-hidden">
              {/* Top accent line resembling the cover page */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary"></div>

              {/* Cover Page Input Mockup */}
              <div className="flex flex-col items-center text-center gap-6 mt-4 p-6 rounded-2xl bg-slate-950/40 border border-white/5 shadow-inner">
                {/* Visual Header Logo */}
                <div className="flex flex-col items-center">
                  {proposalType === 'service' ? (
                    clientLogoUrl ? (
                      <div className="h-14 flex items-center justify-center p-2 rounded-xl bg-white/[0.03] border border-white/10">
                        <img src={clientLogoUrl} alt="Logo Producto" className="h-10 object-contain" />
                      </div>
                    ) : (
                      <div className="text-[10px] text-primary uppercase tracking-[0.2em] font-black border border-primary/20 px-3 py-1.5 rounded-lg bg-primary/5">
                        [ LOGO PRODUCTO: {heroTitle || 'SAAS'} ]
                      </div>
                    )
                  ) : (
                    <img src={creappLogoOfficial} alt="CreAPP Logo" className="h-8 object-contain opacity-80" />
                  )}
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
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">
                      Texto Descriptivo
                    </label>
                    <button
                      type="button"
                      onClick={() => handleOptimizeField('description', description, setDescription)}
                      disabled={optimizingFieldId === 'description' || !description || !description.trim()}
                      className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5"
                      title="Optimizar texto con Inteligencia Artificial de Gemini"
                    >
                      {optimizingFieldId === 'description' ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                      )}
                      <span>Gemini AI</span>
                    </button>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onWheel={(e) => e.stopPropagation()}
                    rows={4}
                    placeholder="Desarrollo e integración de cbkr App v2, una solución móvil..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-slate-300 placeholder-slate-600 focus:outline-none focus:border-primary/50 text-xs leading-relaxed resize-y min-h-[96px] overscroll-contain transition-all font-light"
                    style={{ overscrollBehavior: 'contain' }}
                  />
                </div>

                {/* Bottom details block mimicking cover page columns */}
                <div className="w-full grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5 text-left">
                  {/* Nombre del Cliente / Razón Social */}
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">
                      Nombre del Cliente / Razón Social
                    </label>
                    <input
                      type="text"
                      value={clientLegalData.company_name || clientName}
                      onChange={(e) => updateClientLegalData('company_name', e.target.value)}
                      placeholder="Ej. Astillero Vision / La Trattoria S.R.L."
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

            {/* Ficha Legal y Fiscal del Cliente */}
            {renderClientLegalCard()}
          </div>
        )}

        {/* ALCANCE TAB */}
        {activeEditorTab === 'alcance' && (
          <div className="space-y-6">
            {renderVisibilityCard('alcance', 'Alcance & Entregables')}
            <Section title="Introducciones de Alcance & Exclusiones">
              <div className="p-4 rounded-xl bg-[#090d16] border border-white/5 shadow-lg space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Párrafo Principal de Alcance (Inclusiones)</label>
                    <button
                      type="button"
                      onClick={() => handleOptimizeField('scope_intro', methodology?.scope_intro ?? '', (newVal) => updateMethodologyField('scope_intro', newVal))}
                      disabled={optimizingFieldId === 'scope_intro' || !(methodology?.scope_intro ?? '').trim()}
                      className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5"
                    >
                      {optimizingFieldId === 'scope_intro' ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                      )}
                      <span>Gemini AI</span>
                    </button>
                  </div>
                  <textarea
                    value={methodology?.scope_intro ?? DEFAULT_METHODOLOGY.scope_intro}
                    onChange={(e) => updateMethodologyField('scope_intro', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[60px]"
                    placeholder="Detalle técnico del desarrollo y los entregables comprometidos..."
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Párrafo Principal de Exclusiones (Fuera de Alcance)</label>
                    <button
                      type="button"
                      onClick={() => handleOptimizeField('exclusions_intro', methodology?.exclusions_intro ?? '', (newVal) => updateMethodologyField('exclusions_intro', newVal))}
                      disabled={optimizingFieldId === 'exclusions_intro' || !(methodology?.exclusions_intro ?? '').trim()}
                      className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5"
                    >
                      {optimizingFieldId === 'exclusions_intro' ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                      )}
                      <span>Gemini AI</span>
                    </button>
                  </div>
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
                              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg pl-3 pr-20 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all resize-none overflow-hidden" 
                            />
                            <button
                              type="button"
                              onClick={() => handleOptimizeField(`incl-desc-${i}`, item.description || '', (newVal) => updateItem(inclusions, setInclusions, i, 'description', newVal))}
                              disabled={optimizingFieldId === `incl-desc-${i}` || !(item.description || '').trim()}
                              className="absolute right-14 top-2 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-black/40 hover:bg-black/60 p-1 rounded-md border border-white/5"
                              title="Optimizar descripción con Gemini"
                            >
                              {optimizingFieldId === `incl-desc-${i}` ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                              )}
                            </button>
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
            {renderVisibilityCard('hitos', proposalType === 'service' ? 'Plan & SLA' : 'Cronograma & Pagos')}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h2 className="text-xl font-display font-black text-white">
                {proposalType === 'service' ? 'Plan de Servicio, Tarifas Recurrentes & SLA' : 'Finanzas & Cronograma (P3 / P7)'}
              </h2>
              {/* Presupuesto Consolidado & Divisa */}
              <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                <div className="flex items-center gap-1.5 border-r border-white/10 pr-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Divisa:</span>
                  <input
                    type="text"
                    value={getCurrencyFromTotal(totalValue)}
                    onChange={(e) => {
                      const newCurrency = e.target.value.toUpperCase().replace(/[^A-Z\$]/g, '').slice(0, 5);
                      const amount = getValueFromTotal(totalValue);
                      handleUpdateTotalValue(`${newCurrency} ${amount}`);
                    }}
                    placeholder="USD"
                    className="bg-transparent text-primary text-sm font-black w-14 focus:outline-none text-center font-mono border-b border-white/10 focus:border-primary pb-0.5"
                  />
                </div>
                <div className="flex items-center gap-1.5 pl-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Monto:</span>
                  <input
                    type="text"
                    value={getValueFromTotal(totalValue)}
                    onChange={(e) => {
                      const currency = getCurrencyFromTotal(totalValue);
                      handleUpdateTotalValue(`${currency} ${e.target.value}`);
                    }}
                    placeholder="2.200"
                    className="bg-transparent text-primary text-sm font-black w-24 focus:outline-none text-right font-mono border-b border-white/10 focus:border-primary pb-0.5"
                  />
                </div>
              </div>
            </div>

            {proposalType === 'service' ? (
              <div className="space-y-6">
                <Section title="Configuración del Plan de Servicio & Recurrencia">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Nombre del Plan / Servicio
                      </label>
                      <input
                        type="text"
                        value={serviceDetails.plan_name || ''}
                        onChange={(e) => updateServiceDetailField('plan_name', e.target.value)}
                        placeholder="Stacked Business Cloud"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Periodicidad de Facturación
                      </label>
                      <select
                        value={serviceDetails.billing_frequency || 'monthly'}
                        onChange={(e) => updateServiceDetailField('billing_frequency', e.target.value as any)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                      >
                        <option value="monthly" className="bg-slate-950 text-white">Mensual (Mes adelantado)</option>
                        <option value="quarterly" className="bg-slate-950 text-white">Trimestral</option>
                        <option value="annual" className="bg-slate-950 text-white">Anual</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Tarifa Recurrente (Fee)
                      </label>
                      <input
                        type="text"
                        value={serviceDetails.recurring_fee || totalValue}
                        onChange={(e) => {
                          updateServiceDetailField('recurring_fee', e.target.value);
                          setTotalValue(e.target.value);
                        }}
                        placeholder="$350 USD / mes"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50 font-mono text-purple-300 font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Costo de Setup / Onboarding
                      </label>
                      <input
                        type="text"
                        value={serviceDetails.setup_fee || ''}
                        onChange={(e) => updateServiceDetailField('setup_fee', e.target.value)}
                        placeholder="Bonificado (o $150 USD)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Plazo Mínimo de Permanencia
                      </label>
                      <input
                        type="text"
                        value={serviceDetails.min_term_months || ''}
                        onChange={(e) => updateServiceDetailField('min_term_months', e.target.value)}
                        placeholder="6 meses"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    </div>

                    <div className="space-y-1.5 flex flex-col justify-end pb-1">
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={serviceDetails.auto_renew ?? true}
                          onChange={(e) => updateServiceDetailField('auto_renew', e.target.checked)}
                          className="rounded border-white/20 text-purple-500 focus:ring-0"
                        />
                        <span className="text-xs text-slate-300 font-medium">Renovación automática con preaviso de 30 días</span>
                      </label>
                    </div>
                  </div>
                </Section>

                <Section title="Acuerdo de Nivel de Servicio (SLA) & Soporte">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Disponibilidad Uptime Garantizada
                      </label>
                      <input
                        type="text"
                        value={serviceDetails.sla_uptime || ''}
                        onChange={(e) => updateServiceDetailField('sla_uptime', e.target.value)}
                        placeholder="99.5%"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Canales Oficiales de Soporte
                      </label>
                      <input
                        type="text"
                        value={serviceDetails.support_channels || ''}
                        onChange={(e) => updateServiceDetailField('support_channels', e.target.value)}
                        placeholder="WhatsApp Prioritario + Tickets/Email"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Tiempo de Respuesta Crítico (P1 - Interrupción)
                      </label>
                      <input
                        type="text"
                        value={serviceDetails.response_time_critical || ''}
                        onChange={(e) => updateServiceDetailField('response_time_critical', e.target.value)}
                        placeholder="< 2 horas"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Tiempo de Respuesta Normal (P2 - Consultas)
                      </label>
                      <input
                        type="text"
                        value={serviceDetails.response_time_normal || ''}
                        onChange={(e) => updateServiceDetailField('response_time_normal', e.target.value)}
                        placeholder="< 12 horas hábiles"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Capacidades & Límites del Plan">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Usuarios Concurrentes / Cuentas
                      </label>
                      <input
                        type="text"
                        value={serviceDetails.limits?.users || ''}
                        onChange={(e) => updateServiceLimitField('users', e.target.value)}
                        placeholder="Ilimitados"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Sucursales / Locales
                      </label>
                      <input
                        type="text"
                        value={serviceDetails.limits?.branches || ''}
                        onChange={(e) => updateServiceLimitField('branches', e.target.value)}
                        placeholder="Hasta 3 sucursales"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Almacenamiento Cloud
                      </label>
                      <input
                        type="text"
                        value={serviceDetails.limits?.storage || ''}
                        onChange={(e) => updateServiceLimitField('storage', e.target.value)}
                        placeholder="50 GB Cloud Storage"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                        Seguridad & Backups
                      </label>
                      <input
                        type="text"
                        value={serviceDetails.limits?.custom_notes || ''}
                        onChange={(e) => updateServiceLimitField('custom_notes', e.target.value)}
                        placeholder="Backups automáticos diarios y cifrado SSL"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500/50"
                      />
                    </div>
                  </div>
                </Section>
              </div>
            ) : (
              <>
            <Section title="Introducción de Cronograma">
              <div className="p-4 rounded-xl bg-[#090d16] border border-white/5 shadow-lg space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Párrafo Principal de Fases & Entregas</label>
                    <button
                      type="button"
                      onClick={() => handleOptimizeField('phases_intro', methodology?.phases_intro ?? '', (newVal) => updateMethodologyField('phases_intro', newVal))}
                      disabled={optimizingFieldId === 'phases_intro' || !(methodology?.phases_intro ?? '').trim()}
                      className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5"
                    >
                      {optimizingFieldId === 'phases_intro' ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                      )}
                      <span>Gemini AI</span>
                    </button>
                  </div>
                  <textarea
                    value={methodology?.phases_intro ?? DEFAULT_METHODOLOGY.phases_intro}
                    onChange={(e) => updateMethodologyField('phases_intro', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[60px]"
                    placeholder="El plan de esfuerzo comprende un periodo de 4 meses..."
                  />
                </div>
              </div>
            </Section>

            {/* Toggle para Ocultar Columna Inversión */}
            <div className="p-4 rounded-xl bg-[#090d16] border border-white/5 shadow-lg flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block">Ocultar columna "Inversión" en las Fases</span>
                <span className="text-[11px] text-slate-400">Recomendado cuando el desglose financiero se rige exclusivamente por el Esquema de Pagos / Hitos al pie de la página.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={methodology?.hide_milestone_prices ?? false}
                  onChange={(e) => updateMethodologyField('hide_milestone_prices', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* CRONOGRAMA DE FASES */}
            <Section 
              title="Cronograma de Sprints / Fases" 
              headerRight={
                <div className="flex items-center bg-[#090d16] p-1 rounded-xl border border-white/10 gap-1 shadow-inner">
                  <span className="text-[9px] font-mono font-bold text-slate-400 px-1.5 uppercase">Divisa:</span>
                  <button
                    type="button"
                    onClick={() => handleMilestoneCurrencyChange('ARS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                      activeMilestoneCurrency === 'ARS'
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    $ ARS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMilestoneCurrencyChange('USD')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                      activeMilestoneCurrency === 'USD'
                        ? 'bg-primary/25 text-primary border border-primary/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              }
              onAdd={() => setMilestones([...milestones, { week_range: '', title: '', icon_name: 'Rocket', description: '', control_milestone: '', price: '' }])}
              disabledAdd={milestones.length >= 4}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 -mt-2 mb-4">
                <p className="text-slate-500 text-xs">Mapea las fases semanales que se muestran en el documento y el video (máx 4).</p>
                {milestoneSum > 0 && (
                  <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 text-[11px]">
                    <span className="text-slate-400">Total Fases:</span>
                    <strong className="text-white font-mono">
                      ${milestoneSum.toLocaleString('es-AR')} {activeMilestoneCurrency}
                    </strong>
                    <button
                      type="button"
                      onClick={() => handleUpdateTotalValue(`${activeMilestoneCurrency} ${milestoneSum.toLocaleString('es-AR')}`)}
                      className="text-[9px] text-primary hover:underline font-bold uppercase tracking-wider ml-1 cursor-pointer"
                      title="Sincronizar este monto como Total del Proyecto"
                    >
                      Copiar a Total
                    </button>
                  </div>
                )}
              </div>
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

                            <div className="w-32 shrink-0">
                              <input 
                                type="text" 
                                value={item.week_range || ''} 
                                onChange={(e) => updateItem(milestones, setMilestones, i, 'week_range', e.target.value)} 
                                placeholder="Semanas (ej: 1-4)" 
                                className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all" 
                              />
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
                              className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg pl-3 pr-20 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all resize-none overflow-hidden" 
                            />
                            <button
                              type="button"
                              onClick={() => handleOptimizeField(`mile-desc-${i}`, item.description || '', (newVal) => updateItem(milestones, setMilestones, i, 'description', newVal))}
                              disabled={optimizingFieldId === `mile-desc-${i}` || !(item.description || '').trim()}
                              className="absolute right-14 top-2 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-black/40 hover:bg-black/60 p-1 rounded-md border border-white/5"
                              title="Optimizar descripción con Gemini"
                            >
                              {optimizingFieldId === `mile-desc-${i}` ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                              )}
                            </button>
                            <span className={`absolute right-3 top-2.5 text-[9px] font-mono font-bold select-none ${
                              descLen > 240 ? 'text-red-400' : 'text-slate-500'
                            }`}>
                              {descLen}/240
                            </span>
                          </div>

                          {/* Row 3: Control Milestone + Price */}
                          <div className={methodology?.hide_milestone_prices ? "block" : "grid grid-cols-2 gap-3"}>
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

                            {!methodology?.hide_milestone_prices && (
                              <div className="relative">
                                <input 
                                  type="text" 
                                  value={item.price || ''} 
                                  onChange={(e) => updateItem(milestones, setMilestones, i, 'price', e.target.value)} 
                                  placeholder={activeMilestoneCurrency === 'ARS' ? "Precio de Fase (ej: 767500)" : "Precio de Fase (ej: 750)"} 
                                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-lg pl-3 pr-24 py-2 text-white text-sm focus:outline-none focus:border-primary/50 placeholder-slate-600 font-medium transition-all" 
                                />
                                <div className="absolute right-2 top-2 flex items-center gap-1.5 pointer-events-none">
                                  <span className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded ${
                                    activeMilestoneCurrency === 'ARS'
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                      : 'bg-primary/20 text-primary border border-primary/30'
                                  }`}>
                                    {activeMilestoneCurrency}
                                  </span>
                                  <span className={`text-[9px] font-mono font-bold select-none ${
                                    priceLen > 15 ? 'text-red-400' : 'text-slate-500'
                                  }`}>
                                    {priceLen}/15
                                  </span>
                                </div>
                              </div>
                            )}
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
            </>
            )}
          </div>
        )}

        {/* SEM 1-6 TAB */}
        {activeEditorTab === 'sem1-6' && (
          <div className="space-y-6">
            {renderVisibilityCard('sem1-6', 'Desglose Semanas 1 a 8')}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Párrafo Principal de Desglose (Semanas 1-8)</label>
                    <button
                      type="button"
                      onClick={() => handleOptimizeField('weekly_breakdown_intro_1_8', methodology?.weekly_breakdown_intro_1_8 ?? '', (newVal) => updateMethodologyField('weekly_breakdown_intro_1_8', newVal))}
                      disabled={optimizingFieldId === 'weekly_breakdown_intro_1_8' || !(methodology?.weekly_breakdown_intro_1_8 ?? '').trim()}
                      className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5"
                    >
                      {optimizingFieldId === 'weekly_breakdown_intro_1_8' ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                      )}
                      <span>Gemini AI</span>
                    </button>
                  </div>
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
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Detalle de Entregable</label>
                              <button
                                type="button"
                                onClick={() => handleOptimizeField(`wb-detail-${globalIndex}`, item.detail || '', (newVal) => {
                                  const newBreakdown = [...weeklyBreakdown];
                                  newBreakdown[globalIndex] = { ...newBreakdown[globalIndex], detail: newVal };
                                  setWeeklyBreakdown(newBreakdown);
                                })}
                                disabled={optimizingFieldId === `wb-detail-${globalIndex}` || !(item.detail || '').trim()}
                                className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5"
                              >
                                {optimizingFieldId === `wb-detail-${globalIndex}` ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                                )}
                                <span>Gemini AI</span>
                              </button>
                            </div>
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
            {renderVisibilityCard('sem9-16', 'Desglose Semanas 9 a 16')}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Párrafo Principal de Desglose (Semanas 9-16)</label>
                    <button
                      type="button"
                      onClick={() => handleOptimizeField('weekly_breakdown_intro_9_16', methodology?.weekly_breakdown_intro_9_16 ?? '', (newVal) => updateMethodologyField('weekly_breakdown_intro_9_16', newVal))}
                      disabled={optimizingFieldId === 'weekly_breakdown_intro_9_16' || !(methodology?.weekly_breakdown_intro_9_16 ?? '').trim()}
                      className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5"
                    >
                      {optimizingFieldId === 'weekly_breakdown_intro_9_16' ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                      )}
                      <span>Gemini AI</span>
                    </button>
                  </div>
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
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Detalle de Entregable</label>
                              <button
                                type="button"
                                onClick={() => handleOptimizeField(`wb-detail-${globalIndex}`, item.detail || '', (newVal) => {
                                  const newBreakdown = [...weeklyBreakdown];
                                  newBreakdown[globalIndex] = { ...newBreakdown[globalIndex], detail: newVal };
                                  setWeeklyBreakdown(newBreakdown);
                                })}
                                disabled={optimizingFieldId === `wb-detail-${globalIndex}` || !(item.detail || '').trim()}
                                className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5"
                              >
                                {optimizingFieldId === `wb-detail-${globalIndex}` ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                                )}
                                <span>Gemini AI</span>
                              </button>
                            </div>
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
            {renderVisibilityCard('metodologia', 'Metodología')}
            <Section title="Introducción de Metodología">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Texto Introductorio / Párrafo Principal</label>
                  <button
                    type="button"
                    onClick={() => handleOptimizeField('intro_text', methodology?.intro_text ?? '', (newVal) => updateMethodologyField('intro_text', newVal))}
                    disabled={optimizingFieldId === 'intro_text' || !(methodology?.intro_text ?? '').trim()}
                    className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5"
                  >
                    {optimizingFieldId === 'intro_text' ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                    )}
                    <span>Gemini AI</span>
                  </button>
                </div>
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
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Agrega, edita o elimina los pilares de tu metodología de trabajo.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const PRESET_COLORS = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#6366f1'];
                      const current = getPillars(methodology, brandPrimary, brandSecondary);
                      const nextColor = PRESET_COLORS[current.length % PRESET_COLORS.length];
                      const updated: MethodologyPillar[] = [
                        ...current,
                        {
                          title: `PILAR ${current.length + 1}`,
                          description: 'Trabajo coordinado e intensivo para asegurar el avance predecible y la usabilidad de la solución.',
                          color: nextColor
                        }
                      ];
                      updateMethodologyField('pillars', updated);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Pilar</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {getPillars(methodology, brandPrimary, brandSecondary).map((pilar, index) => {
                    const currentPillars = getPillars(methodology, brandPrimary, brandSecondary);
                    const PRESET_COLOR_SWATCHES = [
                      { name: 'Morado', hex: '#a855f7' },
                      { name: 'Rosa', hex: '#ec4899' },
                      { name: 'Azul', hex: '#3b82f6' },
                      { name: 'Esmeralda', hex: '#10b981' },
                      { name: 'Ámbar', hex: '#f59e0b' },
                      { name: 'Celeste', hex: '#06b6d4' },
                      { name: 'Rojo', hex: '#ef4444' },
                    ];

                    const handleUpdatePillar = (updates: Partial<MethodologyPillar>) => {
                      const updated = currentPillars.map((p, i) => i === index ? { ...p, ...updates } : p);
                      updateMethodologyField('pillars', updated);
                    };

                    const handleRemovePillar = () => {
                      if (currentPillars.length <= 1) return;
                      const updated = currentPillars.filter((_, i) => i !== index);
                      updateMethodologyField('pillars', updated);
                    };

                    const pColor = pilar.color || (index % 2 === 0 ? brandPrimary : brandSecondary);

                    return (
                      <div key={index} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 relative">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full shrink-0 border border-white/20 shadow-sm"
                              style={{ backgroundColor: pColor }}
                            />
                            <span className="font-bold text-xs uppercase tracking-wider text-white">
                              Pilar {index + 1}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Color Selector */}
                            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                              {PRESET_COLOR_SWATCHES.map((c) => (
                                <button
                                  key={c.hex}
                                  type="button"
                                  title={c.name}
                                  onClick={() => handleUpdatePillar({ color: c.hex })}
                                  className={`w-3.5 h-3.5 rounded-full transition-transform ${
                                    (pColor).toLowerCase() === c.hex.toLowerCase()
                                      ? 'scale-125 ring-2 ring-white'
                                      : 'opacity-70 hover:opacity-100 hover:scale-110'
                                  }`}
                                  style={{ backgroundColor: c.hex }}
                                />
                              ))}
                              <label className="relative flex items-center justify-center cursor-pointer ml-0.5">
                                <input
                                  type="color"
                                  value={pColor}
                                  onChange={(e) => handleUpdatePillar({ color: e.target.value })}
                                  className="sr-only"
                                />
                                <div
                                  className="w-3.5 h-3.5 rounded-full border border-white/40 flex items-center justify-center text-[7px] text-white font-black"
                                  title="Color personalizado"
                                  style={{ backgroundColor: pColor }}
                                >
                                  +
                                </div>
                              </label>
                            </div>

                            {currentPillars.length > 1 && (
                              <button
                                type="button"
                                onClick={handleRemovePillar}
                                className="text-slate-400 hover:text-red-400 transition-colors p-1"
                                title="Eliminar pilar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Título</label>
                          <input
                            type="text"
                            value={pilar.title}
                            onChange={(e) => handleUpdatePillar({ title: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                            placeholder="Título del pilar..."
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Descripción</label>
                            <button
                              type="button"
                              onClick={() => handleOptimizeField(`pillar_${index}_text`, pilar.description, (newVal) => handleUpdatePillar({ description: newVal }))}
                              disabled={optimizingFieldId === `pillar_${index}_text` || !pilar.description.trim()}
                              className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5"
                            >
                              {optimizingFieldId === `pillar_${index}_text` ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                              )}
                              <span>Gemini AI</span>
                            </button>
                          </div>
                          <textarea
                            value={pilar.description}
                            onChange={(e) => handleUpdatePillar({ description: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[60px]"
                            placeholder="Descripción detallada del pilar..."
                          />
                          <span className="text-[9px] text-slate-500 block mt-1">Usa <code>{"{client_name}"}</code> para insertar el nombre del cliente automáticamente.</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Section>

            <Section title="Agenda Semanal (Lun - Vie)">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white">Ocultar sección "Agenda Semanal"</div>
                    <div className="text-[11px] text-slate-400">Recomendado si el proyecto no requiere detallar la rutina semanal (Lun - Vie).</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={methodology?.hide_weekly_schedule ?? false}
                      onChange={(e) => updateMethodologyField('hide_weekly_schedule', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {!methodology?.hide_weekly_schedule && (
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Descripción</label>
                      <button
                        type="button"
                        onClick={() => handleOptimizeField('schedule_monday_text', methodology?.schedule_monday_text ?? '', (newVal) => updateMethodologyField('schedule_monday_text', newVal))}
                        disabled={optimizingFieldId === 'schedule_monday_text' || !(methodology?.schedule_monday_text ?? '').trim()}
                        className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5"
                      >
                        {optimizingFieldId === 'schedule_monday_text' ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                        )}
                        <span>Gemini AI</span>
                      </button>
                    </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Descripción</label>
                      <button
                        type="button"
                        onClick={() => handleOptimizeField('schedule_tuesday_text', methodology?.schedule_tuesday_text ?? '', (newVal) => updateMethodologyField('schedule_tuesday_text', newVal))}
                        disabled={optimizingFieldId === 'schedule_tuesday_text' || !(methodology?.schedule_tuesday_text ?? '').trim()}
                        className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5"
                      >
                        {optimizingFieldId === 'schedule_tuesday_text' ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                        )}
                        <span>Gemini AI</span>
                      </button>
                    </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Descripción</label>
                      <button
                        type="button"
                        onClick={() => handleOptimizeField('schedule_friday_text', methodology?.schedule_friday_text ?? '', (newVal) => updateMethodologyField('schedule_friday_text', newVal))}
                        disabled={optimizingFieldId === 'schedule_friday_text' || !(methodology?.schedule_friday_text ?? '').trim()}
                        className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/5"
                      >
                        {optimizingFieldId === 'schedule_friday_text' ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                        )}
                        <span>Gemini AI</span>
                      </button>
                    </div>
                    <textarea
                      value={methodology?.schedule_friday_text ?? DEFAULT_METHODOLOGY.schedule_friday_text}
                      onChange={(e) => updateMethodologyField('schedule_friday_text', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 min-h-[50px]"
                    />
                  </div>
                </div>
              </div>
            )}
              </div>
            </Section>
          </div>
        )}

        {/* LEGAL TAB */}
        {(activeEditorTab === 'legal' || activeEditorTab === 'legal2') && (
          <div className="space-y-6">
            {renderVisibilityCard(activeEditorTab, proposalType === 'service' ? (activeEditorTab === 'legal' ? 'Contrato de Servicio — Pág. 1 (Cláusulas 1 a 4)' : 'Contrato de Servicio — Pág. 2 (Cláusulas 5 a 8 & Firmas)') : 'Legal')}

            {proposalType === 'service' && (
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Página Visualizada:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab('legal')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeEditorTab === 'legal'
                        ? 'bg-primary text-white shadow-md'
                        : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    Pág. 2: Cláusulas 1 a 4
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEditorTab('legal2')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeEditorTab === 'legal2'
                        ? 'bg-primary text-white shadow-md'
                        : 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    Pág. 3: Cláusulas 5 a 8 & Firmas
                  </button>
                </div>
              </div>
            )}

            {/* Quick Contract Presets Toolbar */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300 text-xs font-black uppercase tracking-wider">
                  <Zap size={15} className="text-amber-400" />
                  <span>Plantillas Oficiales de Contrato CreAPP</span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">1-Click Preset</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setContractText(STACKED_PRESET.contract_template);
                    setContractDescription(STACKED_PRESET.contract_description);
                    if (STACKED_PRESET.default_service_details.recurring_fee) {
                      setTotalValue(STACKED_PRESET.default_service_details.recurring_fee);
                    }
                    setShowToast(true);
                  }}
                  className={`px-3 py-2 rounded-xl text-left border transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                    contractText.includes('STACKED')
                      ? 'bg-[#FF6B2C]/20 border-[#FF6B2C]/60 text-white shadow-md shadow-[#FF6B2C]/10'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Cargar contrato de licenciamiento Stacked SaaS"
                >
                  <span className="text-base">🍔</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-wider truncate">Stacked</div>
                    <div className="text-[9px] text-slate-400 truncate">SaaS Gastronomía</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setContractText(TRAZAPP_PRESET.contract_template);
                    setContractDescription(TRAZAPP_PRESET.contract_description);
                    if (TRAZAPP_PRESET.default_service_details.recurring_fee) {
                      setTotalValue(TRAZAPP_PRESET.default_service_details.recurring_fee);
                    }
                    setShowToast(true);
                  }}
                  className={`px-3 py-2 rounded-xl text-left border transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                    contractText.includes('TRAZAPP')
                      ? 'bg-emerald-600/20 border-emerald-500/60 text-white shadow-md shadow-emerald-500/10'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Cargar contrato de licenciamiento Trazapp SaaS"
                >
                  <span className="text-base">🌿</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-wider truncate">Trazapp</div>
                    <div className="text-[9px] text-slate-400 truncate">Agrotech & Club</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setContractText(DENTALIA_PRESET.contract_template);
                    setContractDescription(DENTALIA_PRESET.contract_description);
                    if (DENTALIA_PRESET.default_service_details.recurring_fee) {
                      setTotalValue(DENTALIA_PRESET.default_service_details.recurring_fee);
                    }
                    setShowToast(true);
                  }}
                  className={`px-3 py-2 rounded-xl text-left border transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                    contractText.includes('DENTAL-IA')
                      ? 'bg-blue-600/20 border-blue-500/60 text-white shadow-md shadow-blue-500/10'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Cargar contrato de licenciamiento Dental-IA SaaS"
                >
                  <span className="text-base">🦷</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-wider truncate">Dental-IA</div>
                    <div className="text-[9px] text-slate-400 truncate">Clínicas con IA</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setContractText(DEVELOPMENT_CONTRACT_TEMPLATE);
                    setContractDescription(DEVELOPMENT_CONTRACT_DESCRIPTION);
                    setShowToast(true);
                  }}
                  className={`px-3 py-2 rounded-xl text-left border transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                    !contractText.includes('STACKED') && !contractText.includes('TRAZAPP') && !contractText.includes('DENTAL-IA')
                      ? 'bg-purple-600/20 border-purple-500/60 text-white shadow-md shadow-purple-500/10'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                  title="Cargar contrato tradicional de desarrollo a medida"
                >
                  <Briefcase size={16} className="text-purple-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-wider truncate">Desarrollo</div>
                    <div className="text-[9px] text-slate-400 truncate">A Medida</div>
                  </div>
                </button>
              </div>
            </div>

            {/* CARD 1: TÉRMINOS CLAVE DEL CONTRATO (Campos estructurados e intuitivos) */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-sm">
                    <FileSignature size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Parámetros Principales del Contrato</h4>
                    <p className="text-[11px] text-slate-400">Modifica los datos clave sin necesidad de buscar dentro del texto legal.</p>
                  </div>
                </div>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Sincronizado
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Switcher de Divisa del Contrato */}
                <div className="space-y-1.5 col-span-1 sm:col-span-2 bg-white/[0.02] border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <DollarSign size={14} />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-white uppercase tracking-wider block">Divisa de la Página Legal & Contrato</span>
                      <span className="text-[9px] text-slate-400">Independiente de los costos de fases y proveedores.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-xl border border-white/10 shadow-inner">
                    <button
                      type="button"
                      onClick={() => handleLegalCurrencyChange('ARS')}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        activeLegalCurrency === 'ARS'
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      $ ARS (Pesos)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLegalCurrencyChange('USD')}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        activeLegalCurrency === 'USD'
                          ? 'bg-primary/25 text-primary border border-primary/40 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      $ USD (Dólares)
                    </button>
                  </div>
                </div>

                {/* Cliente / Razón Social */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <Building2 size={12} className="text-primary" />
                    Cliente / Razón Social
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: CBKR Burgers S.R.L."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-all font-medium"
                  />
                  <span className="text-[9px] text-slate-500 block">Reemplaza automáticamente a <code className="text-primary/80 font-mono">{'{client_name}'}</code></span>
                </div>

                {/* Inversión Total / Honorarios de Desarrollo */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <DollarSign size={12} className="text-emerald-400" />
                    Inversión Total / Honorarios
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-500 font-bold text-xs">$</span>
                    <input
                      type="text"
                      value={cleanNumberString(totalValue)}
                      onChange={(e) => {
                        const clean = cleanNumberString(e.target.value);
                        handleUpdateTotalValue(clean);
                      }}
                      placeholder="1.500.000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-16 py-2.5 text-xs text-emerald-300 font-bold placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
                    />
                    <span className="absolute right-3 text-[10px] font-mono font-bold text-slate-400 uppercase">
                      {activeLegalCurrency}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block">Reemplaza automáticamente a <code className="text-emerald-400/80 font-mono">{'{total_value}'}</code></span>
                </div>

                {/* Abono Mensual / Mantenimiento Operativo */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <DollarSign size={12} className="text-teal-400" />
                    Abono Mensual / Soporte & SLA
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-500 font-bold text-xs">$</span>
                    <input
                      type="text"
                      value={cleanNumberString(methodology?.monthly_fee || serviceDetails?.recurring_fee || totalValue)}
                      onChange={(e) => {
                        const clean = cleanNumberString(e.target.value);
                        setMethodology((prev: any) => ({
                          ...(prev || DEFAULT_METHODOLOGY),
                          monthly_fee: clean,
                        }));
                        if (proposalType === 'service') {
                          updateServiceDetailField('recurring_fee', clean);
                        }
                      }}
                      placeholder="1.500.000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-24 py-2.5 text-xs text-teal-300 font-bold placeholder-slate-600 focus:outline-none focus:border-teal-500/50 transition-all font-mono"
                    />
                    <span className="absolute right-3 text-[10px] font-mono font-bold text-slate-400 uppercase">
                      {activeLegalCurrency} / mes
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 block">Reemplaza automáticamente a <code className="text-teal-400/80 font-mono">{'{monthly_fee}'}</code></span>
                </div>

                {/* Vigencia Inicial */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={12} className="text-purple-400" />
                    Vigencia Inicial / Plazo
                  </label>
                  <input
                    type="text"
                    value={serviceDetails.min_term_months || serviceDetails.minimum_commitment || '6 Meses'}
                    onChange={(e) => updateServiceDetailField('min_term_months', e.target.value)}
                    placeholder="Ej: 6 Meses ó 12 Meses"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-purple-300 font-bold placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                  <span className="text-[9px] text-slate-500 block">Reemplaza automáticamente a <code className="text-purple-400/80 font-mono">{'{min_term_months}'}</code></span>
                </div>

                {/* Fecha del Contrato */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar size={12} className="text-blue-400" />
                    Fecha del Contrato
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    placeholder="Ej: 21 de Marzo, 2026"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-all"
                  />
                  <span className="text-[9px] text-slate-500 block">Reemplaza automáticamente a <code className="text-blue-400/80 font-mono">{'{date}'}</code></span>
                </div>

                {/* Localidad / Jurisdicción */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                    <MapPin size={12} className="text-amber-400" />
                    Localidad / Jurisdicción
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej: Buenos Aires, Argentina"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-all"
                  />
                  <span className="text-[9px] text-slate-500 block">Reemplaza automáticamente a <code className="text-amber-400/80 font-mono">{'{location}'}</code></span>
                </div>
              </div>

              {/* Resumen / Encabezado */}
              <div className="space-y-2 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText size={12} className="text-primary" />
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      Texto Descriptivo / Resumen del Servicio
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOptimizeField('contract_description', contractDescription, setContractDescription)}
                      disabled={optimizingFieldId === 'contract_description' || !contractDescription || !contractDescription.trim()}
                      className="flex items-center gap-1 text-[9px] font-bold text-primary hover:text-primary-hover disabled:opacity-30 disabled:hover:text-primary transition-all cursor-pointer bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full border border-primary/20"
                      title="Optimizar redacción con Gemini AI"
                    >
                      {optimizingFieldId === 'contract_description' ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-2.5 h-2.5 text-primary animate-pulse" />
                      )}
                      <span>Gemini AI</span>
                    </button>
                    <span className="text-[9px] text-slate-500 hidden sm:inline">Párrafo de introducción en el PDF</span>
                  </div>
                </div>

                <div className="rounded-xl bg-black/40 border border-white/10 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/30 transition-all overflow-hidden">
                  <textarea
                    value={contractDescription}
                    onChange={(e) => setContractDescription(e.target.value)}
                    onWheel={(e) => e.stopPropagation()}
                    rows={4}
                    placeholder="Acuerdo formal que establece las bases y condiciones legales para la ejecución del servicio..."
                    className="w-full bg-transparent px-3.5 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none leading-relaxed resize-y min-h-[96px] overscroll-contain block font-sans"
                    style={{ overscrollBehavior: 'contain' }}
                  />
                  <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/5 bg-white/[0.02] text-[10px] text-slate-400">
                    <span className="font-mono text-[9px] text-slate-500">
                      {contractDescription ? `${contractDescription.length} caracteres • ${contractDescription.trim().split(/\s+/).filter(Boolean).length} palabras` : '0 caracteres'}
                    </span>
                    <div className="flex items-center gap-2">
                      {contractDescription && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(contractDescription);
                            setCopiedVar('contract_desc');
                            setTimeout(() => setCopiedVar(null), 2000);
                          }}
                          className="text-[9px] text-slate-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded"
                        >
                          <Copy size={10} />
                          <span>{copiedVar === 'contract_desc' ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const preset = getCreappProductPreset(selectedProductId);
                          setContractDescription(proposalType === 'service' ? preset.contract_description : DEVELOPMENT_CONTRACT_DESCRIPTION);
                        }}
                        className="text-[9px] text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded"
                        title="Restaurar texto predeterminado del preset"
                      >
                        <RefreshCw size={10} />
                        <span>Restaurar preset</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: BARRA DE INSERCIÓN DE VARIABLES (Click para insertar en cursor) */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-300 text-xs font-black uppercase tracking-wider">
                  <Sparkles size={14} className="text-primary" />
                  <span>Variables Dinámicas & Campos de Firma</span>
                </div>
                {copiedVar && (
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <Check size={11} /> ¡Insertado en cursor!
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Haz clic en cualquier variable para insertarla directamente en el texto del contrato:
              </p>

              <div className="space-y-2">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
                    Variables automáticas de CreAPP:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => insertVariableIntoContract('{client_name}')}
                      className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title={`Inserta {client_name} (Valor actual: "${clientName || 'Sin definir'}")`}
                    >
                      <span>+</span>
                      <span>{'{client_name}'}</span>
                      <span className="text-[9px] opacity-70 font-sans font-normal border-l border-primary/30 pl-1.5 text-slate-300">
                        {clientName ? `"${clientName.slice(0, 14)}${clientName.length > 14 ? '...' : ''}"` : 'Cliente'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertVariableIntoContract('{total_value}')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title={`Inserta {total_value} (Valor actual: "$${cleanNumberString(totalValue) || '1.500.000'} ${activeLegalCurrency}")`}
                    >
                      <span>+</span>
                      <span>{'{total_value}'}</span>
                      <span className="text-[9px] opacity-70 font-sans font-normal border-l border-emerald-500/30 pl-1.5 text-emerald-200">
                        ${cleanNumberString(totalValue) || '1.500.000'} {activeLegalCurrency}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertVariableIntoContract('{monthly_fee}')}
                      className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title={`Inserta {monthly_fee} (Valor actual: "$${cleanNumberString(methodology?.monthly_fee || serviceDetails?.recurring_fee || totalValue) || '1.500.000'} ${activeLegalCurrency} / mes")`}
                    >
                      <span>+</span>
                      <span>{'{monthly_fee}'}</span>
                      <span className="text-[9px] opacity-70 font-sans font-normal border-l border-teal-500/30 pl-1.5 text-teal-200">
                        ${cleanNumberString(methodology?.monthly_fee || serviceDetails?.recurring_fee || totalValue) || '1.500.000'} {activeLegalCurrency} / mes
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertVariableIntoContract('{date}')}
                      className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title={`Inserta {date} (Valor actual: "${date || 'Fecha'}")`}
                    >
                      <span>+</span>
                      <span>{'{date}'}</span>
                      <span className="text-[9px] opacity-70 font-sans font-normal border-l border-blue-500/30 pl-1.5 text-blue-200">
                        {date ? `${date.slice(0, 12)}` : 'Fecha'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertVariableIntoContract('{location}')}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title={`Inserta {location} (Valor actual: "${location || 'Ubicación'}")`}
                    >
                      <span>+</span>
                      <span>{'{location}'}</span>
                      <span className="text-[9px] opacity-70 font-sans font-normal border-l border-amber-500/30 pl-1.5 text-amber-200">
                        {location ? `${location.slice(0, 12)}` : 'Ubicación'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="pt-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 block mb-1.5">
                    Campos que el cliente completará al firmar en pantalla:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => insertVariableIntoContract('[input:Representante Legal]')}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title="Campo interactivo para que el cliente ingrese su Nombre y Apellido"
                    >
                      <span>+</span>
                      <span className="font-bold">[input:Representante Legal]</span>
                      <span className="text-[9px] text-slate-400 font-sans">Nombre Firmante</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertVariableIntoContract('[input:DNI/CUIT]')}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title="Campo interactivo para que el cliente ingrese su DNI o CUIT"
                    >
                      <span>+</span>
                      <span className="font-bold">[input:DNI/CUIT]</span>
                      <span className="text-[9px] text-slate-400 font-sans">Documento</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => insertVariableIntoContract('[input:Cargo del Firmante]')}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title="Campo interactivo para que el cliente ingrese su Cargo o Poder"
                    >
                      <span>+</span>
                      <span className="font-bold">[input:Cargo del Firmante]</span>
                      <span className="text-[9px] text-slate-400 font-sans">Cargo / Rol</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 3: EDITOR DE CONTRATO CON SELECTOR DE MODO */}
            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 shadow-xl">
              {/* Header con tabs de modo */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Cuerpo del Contrato</h4>
                  <p className="text-[11px] text-slate-400">Edita el clausulado legal de manera modular o en texto continuo.</p>
                </div>

                {/* Switcher de Modos */}
                <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-xl self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setContractViewMode('clauses')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      contractViewMode === 'clauses'
                        ? 'bg-primary text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers size={12} />
                    Cláusulas
                  </button>
                  <button
                    type="button"
                    onClick={() => setContractViewMode('full')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      contractViewMode === 'full'
                        ? 'bg-primary text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText size={12} />
                    Texto Completo
                  </button>
                  <button
                    type="button"
                    onClick={() => setContractViewMode('preview')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      contractViewMode === 'preview'
                        ? 'bg-primary text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Eye size={12} />
                    Lectura Real
                  </button>
                </div>
              </div>

              {/* MODO 1: CLÁUSULAS GUIADAS */}
              {contractViewMode === 'clauses' && (
                <div className="space-y-3">
                  {parsedContract ? (
                    <>
                      {/* Comparecencia de las partes */}
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🏛️</span>
                            <span className="text-[11px] font-black text-white uppercase tracking-wider">
                              Encabezado & Comparecencia de las Partes
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Identificación</span>
                        </div>
                        <textarea
                          value={parsedContract.header}
                          onChange={(e) => handleUpdateContractHeader(e.target.value)}
                          onWheel={(e) => e.stopPropagation()}
                          rows={4}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary/50 leading-relaxed font-sans overscroll-contain resize-y"
                          style={{ overscrollBehavior: 'contain' }}
                        />
                      </div>

                      {/* Lista de Cláusulas */}
                      <div className="space-y-2.5">
                        {parsedContract.clauses.map((clause, idx) => {
                          const isExpanded = expandedClauseId === null || expandedClauseId === idx;
                          const hasTotalValue = clause.content.includes('{total_value}');
                          const hasClient = clause.content.includes('{client_name}');

                          return (
                            <div
                              key={idx}
                              className="rounded-xl bg-white/[0.02] border border-white/5 overflow-hidden transition-all hover:border-white/10"
                            >
                              <div
                                onClick={() => setExpandedClauseId(expandedClauseId === idx ? -1 : idx)}
                                className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none bg-white/[0.01] hover:bg-white/[0.03] transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-base shrink-0">{clause.icon}</span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/5">
                                        {clause.tag}
                                      </span>
                                      {hasTotalValue && (
                                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                          {'{total_value}'}
                                        </span>
                                      )}
                                      {hasClient && (
                                        <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                                          {'{client_name}'}
                                        </span>
                                      )}
                                    </div>
                                    <h5 className="text-xs font-bold text-white tracking-wide truncate mt-0.5">
                                      {clause.title}
                                    </h5>
                                  </div>
                                </div>

                                <div className="text-slate-400 shrink-0">
                                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="p-3.5 pt-0 border-t border-white/5 space-y-2">
                                  <textarea
                                    value={clause.content}
                                    onChange={(e) => handleUpdateClause(idx, e.target.value)}
                                    onWheel={(e) => e.stopPropagation()}
                                    rows={Math.max(3, Math.min(8, Math.ceil(clause.content.length / 75)))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary/50 leading-relaxed font-sans overscroll-contain resize-y"
                                    style={{ overscrollBehavior: 'contain' }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="p-5 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2">
                      <p className="text-xs text-slate-400">
                        El texto actual tiene formato libre y no utiliza cláusulas estándar numeradas (PRIMERA:, SEGUNDA:).
                      </p>
                      <button
                        type="button"
                        onClick={() => setContractViewMode('full')}
                        className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-wider"
                      >
                        Abrir en Modo Texto Completo
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODO 2: TEXTO COMPLETO */}
              {contractViewMode === 'full' && (
                <div className="space-y-3">
                  <div className="relative">
                    <textarea
                      ref={contractTextareaRef}
                      value={contractText}
                      onChange={(e) => setContractText(e.target.value)}
                      onWheel={(e) => e.stopPropagation()}
                      placeholder={`Si se deja vacío, se utilizará la plantilla genérica por defecto:\nEn la localidad de {location}, a los {date}... [input:Nombre]...`}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary/50 min-h-[360px] font-sans text-xs leading-relaxed overscroll-contain resize-y"
                      style={{ overscrollBehavior: 'contain' }}
                    />
                  </div>

                  {/* Barra de estado inferior */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] text-slate-400">
                    <div className="flex items-center gap-3">
                      <span>{contractText.length} caracteres</span>
                      <span>•</span>
                      <span>{contractText.split(/\s+/).filter(Boolean).length} palabras</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(contractText);
                          setShowToast(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
                      >
                        <Copy size={11} /> Copiar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const preset = getCreappProductPreset(selectedProductId);
                          setContractText(preset.contract_template);
                          setContractDescription(preset.contract_description);
                          setShowToast(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-amber-400 transition-colors cursor-pointer"
                      >
                        <RefreshCw size={11} /> Restaurar Plantilla
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODO 3: VISTA DE LECTURA REAL */}
              {contractViewMode === 'preview' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2.5 text-blue-300 text-xs">
                    <Info size={16} className="shrink-0" />
                    <span>
                      Visualización del contrato con todas las variables inyectadas y los campos que completará el cliente.
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4 max-h-[460px] overflow-y-auto">
                    <div className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap select-text space-y-2">
                      {(() => {
                        if (!contractText) {
                          return <p className="text-slate-500 italic">No hay contenido de contrato definido.</p>;
                        }
                        const regex = /(\{(?:client_name|total_value|date|location)\}|\[input:[^\]]+\])/g;
                        const parts = contractText.split(regex);
                        return parts.map((part, idx) => {
                          if (part === '{client_name}') {
                            return (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/20 text-white font-bold border border-primary/40 mx-0.5 shadow-sm" title="Variable {client_name}">
                                {clientName || '{Nombre del Cliente}'}
                              </span>
                            );
                          }
                          if (part === '{total_value}') {
                            return (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 mx-0.5 shadow-sm" title="Variable {total_value}">
                                {totalValue || '{Tarifa/Abono}'}
                              </span>
                            );
                          }
                          if (part === '{date}') {
                            return (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40 mx-0.5 shadow-sm" title="Variable {date}">
                                {date || '{Fecha}'}
                              </span>
                            );
                          }
                          if (part === '{location}') {
                            return (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 mx-0.5 shadow-sm" title="Variable {location}">
                                {location || '{Ubicación}'}
                              </span>
                            );
                          }
                          if (part.startsWith('[input:') && part.endsWith(']')) {
                            const label = part.slice(7, -1);
                            return (
                              <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-200 border border-purple-500/40 mx-0.5 font-medium text-[11px]" title="Campo interactivo para el firmante">
                                <span className="text-[9px] uppercase tracking-wider text-purple-400 font-bold">✍️ Firmante:</span>
                                <span className="underline decoration-dotted decoration-purple-400">{label}</span>
                              </span>
                            );
                          }
                          return <span key={idx}>{part}</span>;
                        });
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CARD 4: FIRMANTES DE LA PROPUESTA / CONTRATO */}
            <Section title="Firmantes Oficiales de CreAPP Software Lab">
              <div className="space-y-3">
                {/* Sebastián Maza */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs">
                      SM
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Sebastián Maza</span>
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">Firmante Titular</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Chief Technology Officer (CTO) — Firma digital oficial CreAPP incluida</div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  </div>
                </div>

                {/* Facundo Marceca */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs">
                      FM
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Facundo Marceca</div>
                      <div className="text-[11px] text-slate-400">Project Manager (PM) — Incluir firma conjunta en el contrato</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={methodology?.show_facundo_signature ?? true}
                      onChange={(e) => updateMethodologyField('show_facundo_signature', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* VIDEO TAB - Left panel info & controls */}
        {activeEditorTab === 'video' && (
          <div className="space-y-4">
            {/* Dedicated Video Logo Scale Control */}
            <div className="glass rounded-2xl p-5 border border-primary/30 bg-slate-900/60 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary border border-primary/20">
                    <Maximize2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-display font-black text-white uppercase tracking-wider">Tamaño del Logo en Video</h3>
                    <p className="text-[10px] text-slate-400">Escala exclusiva para el render animado</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">
                  {videoLogoScale}%
                </span>
              </div>

              {clientLogoUrl ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5">
                  <div className="w-16 h-12 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center p-1.5 overflow-hidden shrink-0">
                    <img
                      src={clientLogoUrl}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain transition-transform duration-200"
                      style={{ transform: `scale(${Math.min(1.5, videoLogoScale / 100)})` }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-white truncate block">{clientName || 'Cliente'}</span>
                    <span className="text-[10px] text-emerald-400/90 font-medium">Logo vinculado para animación</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-400/5 border border-amber-400/10 text-[11px] text-amber-300">
                  No se ha subido logo aún. Puedes subirlo en la pestaña "Portada (P1)". Mientras tanto, se animará la inicial "{clientName?.charAt(0) || 'C'}".
                </div>
              )}

              {/* Slider and Stepper Buttons */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateVideoLogoScale(videoLogoScale - 10)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Reducir 10%"
                  >
                    <Minus size={14} />
                  </button>

                  <input
                    type="range"
                    min="50"
                    max="300"
                    step="5"
                    value={videoLogoScale}
                    onChange={(e) => updateVideoLogoScale(Number(e.target.value))}
                    className="w-full accent-primary bg-white/10 h-2 rounded-lg appearance-none cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => updateVideoLogoScale(videoLogoScale + 10)}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Aumentar 10%"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-6 gap-1.5 pt-1">
                  {[80, 100, 130, 160, 200, 250].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => updateVideoLogoScale(s)}
                      className={`py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        videoLogoScale === s
                          ? 'bg-primary text-white shadow-md shadow-primary/30'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                      }`}
                    >
                      {s}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-[10px] text-slate-300 leading-relaxed">
                🛡️ <strong>Ajuste aislado:</strong> Este valor se aplica <em>únicamente</em> al video (horizontal y vertical). El tamaño del logo en la portada del contrato ({clientLogoScale}%) permanece intacto.
              </div>
            </div>

            {/* Selector de Divisa para el Video Comercial */}
            <div className="glass rounded-2xl p-5 border border-white/5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-display font-black text-white uppercase tracking-wider">
                    Divisa del Presupuesto en Video
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Moneda expresada en la diapositiva final de Inversión y Pagos.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#090d16] border border-white/10 p-1 rounded-xl shadow-inner">
                  <button
                    type="button"
                    onClick={() => handleVideoCurrencyChange('ARS')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      activeVideoCurrency === 'ARS'
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    $ ARS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVideoCurrencyChange('USD')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      activeVideoCurrency === 'USD'
                        ? 'bg-primary/25 text-primary border border-primary/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    $ USD
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-[10px] text-slate-300 leading-relaxed flex items-center justify-between">
                <span>
                  {(!methodology?.video_currency || methodology?.video_currency === activeLegalCurrency) ? (
                    <>
                      🔗 <strong>Sincronizado con Contrato:</strong> Coincide 100% con la divisa legal seleccionada (<strong>{activeLegalCurrency}</strong>).
                    </>
                  ) : (
                    <>
                      ⚡ <strong>Divisa personalizada:</strong> Expresado en <strong>{activeVideoCurrency}</strong> (Contrato en {activeLegalCurrency}).
                    </>
                  )}
                </span>
                {methodology?.video_currency && methodology.video_currency !== activeLegalCurrency && (
                  <button
                    type="button"
                    onClick={() => handleVideoCurrencyChange(activeLegalCurrency)}
                    className="ml-2 text-primary hover:underline font-bold whitespace-nowrap cursor-pointer"
                  >
                    Sincronizar a {activeLegalCurrency}
                  </button>
                )}
              </div>
            </div>

            {/* Configuración del Badge Inferior en Video */}
            <div className="glass rounded-2xl p-5 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-display font-black text-white uppercase tracking-wider">
                    Badge Inferior del Presupuesto
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Subtítulo en cápsula bajo el monto total. Reemplaza al anterior "Desarrollo Llave en Mano".
                  </p>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={
                    methodology?.video_badge_text !== undefined
                      ? methodology.video_badge_text
                      : `Mantenimiento mensual: $${cleanNumberString(methodology?.monthly_fee || serviceDetails?.recurring_fee || totalValue) || '1.750.000'} / mes`
                  }
                  onChange={(e) => {
                    setMethodology((prev: any) => ({
                      ...(prev || DEFAULT_METHODOLOGY),
                      video_badge_text: e.target.value,
                    }));
                  }}
                  placeholder="Ej: Mantenimiento mensual: $1.750.000 / mes"
                  className="w-full bg-[#090d16] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  💡 Puedes editarlo libremente o dejarlo en blanco para ocultar el badge.
                </span>
                {methodology?.video_badge_text !== undefined && (
                  <button
                    type="button"
                    onClick={() => {
                      setMethodology((prev: any) => {
                        const copy = { ...(prev || DEFAULT_METHODOLOGY) };
                        delete copy.video_badge_text;
                        return copy;
                      });
                    }}
                    className="text-primary hover:underline font-bold whitespace-nowrap ml-2 cursor-pointer"
                  >
                    Restablecer
                  </button>
                )}
              </div>
            </div>

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
                <li>El video tiene una duración óptima de 42 segundos dividida en secciones sincronizadas.</li>
              </ul>
            </div>
          </div>
        )}

          </div>{/* end Left Panel */}

          {/* Right Panel: Sticky Live Previews */}
          <div className="space-y-4 lg:sticky lg:top-[90px] h-[calc(100vh-140px)] flex flex-col">
            {activeEditorTab === 'video' ? (
              <div className="glass rounded-2xl p-4 border border-white/5 flex-1 flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Presentación Dinámica (Video Remotion)</span>
                    <p className="text-[10px] text-slate-600">Previsualización animada 16:9 y 9:16 en tiempo real.</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#090d16] border border-white/10 px-2.5 py-1 rounded-xl shadow-inner">
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Divisa Video:</span>
                    <button
                      type="button"
                      onClick={() => handleVideoCurrencyChange('ARS')}
                      className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        activeVideoCurrency === 'ARS'
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      $ ARS
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVideoCurrencyChange('USD')}
                      className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        activeVideoCurrency === 'USD'
                          ? 'bg-primary/25 text-primary border border-primary/40 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      $ USD
                    </button>
                  </div>
                </div>
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
                    totalValue={parseProposalNumericValue(totalValue)}
                    monthlyFee={parseProposalNumericValue(methodology?.monthly_fee || serviceDetails?.recurring_fee || totalValue)}
                    videoBadgeText={methodology?.video_badge_text}
                    clientLogoUrl={clientLogoUrl}
                    clientLogoScale={videoLogoScale}
                    videoLogoScale={videoLogoScale}
                    currency={activeVideoCurrency}
                    pillars={getPillars(methodology, brandPrimary, brandSecondary)}
                    methodologyIntro={methodology?.intro_text}
                    hideWeeklySchedule={methodology?.hide_weekly_schedule}
                  />
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-4 border border-white/5 flex-1 flex flex-col overflow-hidden">
                {/* Document Header & Zoom Controls */}
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                      Vista Previa del Documento (Pág. {getPageNumber(activeEditorTab)} / {ALL_PAGES.filter(p => !isPageHidden(p.id)).length})
                    </span>
                    <p className="text-[10px] text-slate-600">Representación en tiempo real del PDF final.</p>
                  </div>

                  {/* Switcher contextual de Divisa según la página que se visualiza */}
                  <div className="flex items-center gap-2.5">
                    {activeEditorTab === 'hitos' && (
                      <div className="flex items-center gap-1.5 bg-[#090d16] border border-white/10 px-2.5 py-1 rounded-xl shadow-inner">
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Divisa Fases (Pág. 3):</span>
                        <button
                          type="button"
                          onClick={() => handleMilestoneCurrencyChange('ARS')}
                          className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all ${
                            activeMilestoneCurrency === 'ARS'
                              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          $ ARS
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMilestoneCurrencyChange('USD')}
                          className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all ${
                            activeMilestoneCurrency === 'USD'
                              ? 'bg-primary/25 text-primary border border-primary/40 shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          $ USD
                        </button>
                      </div>
                    )}

                    {(activeEditorTab === 'legal' || activeEditorTab === 'legal2') && (
                      <div className="flex items-center gap-1.5 bg-[#090d16] border border-white/10 px-2.5 py-1 rounded-xl shadow-inner">
                        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Divisa Contrato (Pág. Legal):</span>
                        <button
                          type="button"
                          onClick={() => handleLegalCurrencyChange('ARS')}
                          className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all ${
                            activeLegalCurrency === 'ARS'
                              ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          $ ARS
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLegalCurrencyChange('USD')}
                          className={`px-2 py-0.5 rounded-lg text-xs font-black transition-all ${
                            activeLegalCurrency === 'USD'
                              ? 'bg-primary/25 text-primary border border-primary/40 shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          $ USD
                        </button>
                      </div>
                    )}

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
                      {(() => {
                        const getTabPageId = (tab: EditorTab): string | null => {
                          if (tab === 'config' || tab === 'video') return null;
                          return tab;
                        };
                        const pageId = getTabPageId(activeEditorTab);
                        if (pageId && isPageHidden(pageId)) {
                          return (
                            <div className="absolute inset-0 bg-rose-950/20 backdrop-blur-[2px] z-50 flex items-center justify-center border-4 border-rose-500/30">
                              <div className="bg-slate-900/95 border border-rose-500/40 p-6 rounded-2xl flex flex-col items-center gap-3 max-w-xs text-center shadow-2xl">
                                <div className="p-3 bg-rose-500/10 rounded-full text-rose-500">
                                  <EyeOff size={28} />
                                </div>
                                <span className="text-sm font-black uppercase tracking-wider text-white">Esta página está oculta</span>
                                <span className="text-[11px] text-slate-400 leading-relaxed">
                                  No estará visible en el PDF final generado ni en el visor del cliente.
                                </span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
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
        {!isPageHidden('portada') && (
          <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '0', left: '0', right: '0', height: '8px', background: `linear-gradient(to right, ${brandPrimary}, ${brandSecondary})` }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flexGrow: 1, gap: '65px', marginTop: '20px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '30px', justifyContent: 'center', minHeight: '110px' }}>
                {proposalType === 'service' ? (
                  clientLogoUrl && (
                    <img
                      src={clientLogoUrl}
                      alt={heroTitle || "Logo Producto"}
                      style={{
                        height: `${125 * (clientLogoScale / 100)}px`,
                        maxHeight: '170px',
                        maxWidth: '320px',
                        objectFit: 'contain'
                      }}
                    />
                  )
                ) : (
                  <>
                    <img src={creappLogoOfficial} alt="CreAPP Logo" style={{ height: '105px', objectFit: 'contain' }} />
                    {clientLogoUrl && (
                      <>
                        <span style={{ fontSize: '24px', fontWeight: '900', color: '#cbd5e1' }}>✕</span>
                        <img
                          src={clientLogoUrl}
                          alt="Logo Cliente"
                          style={{
                            height: `${105 * (clientLogoScale / 100)}px`,
                            maxHeight: '160px',
                            maxWidth: '260px',
                            objectFit: 'contain'
                          }}
                        />
                      </>
                    )}
                  </>
                )}
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
                  <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{clientLegalData.company_name || clientName}</p>
                  {clientLegalData.tax_id && (
                    <p style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', marginTop: '2px' }}>CUIT: {clientLegalData.tax_id}</p>
                  )}
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
        )}

        {/* PÁGINA 2: Alcance y Entregables */}
        {!isPageHidden('alcance') && (
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
        )}

        {/* PÁGINA 3: Cronograma de Fases & Entregas */}
        {!isPageHidden('hitos') && (
          <div style={{ width: '794px', height: '1123px', padding: '80px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', backgroundColor: '#ffffff', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: (milestones && milestones.length >= 4) || (payments && payments.length >= 4) ? '15px' : '25px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: '900', color: '#0f172a', letterSpacing: '1.5px', lineHeight: '1' }}>CREAPP</span>
                <span style={{ fontSize: '8px', fontWeight: '800', color: brandPrimary, letterSpacing: '1.2px', lineHeight: '1' }}>{heroTitle ? heroTitle.toUpperCase() : 'CBKR APP V2'}</span>
              </div>
              <span style={{ fontSize: '9px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold', fontFamily: 'monospace' }}>PROJECT_ROADMAP // 02</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, gap: (milestones && milestones.length >= 4) || (payments && payments.length >= 4) ? '8px' : '20px' }}>
              <h1 style={{ fontSize: (milestones && milestones.length >= 4) || (payments && payments.length >= 4) ? '24px' : '28px', fontWeight: '950', color: '#0f172a', letterSpacing: '-0.5px', textTransform: 'uppercase', margin: '0' }}>
                CRONOGRAMA DE FASES & <span style={{ fontStyle: 'italic', color: brandPrimary }}>ENTREGAS</span>
              </h1>
              <p style={{ fontSize: (milestones && milestones.length >= 4) || (payments && payments.length >= 4) ? '10px' : '11px', color: '#475569', lineHeight: '1.35', fontWeight: '300', margin: '0' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '2px', marginBottom: '2px' }}>
                <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Estructura de Sprints Mensuales</span>
                <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: (milestones && milestones.length >= 4) || (payments && payments.length >= 4) ? '6px' : '15px' }}>
                {milestones && milestones.map((m, i) => (
                  <div key={m.id || i} style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', minHeight: milestones && milestones.length >= 4 ? '68px' : '95px', boxSizing: 'border-box' }}>
                    <div style={{ width: milestones && milestones.length >= 4 ? '65px' : '80px', flexShrink: 0, flexGrow: 0, backgroundColor: '#000000', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#ffffff', gap: '2px', boxSizing: 'border-box' }}>
                      <span style={{ fontSize: '8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>Fase</span>
                      <span style={{ fontSize: milestones && milestones.length >= 4 ? '16px' : '20px', fontWeight: '950' }}>{i + 1}</span>
                    </div>
                    <div style={{ flexGrow: 1, flexShrink: 1, minWidth: 0, padding: milestones && milestones.length >= 4 ? '6px 12px' : '15px 20px', display: 'flex', flexDirection: 'column', gap: '3px', justifyContent: 'center', boxSizing: 'border-box' }}>
                      <h4 style={{ fontSize: milestones && milestones.length >= 4 ? '11px' : '12px', fontWeight: '900', color: '#0f172a', margin: '0', textTransform: 'uppercase' }}>{m.title}</h4>
                      <p style={{ fontSize: milestones && milestones.length >= 4 ? '9px' : '10px', color: '#475569', lineHeight: '1.2', margin: '0', fontWeight: '300' }}>
                        {m.description || 'Sin descripción de entregables.'}
                      </p>
                    </div>
                    <div style={{ width: milestones && milestones.length >= 4 ? '105px' : '120px', flexShrink: 0, flexGrow: 0, borderLeft: '1px solid #e2e8f0', padding: milestones && milestones.length >= 4 ? '6px 10px' : '15px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '2px', backgroundColor: '#fafafa', boxSizing: 'border-box' }}>
                      <span style={{ fontSize: '7px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hito Control</span>
                      <span style={{ fontSize: milestones && milestones.length >= 4 ? '9px' : '10px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', textAlign: 'center', lineHeight: '1.1' }}>
                        {m.control_milestone || 'VERIFICACIÓN'}
                      </span>
                    </div>
                    {!methodology?.hide_milestone_prices && (
                      <div style={{ width: milestones && milestones.length >= 4 ? '105px' : '120px', flexShrink: 0, flexGrow: 0, borderLeft: '1px solid #e2e8f0', padding: milestones && milestones.length >= 4 ? '6px 10px' : '15px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '2px', backgroundColor: '#fafafa', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: '7px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inversión</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                          <span style={{ fontSize: milestones && milestones.length >= 4 ? '13px' : '14px', fontWeight: '950', color: '#000000', lineHeight: '1.1' }}>${formatMilestonePrice(m.price)}</span>
                          <span style={{ fontSize: '8px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', lineHeight: '1.1' }}>{methodology?.currency || getCurrencyFromTotal(totalValue) || 'USD'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {infrastructureCosts && infrastructureCosts.length > 0 && (
                <div style={{ marginTop: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Costos de Infraestructura Asociados</span>
                    <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {infrastructureCosts.map((infra, idx) => (
                      <div key={idx} style={{ flex: '1 1 180px', padding: '5px 10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px' }}>
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
                <div style={{ marginTop: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Esquema de Pagos / Hitos de Financiamiento</span>
                    <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${payments.length}, minmax(0, 1fr))`, gap: payments.length > 3 ? '8px' : '10px', width: '100%' }}>
                    {payments.map((p, idx) => (
                      <div key={idx} style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: payments.length > 3 ? '8px 10px' : '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', boxSizing: 'border-box' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
                          <span style={{ fontSize: payments.length > 3 ? '8.5px' : '9px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', lineHeight: '1.2' }}>{p.label}</span>
                          <span style={{ fontSize: payments.length > 3 ? '11px' : '12px', fontWeight: '950', color: brandPrimary, flexShrink: 0 }}>{p.percentage}</span>
                        </div>
                        <span style={{ fontSize: payments.length > 3 ? '8px' : '9px', color: '#475569', fontWeight: '300', lineHeight: '1.3' }}>{p.description}</span>
                        {p.tooltip && (
                          <span style={{ fontSize: payments.length > 3 ? '7.5px' : '8px', color: '#94a3b8', fontStyle: 'italic', lineHeight: '1.3', marginTop: '2px' }}>{p.tooltip}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
              <span>Presupuesto Consolidado: <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{formatTotalValue(totalValue)} TOTAL</span></span>
              <span>Página 3 de 7</span>
            </div>
          </div>
        )}

        {/* PÁGINA 4: Desglose de Horas — Semanas 1 a 8 */}
        {!isPageHidden('sem1-6') && (
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
        )}

        {/* PÁGINA 5: Desglose de Horas — Semanas 9 a 16 */}
        {!isPageHidden('sem9-16') && (
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
        )}

        {/* PÁGINA 6: Metodología de Trabajo & Plan de Acción */}
        {!isPageHidden('metodologia') && (() => {
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: meth.hide_weekly_schedule ? '16px' : (getPillars(meth, brandPrimary, brandSecondary).length >= 4 ? '10px' : '15px'), marginTop: '5px' }}>
                  {getPillars(meth, brandPrimary, brandSecondary).map((pillar, idx) => {
                    const mainColor = pillar.color || (idx % 2 === 0 ? brandPrimary : brandSecondary);
                    const isCompact = !meth.hide_weekly_schedule && getPillars(meth, brandPrimary, brandSecondary).length >= 4;
                    return (
                      <div
                        key={pillar.id || idx}
                        style={{
                          padding: meth.hide_weekly_schedule ? '18px 22px' : (isCompact ? '12px 16px' : '18px 20px'),
                          borderRadius: '12px',
                          backgroundColor: `${mainColor}0A`,
                          border: `1px solid ${mainColor}33`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}
                      >
                        <h4 style={{ fontSize: '10px', fontWeight: '900', color: mainColor, margin: '0', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                          {pillar.title}
                        </h4>
                        <p style={{ fontSize: meth.hide_weekly_schedule ? '11px' : (isCompact ? '10px' : '11px'), color: '#475569', lineHeight: '1.5', margin: '0', fontWeight: '300' }}>
                          {clientNameReplacer(pillar.description)}
                        </p>
                      </div>
                    );
                  })}

                  {!meth.hide_weekly_schedule && (
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
                  )}
                </div>
              </div>
              <div style={{ position: 'absolute', bottom: '60px', left: '80px', right: '80px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '20px', fontSize: '10px', color: '#94a3b8' }}>
                <span>Propuesta Comercial | {clientName}</span>
                <span>Página 6 de 7</span>
              </div>
            </div>
          );
        })()}

        {/* PÁGINA LEGAL: Contrato y Firmas */}
        {proposalType === 'service' ? (
          <>
            {!isPageHidden('legal') && (
              <div id="page-legal-part1">
                {renderPageLegalPart1()}
              </div>
            )}
            {!isPageHidden('legal2') && (
              <div id="page-legal-part2">
                {renderPageLegalPart2()}
              </div>
            )}
          </>
        ) : (
          !isPageHidden('legal') && (
            <div id="page-legal">
              {renderPage7()}
            </div>
          )
        )}
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

      {/* Video Notice Modal for Production / Cloud Environments */}
      {isVideoNoticeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900 shadow-2xl p-6 sm:p-8 relative overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-secondary/15 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={() => setIsVideoNoticeModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all cursor-pointer z-10"
            >
              ✕
            </button>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/30 text-primary">
                  <Film size={24} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-display font-black text-white uppercase tracking-wider">
                    Renderizado Remotion CLI
                  </h3>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                    Formato: {targetVideoRatio === '9:16' ? 'Vertical 9:16 (Stories/Reels)' : 'Horizontal 16:9 HD'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-5">
                El compilador de video <strong>Remotion CLI</strong> procesa y renderiza los 1.260 fotogramas de animación en alta definición (1080p a 30fps) utilizando Chromium y FFmpeg en el sistema operativo. Por arquitectura, este proceso de renderizado local requiere correrse en tu máquina.
              </p>

              <div className="space-y-3 mb-6">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wide mb-1">
                      1. Previsualización Inmediata en Vivo
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Puedes reproducir la presentación animada completa con audio, motion graphics y branding en tiempo real directamente desde la pestaña <strong>VIDEO</strong> de este editor web.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-secondary/10 text-secondary shrink-0 mt-0.5">
                    <Download size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wide mb-1">
                      2. Exportar archivo .MP4 físico
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Para compilar y descargar el archivo <code className="text-primary font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded">.mp4</code> final, abre la propuesta en tu entorno local ejecutando <code className="text-secondary font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded">npm run dev</code> en <code className="text-white font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded">localhost:3000</code>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsVideoNoticeModalOpen(false);
                    setActiveEditorTab('video');
                  }}
                  className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20"
                >
                  <Film size={14} /> Ver en pestaña Video
                </button>
                <button
                  type="button"
                  onClick={() => setIsVideoNoticeModalOpen(false)}
                  className="w-full sm:w-auto py-3 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border border-white/5"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
            className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl border border-emerald-500/30 bg-surface-dark/95 backdrop-blur-xl shadow-2xl shadow-emerald-500/10 min-w-[300px]"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck size={18} className="animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-wider text-white">Éxito</p>
              <p className="text-[11px] text-slate-400 font-medium">Cambios guardados</p>
            </div>
            <button 
              onClick={() => setShowToast(false)}
              className="text-slate-500 hover:text-white transition-colors cursor-pointer text-xs font-bold"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {optimizingFieldId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 backdrop-blur-md transition-all duration-300">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-4 px-8 py-7 rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl text-center max-w-sm"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/15 border border-primary/25 text-primary shadow-lg shadow-primary/10">
                <Sparkles size={28} className="animate-bounce" style={{ animationDuration: '2s' }} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black uppercase tracking-widest text-white">Gemini AI</h4>
                <p className="text-xs text-slate-300 font-bold uppercase tracking-wider animate-pulse">Enriqueciendo descripción...</p>
                <p className="text-[10px] text-slate-500 font-medium">Optimizando gramática y adaptando tono</p>
              </div>
              <div className="flex items-center gap-1.5 justify-center mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProposalEditor;
