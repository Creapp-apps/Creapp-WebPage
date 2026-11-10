import React, { useCallback, useEffect, useRef, useState } from 'react';

const fmt = (t: number) => {
  if (!isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

type Props = { src: string; poster?: string | null };

/** Reproductor de video a medida del portal (estética navy + cobre), sin los
 * controles nativos del navegador: barra propia que se desvanece al reproducir. */
export const PortalVideo: React.FC<Props> = ({ src, poster }) => {
  const vref = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hideT = useRef<number | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);

  const toggle = useCallback(() => {
    const v = vref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const nudge = useCallback(() => {
    setUiHidden(false);
    window.clearTimeout(hideT.current);
    hideT.current = window.setTimeout(() => {
      if (vref.current && !vref.current.paused) setUiHidden(true);
    }, 2200);
  }, []);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = vref.current;
    if (!v || !dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    v.currentTime = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * dur;
  };

  const toggleMute = () => {
    const v = vref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const fullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  };

  useEffect(() => () => window.clearTimeout(hideT.current), []);

  const pct = dur ? (cur / dur) * 100 : 0;

  return (
    <div className={`pvid${playing && uiHidden ? ' idle' : ''}`} ref={wrapRef} onMouseMove={nudge}>
      <video
        ref={vref}
        src={src}
        poster={poster ?? undefined}
        playsInline
        onClick={toggle}
        onPlay={() => { setPlaying(true); nudge(); }}
        onPause={() => { setPlaying(false); setUiHidden(false); }}
        onTimeUpdate={() => setCur(vref.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDur(vref.current?.duration ?? 0)}
        onEnded={() => { setPlaying(false); setUiHidden(false); }}
      />
      {!playing && (
        <button type="button" className="pvid-big" aria-label="Reproducir" onClick={toggle}>
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
        </button>
      )}
      <div className="pvid-bar">
        <button type="button" className="pvid-ic" onClick={toggle} aria-label={playing ? 'Pausar' : 'Reproducir'}>
          {playing
            ? <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg>
            : <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>}
        </button>
        <span className="pvid-t">{fmt(cur)} / {fmt(dur)}</span>
        <div className="pvid-track" onClick={seek} role="slider" aria-label="Progreso" aria-valuenow={Math.round(pct)}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <button type="button" className="pvid-ic" onClick={toggleMute} aria-label={muted ? 'Activar sonido' : 'Silenciar'}>
          {muted
            ? <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor" /><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            : <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor" /><path d="M16 8.5a4 4 0 010 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
        </button>
        <button type="button" className="pvid-ic" onClick={fullscreen} aria-label="Pantalla completa">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
};
