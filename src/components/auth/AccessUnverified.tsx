import React from 'react';
import { useAuth } from '@/context/AuthContext';

// Pantalla neutra cuando no se pudo leer el rol real de la cuenta.
// Fail-closed: no muestra ni el panel del equipo ni el portal.
const AccessUnverified: React.FC = () => {
  const { refreshProfile, signOut } = useAuth();
  return (
    <div className="min-h-screen bg-[#070709] text-white flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-lg font-bold mb-2">No pudimos verificar tu acceso</h2>
      <p className="text-sm text-zinc-400 max-w-sm mb-6 leading-relaxed">
        La conexión está lenta o se cortó. Probá de nuevo en unos segundos.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => { void refreshProfile(); }}
          className="px-5 py-2.5 rounded-xl bg-white text-black text-xs font-semibold uppercase tracking-wider active:scale-95 transition-all"
        >
          Reintentar
        </button>
        <button
          onClick={() => { void signOut(); }}
          className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold uppercase tracking-wider transition-all"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default AccessUnverified;
