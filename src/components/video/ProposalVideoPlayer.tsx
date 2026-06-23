import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { ProposalVideoComposition } from './ProposalVideoComposition';
import { Play, Pause, RefreshCw, Film, Download, CheckCircle, Loader } from 'lucide-react';

interface ProposalVideoPlayerProps {
  clientName: string;
  brandPrimary: string;
  brandSecondary: string;
  heroTitle: string;
  inclusions: any[];
  exclusions?: any[];
  milestones: any[];
  payments: any[];
  totalValue: number;
  clientLogoUrl?: string;
  currency?: string;
}

export const ProposalVideoPlayer: React.FC<ProposalVideoPlayerProps> = ({
  clientName,
  brandPrimary,
  brandSecondary,
  heroTitle,
  inclusions,
  exclusions = [],
  milestones,
  payments,
  totalValue,
  clientLogoUrl = '',
  currency = 'USD',
}) => {
  const [selectedRatio, setSelectedRatio] = useState<'16:9' | '9:16'>('16:9');
  const [renderStatus, setRenderStatus] = useState<'idle' | 'rendering' | 'completed'>('idle');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Call Vite backend custom plugin to compile composition using Remotion CLI
  const handleStartRender = async () => {
    if (!isLocalhost) return;
    if (renderStatus !== 'idle') return;
    setRenderStatus('rendering');
    setProgress(0);

    // Simulate steady progress up to 92% while CLI compiles the frames
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          clearInterval(interval);
          return 92;
        }
        return prev + Math.floor(Math.random() * 4) + 1;
      });
    }, 450);

    try {
      const response = await fetch('/api/render-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientName,
          brandPrimary,
          brandSecondary,
          heroTitle,
          inclusions,
          exclusions,
          milestones,
          payments,
          totalValue,
          clientLogoUrl,
          aspectRatio: selectedRatio,
          currency,
        }),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fallo en la compilación del video.');
      }

      const data = await response.json();
      setVideoUrl(data.videoUrl);
      setProgress(100);
      setRenderStatus('completed');
    } catch (error) {
      clearInterval(interval);
      setRenderStatus('idle');
      setProgress(0);
      alert('Error rendering video: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Aspect Ratio Selector Tabs */}
      <div className="flex justify-center gap-3">
        <button
          onClick={() => {
            setSelectedRatio('16:9');
            setRenderStatus('idle');
          }}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            selectedRatio === '16:9'
              ? 'bg-primary text-white shadow-lg shadow-primary/30 border border-primary/20'
              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Film size={14} /> Horizontal (16:9)
        </button>
        <button
          onClick={() => {
            setSelectedRatio('9:16');
            setRenderStatus('idle');
          }}
          className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            selectedRatio === '9:16'
              ? 'bg-primary text-white shadow-lg shadow-primary/30 border border-primary/20'
              : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Film size={14} className="rotate-90" /> Vertical (9:16)
        </button>
      </div>

      {/* Player Frame */}
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-slate-950/80 shadow-2xl glass-panel flex justify-center items-center p-6 w-full">
        <Player
          component={ProposalVideoComposition as any}
          inputProps={{
            clientName,
            brandPrimary,
            brandSecondary,
            heroTitle,
            inclusions,
            exclusions,
            milestones,
            payments,
            totalValue,
            clientLogoUrl,
            aspectRatio: selectedRatio,
            currency,
          }}
          durationInFrames={1440} // 48 seconds at 30 fps
          fps={30}
          compositionWidth={selectedRatio === '9:16' ? 1080 : 1920}
          compositionHeight={selectedRatio === '9:16' ? 1920 : 1080}
          style={{
            width: selectedRatio === '9:16' ? 'auto' : '100%',
            height: selectedRatio === '9:16' ? '500px' : 'auto',
            aspectRatio: selectedRatio === '9:16' ? '9/16' : '16/9',
            backgroundColor: '#030712',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}
          controls
          loop
        />
      </div>

      {/* Render options & info */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Render card */}
        <div className="glass rounded-2xl p-5 border border-white/5 bg-surface-dark/40 flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-display font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Film size={14} className="text-primary" /> Renderizar Propuesta en Video
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Exporta esta propuesta en un archivo de video MP4 de alta calidad ({selectedRatio === '9:16' ? '1080x1920 vertical' : '1920x1080 horizontal'}) para enviárselo a tu cliente.
            </p>
          </div>

          {renderStatus === 'idle' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleStartRender}
                disabled={!isLocalhost}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-lg ${
                  isLocalhost
                    ? 'bg-primary hover:bg-primary-hover cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none border border-white/5'
                }`}
              >
                <Film size={14} /> Exportar como MP4
              </button>
              {!isLocalhost && (
                <p className="text-[10px] text-amber-400/90 leading-relaxed text-center font-bold bg-amber-400/5 py-2.5 px-3 rounded-xl border border-amber-400/10">
                  El renderizado MP4 se ejecuta de forma local. Para exportar el video, abre la propuesta en tu entorno local (localhost).
                </p>
              )}
            </div>
          )}

          {renderStatus === 'rendering' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Loader size={12} className="animate-spin text-primary" /> Procesando video...
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {renderStatus === 'completed' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <CheckCircle size={14} /> ¡Video renderizado con éxito!
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // Download the freshly compiled proposal video from CLI
                    const link = document.createElement('a');
                    link.href = videoUrl || '/demo-video.mp4';
                    const suffix = selectedRatio === '9:16' ? 'vertical' : 'horizontal';
                    link.setAttribute('download', `propuesta-${suffix}-${clientName.toLowerCase().replace(/\s+/g, '-')}.mp4`);
                    link.click();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-emerald-500/10"
                >
                  <Download size={12} /> Descargar MP4
                </button>
                <button
                  onClick={() => setRenderStatus('idle')}
                  className="p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Feature info card */}
        <div className="glass rounded-2xl p-5 border border-white/5 bg-surface-dark/40 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-xs font-display font-black text-white uppercase tracking-widest">
              Características del Formato
            </h3>
            <ul className="space-y-2 text-[11px] text-slate-400">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>
                  <strong>Resolución:</strong>{' '}
                  {selectedRatio === '9:16'
                    ? '1080x1920px (Mobile vertical), optimizado para WhatsApp.'
                    : '1920x1080px (Full HD), ideal para sitios web y presentaciones.'}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span><strong>Branding Dinámico:</strong> Adapta los gradientes según la paleta de colores de tu cliente.</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span><strong>Animaciones Spring:</strong> Movimiento natural y fluido en las tarjetas de entregables.</span>
              </li>
            </ul>
          </div>

          <div className="text-[10px] text-slate-500 font-medium">
            Desarrollado en React utilizando Remotion Video SDK.
          </div>
        </div>
      </div>
    </div>
  );
};
