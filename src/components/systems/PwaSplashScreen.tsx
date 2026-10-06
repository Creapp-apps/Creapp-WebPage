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
  // Secuencia Wegho + CreAPP (Coreografía Telón Fluffy):
  // 1. 'ascending': El cohete y la columna de nubes suben suavemente hacia el cielo (0 - 1.0s)
  // 2. 'settled': Cohete en posición superior, nubes acolchonadas cubren la base y se revela 'creapp Software Lab' (1.0s - 1.9s)
  // 3. 'blastoff': El cohete y el manto de nubes se elevan hacia arriba como un telón (1.9s - 2.5s)
  // 4. 'reveal': Fade out suave y transparente hacia la aplicación (2.4s - 2.85s)
  // 5. 'done': Desmontado total (2.9s)
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
      {/* ── CIELO ESPACIAL CON ESTRELLAS QUE TITILAN ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glow de nebulosa en el cielo superior */}
        <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-gradient-to-b from-[#FF2D78]/25 via-[#9B30FF]/25 to-transparent blur-[90px]" />

        {/* Constelación de estrellas */}
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

      {/* ── COHETE ASCENDIENDO CON SU ESTELA Y CHISPAS ── */}
      <div
        style={{
          transform: isBlastoff || isReveal
            ? 'translateY(-140vh) scale(1.15)'
            : isSettled
            ? 'translateY(10vh) scale(1)'
            : isAscending
            ? 'translateY(36vh) scale(1)'
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

        {/* ── ESTELA DE DESPEGUE CÓNICA ORGÁNICA (Puffs redondos concéntricos estilo Wegho) ── */}
        <div className="relative -mt-1 flex flex-col items-center">
          {/* Puff 1: Incandescencia blanca inmediata bajo tobera */}
          <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-b from-white via-[#fce7f3] to-[#FF2D78] shadow-[0_0_16px_#ffffff] border-[1.5px] border-white animate-cloud-pulse-1" />

          {/* Puff 2: Magenta neón a violeta */}
          <div className="w-[46px] h-[46px] -mt-3 rounded-full bg-gradient-to-b from-white/95 via-[#f5d0fe] to-[#c084fc] shadow-[0_0_20px_rgba(255,45,120,0.6)] border-[1.5px] border-pink-200/80 animate-cloud-pulse-2" />

          {/* Puff 3: Violeta luminoso */}
          <div className="w-[66px] h-[66px] -mt-4.5 rounded-full bg-gradient-to-b from-[#fdf4ff] via-[#d8b4fe] to-[#9333ea] shadow-[0_0_22px_rgba(155,48,255,0.55)] border-[1.5px] border-purple-200/70 animate-cloud-pulse-1" />

          {/* Puff 4: Púrpura cósmico */}
          <div className="w-[92px] h-[92px] -mt-6 rounded-full bg-gradient-to-b from-[#e9d5ff]/90 via-[#a855f7] to-[#7e22ce] shadow-[0_0_25px_rgba(155,48,255,0.4)] border border-purple-300/40 animate-cloud-pulse-2" />

          {/* Puff 5: Profundo CreAPP */}
          <div className="w-[126px] h-[126px] -mt-8 rounded-full bg-gradient-to-b from-[#d8b4fe]/85 via-[#9333ea]/80 to-[#4c1d95]/80 shadow-[0_0_28px_rgba(155,48,255,0.3)] border border-purple-400/25" />

          {/* Puff 6: Penacho que se ensancha hacia las nubes inferiores */}
          <div className="w-[168px] h-[168px] -mt-11 rounded-full bg-gradient-to-b from-[#c084fc]/70 via-[#7e22ce]/70 to-[#2e1065]/70 shadow-[0_0_30px_rgba(155,48,255,0.2)]" />

          {/* Puff 7: Transición difusa */}
          <div className="w-[218px] h-[218px] -mt-14 rounded-full bg-gradient-to-b from-[#9333ea]/50 via-[#581c87]/50 to-transparent blur-[1px]" />
        </div>
      </div>

      {/* ── BANCO DE NUBES CÚMULOS Y TELÓN DE TRANSICIÓN ELEVATOR ── */}
      <div
        style={{
          transform: isBlastoff || isReveal
            ? 'translateY(-130vh)' // ¡Barrido tipo telón hacia arriba acompañando al cohete!
            : isSettled
            ? 'translateY(0vh)'    // En reposo, cubriendo armónicamente la mitad inferior
            : isAscending
            ? 'translateY(16vh)'   // Mientras asciende
            : 'translateY(100vh)',
          transition: isBlastoff || isReveal
            ? 'transform 0.85s cubic-bezier(0.45, 0, 0.2, 1), opacity 0.65s ease-out'
            : 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: isReveal ? 0 : 1,
        }}
        className="absolute inset-x-0 bottom-0 z-30 pointer-events-none flex flex-col items-center justify-end"
      >
        {/* Glow ambiental de horizonte detrás de las nubes */}
        <div className="absolute -top-24 w-full h-[40vh] bg-gradient-to-t from-[#FF2D78]/20 via-[#9B30FF]/25 to-transparent blur-[45px] pointer-events-none" />

        {/* ── BANCO VOLUMÉTRICO DE NUBES FLUFFY (100% Círculos puros sin barras horizontales) ── */}
        <div className="relative w-full h-[44vh] flex items-end justify-center overflow-hidden">
          {/* Base oscura uniforme que conecta las esferas de forma fluida hacia abajo */}
          <div className="absolute inset-x-0 bottom-0 h-[28vh] bg-gradient-to-b from-[#2e1065] via-[#16062a] to-[#070709]" />

          {/* ── Layer 1: Nubes de fondo con glow difuso neón ── */}
          {/* Domo fondo central */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-gradient-to-b from-[#c084fc]/50 via-[#7e22ce]/60 to-[#1e0838] blur-[8px]" />
          {/* Domo fondo izquierdo */}
          <div className="absolute bottom-12 left-[4%] w-[270px] h-[270px] rounded-full bg-gradient-to-b from-[#a855f7]/40 via-[#6b21a8]/50 to-[#1e0838] blur-[8px]" />
          {/* Domo fondo derecho */}
          <div className="absolute bottom-12 right-[4%] w-[270px] h-[270px] rounded-full bg-gradient-to-b from-[#e879f9]/40 via-[#9333ea]/50 to-[#1e0838] blur-[8px]" />

          {/* ── Layer 2: Cúmulos frontales acolchonados (Cúpulas circulares con borde blanco brillante) ── */}
          {/* Cúmulo Central Supremo (El pico principal de la nube) */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[280px] h-[280px] rounded-full bg-gradient-to-b from-white via-[#e9d5ff] to-[#3b0764] shadow-[0_0_35px_rgba(255,45,120,0.5)] border-2 border-white/95" />

          {/* Cúmulo Intermedio Izquierdo */}
          <div className="absolute bottom-6 left-[14%] -translate-x-1/3 w-[240px] h-[240px] rounded-full bg-gradient-to-b from-white/95 via-[#d8b4fe] to-[#2e1065] shadow-[0_0_28px_rgba(155,48,255,0.45)] border-2 border-purple-200/90" />

          {/* Cúmulo Intermedio Derecho */}
          <div className="absolute bottom-6 right-[14%] translate-x-1/3 w-[240px] h-[240px] rounded-full bg-gradient-to-b from-white/95 via-[#f5d0fe] to-[#2e1065] shadow-[0_0_28px_rgba(255,45,120,0.45)] border-2 border-pink-200/90" />

          {/* Cúmulo Lateral Extremo Izquierdo */}
          <div className="absolute -bottom-4 -left-12 w-[220px] h-[220px] rounded-full bg-gradient-to-b from-[#f3e8ff]/90 via-[#c084fc] to-[#1a0833] border-2 border-white/70 shadow-[0_0_20px_rgba(155,48,255,0.3)]" />

          {/* Cúmulo Lateral Extremo Derecho */}
          <div className="absolute -bottom-4 -right-12 w-[220px] h-[220px] rounded-full bg-gradient-to-b from-[#f3e8ff]/90 via-[#e879f9] to-[#1a0833] border-2 border-white/70 shadow-[0_0_20px_rgba(255,45,120,0.3)]" />
        </div>

        {/* ── MARCA CREAPP CENTRADA EN EL CUERPO DE LAS NUBES (Estilo Wegho) ── */}
        <div
          style={{
            bottom: '9vh',
            opacity: isSettled ? 1 : 0,
            transform: isSettled ? 'translateY(0px) scale(1)' : 'translateY(18px) scale(0.92)',
            transition: 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="absolute z-40 flex flex-col items-center text-center pointer-events-none"
        >
          {/* Logo Tipográfico creapp con resplandor */}
          <div className="font-display font-black text-4xl sm:text-5xl tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,1)] drop-shadow-[0_0_20px_rgba(0,0,0,0.9)]">
            <span>cre</span>
            <span className="bg-gradient-to-r from-[#FF2D78] via-[#9B30FF] to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(255,45,120,0.9)]">
              app
            </span>
          </div>

          {/* Subtítulo Software Lab */}
          <p className="text-[12px] sm:text-xs text-white font-mono tracking-[0.35em] uppercase mt-2 drop-shadow-[0_2px_14px_rgba(0,0,0,1)] font-semibold">
            Software Lab
          </p>

          {/* Barra Láser de Carga */}
          <div className="mt-5 w-36 h-[3px] bg-white/30 rounded-full overflow-hidden relative shadow-[0_0_12px_rgba(255,45,120,0.7)]">
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
          50% { transform: scale(1.05) translateX(-2px); }
        }
        @keyframes cloud-pulse-2 {
          0%, 100% { transform: scale(1) translateX(0); }
          50% { transform: scale(1.06) translateX(2px); }
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
