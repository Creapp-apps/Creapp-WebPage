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
} from 'lucide-react';
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
} from '@/lib/proposalTypes';

// =========================================================
// Reusable Section Component
// =========================================================

interface SectionProps {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}

const Section: React.FC<SectionProps> = ({ title, children, onAdd, addLabel = 'Agregar' }) => (
  <div className="glass rounded-2xl p-6 space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="text-sm font-display font-black text-white uppercase tracking-widest">{title}</h3>
      {onAdd && (
        <button
          onClick={onAdd}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary hover:text-white transition-colors"
        >
          <Plus size={14} /> {addLabel}
        </button>
      )}
    </div>
    {children}
  </div>
);

// =========================================================
// Main Editor
// =========================================================

const ProposalEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'nueva';

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

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

  // Child items
  const [inclusions, setInclusions] = useState<Partial<ProposalInclusion>[]>([]);
  const [exclusions, setExclusions] = useState<Partial<ProposalExclusion>[]>([]);
  const [milestones, setMilestones] = useState<Partial<ProposalMilestone>[]>([]);
  const [payments, setPayments] = useState<Partial<ProposalPayment>[]>([]);
  const [projectOptions, setProjectOptions] = useState<Partial<ProposalProjectOption>[]>([]);

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

      const [inc, exc, mil, pay, opt] = await Promise.all([
        supabase.from('proposal_inclusions').select('*').eq('proposal_id', id).order('sort_order'),
        supabase.from('proposal_exclusions').select('*').eq('proposal_id', id).order('sort_order'),
        supabase.from('proposal_milestones').select('*').eq('proposal_id', id).order('sort_order'),
        supabase.from('proposal_payments').select('*').eq('proposal_id', id).order('sort_order'),
        supabase.from('proposal_project_options').select('*').eq('proposal_id', id).order('sort_order'),
      ]);

      setInclusions(inc.data || []);
      setExclusions(exc.data || []);
      setMilestones(mil.data || []);
      setPayments(pay.data || []);
      setProjectOptions(opt.data || []);
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
        contract_text: null,
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-3 text-slate-400 hover:text-white text-xs uppercase tracking-widest font-bold transition-colors"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
          <div className="flex items-center gap-4">
            {!isNew && slug && (
              <a
                href={`/propuesta/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:text-white text-[11px] uppercase tracking-widest font-bold transition-colors"
              >
                <Eye size={14} /> Preview
              </a>
            )}
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

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        <h2 className="text-2xl font-display font-black text-white">
          {isNew ? 'Nueva Propuesta' : `Editando: ${clientName}`}
        </h2>

        {/* Datos Principales */}
        <Section title="Datos del Cliente">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Nombre del Cliente *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  if (isNew) setSlug(generateSlug(e.target.value));
                }}
                placeholder="Ej. Astillero Vision"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Slug (URL)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="astilleros-vision"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-sm font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Fecha</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Ubicación</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-sm"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-sm resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Inversión Total</label>
              <input
                type="text"
                value={totalValue}
                onChange={(e) => setTotalValue(e.target.value)}
                placeholder="USD 1.750"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'signed')}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50 text-sm"
              >
                <option value="draft">Borrador</option>
                <option value="published">Publicada</option>
                <option value="signed">Firmada</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Branding */}
        <Section title="Branding / Colores">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Color Principal</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandPrimary}
                  onChange={(e) => setBrandPrimary(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={brandPrimary}
                  onChange={(e) => setBrandPrimary(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Color Secundario</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandSecondary}
                  onChange={(e) => setBrandSecondary(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                />
                <input
                  type="text"
                  value={brandSecondary}
                  onChange={(e) => setBrandSecondary(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Logo del Cliente (URL)</label>
              <input
                type="text"
                value={clientLogoUrl}
                onChange={(e) => setClientLogoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none text-sm"
              />
            </div>
            {/* Preview */}
            <div className="md:col-span-2 p-4 rounded-xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${brandPrimary}20, ${brandSecondary}20)` }}>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Preview de Gradiente</p>
              <div className="h-3 rounded-full" style={{ background: `linear-gradient(to right, ${brandPrimary}, ${brandSecondary})` }}></div>
            </div>
          </div>
        </Section>

        {/* Inclusiones */}
        <Section
          title={`Inclusiones (${inclusions.length})`}
          onAdd={() => setInclusions([...inclusions, { title: '', description: '', tooltip: '', icon_name: 'CheckCircle2' }])}
        >
          {inclusions.map((item, i) => (
            <div key={i} className="flex gap-3 items-start p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <GripVertical size={16} className="text-slate-700 mt-2 shrink-0" />
              <div className="flex-1 grid md:grid-cols-2 gap-3">
                <input type="text" value={item.title || ''} onChange={(e) => updateItem(inclusions, setInclusions, i, 'title', e.target.value)} placeholder="Título" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                <input type="text" value={item.icon_name || ''} onChange={(e) => updateItem(inclusions, setInclusions, i, 'icon_name', e.target.value)} placeholder="Ícono (ej: Box)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none font-mono" />
                <input type="text" value={item.description || ''} onChange={(e) => updateItem(inclusions, setInclusions, i, 'description', e.target.value)} placeholder="Descripción corta" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none md:col-span-2" />
                <textarea value={item.tooltip || ''} onChange={(e) => updateItem(inclusions, setInclusions, i, 'tooltip', e.target.value)} placeholder="Tooltip / Detalle técnico" rows={2} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none md:col-span-2" />
              </div>
              <button onClick={() => removeItem(inclusions, setInclusions, i)} className="text-slate-600 hover:text-red-400 mt-2 shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
        </Section>

        {/* Exclusiones */}
        <Section
          title={`Exclusiones (${exclusions.length})`}
          onAdd={() => setExclusions([...exclusions, { title: '', tooltip: '' }])}
        >
          {exclusions.map((item, i) => (
            <div key={i} className="flex gap-3 items-start p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <GripVertical size={16} className="text-slate-700 mt-2 shrink-0" />
              <div className="flex-1 space-y-3">
                <input type="text" value={item.title || ''} onChange={(e) => updateItem(exclusions, setExclusions, i, 'title', e.target.value)} placeholder="Título" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                <textarea value={item.tooltip || ''} onChange={(e) => updateItem(exclusions, setExclusions, i, 'tooltip', e.target.value)} placeholder="Aclaración" rows={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none" />
              </div>
              <button onClick={() => removeItem(exclusions, setExclusions, i)} className="text-slate-600 hover:text-red-400 mt-2 shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
        </Section>

        {/* Cronograma */}
        <Section
          title={`Cronograma (${milestones.length})`}
          onAdd={() => setMilestones([...milestones, { week_range: '', title: '', icon_name: 'Rocket' }])}
        >
          {milestones.map((item, i) => (
            <div key={i} className="flex gap-3 items-center p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <GripVertical size={16} className="text-slate-700 shrink-0" />
              <input type="text" value={item.week_range || ''} onChange={(e) => updateItem(milestones, setMilestones, i, 'week_range', e.target.value)} placeholder="Semana (ej: 1-2)" className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
              <input type="text" value={item.title || ''} onChange={(e) => updateItem(milestones, setMilestones, i, 'title', e.target.value)} placeholder="Título" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
              <input type="text" value={item.icon_name || ''} onChange={(e) => updateItem(milestones, setMilestones, i, 'icon_name', e.target.value)} placeholder="Ícono" className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none font-mono" />
              <button onClick={() => removeItem(milestones, setMilestones, i)} className="text-slate-600 hover:text-red-400 shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
        </Section>

        {/* Estructura de Pagos */}
        <Section
          title={`Pagos (${payments.length})`}
          onAdd={() => setPayments([...payments, { percentage: '', label: '', description: '', tooltip: '' }])}
        >
          {payments.map((item, i) => (
            <div key={i} className="flex gap-3 items-start p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <GripVertical size={16} className="text-slate-700 mt-2 shrink-0" />
              <div className="flex-1 grid md:grid-cols-3 gap-3">
                <input type="text" value={item.percentage || ''} onChange={(e) => updateItem(payments, setPayments, i, 'percentage', e.target.value)} placeholder="% (ej: 20%)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                <input type="text" value={item.label || ''} onChange={(e) => updateItem(payments, setPayments, i, 'label', e.target.value)} placeholder="Etiqueta" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                <input type="text" value={item.description || ''} onChange={(e) => updateItem(payments, setPayments, i, 'description', e.target.value)} placeholder="Descripción" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                <textarea value={item.tooltip || ''} onChange={(e) => updateItem(payments, setPayments, i, 'tooltip', e.target.value)} placeholder="Tooltip" rows={2} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none md:col-span-3" />
              </div>
              <button onClick={() => removeItem(payments, setPayments, i)} className="text-slate-600 hover:text-red-400 mt-2 shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
        </Section>

        {/* Prototipos / Opciones de Proyecto */}
        <Section
          title={`Opciones de Proyecto (${projectOptions.length})`}
          onAdd={() => setProjectOptions([...projectOptions, { title: '', tagline: '', description: '', demo_url: '', github_url: '', features: [], style_variant: 'premium' }])}
        >
          {projectOptions.map((item, i) => (
            <div key={i} className="flex gap-3 items-start p-4 rounded-xl bg-white/[0.02] border border-white/5">
              <GripVertical size={16} className="text-slate-700 mt-2 shrink-0" />
              <div className="flex-1 grid md:grid-cols-2 gap-3">
                <input type="text" value={item.title || ''} onChange={(e) => updateItem(projectOptions, setProjectOptions, i, 'title', e.target.value)} placeholder="Título (ej: Experiencia Premium 3D)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                <input type="text" value={item.tagline || ''} onChange={(e) => updateItem(projectOptions, setProjectOptions, i, 'tagline', e.target.value)} placeholder="Etiqueta (ej: Recomendado)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                <textarea value={item.description || ''} onChange={(e) => updateItem(projectOptions, setProjectOptions, i, 'description', e.target.value)} placeholder="Descripción" rows={2} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none resize-none md:col-span-2" />
                <input type="text" value={item.demo_url || ''} onChange={(e) => updateItem(projectOptions, setProjectOptions, i, 'demo_url', e.target.value)} placeholder="URL del Demo" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                <input type="text" value={item.github_url || ''} onChange={(e) => updateItem(projectOptions, setProjectOptions, i, 'github_url', e.target.value)} placeholder="URL del Github" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" />
                <select value={item.style_variant || 'premium'} onChange={(e) => updateItem(projectOptions, setProjectOptions, i, 'style_variant', e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none">
                  <option value="premium">Premium</option>
                  <option value="standard">Standard</option>
                </select>
                <input
                  type="text"
                  value={Array.isArray(item.features) ? item.features.join(', ') : (typeof item.features === 'string' ? item.features : '')}
                  onChange={(e) => updateItem(projectOptions, setProjectOptions, i, 'features', e.target.value.split(',').map(f => f.trim()).filter(Boolean))}
                  placeholder="Features separadas por coma"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
                />
              </div>
              <button onClick={() => removeItem(projectOptions, setProjectOptions, i)} className="text-slate-600 hover:text-red-400 mt-2 shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
        </Section>
      </main>
    </div>
  );
};

export default ProposalEditor;
