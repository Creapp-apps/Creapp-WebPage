import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import creappLogoOfficial from '@/assets/CREAPP LOGO VECTOR.png';

interface PwaSplashScreenProps {
  onComplete?: () => void;
  minDuration?: number; // Duración mínima en ms
}

export const PwaSplashScreen: React.FC<PwaSplashScreenProps> = ({
  onComplete,
  minDuration = 1200,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Si ya se mostró el splash en esta sesión en el navegador estándar, podemos omitirlo
    // pero en modo PWA standalone (agregado a pantalla de inicio), siempre da la bienvenida nativa.
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

    // Temporizador de duración de splash
    const timer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem('creapp_pwa_splash_seen', 'true');
      onComplete?.();
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pwa-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[9999] bg-[#070709] flex flex-col items-center justify-between p-8 select-none pointer-events-auto overflow-hidden"
          style={{ height: '100dvh' }}
        >
          {/* Ambient Cosmic Background Glows */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.25, 0.45, 0.25],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-[#FF2D78]/30 via-[#9B30FF]/30 to-cyan-500/20 blur-[90px]"
            />
          </div>

          {/* Top Pill - System Status */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="relative z-10 pt-safe mt-4"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[10px] font-mono tracking-widest text-zinc-300 uppercase font-semibold">
                CreAPP OS • Launchpad
              </span>
            </div>
          </motion.div>

          {/* Center Branding Hero */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto">
            {/* Rocket Vector with Breathing Aura */}
            <motion.div
              initial={{ scale: 0.75, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative flex items-center justify-center mb-6"
            >
              {/* Outer Ring Glow */}
              <div className="absolute w-36 h-36 rounded-full bg-gradient-to-tr from-[#FF2D78]/25 to-[#9B30FF]/25 blur-xl animate-pulse" />

              <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 p-5 backdrop-blur-2xl shadow-2xl flex items-center justify-center">
                <img
                  src={creappLogoOfficial}
                  alt="CreAPP Logo"
                  className="w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(255,45,120,0.5)]"
                />
              </div>
            </motion.div>

            {/* Typography */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="flex flex-col items-center text-center"
            >
              <div className="flex items-baseline gap-1 font-display font-black text-3xl sm:text-4xl tracking-tight text-white mb-1.5">
                <span>cre</span>
                <span className="bg-gradient-to-r from-[#FF2D78] via-[#9B30FF] to-cyan-400 bg-clip-text text-transparent">
                  app
                </span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 ml-2">
                  OS
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono tracking-wider uppercase">
                Software Lab & Innovation Hub
              </p>
            </motion.div>

            {/* Laser Shimmer Energy Bar */}
            <motion.div
              initial={{ opacity: 0, width: 40 }}
              animate={{ opacity: 1, width: 140 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="h-[2.5px] bg-white/10 rounded-full mt-7 relative overflow-hidden"
            >
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                  repeat: Infinity,
                  duration: 1.1,
                  ease: 'easeInOut',
                }}
                className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-[#FF2D78] to-[#9B30FF] rounded-full shadow-[0_0_12px_#FF2D78]"
              />
            </motion.div>
          </div>

          {/* Bottom Security / System Stamp */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative z-10 pb-safe mb-3 text-center"
          >
            <span className="text-[10px] font-mono text-zinc-600 tracking-widest uppercase">
              Encrypted Session • Ready
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PwaSplashScreen;
