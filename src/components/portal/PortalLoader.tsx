import React, { useEffect, useState } from 'react';

const MESSAGES = [
  'Preparando tu campaña…',
  'Encendiendo las luces…',
  'Trayendo las piezas…',
  'Puliendo los últimos detalles…',
  'Ya casi…',
];

/**
 * Loader del portal en la estética CreAPP (negro + violeta, Outfit), con mensajes
 * rotando. Se usa en TODAS las capas de carga (Suspense del chunk, guard de auth y
 * carga de datos). Es pre-contenido — aparece antes de saber la campaña — así que
 * NO se tematiza por cliente: comparte la puerta de entrada con el login (authShell)
 * para que al refrescar no parpadee el look anterior.
 */
export const PortalLoader: React.FC = () => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 950);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="font-body relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background-dark px-6 text-center">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-primary" aria-hidden="true" />
        <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">Tu agencia te presenta</div>
        <div key={i} className="font-display text-xl font-semibold text-white">{MESSAGES[i]}</div>
      </div>
    </div>
  );
};

export default PortalLoader;
