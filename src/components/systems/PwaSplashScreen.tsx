import React, { useState, useEffect } from 'react';
import creappLogoOfficial from '@/assets/CREAPP LOGO VECTOR.png';

interface PwaSplashScreenProps {
  onComplete?: () => void;
}

// Estrellas de 4 puntas estilo Wegho (Sparkles dorados/cyan al lado del cohete)
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
  // Secuencia Cinemática con Cadencia Satisfactoria (5 Actos):
  // 1. 'loading' (0 - 1.8s): Preloader inicial centrado con barra de carga que avanza de 0% a 100% de forma visible y fluida.
  // 2. 'ascent' (1.8s - 3.4s): Cohete asciende al cielo con chispas y estela; cúmulos entran desde abajo apoyados 100% en el marco (SIN LOGO).
  // 3. 'takeoff' (3.4s - 4.4s): Despegue a máxima potencia; el cohete sale por arriba y las nubes lo siguen barriendo como telón hacia arriba.
  // 4. 'farewell' (4.4s - 5.6s): Sobre el fondo oscuro estrellado aparece centrado el branding de despedida: "creapp SOFTWARE LAB".
  // 5. 'reveal' (5.6s - 6.1s): Fade out suave y etéreo que devela la plataforma / login.
  // 6. 'done' (6.2s): Desmontado del componente.
  const [stage, setStage] = useState<'loading' | 'ascent' | 'takeoff' | 'farewell' | 'reveal' | 'done'>('loading');

  useEffect(() => {
    // Retirar splash estático de index.html
    const staticSplash = document.getElementById('pwa-static-splash');
    if (staticSplash) {
      staticSplash.style.opacity = '0';
      setTimeout(() => staticSplash.remove(), 250);
    }

    // Comprobar sesión si no es PWA instalada
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

    // Cronograma con tiempos amplios y visualmente satisfactorios
    const tAscent = setTimeout(() => {
      setStage('ascent');
    }, 1800);

    const tTakeoff = setTimeout(() => {
      setStage('takeoff');
    }, 3400);

    const tFarewell = setTimeout(() => {
      setStage('farewell');
    }, 4400);

    const tReveal = setTimeout(() => {
      setStage('reveal');
      try {
        sessionStorage.setItem('creapp_pwa_splash_seen', 'true');
      } catch (e) {}
      onComplete?.();
    }, 5600);

    const tDone = setTimeout(() => {
      setStage('done');
    }, 6100);

    const tSafety = setTimeout(() => {
      setStage('done');
    }, 6600);

    return () => {
      clearTimeout(tAscent);
      clearTimeout(tTakeoff);
      clearTimeout(tFarewell);
      clearTimeout(tReveal);
      clearTimeout(tDone);
      clearTimeout(tSafety);
    };
  }, [onComplete]);

  if (stage === 'done') {
    return null;
  }

  const isLoading = stage === 'loading';
  const isAscent = stage === 'ascent';
  const isTakeoff = stage === 'takeoff';
  const isFarewell = stage === 'farewell';
  const isReveal = stage === 'reveal';

  return (
    <div
      onClick={() => setStage('done')}
      className={`fixed inset-0 z-[99999] bg-[#070709] flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-600 ease-out ${
        isReveal ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{ height: '100dvh' }}
    >
      {/* ── CIELO ESPACIAL CON ESTRELLAS TITILANTES ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glow de nebulosa cósmica */}
        <div className="absolute top-[12%] left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full bg-gradient-to-b from-[#FF2D78]/25 via-[#9B30FF]/25 to-transparent blur-[100px]" />

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
          { top: '65%', left: '30%', size: 3.5, delay: '0.6s' },
          { top: '72%', left: '72%', size: 4, delay: '0.2s' },
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

      {/* ── COHETE CREAPP Y SECUENCIA DE ASCENSO ── */}
      <div
        style={{
          transform: isTakeoff || isFarewell || isReveal
            ? 'translateY(-140vh) scale(1.15)'
            : isAscent
            ? 'translateY(-28vh) scale(1)'
            : 'translateY(-6vh) scale(1)', // En loading: centrado cómodo en pantalla
          transition: isTakeoff || isFarewell || isReveal
            ? 'transform 0.85s cubic-bezier(0.65, 0, 0.35, 1)'
            : isAscent
            ? 'transform 1.4s cubic-bezier(0.2, 0.85, 0.25, 1)'
            : 'transform 0.5s ease-out',
        }}
        className="absolute z-20 flex flex-col items-center pointer-events-none"
      >
        {/* Contenedor del Cohete con Balanceo y Sparkles Laterales */}
        <div className="relative flex items-center justify-center animate-rocket-wobble">
          {/* Sparkle Izquierdo (Amarillo / Dorado) - Aparece en ascenso */}
          <div
            style={{
              opacity: isAscent ? 1 : 0,
              transform: isAscent ? 'scale(1)' : 'scale(0)',
              transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
            }}
            className="absolute -left-10 top-4 animate-sparkle-float-1"
          >
            <SparkleStar size={24} color="#FFE600" />
          </div>

          {/* Sparkle Derecho (Cyan Eléctrico) - Aparece en ascenso */}
          <div
            style={{
              opacity: isAscent ? 1 : 0,
              transform: isAscent ? 'scale(1)' : 'scale(0)',
              transition: 'opacity 0.6s ease-out 0.2s, transform 0.6s ease-out 0.2s',
            }}
            className="absolute -right-10 top-8 animate-sparkle-float-2"
          >
            <SparkleStar size={26} color="#00F0FF" />
          </div>

          {/* Resplandor de Neón detrás del Cohete */}
          <div className="absolute w-32 h-32 rounded-full bg-gradient-to-tr from-[#FF2D78]/55 to-[#9B30FF]/55 blur-2xl" />

          {/* VECTOR OFICIAL CREAPP */}
          <img
            src={creappLogoOfficial}
            alt="CreAPP Rocket"
            className="w-18 sm:w-22 h-auto object-contain filter drop-shadow-[0_0_24px_rgba(255,45,120,0.85)] drop-shadow-[0_0_14px_rgba(155,48,255,0.7)]"
          />
        </div>

        {/* ── LLAMA DE FUEGO DEL COHETE ── */}
        <div className="relative -mt-2 flex flex-col items-center">
          <div
            style={{
              transform: isTakeoff
                ? 'scaleY(3.8) scaleX(1.3)'
                : isAscent
                ? 'scaleY(1.5) scaleX(1.1)'
                : 'scaleY(0.9) scaleX(0.9)',
              transition: isTakeoff ? 'transform 0.35s ease-out' : 'transform 0.6s ease-out',
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

        {/* ── ESTELA DE DESPEGUE CÓNICA (Puffs circulares perfectos, emergen en ascenso) ── */}
        <div
          style={{
            opacity: isAscent || isTakeoff ? 1 : 0,
            transform: isAscent || isTakeoff ? 'scaleY(1)' : 'scaleY(0.2)',
            transformOrigin: 'top',
            transition: 'opacity 0.6s ease-out, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          className="relative -mt-1 flex flex-col items-center pointer-events-none"
        >
          {/* Puff 1: Incandescencia blanca inmediata */}
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

          {/* Puff 7: Transición difusa que penetra el banco de nubes */}
          <div className="w-[218px] h-[218px] -mt-14 rounded-full bg-gradient-to-b from-[#9333ea]/50 via-[#581c87]/50 to-transparent blur-[1px]" />
        </div>
      </div>

      {/* ── UI DE CARGA INICIAL CENTRADA (Act 1: Preloader 0% - 100%) ── */}
      <div
        style={{
          opacity: isLoading ? 1 : 0,
          transform: isLoading ? 'translateY(110px) scale(1)' : 'translateY(130px) scale(0.94)',
          transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
          pointerEvents: isLoading ? 'auto' : 'none',
        }}
        className="absolute z-20 flex flex-col items-center text-center"
      >
        {/* Marca creapp */}
        <div className="font-display font-black text-4xl sm:text-5xl tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
          <span>cre</span>
          <span className="bg-gradient-to-r from-[#FF2D78] via-[#9B30FF] to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(255,45,120,0.85)]">
            app
          </span>
        </div>

        {/* Subtítulo Software Lab */}
        <p className="text-[12px] sm:text-xs text-zinc-300 font-mono tracking-[0.35em] uppercase mt-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] font-semibold">
          Software Lab
        </p>

        {/* Barra de Progreso Fluida (0% a 100% en 1.6s) */}
        <div className="mt-6 w-36 sm:w-44 h-[3px] bg-white/15 rounded-full overflow-hidden relative shadow-[0_0_10px_rgba(255,45,120,0.3)]">
          <div className="h-full bg-gradient-to-r from-[#FF2D78] via-[#9B30FF] to-cyan-400 rounded-full animate-progress-fill shadow-[0_0_12px_#FF2D78]" />
        </div>
      </div>

      {/* ── BANCO DE NUBES CÚMULOS Y TELÓN (Act 2 & Act 3: SIN LOGO) ── */}
      <div
        style={{
          transform: isTakeoff || isFarewell || isReveal
            ? 'translateY(-130vh)' // ¡Barrido tipo telón hacia arriba tras el cohete!
            : isAscent
            ? 'translateY(0%)'     // Perfectamente asentado sobre el marco inferior
            : 'translateY(100%)',  // En loading: oculto bajo la pantalla
          transition: isTakeoff || isFarewell || isReveal
            ? 'transform 0.95s cubic-bezier(0.45, 0, 0.2, 1), opacity 0.75s ease-out'
            : isAscent
            ? 'transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)'
            : 'transform 0.3s ease-out',
          opacity: isFarewell || isReveal ? 0 : 1,
        }}
        className="absolute inset-x-0 bottom-0 z-30 pointer-events-none flex flex-col justify-end"
      >
        {/* Glow ambiental de horizonte detrás de las nubes */}
        <div className="absolute -top-28 w-full h-[35vh] bg-gradient-to-t from-[#FF2D78]/25 via-[#9B30FF]/30 to-transparent blur-[50px] pointer-events-none" />

        {/* ── BANCO VOLUMÉTRICO DE NUBES FLUFFY (100% apoyado y sellado en el marco inferior) ── */}
        <div className="relative w-full h-[46vh] flex items-end justify-center overflow-hidden">
          {/* Base sólida y continua que garantiza 0 huecos y 0 márgenes inferiores */}
          <div className="absolute inset-x-0 bottom-0 h-[36vh] bg-gradient-to-b from-[#3b0764] via-[#240842] to-[#120421]" />

          {/* ── Layer 1: Nubes de fondo con glow difuso neón ── */}
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-[380px] h-[380px] rounded-full bg-gradient-to-b from-[#c084fc]/50 via-[#7e22ce]/60 to-[#1e0838] blur-[8px]" />
          <div className="absolute -bottom-16 left-[2%] w-[310px] h-[310px] rounded-full bg-gradient-to-b from-[#a855f7]/40 via-[#6b21a8]/50 to-[#1e0838] blur-[8px]" />
          <div className="absolute -bottom-16 right-[2%] w-[310px] h-[310px] rounded-full bg-gradient-to-b from-[#e879f9]/40 via-[#9333ea]/50 to-[#1e0838] blur-[8px]" />

          {/* ── Layer 2: Cúmulos frontales acolchonados (Esferas geométricas puras con borde blanco brillante) ── */}
          {/* Cúmulo Central Mayor (El pico supremo de la nube) */}
          <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-[310px] h-[310px] rounded-full bg-gradient-to-b from-white via-[#e9d5ff] to-[#3b0764] shadow-[0_0_35px_rgba(255,45,120,0.5)] border-2 border-white/95" />

          {/* Cúmulo Intermedio Izquierdo */}
          <div className="absolute -bottom-22 left-[12%] -translate-x-1/4 w-[270px] h-[270px] rounded-full bg-gradient-to-b from-white/95 via-[#d8b4fe] to-[#2e1065] shadow-[0_0_28px_rgba(155,48,255,0.45)] border-2 border-purple-200/90" />

          {/* Cúmulo Intermedio Derecho */}
          <div className="absolute -bottom-22 right-[12%] translate-x-1/4 w-[270px] h-[270px] rounded-full bg-gradient-to-b from-white/95 via-[#f5d0fe] to-[#2e1065] shadow-[0_0_28px_rgba(255,45,120,0.45)] border-2 border-pink-200/90" />

          {/* Cúmulo Lateral Flanco Izquierdo */}
          <div className="absolute -bottom-28 -left-12 w-[250px] h-[250px] rounded-full bg-gradient-to-b from-[#f3e8ff]/90 via-[#c084fc] to-[#1a0833] border-2 border-white/70 shadow-[0_0_20px_rgba(155,48,255,0.35)]" />

          {/* Cúmulo Lateral Flanco Derecho */}
          <div className="absolute -bottom-28 -right-12 w-[250px] h-[250px] rounded-full bg-gradient-to-b from-[#f3e8ff]/90 via-[#e879f9] to-[#1a0833] border-2 border-white/70 shadow-[0_0_20px_rgba(255,45,120,0.35)]" />
        </div>
      </div>

      {/* ── BRANDING DE DESPEDIDA SOBRE EL FONDO OSCURO (Act 4: Farewell antes del Reveal) ── */}
      <div
        style={{
          opacity: isFarewell ? 1 : 0,
          transform: isFarewell ? 'scale(1) translateY(0px)' : 'scale(0.92) translateY(14px)',
          transition: 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: isFarewell ? 'auto' : 'none',
        }}
        className="absolute inset-0 z-40 flex flex-col items-center justify-center text-center px-6"
      >
        {/* Glow cósmico de despedida */}
        <div className="absolute w-80 h-80 rounded-full bg-gradient-to-tr from-[#FF2D78]/25 via-[#9B30FF]/25 to-transparent blur-3xl pointer-events-none" />

        {/* Logo creapp con tipografía contundente */}
        <div className="relative font-display font-black text-5xl sm:text-6xl tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,1)] drop-shadow-[0_0_25px_rgba(255,45,120,0.7)]">
          <span>cre</span>
          <span className="bg-gradient-to-r from-[#FF2D78] via-[#9B30FF] to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,45,120,0.9)]">
            app
          </span>
        </div>

        {/* Subtítulo Software Lab */}
        <p className="relative text-sm sm:text-base text-zinc-300 font-mono tracking-[0.45em] uppercase mt-3 drop-shadow-[0_2px_14px_rgba(0,0,0,1)] font-semibold">
          Software Lab
        </p>

        {/* Línea Láser Neón de despedida */}
        <div className="relative mt-6 w-28 h-[2px] bg-gradient-to-r from-transparent via-[#FF2D78] to-transparent shadow-[0_0_12px_#FF2D78]" />
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
        @keyframes progress-fill-anim {
          0% { width: 0%; }
          15% { width: 22%; }
          45% { width: 58%; }
          75% { width: 85%; }
          100% { width: 100%; }
        }
        .animate-rocket-wobble { animation: rocket-wobble 1.6s ease-in-out infinite; }
        .animate-flame-flicker { animation: flame-flicker 0.22s ease-in-out infinite alternate; }
        .animate-star-twinkle { animation: star-twinkle 2s ease-in-out infinite; }
        .animate-sparkle-float-1 { animation: sparkle-float-1 1.4s ease-in-out infinite; }
        .animate-sparkle-float-2 { animation: sparkle-float-2 1.6s ease-in-out infinite; }
        .animate-cloud-pulse-1 { animation: cloud-pulse-1 1.1s ease-in-out infinite; }
        .animate-cloud-pulse-2 { animation: cloud-pulse-2 1.3s ease-in-out infinite; }
        .animate-progress-fill { animation: progress-fill-anim 1.65s cubic-bezier(0.25, 0.1, 0.25, 1) forwards; }
      `}</style>
    </div>
  );
};

export default PwaSplashScreen;
