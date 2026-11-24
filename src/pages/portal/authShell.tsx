import React from 'react';
import creappLogo from '@/assets/CREAPP LOGO VECTOR.png';

// Shell de autenticación del portal. Estética CreAPP fija (violeta/negro, tech):
// es la puerta de entrada, ANTES de saber qué cliente/campaña se verá, así que
// nunca se tematiza por marca. El theming por campaña vive en el interior del portal.

export const fieldCls =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-transparent transition-all';

export const labelCls =
  'block mb-1.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-300';

export const primaryBtnCls =
  'mt-3 w-full rounded-full py-3 font-bold text-white bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100';

export const ErrorBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    role="alert"
    className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-300"
  >
    {children}
  </div>
);

export const AuthShell: React.FC<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ eyebrow, title, subtitle, children, footer }) => (
  <div className="font-body relative flex min-h-screen items-center justify-center overflow-hidden bg-background-dark p-4 sm:p-6">
    {/* Luz ambiente CreAPP */}
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-1/4 left-1/3 h-[400px] w-[400px] rounded-full bg-secondary/10 blur-[140px]" />
    </div>

    <div className="relative z-10 w-full max-w-sm">
      <div className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl duration-500">
        <div className="mb-5 flex justify-center">
          <img src={creappLogo} alt="CreAPP" className="h-11 w-11 rounded-[6px] object-contain" />
        </div>
        {eyebrow && (
          <div className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-center text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1.5 text-center text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-5 text-center">{footer}</div>}
    </div>
  </div>
);
