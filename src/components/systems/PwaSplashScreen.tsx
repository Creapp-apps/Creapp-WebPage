import React, { useState, useEffect } from 'react';
import creappLogoOfficial from '@/assets/CREAPP LOGO VECTOR.png';

interface PwaSplashScreenProps {
  onComplete?: () => void;
}

export const PwaSplashScreen: React.FC<PwaSplashScreenProps> = ({ onComplete }) => {
  // Estados de la secuencia cinemática:
  // 'hover'     -> Levitación inicial en el centro con llama y estelas
  // 'ignition'  -> El texto se desvanece suavemente, la llama se sobrecarga (pre-despegue)
  // 'takeoff'   -> El cohete y su llama aceleran disparados hacia arriba saliendo por el borde superior
  // 'reveal'    -> Desvanecimiento sutil del fondo oscuro revelando la aplicación/login
  // 'done'      -> Desmontado completo del DOM
  const [stage, setStage] = useState<'hover' | 'ignition' | 'takeoff' | 'reveal' | 'done'>('hover');

  useEffect(() => {
    // 1. Desvanecer y retirar el splash estático de index.html inmediatamente para evitar duplicados
    const staticSplash = document.getElementById('pwa-static-splash');
    if (staticSplash) {
      staticSplash.style.opacity = '0';
      setTimeout(() => {
        staticSplash.remove();
      }, 250);
    }

    // Comprobar si ya fue visto en esta sesión (navegación común web)
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
    } catch (e) {
      // Ignorar restricciones en navegación privada
    }

    // Cronograma Cinemático de Despegue (Take-Off Sequence)
    const tIgnition = setTimeout(() => {
      setStage('ignition');
    }, 950);

    const tTakeoff = setTimeout(() => {
      setStage('takeoff');
    }, 1250);

    const tReveal = setTimeout(() => {
      setStage('reveal');
      try {
        sessionStorage.setItem('creapp_pwa_splash_seen', 'true');
      } catch (e) {}
      onComplete?.();
    }, 1750);

    const tDone = setTimeout(() => {
      setStage('done');
    }, 2200);

    // Hard safety timeout
    const tSafety = setTimeout(() => {
      setStage('done');
    }, 2500);

    return () => {
      clearTimeout(tIgnition);
      clearTimeout(tTakeoff);
      clearTimeout(tReveal);
      clearTimeout(tDone);
      clearTimeout(tSafety);
    };
  }, [onComplete]);

  if (stage === 'done') {
    return null;
  }

  const isIgnition = stage === 'ignition';
  const isTakeoff = stage === 'takeoff';
  const isReveal = stage === 'reveal';

  return (
    <div
      onClick={() => setStage('done')}
      className={`fixed inset-0 z-[99999] bg-[#070709] flex flex-col items-center justify-center p-6 select-none overflow-hidden transition-opacity duration-500 ease-out ${
        isReveal ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
      style={{ height: '100dvh' }}
    >
      {/* ── Fondo Cósmico y Estelas de Velocidad ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Resplandor ambiental de fondo */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full bg-gradient-to-tr from-[#FF2D78]/25 via-[#9B30FF]/30 to-cyan-500/20 blur-[100px] transition-transform duration-700 ease-out ${
            isTakeoff ? 'scale-150 opacity-40' : 'scale-100 opacity-60'
          }`}
        />

        {/* Líneas de velocidad verticales (Hiperespacio) */}
        <div className="absolute inset-0 overflow-hidden">
          {[
            { left: '14%', h: 70, delay: '0s', dur: isTakeoff ? '0.35s' : '0.9s' },
            { left: '28%', h: 120, delay: '0.2s', dur: isTakeoff ? '0.4s' : '1.1s' },
            { left: '44%', h: 90, delay: '0.4s', dur: isTakeoff ? '0.3s' : '0.8s' },
            { left: '62%', h: 140, delay: '0.1s', dur: isTakeoff ? '0.38s' : '1.0s' },
            { left: '78%', h: 100, delay: '0.3s', dur: isTakeoff ? '0.32s' : '0.85s' },
            { left: '88%', h: 80, delay: '0.15s', dur: isTakeoff ? '0.42s' : '1.2s' },
          ].map((line, i) => (
            <div
              key={i}
              style={{
                left: line.left,
                height: `${line.h}px`,
                animationDelay: line.delay,
                animationDuration: line.dur,
              }}
              className="absolute w-[1.5px] bg-gradient-to-b from-transparent via-[#FF2D78] to-[#9B30FF] rounded-full filter blur-[0.2px] animate-cosmic-speedline"
            />
          ))}
        </div>

        {/* Estrellas sutiles fijas */}
        <div className="absolute top-[22%] left-[20%] w-1 h-1 bg-white rounded-full opacity-60 animate-ping" />
        <div className="absolute top-[32%] right-[22%] w-1.5 h-1.5 bg-[#FF2D78] rounded-full opacity-70 animate-pulse" />
        <div className="absolute bottom-[28%] left-[26%] w-1 h-1 bg-[#9B30FF] rounded-full opacity-50 animate-ping" />
      </div>

      {/* ── Núcleo Central: Cohete + Llama + Tipografía ── */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Contenedor del Cohete con Levitación y Despegue Vertical hacia Arriba */}
        <div
          style={{
            transform: isTakeoff || isReveal
              ? 'translateY(-130vh) scale(1.1)'
              : isIgnition
              ? 'translateY(6px) scale(0.98)'
              : 'translateY(0px) scale(1)',
            transition: isTakeoff || isReveal
              ? 'transform 0.65s cubic-bezier(0.65, 0, 0.35, 1)'
              : isIgnition
              ? 'transform 0.3s ease-out'
              : 'none',
          }}
          className={`relative flex flex-col items-center justify-center ${
            stage === 'hover' ? 'animate-rocket-hover' : ''
          }`}
        >
          {/* Resplandor violeta/fucsia directo en el vector */}
          <div
            className={`absolute w-28 h-28 rounded-full bg-gradient-to-tr from-[#FF2D78]/35 to-[#9B30FF]/35 blur-2xl pointer-events-none transition-all duration-300 ${
              isTakeoff ? 'scale-150 opacity-90' : isIgnition ? 'scale-125 opacity-70' : 'scale-100 opacity-50'
            }`}
          />

          {/* Onda expansiva luminosa en el punto de lanzamiento */}
          {isTakeoff && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-[#FF2D78] shadow-[0_0_35px_#FF2D78] animate-shockwave-burst pointer-events-none" />
          )}

          {/* VECTOR OFICIAL DEL COHETE CREAPP (Limpio, sin recuadro ni marcos) */}
          <div className="relative flex items-center justify-center">
            <img
              src={creappLogoOfficial}
              alt="CreAPP Rocket"
              className="w-[72px] h-auto object-contain filter drop-shadow-[0_0_20px_rgba(255,45,120,0.7)] drop-shadow-[0_0_10px_rgba(155,48,255,0.6)] pointer-events-none"
            />
          </div>

          {/* LLAMA DE PROPULSIÓN CONECTADA DIRECTAMENTE A LA BASE */}
          <div className="relative -mt-2 flex flex-col items-center">
            {/* Llama dinámica con aceleración */}
            <div
              style={{
                transform: isTakeoff
                  ? 'scaleY(3.4) scaleX(1.15)'
                  : isIgnition
                  ? 'scaleY(2.0) scaleX(1.1)'
                  : 'scaleY(1) scaleX(1)',
                transition: isTakeoff
                  ? 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  : isIgnition
                  ? 'transform 0.25s ease-out'
                  : 'none',
              }}
              className={`relative origin-top flex flex-col items-center ${
                stage === 'hover' ? 'animate-flame-flutter' : ''
              }`}
            >
              {/* Cono Exterior de la Llama (Magenta / Púrpura) */}
              <div
                className="w-[18px] h-[26px] rounded-b-full bg-gradient-to-b from-[#FF2D78] via-[#9B30FF] to-transparent filter blur-[0.8px] shadow-[0_8px_20px_#FF2D78]"
                style={{ clipPath: 'polygon(15% 0%, 85% 0%, 100% 70%, 50% 100%, 0% 70%)' }}
              />

              {/* Núcleo Interior Incandescente (Blanco / Cian) */}
              <div
                className="absolute top-0 w-[9px] h-[15px] rounded-b-full bg-gradient-to-b from-white via-cyan-300 to-transparent filter blur-[0.3px]"
                style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 75%, 50% 100%, 0% 75%)' }}
              />
            </div>

            {/* Nubes de humo estilizadas que se expanden hacia abajo */}
            <div className="absolute top-4 flex items-center justify-center pointer-events-none">
              <div className="w-5 h-5 rounded-full bg-gradient-to-t from-[#FF2D78]/30 via-[#9B30FF]/30 to-white/20 blur-sm animate-smoke-puff-1" />
              <div className="w-6 h-6 rounded-full bg-gradient-to-t from-[#9B30FF]/30 to-transparent blur-sm animate-smoke-puff-2" />
            </div>
          </div>
        </div>

        {/* ── Tipografía Centrada: creapp + Software Lab ── */}
        <div
          style={{
            opacity: isIgnition || isTakeoff || isReveal ? 0 : 1,
            transform: isIgnition || isTakeoff || isReveal ? 'translateY(12px)' : 'translateY(0px)',
            transition: 'opacity 0.35s ease-out, transform 0.35s ease-out',
          }}
          className="flex flex-col items-center text-center mt-7 pointer-events-none"
        >
          <div className="font-display font-black text-3xl sm:text-4xl tracking-tight text-white text-center">
            <span>cre</span>
            <span className="bg-gradient-to-r from-[#FF2D78] via-[#9B30FF] to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,45,120,0.5)]">
              app
            </span>
          </div>

          <p className="text-[11px] sm:text-xs text-zinc-400 font-mono tracking-[0.25em] uppercase mt-1.5">
            Software Lab
          </p>

          {/* Barra de progreso láser sincronizada */}
          <div className="mt-5 w-32 h-[2.5px] bg-white/10 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-[#FF2D78] to-[#9B30FF] rounded-full shadow-[0_0_10px_#FF2D78] animate-laser-sweep" />
          </div>
        </div>
      </div>

      {/* ── Keyframes CSS Optimizados por Hardware (60-120fps en iOS Safari) ── */}
      <style>{`
        @keyframes rocket-hover {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-7px) rotate(1deg); }
        }
        @keyframes flame-flutter {
          0% { transform: scaleY(0.92) scaleX(1.05); }
          100% { transform: scaleY(1.28) scaleX(0.94); }
        }
        @keyframes cosmic-speedline {
          0% { transform: translateY(-30vh); opacity: 0; }
          40% { opacity: 0.9; }
          100% { transform: translateY(130vh); opacity: 0; }
        }
        @keyframes shockwave-burst {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(3.5); opacity: 0; }
        }
        @keyframes smoke-puff-1 {
          0% { transform: translateY(0) scale(0.4); opacity: 0.8; }
          100% { transform: translateY(45px) scale(2); opacity: 0; }
        }
        @keyframes smoke-puff-2 {
          0% { transform: translateY(0) scale(0.3); opacity: 0.7; }
          100% { transform: translateY(60px) scale(2.4); opacity: 0; }
        }
        @keyframes laser-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-rocket-hover { animation: rocket-hover 1.8s ease-in-out infinite; }
        .animate-flame-flutter { animation: flame-flutter 0.28s ease-in-out infinite alternate; }
        .animate-cosmic-speedline { animation: cosmic-speedline linear infinite; }
        .animate-shockwave-burst { animation: shockwave-burst 0.5s ease-out forwards; }
        .animate-smoke-puff-1 { animation: smoke-puff-1 1s ease-out infinite; }
        .animate-smoke-puff-2 { animation: smoke-puff-2 1.2s ease-out infinite 0.25s; }
        .animate-laser-sweep { animation: laser-sweep 1.1s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default PwaSplashScreen;
