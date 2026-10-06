import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import creappLogoOfficial from '@/assets/CREAPP LOGO VECTOR.png';

interface PwaSplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

// Estelas de velocidad cósmica (Speed Lines) que caen simulando ascenso
const SpeedLine: React.FC<{ left: string; height: number; delay: number; duration: number }> = ({
  left,
  height,
  delay,
  duration,
}) => (
  <motion.div
    initial={{ y: '-20vh', opacity: 0 }}
    animate={{ y: '120vh', opacity: [0, 0.85, 0] }}
    transition={{
      repeat: Infinity,
      duration,
      delay,
      ease: 'linear',
    }}
    style={{ left, height: `${height}px` }}
    className="absolute w-[1.5px] bg-gradient-to-b from-transparent via-[#FF2D78] to-[#9B30FF] rounded-full pointer-events-none filter blur-[0.2px]"
  />
);

// Nubes de propulsión estilizadas
const SmokePuff: React.FC<{ xOffset: number; delay: number; scaleSize: number }> = ({
  xOffset,
  delay,
  scaleSize,
}) => (
  <motion.div
    initial={{ y: 0, scale: 0.3, opacity: 0.7, x: xOffset }}
    animate={{
      y: [0, 60, 120],
      scale: [0.3, scaleSize, scaleSize * 1.6],
      opacity: [0.7, 0.3, 0],
      x: [xOffset, xOffset * 1.3, xOffset * 1.6],
    }}
    transition={{
      duration: 0.9,
      repeat: Infinity,
      delay,
      ease: 'easeOut',
    }}
    className="absolute -bottom-2 w-7 h-7 rounded-full bg-gradient-to-t from-[#FF2D78]/25 via-[#9B30FF]/30 to-white/20 blur-md pointer-events-none"
  />
);

