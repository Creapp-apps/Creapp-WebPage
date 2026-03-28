import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus } from 'lucide-react';
import type { Project, ProjectInput, Credential } from '@/lib/projectsService';

const STATUS_OPTIONS = [
    { value: 'active', label: 'Activo', color: 'emerald' },
    { value: 'development', label: 'En Desarrollo', color: 'blue' },
    { value: 'paused', label: 'En Pausa', color: 'yellow' },
    { value: 'delivered', label: 'Entregado', color: 'slate' },
] as const;

const PALETTE = ['#a855f7', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6'];

interface Props {
    project?: Project | null;
    onClose: () => void;
    onSave: (data: ProjectInput) => Promise<void>;
}

// --- Field outside component to prevent remount-on-render focus loss ---
interface FieldProps {
    label: string;
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (v: string) => void;
}
const Field: React.FC<FieldProps> = ({ label, type = 'text', placeholder, value, onChange }) => (
    <div className="space-y-1.5">
        <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors text-sm"
        />
    </div>
);

const emptyCredential = (): Credential => ({ label: '', email: '', password: '' });

const empty: ProjectInput = {
    name: '',
    client: '',
    description: '',
    status: 'active',
    production_url: '',
    github_url: '',
    admin_url: '',
    credentials: [emptyCredential()],
    stack: [],
    vercel_url: '',
    notes: '',
    color: '#a855f7',
};

const ProjectModal: React.FC<Props> = ({ project, onClose, onSave }) => {
    const [form, setForm] = useState<ProjectInput>(empty);
    const [stackInput, setStackInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

    useEffect(() => {
        if (project) {
            const { id, created_at, updated_at, ...rest } = project;
            setForm({
                ...rest,
                credentials: rest.credentials && rest.credentials.length > 0
                    ? rest.credentials
                    : [emptyCredential()],
            });
        } else {
            setForm(empty);
        }
        setShowPasswords({});
    }, [project]);

    // Credential helpers
    const addCredential = () =>
        setForm((prev) => ({ ...prev, credentials: [...(prev.credentials ?? []), emptyCredential()] }));

    const removeCredential = (idx: number) =>
        setForm((prev) => ({ ...prev, credentials: (prev.credentials ?? []).filter((_, i) => i !== idx) }));

    const updateCredential = (idx: number, field: keyof Credential, value: string) =>
        setForm((prev) => ({
            ...prev,
            credentials: (prev.credentials ?? []).map((c, i) => i === idx ? { ...c, [field]: value } : c),
        }));

    const togglePassword = (idx: number) =>
        setShowPasswords((prev) => ({ ...prev, [idx]: !prev[idx] }));

    const set = (key: keyof ProjectInput, val: unknown) =>
        setForm((prev) => ({ ...prev, [key]: val }));

    const addTag = () => {
        const tag = stackInput.trim();
        if (tag && !(form.stack ?? []).includes(tag)) {
            set('stack', [...(form.stack ?? []), tag]);
            setStackInput('');
        }
    };

    const removeTag = (tag: string) =>
        set('stack', (form.stack ?? []).filter((t) => t !== tag));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(form);
            onClose();
        } finally {
            setSaving(false);
        }
    };


    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-2xl glass rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5 sticky top-0 bg-surface-dark/90 backdrop-blur-xl rounded-t-2xl">
                        <h2 className="text-lg font-display font-black text-white">
                            {project ? 'Editar Proyecto' : 'Nuevo Proyecto'}
                        </h2>
                        <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Basics */}
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Nombre del proyecto *" value={form.name} onChange={(v) => set('name', v)} placeholder="TrazAPP" />
                            <Field label="Cliente *" value={form.client} onChange={(v) => set('client', v)} placeholder="Nombre del cliente" />
                        </div>
                        <Field label="Descripción" value={form.description ?? ''} onChange={(v) => set('description', v)} placeholder="Breve descripción del proyecto" />

                        {/* Status + Color */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Estado</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => set('status', e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary/50 transition-colors text-sm"
                                >
                                    {STATUS_OPTIONS.map((s) => (
                                        <option key={s.value} value={s.value} className="bg-gray-900">
                                            {s.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Color</label>
                                <div className="flex gap-2 flex-wrap pt-1">
                                    {PALETTE.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => set('color', c)}
                                            className="w-6 h-6 rounded-full border-2 transition-all"
                                            style={{
                                                background: c,
                                                borderColor: form.color === c ? 'white' : 'transparent',
                                                transform: form.color === c ? 'scale(1.2)' : 'scale(1)',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* URLs */}
                        <div className="space-y-3">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Links del Proyecto</p>
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="URL Producción" value={form.production_url ?? ''} onChange={(v) => set('production_url', v)} placeholder="https://app.com" />
                                <Field label="URL GitHub" value={form.github_url ?? ''} onChange={(v) => set('github_url', v)} placeholder="https://github.com/..." />
                                <Field label="URL Vercel" value={form.vercel_url ?? ''} onChange={(v) => set('vercel_url', v)} placeholder="https://vercel.com/..." />
                                <Field label="URL Panel Admin" value={form.admin_url ?? ''} onChange={(v) => set('admin_url', v)} placeholder="https://app.com/admin" />
                            </div>
                        </div>

                        {/* Credentials */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">🔐 Credenciales Admin</p>
                                <button
                                    type="button"
                                    onClick={addCredential}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-slate-300 hover:bg-primary/20 hover:text-primary transition-all text-xs font-bold"
                                >
                                    <Plus size={13} />
                                    Añadir
                                </button>
                            </div>

                            <div className="space-y-3">
                                {(form.credentials ?? []).map((cred, idx) => (
                                    <div
                                        key={idx}
                                        className="relative p-4 rounded-xl bg-white/5 border border-white/10 space-y-3"
                                    >
                                        {/* Remove button — only if more than 1 */}
                                        {(form.credentials ?? []).length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeCredential(idx)}
                                                className="absolute top-3 right-3 p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                            >
                                                <Minus size={13} />
                                            </button>
                                        )}

                                        {/* Label */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Etiqueta</label>
                                            <input
                                                type="text"
                                                value={cred.label}
                                                onChange={(e) => updateCredential(idx, 'label', e.target.value)}
                                                placeholder="Admin, Supabase, Vercel..."
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                                            />
                                        </div>

                                        {/* Email + Password */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Email / Usuario</label>
                                                <input
                                                    type="email"
                                                    value={cred.email}
                                                    onChange={(e) => updateCredential(idx, 'email', e.target.value)}
                                                    placeholder="admin@app.com"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Contraseña</label>
                                                <div className="relative">
                                                    <input
                                                        type={showPasswords[idx] ? 'text' : 'password'}
                                                        value={cred.password}
                                                        onChange={(e) => updateCredential(idx, 'password', e.target.value)}
                                                        placeholder="••••••••"
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePassword(idx)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-xs"
                                                    >
                                                        {showPasswords[idx] ? '🙈' : '👁️'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Stack Tags */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Stack Tecnológico</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={stackInput}
                                    onChange={(e) => setStackInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                                    placeholder="Next.js, Supabase, Vite..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors text-sm"
                                />
                                <button type="button" onClick={addTag} className="px-3 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all">
                                    <Plus size={16} />
                                </button>
                            </div>
                            {(form.stack ?? []).length > 0 && (
                                <div className="flex gap-2 flex-wrap mt-2">
                                    {(form.stack ?? []).map((tag) => (
                                        <span key={tag} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-300 text-xs font-bold">
                                            {tag}
                                            <button type="button" onClick={() => removeTag(tag)}>
                                                <Minus size={10} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Notas Internas</label>
                            <textarea
                                value={form.notes ?? ''}
                                onChange={(e) => set('notes', e.target.value)}
                                placeholder="Información relevante, tareas pendientes, decisiones técnicas..."
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-primary/50 transition-colors text-sm resize-none"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 font-black uppercase tracking-widest text-[11px] hover:bg-white/10 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={saving || !form.name || !form.client}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-black uppercase tracking-widest text-[11px] hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                {saving ? 'Guardando...' : project ? 'Guardar Cambios' : 'Crear Proyecto'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ProjectModal;
