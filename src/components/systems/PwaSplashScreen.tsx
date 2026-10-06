import React, { useState, useEffect } from 'react';
import creappLogoOfficial from '@/assets/CREAPP LOGO VECTOR.png';

interface PwaSplashScreenProps {
  onComplete?: () => void;
}

// Estrellas de 4 puntas estilo Wegho (Sparkles dorados/neón al lado del cohete)
const SparkleStar: React.FC<{ size: number; className?: string; color?: string }> = ({
  size,
  className = '',
  color = '#FFE600',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`filter drop-shadow-[0_0_8px_${color}] ${className}`}
  >
    <path
      d="M12 0C12 7.5 14.5 12 24 12C14.5 12 12 16.5 12 24C12 16.5 9.5 12 0 12C9.5 12 12 7.5 12 0Z"
      fill={color}
    />
  </svg>
);

export const PwaSplashScreen: React.FC<PwaSplashScreenProps> = ({ onComplete }) => {
  // Secuencia de animación estilo Wegho (adaptada a CreAPP):
  // 1. 'ascending': El cohete emerge desde abajo dejando la estela de nubes mientras las nubes base suben (0 - 1.2s)
  // 2. 'settled': El cohete se mantiene en la parte superior, las nubes cubren la base y se revela 'creapp Software Lab' (1.2s - 1.9s)
  // 3. 'blastoff': El cohete acelera disparado fuera de la pantalla por arriba (1.9s - 2.3s)
  // 4. 'reveal': Las nubes y la escena se desvanecen suavemente hacia el login/app (2.3s - 2.7s)
  // 5. 'done': Desmontado total del DOM (2.8s)
  const [stage, setStage] = useState<'ascending' | 'settled' | 'blastoff' | 'reveal' | 'done'>('ascending');

  useEffect(() => {
    // Retirar el splash estático de index.html
    const staticSplash = document.getElementById('pwa-static-splash');
    if (staticSplash) {
      staticSplash.style.opacity = '0';
      setTimeout(() => {
        staticSplash.remove();
      }, 200);
    }

    // Comprobar sesión
    try {
      const isStandalone =
        typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true);

      const hasSeen = sessionStorage.getItem('creapp_pwa_splash_seen');
      if (hasSeen && !isStandalone) {
        setStage('done');
        onComplete?.();
        return;
      }
    } catch (e) {}

    // Cronograma Cinemático Wegho + CreAPP
    const tSettled = setTimeout(() => {
      setStage('settled');
    }, 1100);

    const tBlastoff = setTimeout(() => {
      setStage('blastoff');
    }, 1900);

    const tReveal = setTimeout(() => {
      setStage('reveal');
      try {
        sessionStorage.setItem('creapp_pwa_splash_seen', 'true');
      } catch (e) {}
      onComplete?.();
    }, 2350);

    const tDone = setTimeout(() => {
      setStage('done');
    }, 2750);

    // Hard safety timeout
    const tSafety = setTimeout(() => {
      setStage('done');
    }, 3000);

    return () => {
      clearTimeout(tSettled);
      clearTimeout(tBlastoff);
      clearTimeout(tReveal);
      clearTimeout(tDone);
      clearTimeout(tSafety);
    };
  }, [onComplete]);

  if (stage === 'done') {
    return null;
  }

  const isAscending = stage === 'ascending';
  const isSettled = stage === 'settled';
  const isBlastoff = stage === 'blastoff';
  const isReveal = stage === 'reveal';

  return (
    <div
      onClick={() => setStage('done')}
      className={`fixed inset-0 z-[99999] bg-[#070709] flex flex-col items-center justify-between select-none overflow-hidden transition-opacity duration-500 ease-out ${
        isReveal ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{ height: '100dvh' }}
    >
      {/* ── CIELO ESPACIAL CON ESTRELLAS QUE TITILAN (Estilo Wegho en Dark Mode) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Resplandor radial cósmico superior */}
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-gradient-to-b from-[#FF2D78]/20 via-[#9B30FF]/25 to-transparent blur-[90px]" />

        {/* Constelación de estrellas centelleantes */}
        {[
          { top: '8%', left: '15%', size: 4, delay: '0s' },
          { top: '12%', left: '82%', size: 3, delay: '0.4s' },
          { top: '18%', left: '38%', size: 4.5, delay: '0.8s' },
          { top: '22%', left: '68%', size: 3, delay: '0.2s' },
          { top: '28%', left: '12%', size: 4, delay: '0.6s' },
          { top: '34%', left: '88%', size: 3.5, delay: '1s' },
          { top: '40%', left: '25%', size: 4, delay: '0.3s' },
          { top: '46%', left: '74%', size: 5, delay: '0.7s' },
          { top: '55%', left: '18%', size: 3, delay: '0.5s' },
          { top: '62%', left: '85%', size: 4, delay: '0.9s' },
        ].map((star, i) => (
          <div
            key={i}
            style={{
              top: star.top,
              left: star.left,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDelay: star.delay,
            }}
            className="absolute rounded-full bg-white shadow-[0_0_8px_#ffffff] animate-star-twinkle"
          />
        ))}
      </div>

      {/* ── COHETE ASCENDIENDO CON SU ESTELA DE NUBES Y CHISPAS ── */}
      <div
        style={{
          transform: isBlastoff || isReveal
            ? 'translateY(-140vh) scale(1.15)'
            : isSettled
            ? 'translateY(18vh) scale(1)'
            : isAscending
            ? 'translateY(42vh) scale(1)'
            : 'translateY(110vh) scale(0.9)',
          transition: isBlastoff || isReveal
            ? 'transform 0.65s cubic-bezier(0.65, 0, 0.35, 1)'
            : 'transform 1.2s cubic-bezier(0.2, 0.8, 0.25, 1)',
        }}
        className="absolute z-20 flex flex-col items-center pointer-events-none"
      >
        {/* Contenedor del Cohete con Oscilación y Sparkles Laterales */}
        <div className="relative flex items-center justify-center animate-rocket-wobble">
          {/* Sparkle Izquierdo (Amarillo / Dorado) */}
          <div className="absolute -left-10 top-6 animate-sparkle-float-1">
            <SparkleStar size={20} color="#FFE600" />
          </div>

          {/* Sparkle Derecho (Cyan / Rosa Neón) */}
          <div className="absolute -right-10 top-10 animate-sparkle-float-2">
            <SparkleStar size={22} color="#00F0FF" />
          </div>

          {/* Resplandor de Neón detrás del Cohete */}
          <div className="absolute w-24 h-24 rounded-full bg-gradient-to-tr from-[#FF2D78]/50 to-[#9B30FF]/50 blur-xl" />

          {/* VECTOR OFICIAL CREAPP */}
          <img
            src={creappLogoOfficial}
            alt="CreAPP Rocket"
            className="w-16 sm:w-20 h-auto object-contain filter drop-shadow-[0_0_20px_rgba(255,45,120,0.8)] drop-shadow-[0_0_12px_rgba(155,48,255,0.7)]"
          />
        </div>

        {/* ── LLAMA DE FUEGO DEL COHETE ── */}
        <div className="relative -mt-2 flex flex-col items-center">
          <div
            style={{
              transform: isBlastoff ? 'scaleY(3.8) scaleX(1.2)' : 'scaleY(1.3) scaleX(1)',
              transition: isBlastoff ? 'transform 0.35s ease-out' : 'none',
            }}
            className="origin-top flex flex-col items-center animate-flame-flicker"
          >
            {/* Llama exterior magenta/púrpura */}
            <div
              className="w-5 h-8 rounded-b-full bg-gradient-to-b from-[#FF2D78] via-[#9B30FF] to-transparent filter blur-[0.6px] shadow-[0_6px_18px_#FF2D78]"
              style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 70%, 50% 100%, 0% 70%)' }}
            />
            {/* Núcleo de llama incandescente blanco/dorado */}
            <div
              className="absolute top-0 w-2.5 h-4.5 rounded-b-full bg-gradient-to-b from-white via-[#FFE600] to-transparent filter blur-[0.2px]"
              style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 75%, 50% 100%, 0% 75%)' }}
            />
          </div>
        </div>

        {/* ── ESTELA DE NUBES DE PROPULSIÓN (Columna de humo vertical estilo Wegho) ── */}
        <div className="relative -mt-1 flex flex-col items-center">
          {/* Burbujas de nubes apiladas que crecen hacia abajo */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-white/90 via-[#FF2D78]/40 to-[#9B30FF]/30 blur-[2px] shadow-[0_0_12px_rgba(255,255,255,0.6)] animate-cloud-pulse-1" />
          <div className="w-12 h-10 -mt-3 rounded-full bg-gradient-to-b from-white/80 via-[#9B30FF]/50 to-[#2c124d]/60 blur-[3px] shadow-[0_0_15px_rgba(255,45,120,0.5)] animate-cloud-pulse-2" />
          <div className="w-16 h-12 -mt-4 rounded-full bg-gradient-to-b from-white/70 via-[#FF2D78]/40 to-[#180a2b]/70 blur-[4px] animate-cloud-pulse-1" />
          <div className="w-20 h-14 -mt-5 rounded-full bg-gradient-to-b from-[#9B30FF]/60 via-[#FF2D78]/30 to-[#0e051a]/80 blur-[5px] animate-cloud-pulse-2" />
          <div className="w-28 h-18 -mt-6 rounded-full bg-gradient-to-b from-[#FF2D78]/40 via-[#9B30FF]/30 to-[#070709] blur-[6px]" />
          <div className="w-36 h-24 -mt-8 rounded-full bg-gradient-to-b from-[#9B30FF]/30 via-[#260f3d]/60 to-[#070709] blur-[8px]" />
        </div>
      </div>

      {/* ── BANCO DE NUBES EN LA BASE (Sube y cubre la mitad inferior estilo Wegho) ── */}
      <div
        style={{
          transform: isAscending
            ? 'translateY(16vh)'
            : 'translateY(0vh)',
          transition: 'transform 1.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="absolute inset-x-0 bottom-0 z-30 pointer-events-none flex flex-col items-center justify-end"
      >
        {/* Capa de Niebla Lumínica / Aura de las Nubes */}
        <div className="absolute bottom-0 w-full h-[45vh] bg-gradient-to-t from-[#070709] via-[#150a26]/90 to-transparent pointer-events-none" />

        {/* Nubes Volumétricas Layer 1 (Fondo con Glow Neón Magenta/Púrpura) */}
        <div className="relative w-full overflow-hidden flex items-end justify-center -mb-8">
          <svg
            viewBox="0 0 1440 400"
            fill="none"
            className="w-[120%] min-w-[600px] h-[32vh] filter drop-shadow-[0_-15px_30px_rgba(255,45,120,0.35)] opacity-85"
            preserveAspectRatio="none"
          >
            <path
              d="M0,400 L0,260 C80,240 160,200 260,220 C360,240 420,160 540,150 C660,140 720,200 840,190 C960,180 1020,130 1140,140 C1260,150 1340,220 1440,240 L1440,400 Z"
              fill="url(#cloudGrad1)"
            />
            <defs>
              <linearGradient id="cloudGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF2D78" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#9B30FF" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#1a0c2e" stopOpacity="0.9" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Nubes Volumétricas Layer 2 (Primer plano: Ondas suaves estilo Cumulus) */}
        <div className="relative w-full overflow-hidden flex items-end justify-center">
          <svg
            viewBox="0 0 1440 340"
            fill="none"
            className="w-[110%] min-w-[500px] h-[26vh] filter drop-shadow-[0_-10px_20px_rgba(155,48,255,0.4)]"
            preserveAspectRatio="none"
          >
            <path
              d="M0,340 L0,180 C120,140 220,190 320,170 C420,150 490,90 600,100 C710,110 780,160 880,150 C980,140 1060,95 1180,110 C1300,125 1380,170 1440,190 L1440,340 Z"
              fill="url(#cloudGrad2)"
            />
            <defs>
              <linearGradient id="cloudGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#25123d" stopOpacity="0.95" />
                <stop offset="40%" stopColor="#130921" stopOpacity="0.98" />
                <stop offset="100%" stopColor="#070709" stopOpacity="1" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* ── MARCA CREAPP CENTRADA EN EL CORAZÓN DE LAS NUBES (Estilo 'wegho') ── */}
        <div
          style={{
            opacity: isSettled ? 1 : 0,
            transform: isSettled ? 'translateY(-10vh) scale(1)' : 'translateY(-4vh) scale(0.92)',
            transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="absolute z-40 flex flex-col items-center text-center pointer-events-none"
        >
          {/* Logo Tipográfico creapp */}
          <div className="font-display font-black text-4xl sm:text-5xl tracking-tight text-white drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
            <span>cre</span>
            <span className="bg-gradient-to-r from-[#FF2D78] via-[#9B30FF] to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(255,45,120,0.7)]">
              app
            </span>
          </div>

          {/* Subtítulo Software Lab */}
          <p className="text-[12px] sm:text-xs text-zinc-300 font-mono tracking-[0.3em] uppercase mt-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            Software Lab
          </p>

          {/* Línea Láser Sutil de Carga */}
          <div className="mt-5 w-32 h-[2.5px] bg-white/10 rounded-full overflow-hidden relative shadow-[0_0_10px_rgba(255,45,120,0.3)]">
            <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-[#FF2D78] to-[#9B30FF] rounded-full animate-laser-sweep" />
          </div>
        </div>
      </div>

      {/* ── KEYFRAMES CSS DE MOVIMIENTO FLUIDO (60-120fps GPU) ── */}
      <style>{`
        @keyframes rocket-wobble {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes flame-flicker {
          0% { transform: scaleY(1.1) scaleX(1.05); }
          100% { transform: scaleY(1.4) scaleX(0.92); }
        }
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes sparkle-float-1 {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(0.9); }
          50% { transform: translateY(-8px) rotate(20deg) scale(1.1); }
        }
        @keyframes sparkle-float-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1.1); }
          50% { transform: translateY(6px) rotate(-25deg) scale(0.9); }
        }
        @keyframes cloud-pulse-1 {
          0%, 100% { transform: scale(1) translateX(0); }
          50% { transform: scale(1.06) translateX(-3px); }
        }
        @keyframes cloud-pulse-2 {
          0%, 100% { transform: scale(1) translateX(0); }
          50% { transform: scale(1.08) translateX(3px); }
        }
        @keyframes laser-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-rocket-wobble { animation: rocket-wobble 1.6s ease-in-out infinite; }
        .animate-flame-flicker { animation: flame-flicker 0.22s ease-in-out infinite alternate; }
        .animate-star-twinkle { animation: star-twinkle 2s ease-in-out infinite; }
        .animate-sparkle-float-1 { animation: sparkle-float-1 1.4s ease-in-out infinite; }
        .animate-sparkle-float-2 { animation: sparkle-float-2 1.6s ease-in-out infinite; }
        .animate-cloud-pulse-1 { animation: cloud-pulse-1 1.1s ease-in-out infinite; }
        .animate-cloud-pulse-2 { animation: cloud-pulse-2 1.3s ease-in-out infinite; }
        .animate-laser-sweep { animation: laser-sweep 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default PwaSplashScreen;
