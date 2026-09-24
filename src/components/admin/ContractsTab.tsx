import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileSignature,
  FileCheck,
  Shield,
  Download,
  Printer,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Building2,
} from 'lucide-react';
import {
  CREAPP_PRODUCTS,
  STACKED_PRESET,
  TRAZAPP_PRESET,
  DENTALIA_PRESET,
  CreappProductPreset,
} from '@/lib/serviceContractTemplates';
import { Lead } from '@/lib/pipelineService';

interface ContractsTabProps {
  leads: Lead[];
}

export const ContractsTab: React.FC<ContractsTabProps> = ({ leads }) => {
  const [selectedProductKey, setSelectedProductKey] = useState<string>('stacked');
  const [clientName, setClientName] = useState<string>('');
  const [clientTaxId, setClientTaxId] = useState<string>('');
  const [contractDate, setContractDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const currentPreset: CreappProductPreset =
    selectedProductKey === 'stacked'
      ? STACKED_PRESET
      : selectedProductKey === 'trazapp'
      ? TRAZAPP_PRESET
      : selectedProductKey === 'dental-ia'
      ? DENTALIA_PRESET
      : STACKED_PRESET;

  const handlePrint = () => {
    window.print();
  };

  const handleSelectLead = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      setClientName(lead.company);
      if (lead.productType === 'Stacked SaaS') setSelectedProductKey('stacked');
      if (lead.productType === 'TrazApp') setSelectedProductKey('trazapp');
      if (lead.productType === 'Dental IA') setSelectedProductKey('dental-ia');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-amber-950/20 via-[#0e0e14] to-zinc-950 border border-amber-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <FileSignature size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Gestor de Contratos de Servicio & SLA
            </h2>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Genera acuerdos de prestación de servicios tecnológicos con nivel de servicio garantizado (SLA), mantenimiento preventivo y cuotas recurrentes estandarizadas para el portafolio de CreApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-all"
          >
            <Printer size={14} />
            <span>Imprimir / Guardar PDF</span>
          </button>
        </div>
      </div>

      {/* CONFIGURATION & PREVIEW SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="p-6 rounded-2xl bg-[#0e0e12] border border-white/5 space-y-5 text-xs">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield size={16} className="text-amber-400" />
            <span>Parámetros del Contrato</span>
          </h3>

          {/* Preset Selector */}
          <div>
            <label className="block text-zinc-400 mb-1.5 font-medium">Producto / Solución</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'stacked', name: 'Stacked SaaS' },
                { id: 'trazapp', name: 'TrazApp' },
                { id: 'dental-ia', name: 'Dental IA' },
              ].map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => setSelectedProductKey(prod.id)}
                  className={`p-2.5 rounded-xl border text-center font-medium transition-all ${
                    selectedProductKey === prod.id
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                      : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {prod.name}
                </button>
              ))}
            </div>
          </div>

          {/* Lead Picker */}
          <div>
            <label className="block text-zinc-400 mb-1.5 font-medium">Vincular con Cuenta del Pipeline</label>
            <select
              onChange={(e) => handleSelectLead(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">Seleccionar del CRM...</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id} className="bg-[#111]">
                  {l.company} ({l.name}) - {l.productType}
                </option>
              ))}
            </select>
          </div>

          {/* Client Details Form */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div>
              <label className="block text-zinc-400 mb-1">Nombre Comercial del Cliente</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Identificación Fiscal / CUIT</label>
              <input
                type="text"
                value={clientTaxId}
                onChange={(e) => setClientTaxId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Fecha de Inicio de Vigencia</label>
              <input
                type="date"
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Resumen de SLA */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2 text-[11px]">
            <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
              Garantías de este plan:
            </span>
            <div className="flex justify-between text-zinc-300">
              <span>Disponibilidad (Uptime):</span>
              <strong className="text-emerald-400 font-mono">{currentPreset.default_service_details.sla_uptime}</strong>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>Soporte P1 Crítico:</span>
              <strong className="text-amber-400 font-mono">{currentPreset.default_service_details.response_time_critical}</strong>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>Cuota Recurrente:</span>
              <strong className="text-purple-300 font-mono">{currentPreset.default_service_details.recurring_fee}</strong>
            </div>
          </div>
        </div>

        {/* Live Contract Document Preview */}
        <div className="lg:col-span-2 p-8 rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl text-zinc-300 font-serif leading-relaxed text-xs space-y-5 print:text-black print:bg-white">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 print:border-black">
            <div>
              <div className="font-sans font-bold text-sm tracking-wider text-white print:text-black">
                CREAPP SOFTWARE LAB
              </div>
              <div className="text-[10px] text-zinc-400 font-sans print:text-zinc-600">
                FINTECH & INNOVATION HUB // ACUERDO DE SERVICIO TECNOLÓGICO (SLA)
              </div>
            </div>
            <span className="text-xs font-mono text-zinc-400 print:text-zinc-600">
              CONTRATO REF: #{selectedProductKey.toUpperCase()}-{contractDate.replace(/-/g, '')}
            </span>
          </div>

          <div>
            <h4 className="font-sans font-bold text-base text-white mb-2 print:text-black">
              Contrato de Licenciamiento y Prestación de Servicios SaaS: {currentPreset.name}
            </h4>
            <p className="text-justify text-zinc-300 print:text-zinc-800">
              En la fecha <strong>{contractDate}</strong>, comparecen por una parte <strong>CREAPP INNOVATION HUB</strong> (en adelante "El Proveedor"), y por la otra parte la entidad <strong>{clientName || '[Razón Social / Nombre del Cliente]'}</strong> ({clientTaxId || '[Identificación Fiscal / CUIT]'}) (en adelante "El Cliente"), conviniendo las siguientes cláusulas y condiciones:
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <strong className="font-sans font-semibold text-white block mb-1 print:text-black">
                1. OBJETO Y ALCANCE TECNOLÓGICO
              </strong>
              <p className="text-justify text-zinc-400 print:text-zinc-700">
                {currentPreset.contract_description} El Proveedor pondrá a disposición la infraestructura cloud, base de datos de alta disponibilidad y actualizaciones continuas del sistema.
              </p>
            </div>

            <div>
              <strong className="font-sans font-semibold text-white block mb-1 print:text-black">
                2. NIVEL DE SERVICIO (SLA) Y CANALES DE SOPORTE
              </strong>
              <p className="text-justify text-zinc-400 print:text-zinc-700">
                Se garantiza un Uptime mensual de <strong>{currentPreset.default_service_details.sla_uptime}</strong>. Canal de atención: <strong>{currentPreset.default_service_details.support_channels}</strong>. Tiempo de respuesta para incidentes críticos: <strong>{currentPreset.default_service_details.response_time_critical}</strong>.
              </p>
            </div>

            <div>
              <strong className="font-sans font-semibold text-white block mb-1 print:text-black">
                3. ESQUEMA FINANCIERO Y CUOTAS
              </strong>
              <p className="text-justify text-zinc-400 print:text-zinc-700">
                El costo del setup inicial es <strong>{currentPreset.default_service_details.setup_fee}</strong>. La cuota recurrente mensual estipulada es de <strong>{currentPreset.default_service_details.recurring_fee}</strong>, pagadera por período adelantado dentro de los primeros 10 días de cada mes calendario.
              </p>
            </div>
          </div>

          {/* Firmas */}
          <div className="pt-8 border-t border-white/10 grid grid-cols-2 gap-8 print:border-black">
            <div className="space-y-2 text-center">
              <div className="h-12 border-b border-dashed border-zinc-600 print:border-black flex items-end justify-center pb-1">
                <span className="font-sans font-bold text-xs text-purple-400 print:text-black">
                  Sebastián Maza — CreApp CEO
                </span>
              </div>
              <span className="font-sans text-[10px] text-zinc-500 uppercase tracking-wider block">
                Por CreApp Software Lab
              </span>
            </div>

            <div className="space-y-2 text-center">
              <div className="h-12 border-b border-dashed border-zinc-600 print:border-black flex items-end justify-center pb-1">
                <span className="font-sans font-semibold text-xs text-zinc-300 print:text-black">
                  {clientName || '[Firma del Cliente]'}
                </span>
              </div>
              <span className="font-sans text-[10px] text-zinc-500 uppercase tracking-wider block">
                Firma Representante Legal
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractsTab;
