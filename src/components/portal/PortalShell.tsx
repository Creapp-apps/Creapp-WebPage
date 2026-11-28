import React, { useCallback, useEffect, useState } from 'react';
import {
  Sparkles, ClipboardCheck, CalendarDays, BarChart3,
  Clapperboard, Inbox, LogOut, PanelLeftClose, PanelLeft, Menu, X,
} from 'lucide-react';
import { AgencyBadge } from '@/components/portal/AgencyBadge';
import { BrandMarkView } from '@/components/portal/BrandMark';
import type { PortalCampaign } from '@/lib/portalTypes';

export type PortalSection = 'campania' | 'revision' | 'calendario' | 'piezas' | 'bandeja' | 'insights';

interface Props {
  active: PortalSection;
  onNavigate: (s: PortalSection) => void;
  pendingCount?: number;
  inboxCount?: number;
  onSignOut: () => void;
  /** Marca del cliente para el mark superior del sidebar (logo + monograma). */
  brand?: PortalCampaign['client'] | null;
  /** Modo en vivo: oculta Revisión (campaña ya publicada, nada para revisar). */
  hideReview?: boolean;
  children: React.ReactNode;
}

const COLLAPSE_KEY = 'portal.sidebar.collapsed';

const readCollapsed = (): boolean => {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
};

type NavDef = { id: PortalSection; label: string; icon: React.ComponentType<{ size?: number }> };
const NAV: NavDef[] = [
  { id: 'campania', label: 'Campaña', icon: Sparkles },
  { id: 'revision', label: 'Revisión', icon: ClipboardCheck },
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
  { id: 'piezas', label: 'Mis Piezas', icon: Clapperboard },
  { id: 'bandeja', label: 'Bandeja de entrada', icon: Inbox },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
];

/** Shell del portal del cliente: sidebar colapsable (chrome CreAPP) + contenido. Spec §5.3. */
export const PortalShell: React.FC<Props> = ({ active, onNavigate, pendingCount = 0, inboxCount = 0, onSignOut, brand, hideReview, children }) => {
  const nav = hideReview ? NAV.filter((n) => n.id !== 'revision') : NAV;
  const initial = (brand?.name ?? 'C').trim().charAt(0).toUpperCase() || 'C';
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const n = !c;
      try { localStorage.setItem(COLLAPSE_KEY, n ? '1' : '0'); } catch { /* ignore */ }
      return n;
    });
  }, []);

  // Cierra el drawer móvil al navegar o con Escape.
  const go = useCallback((s: PortalSection) => { onNavigate(s); setMobileOpen(false); }, [onNavigate]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className={`pshell${collapsed ? ' collapsed' : ''}${mobileOpen ? ' m-open' : ''}`}>
      <button type="button" className="pshell-scrim" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />

      <aside className="psb">
        <div className="psb-top">
          <div className="psb-brand" title={brand?.name ?? undefined}>
            <span className="psb-mark">{initial}</span>
            <span className="psb-logo">{brand ? <BrandMarkView client={brand} /> : <b className="psb-name">Tu marca</b>}</span>
          </div>
          <button type="button" className="psb-collapse" aria-label={collapsed ? 'Expandir' : 'Colapsar'} onClick={toggleCollapsed}>
            {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="psb-nav">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`psb-item${active === id ? ' on' : ''}`}
              aria-current={active === id ? 'page' : undefined}
              title={collapsed ? label : undefined}
              onClick={() => go(id)}
            >
              <span className="psb-ic"><Icon size={19} /></span>
              <span className="psb-lbl">{label}</span>
              {id === 'revision' && pendingCount > 0 && <span className="psb-badge">{pendingCount}</span>}
              {id === 'bandeja' && inboxCount > 0 && <span className="psb-badge">{inboxCount}</span>}
            </button>
          ))}
        </nav>

        <div className="psb-foot">
          <AgencyBadge />
          <button type="button" className="psb-signout" onClick={onSignOut}>
            <LogOut size={16} /> <span className="psb-lbl">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main className="pshell-main">
        <header className="pshell-mtop">
          <button type="button" className="pshell-burger" aria-label="Abrir menú" onClick={() => setMobileOpen(true)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          {brand && <span className="pshell-mbrand"><BrandMarkView client={brand} /></span>}
        </header>
        {children}
      </main>
    </div>
  );
};
