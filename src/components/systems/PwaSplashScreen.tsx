import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import creappLogoOfficial from '@/assets/CREAPP LOGO VECTOR.png';

interface PwaSplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

// Estelas de velocidad cósmica que caen simulando ascenso a hipervelocidad
const SpeedLine: React.FC<{ left: string; height: number; delay: number; duration: number }> = ({
  left,
  height,
  delay,
  duration,
}) => (
  <motion.div
    initial={{ y: '-20vh', opacity: 0 }}
    animate={{ y: '120vh', opacity: [0, 0.9, 0] }}
    transition={{
      repeat: Infinity,
      duration,
      delay,
      ease: 'linear',
    }}
    style={{ left, height: `${height}px` }}
    className="absolute w-[1.5px] bg-gradient-to-b from-transparent via-[#FF2D78] to-[#9B30FF] rounded-full pointer-events-none filter blur-[0.3px]"
  />
);

// Nubes de humo/propulsión estilizadas
const SmokePuff: React.FC<{ xOffset: number; delay: number; scaleSize: number }> = ({
  xOffset,
  delay,
  scaleSize,
}) => (
  <motion.div
    initial={{ y: 0, scale: 0.4, opacity: 0.8, x: xOffset }}
    animate={{
      y: [0, 80, 160],
      scale: [0.4, scaleSize * 1.2, scaleSize * 2],
      opacity: [0.8, 0.4, 0],
      x: [xOffset, xOffset * 1.4, xOffset * 1.8],
    }}
    transition={{
      duration: 1.1,
      repeat: Infinity,
      delay,
      ease: 'easeOut',
    }}
    className="absolute -bottom-4 w-9 h-9 rounded-full bg-gradient-to-t from-[#FF2D78]/25 via-[#9B30FF]/30 to-white/20 blur-md pointer-events-none"
  />
);

