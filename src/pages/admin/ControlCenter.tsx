import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    LayoutGrid,
    Plus,
    Pencil,
    Trash2,
    ExternalLink,
    Github,
    Globe,
    Shield,
    Eye,
    EyeOff,
    ArrowLeft,
    Rocket,
    LogOut,
    Copy,
    CheckCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import {
    getAllProjects,
    createProject,
    updateProject,
    deleteProject,
} from '@/lib/projectsService';
import type { Project, ProjectInput } from '@/lib/projectsService';
import ProjectModal from '@/components/admin/ProjectModal';

const STATUS_CONFIG = {
    active: { label: 'Activo', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    development: { label: 'En Desarrollo', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    paused: { label: 'En Pausa', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
    delivered: { label: 'Entregado', cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
};

const ControlCenter: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Project | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [showPass, setShowPass] = useState<Record<string, boolean>>({});
    const [copied, setCopied] = useState<string | null>(null);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            setProjects(await getAllProjects());
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => { fetchProjects(); }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
    };

    const handleSave = async (data: ProjectInput) => {
        if (editing) {
            const updated = await updateProject(editing.id, data);
            setProjects((prev) => prev.map((p) => (p.id === editing.id ? updated : p)));
        } else {
            const created = await createProject(data);
            setProjects((prev) => [created, ...prev]);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Eliminar el proyecto "${name}"?`)) return;
        await deleteProject(id);
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (expanded === id) setExpanded(null);
    };

    const handleEdit = (p: Project) => {
        setEditing(p);
        setModalOpen(true);
    };

    const handleNew = () => {
        setEditing(null);
        setModalOpen(true);
    };

    const ensureUrl = (url: string) =>
        url.startsWith('http://') || url.startsWith('https://')
            ? url
            : `https://${url}`;

    const copyToClipboard = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(null), 1500);
    };

    const CopyBtn = ({ text, id }: { text: string; id: string }) => (
        <button
            onClick={() => copyToClipboard(text, id)}
            className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors"
            title="Copiar"
        >
            {copied === id ? <CheckCheck size={12} className="text-emerald-400" /> : <Copy size={12} />}
        </button>
    );

    return (
        <div className="min-h-screen bg-background-dark text-slate-200 font-body">
            {/* Header */}
            <header className="border-b border-white/5 bg-surface-dark/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                            <Rocket className="text-white fill-current" size={18} />
                        </div>
                        <div>
                            <h1 className="text-lg font-display font-black text-white tracking-tight">Centro de Control</h1>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Gestión de Proyectos CreAPP</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin')}
                            className="flex items-center gap-2 text-slate-500 hover:text-white text-xs uppercase tracking-widest font-bold transition-colors"
                        >
                            <ArrowLeft size={16} />
                            Propuestas
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-slate-500 hover:text-white text-xs uppercase tracking-widest font-bold transition-colors"
                        >
                            <LogOut size={16} />
                            Salir
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10">
                {/* Top bar */}
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h2 className="text-2xl font-display font-black text-white">Proyectos</h2>
                        <p className="text-slate-500 text-sm mt-1">
                            {projects.length} proyecto{projects.length !== 1 ? 's' : ''} registrado{projects.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={handleNew}
                        className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-black uppercase tracking-widest text-[11px] hover:opacity-90 transition-all active:scale-[0.98] shadow-lg"
                    >
                        <Plus size={16} />
                        Nuevo Proyecto
                    </button>
                </div>

                {/* Projects */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-20">
                        <LayoutGrid className="mx-auto text-slate-700 mb-6" size={48} />
                        <h3 className="text-xl font-display font-black text-white mb-3">Sin proyectos aún</h3>
                        <p className="text-slate-500 text-sm mb-8">
                            Comenzá a registrar los proyectos de CreAPP.
                        </p>
                        <button
                            onClick={handleNew}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-black uppercase tracking-widest text-[11px] hover:opacity-90 transition-all"
                        >
                            <Plus size={16} />
                            Registrar Primer Proyecto
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {projects.map((project) => {
                            const isOpen = expanded === project.id;
                            const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active;

                            return (
                                <motion.div
                                    key={project.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="glass rounded-2xl overflow-hidden"
                                >
                                    {/* Card Header */}
                                    <div
                                        className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/3 transition-colors"
                                        onClick={() => setExpanded(isOpen ? null : project.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-lg font-black"
                                                style={{ background: `${project.color}22`, border: `1.5px solid ${project.color}44` }}
                                            >
                                                <span style={{ color: project.color }}>
                                                    {project.name.slice(0, 1).toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="font-display font-black text-white text-base">{project.name}</h3>
                                                <p className="text-slate-500 text-xs">{project.client}</p>
                                            </div>
                                            {(project.stack ?? []).length > 0 && (
                                                <div className="hidden md:flex gap-1.5 flex-wrap ml-2">
                                                    {(project.stack ?? []).slice(0, 4).map((tag) => (
                                                        <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5 text-slate-400 text-[10px] font-bold">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${status.cls}`}>
                                                {status.label}
                                            </span>
                                            {project.production_url && (
                                                <a
                                                    href={ensureUrl(project.production_url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                                    title="Ver en producción"
                                                >
                                                    <Globe size={15} />
                                                </a>
                                            )}
                                            {project.github_url && (
                                                <a
                                                    href={ensureUrl(project.github_url)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                                    title="Ver repositorio"
                                                >
                                                    <Github size={15} />
                                                </a>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEdit(project); }}
                                                className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                                                title="Editar"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(project.id, project.name); }}
                                                className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Detail */}
                                    {isOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="border-t border-white/5 px-5 pb-5 pt-4"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Links */}
                                                <div className="space-y-3">
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Links</p>
                                                    {[
                                                        { icon: Globe, label: 'Producción', val: project.production_url },
                                                        { icon: Github, label: 'GitHub', val: project.github_url },
                                                        { icon: ExternalLink, label: 'Vercel', val: project.vercel_url },
                                                        { icon: Shield, label: 'Panel Admin', val: project.admin_url },
                                                    ].map(({ icon: Icon, label, val }) =>
                                                        val ? (
                                                            <a
                                                                key={label}
                                                                href={ensureUrl(val)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group"
                                                            >
                                                                <Icon size={14} className="text-slate-400 group-hover:text-white" />
                                                                <div className="min-w-0">
                                                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{label}</p>
                                                                    <p className="text-slate-300 text-xs truncate">{val}</p>
                                                                </div>
                                                                <ExternalLink size={12} className="ml-auto text-slate-600 group-hover:text-slate-400" />
                                                            </a>
                                                        ) : null
                                                    )}
                                                </div>

                                                {/* Credentials + Notes */}
                                                <div className="space-y-4">
                                                    {(project.credentials ?? []).length > 0 && (
                                                        <div>
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">🔐 Credenciales Admin</p>
                                                            <div className="space-y-2">
                                                                {(project.credentials ?? []).map((cred, idx) => (
                                                                    <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                                                                        {cred.label && (
                                                                            <p className="text-[10px] text-primary uppercase tracking-widest font-black">{cred.label}</p>
                                                                        )}
                                                                        {cred.email && (
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <div>
                                                                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Email / Usuario</p>
                                                                                    <p className="text-slate-300 text-sm font-mono">{cred.email}</p>
                                                                                </div>
                                                                                <CopyBtn text={cred.email} id={`cred-email-${project.id}-${idx}`} />
                                                                            </div>
                                                                        )}
                                                                        {cred.password && (
                                                                            <div className="flex items-center justify-between gap-2">
                                                                                <div>
                                                                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Contraseña</p>
                                                                                    <p className="text-slate-300 text-sm font-mono">
                                                                                        {showPass[`${project.id}-${idx}`] ? cred.password : '••••••••'}
                                                                                    </p>
                                                                                </div>
                                                                                <div className="flex gap-1">
                                                                                    <button
                                                                                        onClick={() => setShowPass((prev) => ({ ...prev, [`${project.id}-${idx}`]: !prev[`${project.id}-${idx}`] }))}
                                                                                        className="p-1 rounded text-slate-600 hover:text-slate-300 transition-colors"
                                                                                    >
                                                                                        {showPass[`${project.id}-${idx}`] ? <EyeOff size={12} /> : <Eye size={12} />}
                                                                                    </button>
                                                                                    <CopyBtn text={cred.password} id={`cred-pass-${project.id}-${idx}`} />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {project.notes && (
                                                        <div>
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Notas</p>
                                                            <p className="text-slate-400 text-sm leading-relaxed bg-white/5 rounded-xl p-3">
                                                                {project.notes}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {project.description && (
                                                        <div>
                                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Descripción</p>
                                                            <p className="text-slate-400 text-sm">{project.description}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Modal */}
            {modalOpen && (
                <ProjectModal
                    project={editing}
                    onClose={() => setModalOpen(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
};

export default ControlCenter;
