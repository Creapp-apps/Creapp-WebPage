import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Kanban,
  Radar,
  FileSpreadsheet,
  FileSignature,
  Layers,
  KeyRound,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  ShieldCheck,
  Search,
  ExternalLink,
  Sparkles,
  Menu,
  X,
  Repeat,
  WalletCards,
  Users,
  Shield,
  Briefcase,
  User,
  Settings,
  Radio,
  Activity,
  Smartphone,
  Download,
  Share2,
} from 'lucide-react';
import creappLogoOfficial from '@/assets/CREAPP LOGO VECTOR.png';
import { useAuth } from '@/context/AuthContext';
import TeamManagementModal from './TeamManagementModal';
import UserProfileModal from './UserProfileModal';
import { NotificationBell } from './NotificationBell';

export type AdminTab = 
  | 'dashboard'
  | 'scraper'
  | 'pipeline'
  | 'proposals'
  | 'contracts'
  | 'projects'
  | 'subscriptions'
  | 'finances'
  | 'telemetry';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  children: React.ReactNode;
  onCreateProposalClick?: () => void;
  onCreateLeadClick?: () => void;
}

interface NavItem {
  id: AdminTab;
  label: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  category: string;
  items: NavItem[];
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onTabChange,
  children,
  onCreateProposalClick,
  onCreateLeadClick,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, profile, role, isAdmin, signOut } = useAuth();

  // Detección de PWA Standalone y beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsStandalone(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsStandalone(true);
        setDeferredPrompt(null);
      }
    } else {
      setInstallModalOpen(true);
    }
  };

  // Cerrar dropdown si se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const rawNavGroups: NavGroup[] = [
    {
      category: 'Visión General',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: 'Live',
          badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        },
      ],
    },
    {
      category: 'Ventas & Crecimiento',
      items: [
        {
          id: 'scraper',
          label: 'Lead Scraper & IA',
          icon: Radar,
          badge: 'B2B',
          badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        },
        {
          id: 'pipeline',
          label: 'Pipeline CRM',
          icon: Kanban,
          badge: 'Ventas',
          badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        },
        {
          id: 'proposals',
          label: 'Creador de Propuestas',
          icon: FileSpreadsheet,
          badge: 'Dev',
          badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        },
      ],
    },
    {
      category: 'Finanzas & Contable',
      items: [
        {
          id: 'subscriptions',
          label: 'Suscripciones',
          icon: Repeat,
          badge: 'MRR',
          badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        },
        {
          id: 'finances',
          label: 'Finanzas',
          icon: WalletCards,
          badge: 'OPEX',
          badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        },
      ],
    },
    {
      category: 'Operaciones & Dev',
      items: [
        {
          id: 'contracts',
          label: 'Contratos & SLA',
          icon: FileSignature,
          badge: 'Legal',
          badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        },
        {
          id: 'projects',
          label: 'Credenciales & Proyectos',
          icon: KeyRound,
          badge: 'Vault',
          badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        },
        {
          id: 'telemetry',
          label: 'NOC & Telemetría',
          icon: Radio,
          badge: 'Live',
          badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        },
      ],
    },
  ];

  // Si el usuario es vendedor, ocultamos las categorías de Finanzas, Contratos y Credenciales
  const navGroups: NavGroup[] = rawNavGroups.filter((g) => {
    if (isAdmin) return true;
    return g.category === 'Visión General' || g.category === 'Ventas & Crecimiento';
  });

  // Helper para buscar el título actual del tab
  const allNavItems = rawNavGroups.flatMap((g) => g.items);
  const currentTabLabel =
    currentTab === 'proposals'
      ? 'Creador de Propuestas de Desarrollo'
      : allNavItems.find((n) => n.id === currentTab)?.label || 'CreApp OS';

  const userDisplayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const userInitials = (profile?.full_name || user?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* DESKTOP SIDEBAR (Pinned, 100vh, never cut off) */}
        <aside
          className={`hidden md:flex flex-col border-r border-white/5 bg-[#0b0b0e]/95 backdrop-blur-xl transition-all duration-300 z-30 h-screen sticky top-0 shrink-0 ${
            collapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Logo & Brand */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/5 shrink-0">
            <div
              onClick={() => onTabChange('dashboard')}
              className="flex items-center gap-3 cursor-pointer group overflow-hidden"
            >
              <img
                src={creappLogoOfficial}
                alt="CreApp Logo"
                className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform"
              />
              {!collapsed && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm tracking-wider bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
                      CREAPP
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      OS
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono tracking-tight">Business Suite</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Quick Action Button */}
          <div className="p-3 shrink-0">
            <button
              onClick={onCreateProposalClick}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-xs text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-90 shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98] ${
                collapsed ? 'px-0' : ''
              }`}
              title="Nueva Propuesta Comercial"
            >
              <Plus size={16} className="shrink-0" />
              {!collapsed && <span>Nueva Propuesta</span>}
            </button>
          </div>

          {/* Categorized Navigation Groups (Scrollable) */}
          <nav className="flex-1 px-2.5 py-2 space-y-4 overflow-y-auto">
            {navGroups.map((group, groupIdx) => (
              <div key={group.category} className="space-y-1">
                {/* Category Header */}
                {!collapsed ? (
                  <div className="px-2.5 pt-1.5 pb-1 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold">
                      {group.category}
                    </span>
                    <div className="h-[1px] flex-1 bg-white/[0.04] ml-2" />
                  </div>
                ) : (
                  groupIdx > 0 && <div className="h-[1px] bg-white/[0.06] my-2 mx-2" />
                )}

                {/* Items in Category */}
                {group.items.map((item) => {
                  const active = currentTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative ${
                        active
                          ? 'bg-purple-600/15 text-white border border-purple-500/30 shadow-sm shadow-purple-500/10'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                      }`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon
                        size={17}
                        className={`shrink-0 transition-colors ${
                          active ? 'text-purple-400' : 'text-zinc-400 group-hover:text-zinc-200'
                        }`}
                      />
                      {!collapsed && (
                        <span className="flex-1 text-left truncate">{item.label}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                            item.badgeColor || 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {active && (
                        <motion.div
                          layoutId="active-nav-indicator"
                          className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-gradient-to-b from-purple-500 to-pink-500 rounded-r-full"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User profile & System Status (Pinned at bottom, always visible) */}
          <div className="p-3 border-t border-white/5 bg-[#08080b] flex flex-col gap-2 shrink-0">
            {!collapsed ? (
              <div className="flex flex-col gap-2 p-2.5 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border border-white/5 text-[11px] transition-colors">
                <div
                  onClick={() => setProfileModalOpen(true)}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-sm">
                      {userInitials}
                    </div>
                    <div className="min-w-0">
                      <span className="text-white font-semibold truncate block group-hover:text-purple-300 transition-colors">
                        {userDisplayName}
                      </span>
                      <span className="text-[10px] text-zinc-500 truncate font-mono block">
                        {user?.email}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                      isAdmin
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    }`}
                  >
                    {isAdmin ? 'Master' : 'Ventas'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                  <button
                    onClick={() => setProfileModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-[10px] font-medium transition-colors"
                  >
                    <User size={11} />
                    <span>Mi Perfil</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => setTeamModalOpen(true)}
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[10px] font-medium transition-colors border border-purple-500/20"
                    >
                      <Users size={11} />
                      <span>Equipo</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm"
                  title={`Mi Perfil (${userDisplayName})`}
                >
                  {userInitials}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setTeamModalOpen(true)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                    title="Gestionar Equipo"
                  >
                    <Users size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400/90 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              title="Cerrar sesión"
            >
              <LogOut size={15} className="shrink-0 text-rose-400" />
              {!collapsed && <span>Cerrar Sesión</span>}
            </button>
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* TOP BAR WITH SAFE AREA INSET SUPPORT */}
          <header className="admin-mobile-header w-full border-b border-white/5 bg-[#0b0b0e]/95 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30 transition-all sm:h-16 sm:px-6 sm:py-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-xl text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 active:scale-95 transition-all shrink-0 flex items-center justify-center min-w-[42px] min-h-[42px] shadow-sm ml-0.5"
                title="Abrir menú"
                aria-label="Abrir menú"
              >
                <Menu size={20} />
              </button>

              <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono min-w-0">
                <span className="text-zinc-500 hidden sm:inline">creapp.os</span>
                <span className="text-zinc-600 hidden sm:inline">/</span>
                <span className="text-purple-300 font-semibold bg-purple-500/10 px-2 sm:px-2.5 py-1 rounded-lg border border-purple-500/20 truncate max-w-[125px] xs:max-w-[170px] sm:max-w-[260px]">
                  {currentTabLabel}
                </span>
                {!isAdmin && (
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono hidden xs:inline shrink-0">
                    Ventas
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions & User Menu in Header */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
              >
                <ExternalLink size={14} />
                <span>Web CreApp</span>
              </a>

              {isAdmin && (
                <button
                  onClick={() => setTeamModalOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                  title="Gestionar Equipo & Vendedores"
                >
                  <Users size={14} className="text-purple-400" />
                  <span>Equipo</span>
                </button>
              )}

              {onCreateLeadClick && (
                <button
                  onClick={onCreateLeadClick}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all"
                >
                  <Sparkles size={14} />
                  <span>+ Prospecto</span>
                </button>
              )}

              <button
                onClick={onCreateProposalClick}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 shadow-sm transition-all"
              >
                <Plus size={14} />
                <span>+ Propuesta</span>
              </button>

              {/* Notification Bell (FCM Push) */}
              <NotificationBell />

              {/* USER PROFILE DROPDOWN MENU */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 active:scale-95 transition-all text-xs font-medium text-white group min-h-[40px]"
                  aria-label="Menú de perfil de usuario"
                >
                  <div className="w-7 h-7 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 flex items-center justify-center text-white text-[11px] font-black shadow-inner shrink-0">
                    {userInitials}
                  </div>
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-[11px] font-bold text-white leading-tight truncate max-w-[110px]">
                      {userDisplayName}
                    </span>
                    <span className="text-[9px] font-mono text-purple-300 leading-tight">
                      {isAdmin ? 'Master Admin' : 'Ventas'}
                    </span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-zinc-400 transition-transform ${
                      userDropdownOpen ? 'rotate-180 text-white' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-[#0d0d12]/95 border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-50 p-2 flex flex-col gap-1 backdrop-blur-2xl"
                    >
                      {/* Dropdown Header */}
                      <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                          {userInitials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{userDisplayName}</p>
                          <p className="text-[10px] text-zinc-500 font-mono truncate">{user?.email}</p>
                          <span
                            className={`inline-block text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase mt-1 ${
                              isAdmin
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {isAdmin ? 'Master Admin' : 'Vendedor Comercial'}
                          </span>
                        </div>
                      </div>

                      {/* Dropdown Actions */}
                      <div className="py-1 space-y-0.5">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            setProfileModalOpen(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                        >
                          <User size={15} className="text-purple-400" />
                          <span>Mi Perfil & Contraseña</span>
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              setTeamModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white hover:bg-white/5 transition-colors text-left"
                          >
                            <Users size={15} className="text-purple-400" />
                            <span>Gestionar Vendedores</span>
                          </button>
                        )}
                      </div>

                      <div className="h-[1px] bg-white/5 my-0.5" />

                      {/* Logout Action */}
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left"
                      >
                        <LogOut size={15} />
                        <span>Cerrar Sesión</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </header>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-28 md:pb-8">
            {children}
          </main>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="admin-mobile-drawer relative w-72 bg-[#0d0d11] border-r border-white/10 flex flex-col p-4 z-10 h-full"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <img src={creappLogoOfficial} alt="CreApp" className="w-7 h-7" />
                  <span className="font-bold text-sm tracking-wide text-white">CREAPP OS</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
                  aria-label="Cerrar menú"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mobile User Card */}
              <div className="p-3 mb-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{userDisplayName}</p>
                  <p className="text-[10px] text-zinc-500 font-mono truncate">{user?.email}</p>
                  <span
                    className={`inline-block text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase mt-0.5 ${
                      isAdmin
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    }`}
                  >
                    {isAdmin ? 'Master Admin' : 'Ventas'}
                  </span>
                </div>
              </div>

              <nav className="flex-1 space-y-4 overflow-y-auto">
                {navGroups.map((group) => (
                  <div key={group.category} className="space-y-1">
                    <div className="px-2 pt-1 pb-1 text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold">
                      {group.category}
                    </div>
                    {group.items.map((item) => {
                      const active = currentTab === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onTabChange(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium ${
                            active
                              ? 'bg-purple-600/20 text-white border border-purple-500/30'
                              : 'text-zinc-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon size={18} className={active ? 'text-purple-400' : 'text-zinc-400'} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>

              <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-300 hover:text-white bg-white/5"
                >
                  <User size={16} />
                  <span>Mi Perfil</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setTeamModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20"
                  >
                    <Users size={16} />
                    <span>Gestionar Vendedores</span>
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10"
                >
                  <LogOut size={16} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MOBILE FLOATING BOTTOM NAVIGATION DOCK (Thumb Zone) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0b0e]/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.65)] px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex items-center justify-around relative max-w-md mx-auto">
          {/* 1. Dashboard */}
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
              currentTab === 'dashboard'
                ? 'text-purple-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LayoutDashboard size={20} className={currentTab === 'dashboard' ? 'scale-110 transition-transform' : ''} />
            <span className="text-[10px] mt-1 font-medium tracking-tight">Inicio</span>
            {currentTab === 'dashboard' && (
              <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-sm shadow-purple-400" />
            )}
          </button>

          {/* 2. Scraper */}
          <button
            onClick={() => onTabChange('scraper')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
              currentTab === 'scraper'
                ? 'text-purple-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radar size={20} className={currentTab === 'scraper' ? 'scale-110 transition-transform' : ''} />
            <span className="text-[10px] mt-1 font-medium tracking-tight">Scraper</span>
            {currentTab === 'scraper' && (
              <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-sm shadow-purple-400" />
            )}
          </button>

          {/* 3. Central Elevated Quick Action FAB */}
          <div className="relative -top-5 flex flex-col items-center">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setQuickActionsOpen(true)}
              className="w-[52px] h-[52px] rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 shadow-[0_4px_20px_rgba(168,85,247,0.45)] ring-4 ring-[#070709] flex items-center justify-center text-white active:opacity-95"
              title="Acciones Rápidas"
            >
              <Plus size={26} />
            </motion.button>
            <span className="text-[9px] font-mono text-zinc-400 mt-1 uppercase tracking-wider font-semibold">
              Acción
            </span>
          </div>

          {/* 4. CRM / Pipeline */}
          <button
            onClick={() => onTabChange('pipeline')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
              currentTab === 'pipeline'
                ? 'text-purple-400 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Kanban size={20} className={currentTab === 'pipeline' ? 'scale-110 transition-transform' : ''} />
            <span className="text-[10px] mt-1 font-medium tracking-tight">CRM</span>
            {currentTab === 'pipeline' && (
              <span className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-sm shadow-purple-400" />
            )}
          </button>

          {/* 5. Menú Completo (Drawer en Thumb Zone) */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative ${
              mobileMenuOpen ? 'text-purple-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200 active:scale-95'
            }`}
            aria-label="Abrir menú"
          >
            <div className="relative">
              <Menu size={20} className={mobileMenuOpen ? 'scale-110 transition-transform text-purple-400' : ''} />
              {isAdmin && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-500 shadow-sm shadow-purple-400" />
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium tracking-tight">Menú</span>
          </button>
        </div>
      </div>

      {/* QUICK ACTIONS BOTTOM SHEET MODAL */}
      <AnimatePresence>
        {quickActionsOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickActionsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="relative bg-[#0d0d12] border-t border-white/10 rounded-t-3xl p-5 z-10 max-h-[85vh] overflow-y-auto shadow-2xl pb-[max(1.75rem,env(safe-area-inset-bottom))]"
            >
              {/* Pull Bar */}
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />

              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-400" />
                    Acciones Rápidas
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Operativa directa desde tu dispositivo móvil</p>
                </div>
                <button
                  onClick={() => setQuickActionsOpen(false)}
                  className="p-1.5 rounded-full bg-white/5 text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {/* 1. Nueva Propuesta */}
                <button
                  onClick={() => {
                    setQuickActionsOpen(false);
                    onCreateProposalClick?.();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-left group active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
                      <Plus size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Nueva Propuesta Comercial</h4>
                      <p className="text-[11px] text-zinc-400">Crear cotización SaaS o desarrollo a medida</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                </button>

                {/* 2. Nuevo Prospecto / Lead */}
                <button
                  onClick={() => {
                    setQuickActionsOpen(false);
                    onTabChange('pipeline');
                    onCreateLeadClick?.();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left group active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <Users size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">+ Nuevo Prospecto CRM</h4>
                      <p className="text-[11px] text-zinc-400">Registrar nuevo cliente en el pipeline</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                </button>

                {/* 3. B2B Scraper */}
                <button
                  onClick={() => {
                    setQuickActionsOpen(false);
                    onTabChange('scraper');
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left group active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                      <Radar size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Lead Scraper con IA</h4>
                      <p className="text-[11px] text-zinc-400">Escanear negocios en Google Maps B2B</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                </button>

                {/* 4. NOC Radar (Solo Admin) */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setQuickActionsOpen(false);
                      onTabChange('telemetry');
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left group active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                        <Radio size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Telemetría NOC & Bugs</h4>
                        <p className="text-[11px] text-zinc-400">Monitoreo de latencia y Sentry de la flota</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                  </button>
                )}

                {/* 5. Suscripciones / Finanzas (Solo Admin) */}
                {isAdmin && (
                  <button
                    onClick={() => {
                      setQuickActionsOpen(false);
                      onTabChange('subscriptions');
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-left group active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Repeat size={18} />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Suscripciones & Abonos</h4>
                        <p className="text-[11px] text-zinc-400">Control de pagos mensuales recurrentes</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-500 group-hover:text-white transition-colors" />
                  </button>
                )}

                {/* 6. Instalar App en Móvil (PWA) */}
                {!isStandalone && (
                  <button
                    onClick={() => {
                      setQuickActionsOpen(false);
                      handleInstallClick();
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600/20 via-cyan-600/20 to-purple-600/20 border border-emerald-500/40 text-left group active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/30 shrink-0">
                        <Smartphone size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">Instalar CreAPP en tu Móvil</h4>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 text-[9px] font-bold uppercase tracking-wider">PWA</span>
                        </div>
                        <p className="text-[11px] text-zinc-300 truncate">Acceso directo como app nativa en tu pantalla de inicio</p>
                      </div>
                    </div>
                    <Download size={16} className="text-emerald-400 group-hover:scale-110 transition-transform shrink-0 ml-2" />
                  </button>
                )}
              </div>

              {/* Quick drawer link */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <button
                  onClick={() => {
                    setQuickActionsOpen(false);
                    setMobileMenuOpen(true);
                  }}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5"
                >
                  <Menu size={14} />
                  <span>Ver todos los módulos</span>
                </button>
                <button
                  onClick={() => {
                    setQuickActionsOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <User size={13} />
                  <span>Mi cuenta</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL GUÍA DE INSTALACIÓN PWA */}
      <AnimatePresence>
        {installModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInstallModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full max-w-md bg-[#0f0f15] border border-emerald-500/30 rounded-3xl p-6 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Instalar CreAPP OS</h3>
                    <p className="text-xs text-zinc-400">PWA optimizada para pantalla completa</p>
                  </div>
                </div>
                <button
                  onClick={() => setInstallModalOpen(false)}
                  className="p-1.5 rounded-full bg-white/5 text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Instrucciones iOS Safari */}
              <div className="p-4 rounded-2xl bg-[#14141f] border border-white/10 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">🍎</span>
                  <span>En iPhone / iPad (Safari)</span>
                </div>
                <ol className="text-xs text-zinc-300 space-y-2 pl-4 list-decimal marker:text-purple-400">
                  <li>Toca el botón <strong>Compartir</strong> (ícono cuadrado con flecha <Share2 size={12} className="inline text-purple-400" />) en la barra de Safari.</li>
                  <li>Desliza hacia abajo y selecciona <strong>"Agregar a pantalla de inicio"</strong> (+).</li>
                  <li>Toca <strong>"Agregar"</strong> arriba a la derecha ¡y listo!</li>
                </ol>
              </div>

              {/* Instrucciones Android Chrome */}
              <div className="p-4 rounded-2xl bg-[#14141f] border border-white/10 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">🤖</span>
                  <span>En Android (Google Chrome)</span>
                </div>
                <ol className="text-xs text-zinc-300 space-y-2 pl-4 list-decimal marker:text-emerald-400">
                  <li>Toca el menú de los <strong>tres puntos</strong> (⋮) en la esquina superior.</li>
                  <li>Elige <strong>"Instalar aplicación"</strong> o "Agregar a pantalla principal".</li>
                </ol>
              </div>

              <button
                onClick={() => setInstallModalOpen(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-emerald-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg active:scale-95 transition-all"
              >
                Entendido, Continuar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL MI PERFIL */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* MODAL GESTIÓN DE EQUIPO */}
      {isAdmin && (
        <TeamManagementModal
          isOpen={teamModalOpen}
          onClose={() => setTeamModalOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