export const PwaSplashScreen: React.FC<PwaSplashScreenProps> = ({
  onComplete,
  duration = 1800,
}) => {
  const [visible, setVisible] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true);

    const hasSeenSplash = sessionStorage.getItem('creapp_pwa_splash_seen');

    if (hasSeenSplash && !isStandalone) {
      setVisible(false);
      onComplete?.();
      return;
    }

    // Fase 1: Despegue a hipervelocidad 450ms antes del cierre
    const launchTimer = setTimeout(() => {
      setIsLaunching(true);
    }, Math.max(800, duration - 450));

    // Fase 2: Salida y desmontaje
    const endTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem('creapp_pwa_splash_seen', 'true');
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(launchTimer);
      clearTimeout(endTimer);
    };
  }, [duration, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pwa-wegho-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[99999] bg-[#070709] flex flex-col items-center justify-between p-6 select-none pointer-events-auto overflow-hidden"
          style={{ height: '100dvh' }}
        >
          {/* Fondo Cósmico y Destellos de Hiperespacio */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Resplandor ambiental de fondo */}
            <motion.div
              animate={{
                scale: isLaunching ? 2.5 : [1, 1.25, 1],
                opacity: isLaunching ? 0.7 : [0.25, 0.45, 0.25],
              }}
              transition={{ duration: isLaunching ? 0.4 : 2, repeat: isLaunching ? 0 : Infinity }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-[#FF2D78]/25 via-[#9B30FF]/30 to-cyan-500/20 blur-[100px]"
            />

            {/* Líneas de velocidad verticales cayendo (Simulan ascenso hacia arriba) */}
            <SpeedLine left="12%" height={90} delay={0} duration={0.9} />
            <SpeedLine left="24%" height={140} delay={0.3} duration={1.1} />
            <SpeedLine left="40%" height={110} delay={0.6} duration={0.8} />
            <SpeedLine left="62%" height={160} delay={0.15} duration={1.0} />
            <SpeedLine left="78%" height={120} delay={0.45} duration={0.85} />
            <SpeedLine left="88%" height={80} delay={0.2} duration={1.2} />

            {/* Estrellas sutiles que parpadean */}
            <div className="absolute top-[18%] left-[20%] w-1 h-1 bg-white rounded-full animate-ping opacity-60" />
            <div className="absolute top-[28%] right-[22%] w-1.5 h-1.5 bg-[#FF2D78] rounded-full animate-pulse opacity-70" />
            <div className="absolute bottom-[35%] left-[28%] w-1 h-1 bg-[#9B30FF] rounded-full animate-ping opacity-50" />
          </div>

          {/* Barra Superior - Indicador de Sistema */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="relative z-10 pt-safe mt-3"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="text-[10px] font-mono tracking-widest text-zinc-300 uppercase font-semibold">
                CreAPP Engine • Launching
              </span>
            </div>
          </motion.div>

          {/* Núcleo Central: El Cohete CreAPP Estilo Wegho Motion */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto">
            {/* Contenedor del Cohete con Levitation / Vibration y Blast-off */}
            <motion.div
              initial={{ scale: 0.6, y: 80, opacity: 0 }}
              animate={
                isLaunching
                  ? {
                      y: -850,
                      scale: 1.15,
                      opacity: [1, 1, 0],
                      transition: { duration: 0.5, ease: [0.6, 0.05, -0.01, 0.9] },
                    }
                  : {
                      scale: 1,
                      y: [-5, 6, -5],
                      rotate: [-1.2, 1.2, -1.2],
                      opacity: 1,
                      transition: {
                        scale: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
                        y: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' },
                        rotate: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' },
                      },
                    }
              }
              className="relative flex flex-col items-center justify-center"
            >
              {/* Resplandor del Cohete */}
              <div className="absolute w-36 h-36 rounded-full bg-gradient-to-tr from-[#FF2D78]/35 to-[#9B30FF]/35 blur-2xl animate-pulse" />

              {/* Onda expansiva luminosa al despegar */}
              {isLaunching && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 1 }}
                  animate={{ scale: 4, opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute w-28 h-28 rounded-full border-2 border-[#FF2D78] shadow-[0_0_30px_#FF2D78]"
                />
              )}

              {/* Cohete Vector CreAPP (Emblema) */}
              <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 p-5 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(255,45,120,0.3)] flex items-center justify-center">
                <img
                  src={creappLogoOfficial}
                  alt="CreAPP Rocket"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_22px_rgba(255,45,120,0.65)]"
                />
              </div>

              {/* LLAMA DE PROPULSIÓN (Thruster Jet Flame) */}
              <div className="relative -mt-2 flex flex-col items-center">
                {/* Llama de plasma animada */}
                <motion.div
                  animate={
                    isLaunching
                      ? {
                          scaleY: [2, 3.5],
                          scaleX: [1.2, 0.9],
                          opacity: 1,
                        }
                      : {
                          scaleY: [1, 1.35, 0.95, 1.25, 1],
                          scaleX: [1, 0.92, 1.08, 0.96, 1],
                        }
                  }
                  transition={{
                    repeat: isLaunching ? 0 : Infinity,
                    duration: isLaunching ? 0.35 : 0.3,
                    ease: 'easeInOut',
                  }}
                  className="relative origin-top flex flex-col items-center"
                >
                  {/* Cono Exterior de la Llama (Magenta / Púrpura) */}
                  <div
                    className="w-6 h-12 rounded-b-full bg-gradient-to-b from-[#FF2D78] via-[#9B30FF] to-transparent filter blur-[1.5px] shadow-[0_10px_25px_#FF2D78]"
                    style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 70%, 50% 100%, 0% 70%)' }}
                  />

                  {/* Núcleo Interior de la Llama (Cian / Blanco incandescente) */}
                  <div
                    className="absolute top-0 w-3 h-7 rounded-b-full bg-gradient-to-b from-white via-cyan-300 to-transparent filter blur-[0.5px]"
                    style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 75%, 50% 100%, 0% 75%)' }}
                  />
                </motion.div>

                {/* Nubes de humo/propulsión flotantes saliendo de la tobera */}
                <div className="absolute top-6 flex items-center justify-center">
                  <SmokePuff xOffset={-14} delay={0} scaleSize={1} />
                  <SmokePuff xOffset={14} delay={0.25} scaleSize={1.1} />
                  <SmokePuff xOffset={-6} delay={0.5} scaleSize={1.2} />
                  <SmokePuff xOffset={8} delay={0.75} scaleSize={0.9} />
                </div>
              </div>
            </motion.div>

            {/* Tipografía de Marca (creapp OS) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isLaunching ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="flex flex-col items-center text-center mt-12"
            >
              <div className="flex items-baseline gap-1 font-display font-black text-3xl sm:text-4xl tracking-tight text-white mb-1.5">
                <span>cre</span>
                <span className="bg-gradient-to-r from-[#FF2D78] via-[#9B30FF] to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,45,120,0.5)]">
                  app
                </span>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 ml-2">
                  OS
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono tracking-wider uppercase">
                Software Lab & Innovation Hub
              </p>

              {/* Barra de progreso de encendido */}
              <div className="mt-5 w-36 h-[3px] bg-white/10 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: isLaunching ? '0%' : '100%' }}
                  transition={{
                    repeat: isLaunching ? 0 : Infinity,
                    duration: 1.1,
                    ease: 'easeInOut',
                  }}
                  className="absolute inset-y-0 w-full bg-gradient-to-r from-transparent via-[#FF2D78] to-[#9B30FF] shadow-[0_0_12px_#FF2D78]"
                />
              </div>
            </motion.div>
          </div>

          {/* Pie de pantalla / Ready */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isLaunching ? 0 : 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="relative z-10 pb-safe mb-2 text-center"
          >
            <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">
              Innovation in Motion • Ready
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PwaSplashScreen;
