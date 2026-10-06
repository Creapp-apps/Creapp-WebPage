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
    className={`filter drop-shadow-[0_0_10px_${color}] ${className}`}
  >
    <path
      d="M12 0C12 7.5 14.5 12 24 12C14.5 12 12 16.5 12 24C12 16.5 9.5 12 0 12C9.5 12 12 7.5 12 0Z"
      fill={color}
    />
  </svg>
);

export const PwaSplashScreen: React.FC<PwaSplashScreenProps> = ({ onComplete }) => {
  // Secuencia Wegho Exacta (como describió el usuario en el audio):
  // 1. 'ascending': El cohete y la estela suben desde abajo hacia el tercio superior (0 - 1.0s)
  // 2. 'settled': Las nubes suben cubriendo la pantalla y revelan el nombre "creapp Software Lab" (1.0s - 1.9s)
  // 3. 'blastoff': El cohete despega hacia arriba Y LAS NUBES SUBEN barriendo la pantalla hacia arriba (1.9s - 2.5s)
  // 4. 'reveal': Fade out suave y fluido hacia la aplicación/login (2.4s - 2.8s)
  // 5. 'done': Desmontado completo del DOM (2.9s)
  const [stage, setStage] = useState<'ascending' | 'settled' | 'blastoff' | 'reveal' | 'done'>('ascending');

  useEffect(() => {
    // Retirar splash estático de index.html
    const staticSplash = document.getElementById('pwa-static-splash');
    if (staticSplash) {
      staticSplash.style.opacity = '0';
      setTimeout(() => staticSplash.remove(), 200);
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

    // Cronograma Cinemático Wegho
    const tSettled = setTimeout(() => {
      setStage('settled');
    }, 1000);

    const tBlastoff = setTimeout(() => {
      setStage('blastoff');
    }, 1900);

    const tReveal = setTimeout(() => {
      setStage('reveal');
      try {
        sessionStorage.setItem('creapp_pwa_splash_seen', 'true');
      } catch (e) {}
      onComplete?.();
    }, 2400);

    const tDone = setTimeout(() => {
      setStage('done');
    }, 2850);

    const tSafety = setTimeout(() => {
      setStage('done');
    }, 3100);

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
      {/* ── CIELO ESPACIAL ESTRELLADO ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glow cósmico de fondo */}
        <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-gradient-to-b from-[#FF2D78]/20 via-[#9B30FF]/25 to-transparent blur-[90px]" />

        {/* Estrellas centelleantes */}
        {[
          { top: '6%', left: '16%', size: 4, delay: '0s' },
          { top: '10%', left: '82%', size: 3, delay: '0.4s' },
          { top: '14%', left: '38%', size: 4.5, delay: '0.8s' },
          { top: '18%', left: '68%', size: 3, delay: '0.2s' },
          { top: '24%', left: '12%', size: 4, delay: '0.6s' },
          { top: '28%', left: '88%', size: 3.5, delay: '1s' },
          { top: '35%', left: '25%', size: 4, delay: '0.3s' },
          { top: '42%', left: '78%', size: 5, delay: '0.7s' },
          { top: '48%', left: '15%', size: 3, delay: '0.5s' },
          { top: '54%', left: '84%', size: 4, delay: '0.9s' },
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

      {/* ── COHETE ASCENDIENDO CON SU ESTELA Y SPARKLES ── */}
      <div
        style={{
          transform: isBlastoff || isReveal
            ? 'translateY(-140vh) scale(1.15)'
            : isSettled
            ? 'translateY(12vh) scale(1)'
            : isAscending
            ? 'translateY(35vh) scale(1)'
            : 'translateY(110vh) scale(0.9)',
          transition: isBlastoff || isReveal
            ? 'transform 0.75s cubic-bezier(0.65, 0, 0.35, 1)'
            : 'transform 1.1s cubic-bezier(0.2, 0.8, 0.25, 1)',
        }}
        className="absolute z-20 flex flex-col items-center pointer-events-none"
      >
        {/* Contenedor del Cohete con Balanceo y Sparkles Laterales */}
        <div className="relative flex items-center justify-center animate-rocket-wobble">
          {/* Sparkle Izquierdo (Amarillo / Dorado) */}
          <div className="absolute -left-9 top-4 animate-sparkle-float-1">
            <SparkleStar size={22} color="#FFE600" />
          </div>

          {/* Sparkle Derecho (Cyan Eléctrico) */}
          <div className="absolute -right-9 top-8 animate-sparkle-float-2">
            <SparkleStar size={24} color="#00F0FF" />
          </div>

          {/* Resplandor de Neón detrás del Cohete */}
          <div className="absolute w-28 h-28 rounded-full bg-gradient-to-tr from-[#FF2D78]/55 to-[#9B30FF]/55 blur-2xl" />

          {/* VECTOR OFICIAL CREAPP */}
          <img
            src={creappLogoOfficial}
            alt="CreAPP Rocket"
            className="w-16 sm:w-20 h-auto object-contain filter drop-shadow-[0_0_22px_rgba(255,45,120,0.85)] drop-shadow-[0_0_12px_rgba(155,48,255,0.7)]"
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

        {/* ── COLUMNA DE HUMO/NUBES APILADAS (Estilo Wegho con bordes iluminados) ── */}
        <div className="relative -mt-1 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-white via-[#fbcfe8] to-[#FF2D78]/80 shadow-[0_0_15px_rgba(255,255,255,0.7)] border border-white/60 animate-cloud-pulse-1" />
          <div className="w-12 h-10 -mt-3.5 rounded-full bg-gradient-to-b from-white/90 via-[#e9d5ff] to-[#9B30FF]/85 shadow-[0_0_18px_rgba(255,45,120,0.6)] border border-purple-200/50 animate-cloud-pulse-2" />
          <div className="w-16 h-12 -mt-4.5 rounded-full bg-gradient-to-b from-[#f5d0fe] via-[#d8b4fe] to-[#7e22ce]/90 shadow-[0_0_20px_rgba(155,48,255,0.5)] border border-pink-300/40 animate-cloud-pulse-1" />
          <div className="w-22 h-15 -mt-5.5 rounded-full bg-gradient-to-b from-[#d8b4fe] via-[#a855f7]/80 to-[#4c1d95]/90 border border-purple-400/30 animate-cloud-pulse-2" />
          <div className="w-30 h-20 -mt-6.5 rounded-full bg-gradient-to-b from-[#c084fc]/70 via-[#9333ea]/70 to-[#2e1065]/90 blur-[1px]" />
          <div className="w-40 h-26 -mt-8 rounded-full bg-gradient-to-b from-[#a855f7]/50 via-[#6b21a8]/60 to-[#1e0838]/90 blur-[2px]" />
          <div className="w-52 h-32 -mt-10 rounded-full bg-gradient-to-b from-[#7e22ce]/40 via-[#3b0764]/70 to-[#070709] blur-[4px]" />
        </div>
      </div>

      {/* ── BANCO DE NUBES CÚMULOS EN LA BASE QUE SUBE Y LUEGO BARRE HACIA ARRIBA ── */}
      <div
        style={{
          transform: isBlastoff || isReveal
            ? 'translateY(-125vh)' // ¡SUBE COMPLETAMENTE POR TODA LA PANTALLA HASTA SALIR!
            : isSettled
            ? 'translateY(0vh)'    // En reposo, cubriendo la mitad inferior y mostrando el logo
            : isAscending
            ? 'translateY(16vh)'   // Mientras asciende
            : 'translateY(100vh)',
          transition: isBlastoff || isReveal
            ? 'transform 0.85s cubic-bezier(0.45, 0, 0.2, 1), opacity 0.7s ease-out'
            : 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: isReveal ? 0 : 1,
        }}
        className="absolute inset-x-0 bottom-0 z-30 pointer-events-none flex flex-col items-center justify-end"
      >
        {/* Glow ambiental inferior que ilumina el banco de nubes */}
        <div className="absolute bottom-0 w-full h-[60vh] bg-gradient-to-t from-[#070709] via-[#21093b]/80 to-transparent pointer-events-none" />

        {/* ── NUBES LAYER 1 (Fondo con resplandor neón magenta/violeta) ── */}
        <div className="relative w-full h-[48vh] overflow-hidden flex items-end justify-center -mb-12">
          <svg
            viewBox="0 0 1000 500"
            className="w-[125%] min-w-[550px] h-full filter drop-shadow-[0_-15px_35px_rgba(255,45,120,0.5)] opacity-95"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="cloudBackGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.9" />
                <stop offset="15%" stopColor="#a855f7" stopOpacity="0.9" />
                <stop offset="45%" stopColor="#6b21a8" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#1e0838" stopOpacity="1" />
              </linearGradient>
            </defs>
            {/* Esferas cúmulos acolchonadas de fondo */}
            <circle cx="70" cy="320" r="150" fill="url(#cloudBackGrad)" />
            <circle cx="230" cy="230" r="170" fill="url(#cloudBackGrad)" />
            <circle cx="410" cy="170" r="190" fill="url(#cloudBackGrad)" />
            <circle cx="610" cy="190" r="180" fill="url(#cloudBackGrad)" />
            <circle cx="790" cy="240" r="170" fill="url(#cloudBackGrad)" />
            <circle cx="940" cy="330" r="150" fill="url(#cloudBackGrad)" />
            <rect x="0" y="320" width="1000" height="180" fill="url(#cloudBackGrad)" />
          </svg>
        </div>

        {/* ── NUBES LAYER 2 (Primer plano: Cúmulos acolchonados con bordes iluminados estilo Wegho) ── */}
        <div className="relative w-full h-[40vh] overflow-hidden flex items-end justify-center">
          <svg
            viewBox="0 0 1000 420"
            className="w-[115%] min-w-[500px] h-full filter drop-shadow-[0_-12px_28px_rgba(155,48,255,0.6)]"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="cloudFrontGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="8%" stopColor="#f3e8ff" stopOpacity="1" />
                <stop offset="25%" stopColor="#c084fc" stopOpacity="0.98" />
                <stop offset="55%" stopColor="#581c87" stopOpacity="1" />
                <stop offset="100%" stopColor="#070709" stopOpacity="1" />
              </linearGradient>
            </defs>
            {/* Esferas redondeadas frontales perfectamente acolchonadas */}
            <circle cx="20" cy="280" r="135" fill="url(#cloudFrontGrad)" stroke="#ffffff" strokeWidth="2.5" strokeOpacity="0.8" />
            <circle cx="150" cy="200" r="155" fill="url(#cloudFrontGrad)" stroke="#ffffff" strokeWidth="3" strokeOpacity="0.85" />
            <circle cx="310" cy="140" r="170" fill="url(#cloudFrontGrad)" stroke="#ffffff" strokeWidth="3" strokeOpacity="0.9" />
            <circle cx="500" cy="105" r="185" fill="url(#cloudFrontGrad)" stroke="#ffffff" strokeWidth="3.5" strokeOpacity="0.95" />
            <circle cx="690" cy="140" r="170" fill="url(#cloudFrontGrad)" stroke="#ffffff" strokeWidth="3" strokeOpacity="0.9" />
            <circle cx="850" cy="200" r="155" fill="url(#cloudFrontGrad)" stroke="#ffffff" strokeWidth="3" strokeOpacity="0.85" />
            <circle cx="980" cy="280" r="135" fill="url(#cloudFrontGrad)" stroke="#ffffff" strokeWidth="2.5" strokeOpacity="0.8" />
            <rect x="0" y="240" width="1000" height="180" fill="url(#cloudFrontGrad)" />
          </svg>
        </div>

        {/* ── MARCA CREAPP CENTRADA EN EL CORAZÓN DE LAS NUBES (Estilo 'wegho') ── */}
        <div
          style={{
            bottom: '16vh',
            opacity: isSettled ? 1 : 0,
            transform: isSettled ? 'translateY(0px) scale(1)' : 'translateY(22px) scale(0.92)',
            transition: 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="absolute z-40 flex flex-col items-center text-center pointer-events-none"
        >
          {/* Logo Tipográfico creapp */}
          <div className="font-display font-black text-4xl sm:text-5xl tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,1)]">
            <span>cre</span>
            <span className="bg-gradient-to-r from-[#FF2D78] via-[#9B30FF] to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(255,45,120,0.85)]">
              app
            </span>
          </div>

          {/* Subtítulo Software Lab */}
          <p className="text-[12px] sm:text-xs text-zinc-100 font-mono tracking-[0.35em] uppercase mt-2 drop-shadow-[0_2px_14px_rgba(0,0,0,1)] font-semibold">
            Software Lab
          </p>

          {/* Línea Láser Sutil de Carga */}
          <div className="mt-5 w-36 h-[3px] bg-white/25 rounded-full overflow-hidden relative shadow-[0_0_12px_rgba(255,45,120,0.6)]">
            <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-[#FF2D78] to-[#9B30FF] rounded-full animate-laser-sweep" />
          </div>
        </div>
      </div>

      {/* ── KEYFRAMES CSS (120fps GPU) ── */}
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
          50% { transform: translateY(-8px) rotate(20deg) scale(1.15); }
        }
        @keyframes sparkle-float-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1.15); }
          50% { transform: translateY(7px) rotate(-25deg) scale(0.9); }
        }
        @keyframes cloud-pulse-1 {
          0%, 100% { transform: scale(1) translateX(0); }
          50% { transform: scale(1.06) translateX(-2.5px); }
        }
        @keyframes cloud-pulse-2 {
          0%, 100% { transform: scale(1) translateX(0); }
          50% { transform: scale(1.08) translateX(2.5px); }
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
