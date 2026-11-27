import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Film, Images, Share2, X } from 'lucide-react';
import { getMyShowroomPieces, fetchPieceBlob, downloadBlob, subscribeMyShowroom } from '@/lib/showroomService';
import { planShare, nextFallback, type ShareMode, type ShareCaps } from '@/lib/sharePiece';
import type { CalendarPiece } from '@/lib/calendarTypes';
import { PortalVideo } from '@/components/portal/PortalVideo';

const TYPE_LABEL: Record<string, string> = { reel: 'Reel', carousel: 'Carrusel', story: 'Historia' };

const dateLabel = (d: Date | null): string =>
  d ? new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(d) : '';

// Compartir archivo (mobile): solo ahí sirve prefetchear el blob.
const canShareFile = typeof navigator !== 'undefined' && !!navigator.canShare && (() => {
  try { return navigator.canShare({ files: [new File([], 'x.mp4', { type: 'video/mp4' })] }); } catch { return false; }
})();

type Blobbed = { blob: Blob; filename: string };

const Cover: React.FC<{ piece: CalendarPiece }> = ({ piece }) => {
  const [broken, setBroken] = useState(false);
  return (
    <div className="mp-cover">
      {piece.coverUrl && !broken
        ? <img src={piece.coverUrl} alt="" loading="lazy" onError={() => setBroken(true)} />
        : <div className="mp-ph">{piece.type === 'carousel' ? <Images size={26} /> : <Film size={26} />}</div>}
    </div>
  );
};

const Detail: React.FC<{ piece: CalendarPiece; onClose: () => void }> = ({ piece, onClose }) => {
  const isCarousel = piece.type === 'carousel';
  const [idx, setIdx] = useState(0);
  const [pre, setPre] = useState<Blobbed | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prefetch para que el tap de Compartir sea síncrono (iOS Safari).
  useEffect(() => {
    if (isCarousel || !canShareFile) return;
    let alive = true;
    setPre(null);
    setBusy(true);
    fetchPieceBlob(piece.id, 0)
      .then((r) => { if (alive) setPre(r); })
      .catch(() => { /* sin archivo: el share cae a link/menú */ })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [piece.id, isCarousel]);

  const download = async () => {
    setDownloading(true);
    setMsg(null);
    try {
      const { blob, filename } = await fetchPieceBlob(piece.id, isCarousel ? idx : 0);
      downloadBlob(blob, filename);
    } catch {
      setMsg('No pudimos descargar la pieza.');
    } finally {
      setDownloading(false);
    }
  };

  const link = piece.permalink;

  const share = async () => {
    setMsg(null);
    const caps: ShareCaps = {
      canShareFiles: (f: File) => !!(navigator.canShare && navigator.canShare({ files: [f] })),
      canShareUrl: typeof navigator.share === 'function',
    };
    const file = pre ? new File([pre.blob], pre.filename, { type: pre.blob.type || 'video/mp4' }) : null;
    let mode: ShareMode | null = isCarousel ? 'link' : planShare({ file, permalink: piece.permalink, caps });
    while (mode) {
      if (mode === 'link' && !link) mode = 'menu';
      if (mode === 'menu') { setMenu(true); return; }
      try {
        if (mode === 'file' && file) {
          await navigator.share({ files: [file], title: 'Mi pieza', text: piece.caption ?? '' });
        } else if (link) {
          await navigator.share({ url: link, text: piece.caption ?? '' });
        }
        return;
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return;
        mode = nextFallback(mode);
      }
    }
    setMenu(true);
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { setMsg('No pudimos copiar el link.'); }
  };
  const whatsapp = () => {
    if (!link) return;
    const text = ((piece.caption ? piece.caption + ' ' : '') + link).trim();
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener,noreferrer');
  };

  const slides = piece.mediaUrls;
  return (
    <div className="mp-modal" role="dialog" aria-modal="true" aria-label="Pieza" onClick={onClose}>
      <div className="mp-sheet" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mp-close" aria-label="Cerrar" onClick={onClose}><X size={18} /></button>
        {isCarousel ? (
          <>
            <div className="mp-slides">{slides[idx] && <img src={slides[idx]} alt={`Lámina ${idx + 1}`} />}</div>
            <div className="mp-slidenav">
              <button type="button" className="nav" aria-label="Anterior" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>‹</button>
              <div className="mp-dots">{slides.map((_, i) => <i key={i} className={i === idx ? 'on' : ''} />)}</div>
              <button type="button" className="nav" aria-label="Siguiente" disabled={idx >= slides.length - 1} onClick={() => setIdx((i) => Math.min(slides.length - 1, i + 1))}>›</button>
            </div>
          </>
        ) : (
          slides[0] && <PortalVideo src={slides[0]} poster={piece.coverUrl} />
        )}
        {piece.caption && <p className="mp-caption">{piece.caption}</p>}
        {msg && <p className="mp-msg">{msg}</p>}
        <div className="mp-actions">
          {menu && (
            <div className="mp-menu">
              {link && <button type="button" onClick={copy}>{copied ? 'Copiado' : 'Copiar link'}</button>}
              {link && <button type="button" onClick={whatsapp}>WhatsApp</button>}
              <button type="button" onClick={download}>Descargar</button>
            </div>
          )}
          <button type="button" className="mp-btn primary" onClick={share} disabled={busy}>
            {busy ? <span className="mp-spin" /> : <Share2 size={16} />} Compartir
          </button>
          <button type="button" className="mp-btn" onClick={download} disabled={downloading}>
            {downloading ? <span className="mp-spin" /> : <Download size={16} />} Descargar
          </button>
        </div>
      </div>
    </div>
  );
};

/** Showroom del cliente: piezas ya publicadas, con compartir y descargar. */
export const MisPiezas: React.FC<{ campaignId: string | null }> = ({ campaignId }) => {
  const [pieces, setPieces] = useState<CalendarPiece[] | undefined>(undefined);
  const [error, setError] = useState(false);
  const [sel, setSel] = useState<CalendarPiece | null>(null);

  const seq = useRef(0);
  const hasData = useRef(false);

  const load = useCallback(() => {
    const my = ++seq.current;
    getMyShowroomPieces(campaignId)
      .then((p) => { if (my !== seq.current) return; hasData.current = true; setError(false); setPieces(p); })
      .catch(() => {
        if (my !== seq.current) return;
        if (hasData.current) return; // conserva la lista ya mostrada
        setError(true); setPieces([]);
      });
  }, [campaignId]);

  useEffect(() => { hasData.current = false; setPieces(undefined); setError(false); load(); return () => { seq.current++; }; }, [load]);
  useEffect(() => subscribeMyShowroom(load), [load]);

  const close = useCallback(() => setSel(null), []);

  if (pieces === undefined) return <div className="cal-state">Cargando tus piezas…</div>;
  if (error) {
    return (
      <div className="cal-state">
        <p>No pudimos cargar tus piezas.</p>
        <button type="button" className="cal-retry" onClick={load}>Reintentar</button>
      </div>
    );
  }
  if (pieces.length === 0) {
    return <div className="cal-state"><p>Todavía no publicamos piezas. Acá vas a verlas apenas salgan.</p></div>;
  }
  return (
    <>
      <div className="mp-grid">
        {pieces.map((p) => (
          <button type="button" key={p.id} className="mp-card" onClick={() => setSel(p)}>
            <Cover piece={p} />
            <div className="mp-meta"><b>{TYPE_LABEL[p.type]}</b><span>{dateLabel(p.date)}</span></div>
          </button>
        ))}
      </div>
      {sel && <Detail key={sel.id} piece={sel} onClose={close} />}
    </>
  );
};
