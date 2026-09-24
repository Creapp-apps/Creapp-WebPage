import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSignature,
  CheckCircle2,
  Clock,
  Printer,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Eye,
  Eraser,
  PenTool,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import {
  ServiceContract,
  getContractById,
  recordContractView,
  signContract,
} from '@/lib/contractService';
import creappLogoOfficial from '@/assets/creapp-logo.png';

export const ContractView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [contract, setContract] = useState<ServiceContract | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states for digital signature
  const [signerName, setSignerName] = useState('');
  const [signerTaxId, setSignerTaxId] = useState('');
  const [signerRole, setSignerRole] = useState('Representante Legal / Titular');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signedSuccess, setSignedSuccess] = useState(false);

  // Canvas for drawing signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (id) {
      // Registrar apertura del cliente en el tracking
      const updated = recordContractView(id);
      if (updated) {
        setContract(updated);
        setSignerName(updated.clientName || '');
        setSignerTaxId(updated.clientTaxId || '');
      } else {
        const found = getContractById(id);
        if (found) {
          setContract(found);
          setSignerName(found.clientName || '');
          setSignerTaxId(found.clientTaxId || '');
        }
      }
      setLoading(false);
    }
  }, [id]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#a855f7'; // Purple line
  }, [contract?.status]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== 'mousedown' && e.type !== 'touchstart') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (e.type === 'mousedown' || e.type === 'touchstart') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
      setHasDrawn(true);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirmSignature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    if (!signerName.trim()) {
      alert('Por favor ingrese el nombre del firmante.');
      return;
    }
    if (!acceptedTerms) {
      alert('Debe aceptar las cláusulas y condiciones del acuerdo.');
      return;
    }

    setIsSigning(true);

    let signatureImage = '';
    if (canvasRef.current && hasDrawn) {
      signatureImage = canvasRef.current.toDataURL('image/png');
    }

    const signed = signContract(contract.id, {
      signedByName: signerName,
      signedByTaxId: signerTaxId,
      signedByRole: signerRole,
      signatureImage: signatureImage || undefined,
    });

    if (signed) {
      setContract(signed);
      setSignedSuccess(true);
    }
    setIsSigning(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090d] flex items-center justify-center text-zinc-400 font-mono text-sm">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span>Cargando acuerdo de servicio tecnológico...</span>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-[#09090d] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Contrato no encontrado</h1>
        <p className="text-zinc-400 text-sm max-w-md mb-6">
          El enlace al acuerdo de servicio tecnológico no es válido o ha expirado. Por favor contacte al equipo de CreApp Software Lab.
        </p>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all"
        >
          Volver a CreApp
        </Link>
      </div>
    );
  }

  const isSigned = contract.status === 'signed';

  return (
    <div className="min-h-screen bg-[#08080c] text-zinc-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white pb-20">
      {/* Top Header / Branding Bar */}
      <header className="sticky top-0 z-30 bg-[#0c0c14]/90 backdrop-blur-md border-b border-white/10 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={creappLogoOfficial} alt="CreApp Logo" className="w-8 h-8 object-contain" />
            <div className="flex flex-col">
              <span className="font-bold text-sm text-white tracking-wide">CREAPP SOFTWARE LAB</span>
              <span className="text-[10px] text-zinc-400 font-mono">Acuerdo de Servicio Tecnológico & SLA</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSigned ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 size={13} />
                <span>Firmado & Vigente</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                <Clock size={13} />
                <span>Pendiente de Firma</span>
              </span>
            )}

            <button
              onClick={handlePrint}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Imprimir contrato"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Imprimir / PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 w-full space-y-6">
        {/* Status Alert Banner */}
        {isSigned ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#0e1713] to-zinc-950 border border-emerald-500/30 shadow-lg flex items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-300">
                  Acuerdo Firmado y Certificado Digitalmente
                </h3>
                <p className="text-xs text-zinc-400">
                  Firmado por <strong>{contract.signedByName}</strong> el {new Date(contract.signedAt || '').toLocaleDateString('es-AR')} a las {new Date(contract.signedAt || '').toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs.
                </p>
              </div>
            </div>
            {contract.verificationHash && (
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">Hash de Verificación</span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {contract.verificationHash}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-[#100f1c] to-zinc-950 border border-purple-500/20 shadow-lg flex items-center justify-between gap-4 print:hidden">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                <FileSignature size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Por favor revise y firme el presente acuerdo digital
                </h3>
                <p className="text-xs text-zinc-400">
                  Una vez firmado, se generará el certificado de nivel de servicio garantizado y comenzará la vigencia operativa.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Contract Document Card */}
        <div className="rounded-3xl bg-[#0f0f16] border border-white/10 p-6 sm:p-10 shadow-2xl space-y-8 font-serif leading-relaxed text-zinc-300 text-xs sm:text-sm print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
          {/* Header of Contract Document */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 print:border-black">
            <div>
              <span className="text-[10px] font-sans font-bold tracking-widest uppercase text-purple-400 block mb-1 print:text-purple-700">
                CREAPP SOFTWARE LAB // LEGAL & SLA
              </span>
              <h1 className="text-xl sm:text-2xl font-sans font-black text-white tracking-tight print:text-black">
                Acuerdo de Nivel de Servicio & Licencia SaaS: {contract.productName}
              </h1>
            </div>
            <div className="sm:text-right font-sans shrink-0">
              <span className="text-xs font-mono font-bold text-zinc-400 block print:text-zinc-600">
                REF: {contract.contractRef}
              </span>
              <span className="text-xs text-zinc-500 block">
                Fecha de Vigencia: <strong>{contract.effectiveDate}</strong>
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans print:border print:border-black print:p-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 print:border-none">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Uptime SLA</span>
              <span className="text-sm font-black text-emerald-400 font-mono print:text-black">{contract.slaUptime}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 print:border-none">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Respuesta Crítica</span>
              <span className="text-sm font-black text-amber-400 font-mono print:text-black">{contract.responseTimeCritical}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 print:border-none">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Cuota Mensual</span>
              <span className="text-sm font-black text-purple-300 font-mono print:text-black">{contract.monthlyFee}</span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 print:border-none">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Plazo Inicial</span>
              <span className="text-sm font-black text-white font-mono print:text-black">{contract.durationMonths}</span>
            </div>
          </div>

          {/* Body Clauses */}
          <div className="space-y-6 text-justify">
            <p>
              En la fecha <strong>{contract.effectiveDate}</strong>, comparecen por una parte <strong>CREAPP INNOVATION HUB</strong> (en adelante "El Proveedor"), con domicilio legal y operativo en Buenos Aires, Argentina; y por la otra parte la entidad <strong>{contract.clientName}</strong> {contract.clientTaxId ? `(Identificación Fiscal / CUIT N° ${contract.clientTaxId})` : ''} (en adelante "El Cliente"), conviniendo en celebrar el presente Contrato de Nivel de Servicio Tecnológico bajo las siguientes estipulaciones:
            </p>

            <div>
              <h4 className="font-sans font-bold text-sm text-white mb-1.5 print:text-black">
                1. OBJETO Y ALCANCE DE LA PLATAFORMA
              </h4>
              <p className="text-zinc-400 print:text-zinc-700">
                El Proveedor concede a El Cliente una licencia de uso de software bajo modalidad SaaS (Software as a Service) para la plataforma tecnológica <strong>{contract.productName}</strong>. CreApp Software Lab se compromete a garantizar la continuidad operativa, el alojamiento en infraestructura cloud de alta resiliencia, la custodia segura de datos, y el despliegue continuo de parches de seguridad y mantenimiento preventivo.
              </p>
            </div>

            <div>
              <h4 className="font-sans font-bold text-sm text-white mb-1.5 print:text-black">
                2. ACUERDO DE NIVEL DE SERVICIO (SLA) & MATRIZ DE INCIDENCIAS
              </h4>
              <p className="text-zinc-400 print:text-zinc-700">
                El Proveedor garantiza un nivel de disponibilidad mensual mínima del <strong>{contract.slaUptime}</strong> de Uptime. El canal de comunicación directa para emergencias será: <strong>{contract.supportChannels}</strong>.
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-400 font-sans text-xs print:text-zinc-700">
                <li><strong>Incidentes Críticos (P1 - Interrupción Total del Servicio):</strong> Tiempo de respuesta inicial garantizado menor a <strong>{contract.responseTimeCritical}</strong>.</li>
                <li><strong>Consultas y Ajustes No Críticos (P2):</strong> Tiempo de respuesta promedio inferior a 12 horas hábiles.</li>
                <li><strong>Backups & Redundancia:</strong> Respaldo automático diario de base de datos con recuperación ante desastres.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-sans font-bold text-sm text-white mb-1.5 print:text-black">
                3. TÉRMINOS ECONÓMICOS & FORMA DE PAGO
              </h4>
              <p className="text-zinc-400 print:text-zinc-700">
                El costo por configuración y puesta en marcha inicial se fija en: <strong>{contract.setupFee || 'Bonificado'}</strong>. La cuota por servicio continuo estipulada es de <strong>{contract.monthlyFee}</strong>, pagadera por mes adelantado dentro de los primeros diez (10) días de cada mes calendario.
              </p>
            </div>

            <div>
              <h4 className="font-sans font-bold text-sm text-white mb-1.5 print:text-black">
                4. PROPIEDAD DE LOS DATOS Y CONFIDENCIALIDAD
              </h4>
              <p className="text-zinc-400 print:text-zinc-700">
                Toda la información operativa, bases de datos de clientes, historiales de transacciones y registros procesados mediante el sistema son de propiedad exclusiva de El Cliente. CreApp Software Lab actuará como custodio y encargado de tratamiento tecnológico bajo estricto secreto profesional.
              </p>
            </div>

            <div>
              <h4 className="font-sans font-bold text-sm text-white mb-1.5 print:text-black">
                5. VIGENCIA Y RENOVACIÓN
              </h4>
              <p className="text-zinc-400 print:text-zinc-700">
                El presente acuerdo rige a partir del <strong>{contract.effectiveDate}</strong> por un período inicial de <strong>{contract.durationMonths}</strong>, renovable automáticamente salvo notificación fehaciente por escrito con 30 días corridos de anticipación.
              </p>
            </div>
          </div>

          {/* Signature Representation Area */}
          <div className="pt-8 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-8 print:border-black font-sans">
            {/* CreApp CEO */}
            <div className="space-y-2 text-center">
              <div className="h-16 border-b border-dashed border-zinc-700 print:border-black flex flex-col items-center justify-end pb-1">
                <span className="font-script text-base text-purple-400 font-bold print:text-black">
                  Sebastián Maza
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">CEO & Founder — CreApp Software Lab</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium block">
                Por CreApp Innovation Hub
              </span>
            </div>

            {/* Client Signature */}
            <div className="space-y-2 text-center">
              <div className="h-16 border-b border-dashed border-zinc-700 print:border-black flex flex-col items-center justify-end pb-1">
                {isSigned ? (
                  contract.signatureImage ? (
                    <img
                      src={contract.signatureImage}
                      alt="Firma del Cliente"
                      className="max-h-12 object-contain"
                    />
                  ) : (
                    <span className="font-script text-base text-emerald-400 font-bold print:text-black">
                      {contract.signedByName}
                    </span>
                  )
                ) : (
                  <span className="text-xs text-zinc-600 italic">Pendiente de firma digital</span>
                )}
                {isSigned && (
                  <span className="text-[10px] text-emerald-500 font-mono">
                    Firmado digitalmente • {contract.signedByRole || 'Representante'}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-400 font-medium block">
                {contract.clientName} (Cliente)
              </span>
            </div>
          </div>
        </div>

        {/* Digital Signature Action Form (Only shown if pending) */}
        {!isSigned && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#12121c] to-[#0c0c12] border border-purple-500/30 shadow-2xl space-y-6 print:hidden"
          >
            <div className="flex items-center gap-3 pb-3 border-b border-white/5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                <PenTool size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Firma Electrónica del Cliente</h3>
                <p className="text-xs text-zinc-400">
                  Complete sus datos de representación legal y dibuje su firma digital para formalizar el acuerdo.
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmSignature} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Nombre del Firmante *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Identificación Fiscal / CUIT o DNI
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 30-71649281-9"
                    value={signerTaxId}
                    onChange={(e) => setSignerTaxId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Cargo / Rol
                  </label>
                  <input
                    type="text"
                    value={signerRole}
                    onChange={(e) => setSignerRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Signature Canvas Pad */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <span>Dibuje su Firma en el Recuadro:</span>
                    <span className="text-[10px] text-zinc-500 font-normal">(Opcional, se estampará en el contrato)</span>
                  </label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <Eraser size={12} />
                    <span>Limpiar Trazo</span>
                  </button>
                </div>
                <div className="relative border-2 border-dashed border-white/20 rounded-2xl bg-black/40 overflow-hidden cursor-crosshair">
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchMove={draw}
                    className="w-full h-[140px] touch-none"
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-600 text-xs italic">
                      Haga clic o arrastre el dedo aquí para firmar
                    </div>
                  )}
                </div>
              </div>

              {/* Acceptance Checkbox */}
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 cursor-pointer hover:bg-white/[0.04] transition-colors">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-zinc-700 text-purple-600 focus:ring-purple-500 bg-black/60 cursor-pointer"
                />
                <span className="text-xs text-zinc-300 leading-relaxed">
                  Declaro que he leído el presente Acuerdo de Prestación de Servicios Tecnológicos, acepto las garantías de Uptime SLA (<strong>{contract.slaUptime}</strong>), la matriz de tiempos de respuesta crítica y la cuota recurrente mensual estipulada de <strong>{contract.monthlyFee}</strong>.
                </span>
              </label>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSigning || !acceptedTerms}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 font-bold text-white text-sm shadow-xl shadow-purple-600/30 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Lock size={15} />
                  <span>{isSigning ? 'Procesando Firma...' : 'Confirmar & Firmar Acuerdo'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default ContractView;
