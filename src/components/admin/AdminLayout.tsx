import React, { useState } from 'react';
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
  Plus,
  ShieldCheck,
  Search,
  ExternalLink,
  Sparkles,
  Menu,
  X,
  Repeat,
  WalletCards,
} from 'lucide-react';
import creappLogoOfficial from '@/assets/CREAPP LOGO VECTOR.png';
import { supabase } from '@/lib/supabaseClient';

export type AdminTab = 
  | 'dashboard'
  | 'scraper'
  | 'pipeline'
  | 'proposals'
  | 'contracts'
  | 'projects'
  | 'subscriptions'
  | 'finances';

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const navGroups: NavGroup[] = [
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
      ],
    },
  ];

  // Helper para buscar el título actual del tab
  const allNavItems = navGroups.flatMap((g) => g.items);
  const currentTabLabel =
    currentTab === 'proposals'
      ? 'Creador de Propuestas de Desarrollo'
      : allNavItems.find((n) => n.id === currentTab)?.label || 'CreApp OS';

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 flex-1 flex overflow-hidden">
        {/* DESKTOP SIDEBAR */}
        <aside
          className={`hidden md:flex flex-col border-r border-white/5 bg-[#0b0b0e]/80 backdrop-blur-xl transition-all duration-300 z-30 ${
            collapsed ? 'w-20' : 'w-64'
          }`}
        >
          {/* Logo & Brand */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-white/5">
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
          <div className="p-3">
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

          {/* Categorized Navigation Groups */}
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

          {/* User profile & System Status */}
          <div className="p-3 border-t border-white/5 flex flex-col gap-2">
            {!collapsed && (
              <div className="flex items-center justify-between px-2 py-1.5 bg-black/40 rounded-lg border border-white/5 text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-zinc-400 font-mono">Cloud OS Ready</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">v2.4</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ${
                collapsed ? 'justify-center px-0' : ''
              }`}
              title="Cerrar sesión"
            >
              <LogOut size={16} className="shrink-0" />
              {!collapsed && <span>Cerrar Sesión</span>}
            </button>
          </div>
        </aside>

        {/* MAIN VIEWPORT */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* TOP BAR */}
          <header className="h-16 px-4 sm:px-6 border-b border-white/5 bg-[#0b0b0e]/60 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
              >
                <Menu size={20} />
              </button>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-zinc-500">creapp.os</span>
                <span className="text-zinc-600">/</span>
                <span className="text-purple-300 font-semibold bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {currentTabLabel}
                </span>
              </div>
            </div>

            {/* Quick Actions in Header */}
            <div className="flex items-center gap-2.5">
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
              >
                <ExternalLink size={14} />
                <span>Ver Web CreApp</span>
              </a>

              {onCreateLeadClick && (
                <button
                  onClick={onCreateLeadClick}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all"
                >
                  <Sparkles size={14} />
                  <span className="hidden sm:inline">+ Prospecto</span>
                </button>
              )}

              <button
                onClick={onCreateProposalClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 shadow-sm transition-all"
              >
                <Plus size={14} />
                <span>+ Propuesta</span>
              </button>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className={`flex-1 p-4 sm:p-6 lg:p-8 w-full ${currentTab === 'pipeline' ? 'max-w-[1920px] mx-auto' : 'max-w-7xl mx-auto'}`}>
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
              className="relative w-72 bg-[#0d0d11] border-r border-white/10 flex flex-col p-4 z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <img src={creappLogoOfficial} alt="CreApp" className="w-7 h-7" />
                  <span className="font-bold text-sm tracking-wide text-white">CREAPP OS</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X size={18} />
                </button>
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

              <div className="pt-4 border-t border-white/10">
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
    </div>
  );
};

export default AdminLayout;
