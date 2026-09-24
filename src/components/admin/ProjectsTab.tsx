import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Github,
  Globe,
  Shield,
  Eye,
  EyeOff,
  Copy,
  CheckCheck,
  Search,
  Filter,
  Layers,
  Lock,
  Server,
  FolderGit2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getAllProjects,
  createProject,
  updateProject,
  deleteProject,
} from '@/lib/projectsService';
import type { Project, ProjectInput } from '@/lib/projectsService';
import ProjectModal from '@/components/admin/ProjectModal';

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  active: {
    label: 'Activo',
    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  development: {
    label: 'En Desarrollo',
    cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot: 'bg-blue-400',
  },
  paused: {
    label: 'En Pausa',
    cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    dot: 'bg-yellow-400',
  },
  delivered: {
    label: 'Entregado',
    cls: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    dot: 'bg-zinc-400',
  },
};

export const ProjectsTab: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await getAllProjects();
      setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

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
    if (!confirm(`¿Eliminar el proyecto "${name}" y sus credenciales asociadas?`)) return;
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
    url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  // KPIs
  const activeCount = projects.filter((p) => p.status === 'active').length;
  const devCount = projects.filter((p) => p.status === 'development').length;
  const repoCount = projects.filter((p) => !!p.github_url).length;
  const totalCreds = projects.reduce((acc, p) => acc + (p.credentials?.length || 0), 0);

  // Filtros
  const filteredProjects = projects.filter((project) => {
    const matchSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.stack || []).some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = selectedStatus === 'all' || project.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* HERO BANNER */}
      <div className="rounded-3xl p-6 bg-gradient-to-r from-indigo-950/30 via-[#0e0e14] to-purple-950/20 border border-indigo-500/20 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <KeyRound size={20} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Credenciales & Proyectos (Vault)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
            Bóveda centralizada de accesos de clientes, repositorios GitHub, URLs de producción y credenciales protegidas para el equipo técnico de CreApp.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white shadow-lg shadow-purple-600/30 hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus size={15} />
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      {/* MINI STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-[#0e0e12] border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-zinc-500 block text-[11px]">Total Proyectos</span>
            <span className="text-lg font-bold text-white font-mono">{projects.length}</span>
          </div>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Layers size={16} />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0e0e12] border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-zinc-500 block text-[11px]">En Producción</span>
            <span className="text-lg font-bold text-emerald-400 font-mono">{activeCount}</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Server size={16} />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0e0e12] border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-zinc-500 block text-[11px]">En Desarrollo</span>
            <span className="text-lg font-bold text-blue-400 font-mono">{devCount}</span>
          </div>
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <Sparkles size={16} />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#0e0e12] border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-zinc-500 block text-[11px]">Credenciales Vault</span>
            <span className="text-lg font-bold text-indigo-400 font-mono">{totalCreds}</span>
          </div>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Lock size={16} />
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#0e0e12] border border-white/5 text-xs">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por proyecto, cliente o stack..."
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-zinc-500 text-[11px] shrink-0 font-medium">Estado:</span>
          {(['all', 'active', 'development', 'paused', 'delivered'] as const).map((st) => {
            const label =
              st === 'all'
                ? 'Todos'
                : STATUS_CONFIG[st]?.label || st;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-all ${
                  selectedStatus === st
                    ? 'bg-purple-600 text-white font-semibold shadow-sm'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* PROJECTS LIST */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-20 bg-[#0e0e12] border border-white/5 rounded-3xl">
          <KeyRound className="mx-auto text-zinc-700 mb-4" size={44} />
          <h3 className="text-base font-bold text-white mb-2">No se encontraron proyectos</h3>
          <p className="text-zinc-400 text-xs mb-6 max-w-sm mx-auto">
            Ajusta los filtros o registra un nuevo proyecto con sus accesos.
          </p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md hover:opacity-90 transition-all"
          >
            <Plus size={14} />
            <span>Nuevo Proyecto</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {filteredProjects.map((project) => {
            const isOpen = expanded === project.id;
            const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.active;
            const credCount = project.credentials?.length || 0;

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-[#0e0e12] border border-white/5 hover:border-purple-500/20 transition-all overflow-hidden"
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : project.id)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-black shadow-inner"
                      style={{
                        background: `${project.color || '#8B5CF6'}22`,
                        border: `1.5px solid ${project.color || '#8B5CF6'}44`,
                      }}
                    >
                      <span style={{ color: project.color || '#8B5CF6' }}>
                        {project.name.slice(0, 1).toUpperCase()}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-bold text-white text-base tracking-tight truncate">
                          {project.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border flex items-center gap-1.5 ${status.cls}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-400">
                        <span className="text-zinc-300 font-medium">{project.client}</span>
                        {credCount > 0 && (
                          <>
                            <span className="text-zinc-700">•</span>
                            <span className="text-indigo-400 font-mono text-[11px] flex items-center gap-1">
                              <Lock size={10} /> {credCount} credencial{credCount !== 1 ? 'es' : ''}
                            </span>
                          </>
                        )}
                        {(project.stack || []).length > 0 && (
                          <>
                            <span className="text-zinc-700">•</span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {(project.stack || []).slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.2 rounded-md bg-white/5 text-zinc-400 font-mono text-[10px] border border-white/5"
                                >
                                  {tag}
                                </span>
                              ))}
                              {(project.stack || []).length > 3 && (
                                <span className="text-[10px] text-zinc-500 font-mono">
                                  +{(project.stack || []).length - 3}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Links & Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    {project.production_url && (
                      <a
                        href={ensureUrl(project.production_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-emerald-400 border border-white/5 transition-colors"
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
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-colors"
                        title="Ver repositorio GitHub"
                      >
                        <Github size={15} />
                      </a>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(project);
                      }}
                      className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-colors"
                      title="Editar proyecto"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.id, project.name);
                      }}
                      className="p-2 rounded-xl hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>

                    <div className="p-2 text-zinc-500">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </div>
                </div>

                {/* Expanded Vault Details */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-white/5 px-5 pb-5 pt-4 bg-black/30"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                        {/* Links de Infraestructura */}
                        <div className="space-y-2.5">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block">
                            Infraestructura & Accesos
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              { icon: Globe, label: 'Producción', val: project.production_url },
                              { icon: Github, label: 'GitHub', val: project.github_url },
                              { icon: ExternalLink, label: 'Vercel / Hosting', val: project.vercel_url },
                              { icon: Shield, label: 'Panel Admin', val: project.admin_url },
                            ].map(({ icon: Icon, label, val }) =>
                              val ? (
                                <a
                                  key={label}
                                  href={ensureUrl(val)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 transition-all truncate"
                                >
                                  <Icon size={14} className="text-purple-400 shrink-0" />
                                  <div className="min-w-0">
                                    <span className="text-[10px] text-zinc-500 block">{label}</span>
                                    <span className="text-xs truncate font-mono text-zinc-300 block">
                                      {val.replace(/^https?:\/\//, '')}
                                    </span>
                                  </div>
                                </a>
                              ) : null
                            )}
                          </div>

                          {project.description && (
                            <p className="text-xs text-zinc-400 bg-white/5 p-3 rounded-xl border border-white/5 mt-2">
                              {project.description}
                            </p>
                          )}
                        </div>

                        {/* Credenciales Protegidas (Vault) */}
                        <div className="space-y-2.5">
                          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 block flex items-center justify-between">
                            <span>Credenciales Guardadas ({credCount})</span>
                            <span className="text-emerald-400 font-normal">Cifrado Local</span>
                          </span>

                          {credCount === 0 ? (
                            <div className="p-4 rounded-xl border border-dashed border-white/10 text-center text-zinc-500 text-xs">
                              Sin credenciales almacenadas para este proyecto.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {(project.credentials || []).map((cred, idx) => {
                                const passKey = `${project.id}-pass-${idx}`;
                                const isVisible = showPass[passKey];

                                return (
                                  <div
                                    key={idx}
                                    className="p-3 rounded-xl bg-[#111116] border border-white/5 space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300">
                                      <span className="text-purple-300">{cred.label || 'Acceso'}</span>
                                    </div>

                                    {/* Email */}
                                    {cred.email && (
                                      <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                                        <span className="truncate">{cred.email}</span>
                                        <button
                                          onClick={() => copyToClipboard(cred.email, `${project.id}-email-${idx}`)}
                                          className="p-1 hover:text-white transition-colors"
                                          title="Copiar email"
                                        >
                                          {copied === `${project.id}-email-${idx}` ? (
                                            <CheckCheck size={12} className="text-emerald-400" />
                                          ) : (
                                            <Copy size={12} />
                                          )}
                                        </button>
                                      </div>
                                    )}

                                    {/* Password */}
                                    {cred.password && (
                                      <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                                        <span className="truncate">
                                          {isVisible ? cred.password : '••••••••••••'}
                                        </span>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() =>
                                              setShowPass((prev) => ({ ...prev, [passKey]: !prev[passKey] }))
                                            }
                                            className="p-1 hover:text-white transition-colors"
                                            title={isVisible ? 'Ocultar' : 'Mostrar'}
                                          >
                                            {isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                                          </button>
                                          <button
                                            onClick={() => copyToClipboard(cred.password, passKey)}
                                            className="p-1 hover:text-white transition-colors"
                                            title="Copiar contraseña"
                                          >
                                            {copied === passKey ? (
                                              <CheckCheck size={12} className="text-emerald-400" />
                                            ) : (
                                              <Copy size={12} />
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL EDITAR / CREAR PROYECTO */}
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

export default ProjectsTab;