export const PwaSplashScreen: React.FC<PwaSplashScreenProps> = ({
  onComplete,
  duration = 1600,
}) => {
  // Estados de fase para control absoluto sin cuelgues
  const [phase, setPhase] = useState<'flying' | 'launching' | 'fadeout' | 'done'>('flying');

  useEffect(() => {
    try {
      const isStandalone =
        typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true);

      const hasSeenSplash = sessionStorage.getItem('creapp_pwa_splash_seen');
      if (hasSeenSplash && !isStandalone) {
        setPhase('done');
        onComplete?.();
        return;
      }
    } catch (e) {
      // Ignorar errores de storage en modo privado
    }

    // Tiempos de la coreografía
    const launchTime = Math.max(700, duration - 500); // 1100ms
    const fadeoutTime = duration;                      // 1600ms
    const doneTime = duration + 350;                   // 1950ms

    // 1. Iniciar despegue hacia arriba (Blast-off)
    const tLaunch = setTimeout(() => {
      setPhase('launching');
    }, launchTime);

    // 2. Desvanecer la cortina oscura
    const tFade = setTimeout(() => {
      setPhase('fadeout');
      try {
        sessionStorage.setItem('creapp_pwa_splash_seen', 'true');
      } catch (e) {}
      onComplete?.();
    }, fadeoutTime);

    // 3. Desmontar del DOM al 100%
    const tDone = setTimeout(() => {
      setPhase('done');
    }, doneTime);

    // HARD SAFETY FALLBACK: Pase lo que pase, a los 2.1s se desmonta sí o sí
    const tSafety = setTimeout(() => {
      setPhase('done');
    }, 2100);

    return () => {
      clearTimeout(tLaunch);
      clearTimeout(tFade);
      clearTimeout(tDone);
      clearTimeout(tSafety);
    };
  }, [duration, onComplete]);

  // Si ya terminó, no renderizar nada
  if (phase === 'done') {
    return null;
  }

  const isLaunching = phase === 'launching' || phase === 'fadeout';
  const isFading = phase === 'fadeout';

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-[#070709] flex flex-col items-center justify-center p-6 select-none overflow-hidden transition-opacity duration-300 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{ height: '100dvh' }}
    >
      {/* Fondo Cósmico y Destellos de Hiperespacio */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Resplandor ambiental de fondo */}
        <motion.div
          animate={{
            scale: isLaunching ? 2.2 : [1, 1.25, 1],
            opacity: isLaunching ? 0.6 : [0.25, 0.45, 0.25],
          }}
          transition={{ duration: isLaunching ? 0.4 : 2, repeat: isLaunching ? 0 : Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-[#FF2D78]/25 via-[#9B30FF]/30 to-cyan-500/20 blur-[100px]"
        />

        {/* Líneas de velocidad verticales */}
        <SpeedLine left="12%" height={80} delay={0} duration={0.8} />
        <SpeedLine left="26%" height={130} delay={0.25} duration={1.0} />
        <SpeedLine left="42%" height={100} delay={0.5} duration={0.75} />
        <SpeedLine left="60%" height={150} delay={0.1} duration={0.95} />
        <SpeedLine left="76%" height={110} delay={0.4} duration={0.8} />
        <SpeedLine left="88%" height={75} delay={0.2} duration={1.1} />

        {/* Estrellas sutiles */}
        <div className="absolute top-[20%] left-[22%] w-1 h-1 bg-white rounded-full animate-ping opacity-60" />
        <div className="absolute top-[30%] right-[24%] w-1.5 h-1.5 bg-[#FF2D78] rounded-full animate-pulse opacity-70" />
        <div className="absolute bottom-[32%] left-[30%] w-1 h-1 bg-[#9B30FF] rounded-full animate-ping opacity-50" />
      </div>

      {/* Núcleo Central: El Cohete CreAPP Vector Puro (Sin recuadro) */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Contenedor del Cohete con Levitación y Despegue */}
        <motion.div
          initial={{ scale: 0.7, y: 50, opacity: 0 }}
          animate={
            isLaunching
              ? {
                  y: -900,
                  scale: 1.15,
                  opacity: [1, 1, 0],
                  transition: { duration: 0.5, ease: [0.6, 0.05, -0.01, 0.9] },
                }
              : {
                  scale: 1,
                  y: [-4, 5, -4],
                  rotate: [-1.2, 1.2, -1.2],
                  opacity: 1,
                  transition: {
                    scale: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                    y: { repeat: Infinity, duration: 1.6, ease: 'easeInOut' },
                    rotate: { repeat: Infinity, duration: 2.0, ease: 'easeInOut' },
                  },
                }
          }
          className="relative flex flex-col items-center justify-center"
        >
          {/* Resplandor violeta/fucsia directo en el vector */}
          <div className="absolute w-32 h-32 rounded-full bg-gradient-to-tr from-[#FF2D78]/35 to-[#9B30FF]/35 blur-2xl pointer-events-none" />

          {/* Onda expansiva luminosa al despegar */}
          {isLaunching && (
            <motion.div
              initial={{ scale: 0.4, opacity: 1 }}
              animate={{ scale: 3.5, opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="absolute w-24 h-24 rounded-full border-2 border-[#FF2D78] shadow-[0_0_30px_#FF2D78] pointer-events-none"
            />
          )}

          {/* COHETE VECTOR OFICIAL (Totalmente libre, sin recuadros ni cajas) */}
          <div className="relative flex items-center justify-center">
            <img
              src={creappLogoOfficial}
              alt="CreAPP Rocket"
              className="w-20 sm:w-24 h-auto object-contain filter drop-shadow-[0_0_24px_rgba(255,45,120,0.7)] drop-shadow-[0_0_12px_rgba(155,48,255,0.6)] pointer-events-none"
            />
          </div>

          {/* LLAMA DE PROPULSIÓN CONECTADA A LA TOBERA DEL VECTOR */}
          <div className="relative -mt-3.5 flex flex-col items-center">
            <motion.div
              animate={
                isLaunching
                  ? {
                      scaleY: [2, 3.8],
                      scaleX: [1.2, 0.85],
                      opacity: 1,
                    }
                  : {
                      scaleY: [1, 1.35, 0.95, 1.25, 1],
                      scaleX: [1, 0.92, 1.06, 0.95, 1],
                    }
              }
              transition={{
                repeat: isLaunching ? 0 : Infinity,
                duration: isLaunching ? 0.35 : 0.28,
                ease: 'easeInOut',
              }}
              className="relative origin-top flex flex-col items-center"
            >
              {/* Cono Exterior de la Llama (Magenta / Púrpura) */}
              <div
                className="w-5 sm:w-6 h-11 sm:h-12 rounded-b-full bg-gradient-to-b from-[#FF2D78] via-[#9B30FF] to-transparent filter blur-[1px] shadow-[0_8px_20px_#FF2D78]"
                style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 70%, 50% 100%, 0% 70%)' }}
              />

              {/* Núcleo Interior de la Llama (Cian / Blanco incandescente) */}
              <div
                className="absolute top-0 w-2.5 sm:w-3 h-6 sm:h-7 rounded-b-full bg-gradient-to-b from-white via-cyan-300 to-transparent filter blur-[0.4px]"
                style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 75%, 50% 100%, 0% 75%)' }}
              />
            </motion.div>

            {/* Nubes de humo saliendo de la propulsión */}
            <div className="absolute top-5 flex items-center justify-center pointer-events-none">
              <SmokePuff xOffset={-12} delay={0} scaleSize={1} />
              <SmokePuff xOffset={12} delay={0.2} scaleSize={1.1} />
              <SmokePuff xOffset={-5} delay={0.4} scaleSize={1.2} />
              <SmokePuff xOffset={7} delay={0.6} scaleSize={0.9} />
            </div>
          </div>
        </motion.div>

        {/* Tipografía de Marca Centrada (CreAPP + Software Lab) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isLaunching ? { opacity: 0, y: -10 } : { opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="flex flex-col items-center text-center mt-9"
        >
          <div className="font-display font-black text-3xl sm:text-4xl tracking-tight text-white text-center">
            <span>cre</span>
            <span className="bg-gradient-to-r from-[#FF2D78] via-[#9B30FF] to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,45,120,0.5)]">
              app
            </span>
          </div>

          <p className="text-[11px] sm:text-xs text-zinc-400 font-mono tracking-[0.25em] uppercase mt-2">
            Software Lab
          </p>

          {/* Barra de progreso láser */}
          <div className="mt-5 w-32 h-[2.5px] bg-white/10 rounded-full overflow-hidden relative">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: isLaunching ? '0%' : '100%' }}
              transition={{
                repeat: isLaunching ? 0 : Infinity,
                duration: 1.0,
                ease: 'easeInOut',
              }}
              className="absolute inset-y-0 w-full bg-gradient-to-r from-transparent via-[#FF2D78] to-[#9B30FF] shadow-[0_0_12px_#FF2D78]"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PwaSplashScreen;
