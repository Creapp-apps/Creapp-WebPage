import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff, X } from 'lucide-react';
import type { LaunchPiece } from '@/lib/launchesTypes';
import { STATUS_LABEL, KIND_LABEL, kindFromPlatform } from './LaunchRow';

const isVideo = (u: string): boolean => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u);
const isImage = (u: string): boolean => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u);

interface Props {
  piece: LaunchPiece;
  onClose: () => void;
}

/**
 * Preview de SOLO LECTURA de una pieza ya programada/encolada. No ofrece aprobar,
 * cancelar, forzar ni ninguna acción determinante: es un vistazo rápido ("¿qué se
 * publica mañana?") sin riesgo de desconfigurar la programación.
 */
export const LaunchPreviewModal: React.FC<Props> = ({ piece, onClose }) => {
  const [shown, setShown] = useState(false);       // dispara la transición de entrada
  const [idx, setIdx] = useState(0);               // índice del carrusel de imágenes

  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(r); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const video = piece.mediaUrls.find(isVideo);
  const images = piece.mediaUrls.filter(isImage);
  const when = piece.scheduledAt
    ? new Date(piece.scheduledAt).toLocaleString('es-AR', { dateStyle: 'full', timeStyle: 'short' })
    : null;

  const media = (() => {
    if (video) {
      return (
        <video
          src={video}
          poster={piece.coverUrl ?? undefined}
          controls
          playsInline
          className="w-full h-full object-contain bg-black"
        />
      );
    }
    if (images.length > 0) {
      const safe = Math.min(idx, images.length - 1);
      return (
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <img src={images[safe]} alt={`Lámina ${safe + 1}`} className="w-full h-full object-contain" />
          {images.length > 1 && (
            <>
              <button
                type="button" aria-label="Anterior"
                onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button
                type="button" aria-label="Siguiente"
                onClick={() => setIdx((i) => (i + 1) % images.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 transition-colors">
                <ChevronRight size={18} />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === safe ? 'bg-white' : 'bg-white/30'}`} />
                ))}
              </div>
            </>
          )}
        </div>
      );
    }
    if (piece.coverUrl) {
      return <img src={piece.coverUrl} alt="" className="w-full h-full object-contain bg-black" />;
    }
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-600">
        <ImageOff size={28} /> <span className="text-xs">Sin vista previa disponible</span>
      </div>
    );
  })();

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${shown ? 'opacity-100' : 'opacity-0'} bg-black/75 backdrop-blur-sm`}
      role="dialog" aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-sm rounded-2xl border border-white/10 bg-[#0e0e12] overflow-hidden shadow-2xl transition-all duration-200 ease-out ${shown ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-white/5">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{piece.title || piece.jobId}</h3>
            <p className="text-[11px] text-zinc-500 truncate">
              {piece.clientName} · {KIND_LABEL[kindFromPlatform(piece.platform)]}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-zinc-500/10 text-zinc-300 border-zinc-500/20">
              {STATUS_LABEL[piece.status] ?? piece.status}
            </span>
            <button type="button" onClick={onClose} aria-label="Cerrar"
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Media 9:16 */}
        <div className="aspect-[9/16] max-h-[55vh] w-full bg-black">{media}</div>

        {/* Meta + caption */}
        <div className="p-4 space-y-3 max-h-[26vh] overflow-y-auto">
          {when && (
            <p className="text-xs text-zinc-300">
              <span className="text-zinc-500">Se publica:</span> {when}
            </p>
          )}
          {piece.caption && (
            <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{piece.caption}</p>
          )}
          {piece.permalink && (
            <a href={piece.permalink} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-white/10 text-zinc-300 hover:bg-white/5 transition-colors">
              <ExternalLink size={12} /> Abrir post publicado
            </a>
          )}
          <p className="text-[10px] text-zinc-600 pt-1">Vista de solo lectura · la programación no se modifica desde acá.</p>
        </div>
      </div>
    </div>
  );
};

export default LaunchPreviewModal;
