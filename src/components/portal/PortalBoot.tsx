import React, { createContext, useContext, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PortalSplash } from './PortalSplash';
import { hasSeenSplash, markSplashSeen } from '@/lib/splashSession';

type Accent = { color: string; deep: string; bg: string };
type BootCtx = {
  /** PortalView avisa cuando terminó de cargar la campaña. */
  setReady: (v: boolean) => void;
  /** Color de la campaña, para que el tinte de la splash sea el de la marca. */
  setAccent: (a: Accent | null) => void;
  /** true mientras la splash cubre la pantalla (gating del reveal del contenido). */
  splashActive: boolean;
};

const Ctx = createContext<BootCtx>({ setReady: () => {}, setAccent: () => {}, splashActive: false });
export const usePortalBoot = () => useContext(Ctx);

// Dueño único de la splash: la renderiza como overlay sobre TODO el arranque del
// portal (chequeo de auth del guard + carga del chunk + carga de datos), para que
// el cohete sea la única experiencia de carga, sin spinner previo. Despega cuando
// la auth resolvió y los datos están listos; al terminar, revela el contenido.
export const PortalBoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading: authLoading } = useAuth();
  const [dataReady, setDataReady] = useState(false);
  const [accent, setAccent] = useState<Accent | null>(null);
  const [splashDone, setSplashDone] = useState(false);
  const shouldSplash = useMemo(() => !hasSeenSplash(), []);
  const splashActive = shouldSplash && !splashDone;

  const ctx = useMemo<BootCtx>(() => ({ setReady: setDataReady, setAccent, splashActive }), [splashActive]);

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {splashActive && (
        <PortalSplash
          ready={!authLoading && dataReady}
          accent={accent}
          onDone={() => { markSplashSeen(); setSplashDone(true); }}
        />
      )}
    </Ctx.Provider>
  );
};

export default PortalBoot;
