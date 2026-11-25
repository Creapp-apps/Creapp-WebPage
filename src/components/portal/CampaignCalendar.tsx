import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Clock, Instagram, X, Images, Film } from 'lucide-react';
import { getMyCalendarPieces, subscribeMyCalendar } from '@/lib/calendarService';
import { cellState, monthGrid, toLocalDayKey, firstPieceMonth } from '@/lib/calendarMapper';
import type { CalendarPiece } from '@/lib/calendarTypes';
import { PortalVideo } from '@/components/portal/PortalVideo';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TYPE_LABEL: Record<string, string> = { reel: 'Reel', carousel: 'Carrusel', story: 'Historia' };

const monthLabel = (year: number, month0: number): string =>
  new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date(year, month0, 1));

const timeLabel = (d: Date): string =>
  new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }).format(d);

type MonthKey = { year: number; month0: number };

/** Calendario de la campaña del cliente: scheduled_posts en vivo, blur por publicado,
 * player embebido. Ver spec §5.4. Acentos = tema del cliente (chrome-only CreAPP). */
export const CampaignCalendar: React.FC<{ campaignId: string | null }> = ({ campaignId }) => {
  const [pieces, setPieces] = useState<CalendarPiece[] | undefined>(undefined);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [month, setMonth] = useState<MonthKey | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarPiece[] | null>(null);
  const [selIdx, setSelIdx] = useState(0);

  const load = useCallback(() => {
    setError(false);
    getMyCalendarPieces(campaignId)
      .then((p) => setPieces(p))
      .catch(() => { setError(true); setPieces([]); });
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeMyCalendar(load), [load]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // Al cambiar de campaña, volvé a "auto" para que el mes se re-derive de la nueva.
  useEffect(() => { setMonth(null); }, [campaignId]);

  // Piezas por día local (clave YYYY-MM-DD).
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarPiece[]>();
    for (const p of pieces ?? []) {
      if (!p.date) continue;
      const k = toLocalDayKey(p.date.toISOString());
      (m.get(k) ?? m.set(k, []).get(k)!).push(p);
    }
    return m;
  }, [pieces]);

  // Meses (AR-local) que tienen piezas, para clamp de navegación.
  const monthsWithPieces = useMemo(() => {
    const s = new Set<string>();
    for (const p of pieces ?? []) {
      if (!p.date) continue;
      const [y, m] = toLocalDayKey(p.date.toISOString()).split('-').map(Number);
      s.add(`${y}-${m - 1}`);
    }
    return s;
  }, [pieces]);

  // Mes visible: override del usuario, o el default derivado de las piezas (AR-local).
  const base: MonthKey = month ?? firstPieceMonth(pieces ?? [], now);

  const shift = (delta: number) => {
    const d = new Date(base.year, base.month0 + delta, 1);
    setMonth({ year: d.getFullYear(), month0: d.getMonth() });
  };
  const canShift = (delta: number): boolean => {
    if (monthsWithPieces.size === 0) return false;
    const d = new Date(base.year, base.month0 + delta, 1);
    // habilita si hay algún mes con piezas en esa dirección
    for (const k of monthsWithPieces) {
      const [y, m] = k.split('-').map(Number);
      const cmp = (y - d.getFullYear()) * 12 + (m - d.getMonth());
      if (delta < 0 ? cmp <= 0 : cmp >= 0) return true;
    }
    return false;
  };

  // Cierre del modal con Escape.
  useEffect(() => {
    if (!selectedDay) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedDay(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedDay]);

  if (pieces === undefined) {
    return <div className="cal-state">Cargando tu calendario…</div>;
  }
  if (error) {
    return (
      <div className="cal-state">
        <p>No pudimos cargar tu calendario.</p>
        <button type="button" className="cal-retry" onClick={load}>Reintentar</button>
      </div>
    );
  }
  if (pieces.length === 0) {
    return (
      <div className="cal-state cal-empty">
        <h3>Tu campaña todavía no se lanzó</h3>
        <p>Cuando la aprobemos y la pongamos en marcha, vas a ver acá el calendario con cada pieza y el día en que sale.</p>
      </div>
    );
  }

  const grid = monthGrid(base.year, base.month0);
  const todayKey = toLocalDayKey(now.toISOString());

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" className="cal-nav" aria-label="Mes anterior" disabled={!canShift(-1)} onClick={() => shift(-1)}>
          <ChevronLeft size={18} />
        </button>
        <h2 className="cal-month">{monthLabel(base.year, base.month0)}</h2>
        <button type="button" className="cal-nav" aria-label="Mes siguiente" disabled={!canShift(1)} onClick={() => shift(1)}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="cal-dow">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>

      <div className="cal-grid">
        {grid.map((dayKey, i) => {
          if (!dayKey) return <div key={i} className="cal-cell cal-empty-cell" />;
          const dayNum = Number(dayKey.slice(-2));
          const dayPieces = byDay.get(dayKey) ?? [];
          const head = dayPieces[0];
          const isToday = dayKey === todayKey;
          const state = head ? cellState(head, now) : null;
          return (
            <button
              type="button"
              key={i}
              className={`cal-cell${head ? ' has' : ''}${isToday ? ' today' : ''}${state ? ` st-${state}` : ''}`}
              disabled={!head}
              onClick={() => { if (head) { setSelectedDay(dayPieces); setSelIdx(0); } }}
              aria-label={head ? `${dayNum}: ${head.caption ?? 'pieza programada'}` : `${dayNum}`}
            >
              <span className="cal-day">{dayNum}</span>
              {head && (
                <>
                  {head.coverUrl && <img className="cal-cover" src={head.coverUrl} alt="" loading="lazy" />}
                  <span className="cal-veil" />
                  <span className="cal-badge">
                    {state === 'published' ? <Check size={13} />
                      : state === 'in_process' ? <Clock size={13} />
                      : <>{head.date ? timeLabel(head.date) : ''}</>}
                  </span>
                  {dayPieces.length > 1 && <span className="cal-more">+{dayPieces.length - 1}</span>}
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="cal-legend">
        <span><i className="lg lg-future" /> Programado</span>
        <span><i className="lg lg-proc" /> En proceso</span>
        <span><i className="lg lg-pub" /> Publicado</span>
      </div>

      {selectedDay && selectedDay[selIdx] && (() => {
        const sel = selectedDay[selIdx];
        const many = selectedDay.length > 1;
        return (
          <div className="cal-modal" role="dialog" aria-modal="true" aria-label="Pieza de la campaña" onClick={() => setSelectedDay(null)}>
            <div className="cal-sheet" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="cal-close" aria-label="Cerrar" onClick={() => setSelectedDay(null)}>
                <X size={18} />
              </button>
              <div className="cal-media"><PieceViewer key={sel.id} piece={sel} /></div>
              <div className="cal-info">
                <div className="cal-info-head">
                  <span className="cal-type">{TYPE_LABEL[sel.type]}</span>
                  {many && (
                    <div className="cal-daynav">
                      <button type="button" aria-label="Pieza anterior" disabled={selIdx === 0} onClick={() => setSelIdx((s) => Math.max(0, s - 1))}>‹</button>
                      <span>{selIdx + 1} / {selectedDay.length}</span>
                      <button type="button" aria-label="Pieza siguiente" disabled={selIdx === selectedDay.length - 1} onClick={() => setSelIdx((s) => Math.min(selectedDay.length - 1, s + 1))}>›</button>
                    </div>
                  )}
                </div>
                {sel.caption && <p className="cal-caption">{sel.caption}</p>}
                {sel.permalink && (
                  <a className="cal-iglink" href={sel.permalink} target="_blank" rel="noopener noreferrer">
                    <Instagram size={15} /> Ver en Instagram
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

/** Visor de la pieza dentro del modal: video (reel/story), carrusel o portada. */
const PieceViewer: React.FC<{ piece: CalendarPiece }> = ({ piece }) => {
  const [slide, setSlide] = useState(0);
  const slides = piece.type === 'carousel' ? piece.mediaUrls : [];
  if (piece.type !== 'carousel' && piece.mediaUrls[0]) {
    return <PortalVideo src={piece.mediaUrls[0]} poster={piece.coverUrl} />;
  }
  if (slides.length > 0) {
    return (
      <div className="vslides">
        <div className="vslide-frame">
          <img className="vslide vslide-in" key={slide} src={slides[slide]} alt={`Lámina ${slide + 1}`} />
        </div>
        <div className="slidenav">
          <button type="button" aria-label="Lámina anterior" onClick={() => setSlide((s) => Math.max(0, s - 1))}>‹</button>
          <span>{slide + 1} / {slides.length}</span>
          <button type="button" aria-label="Lámina siguiente" onClick={() => setSlide((s) => Math.min(slides.length - 1, s + 1))}>›</button>
        </div>
        <span className="vtype"><Images size={14} /> Carrusel</span>
      </div>
    );
  }
  return (
    <div className="vslides">
      {piece.coverUrl
        ? <img className="vslide" src={piece.coverUrl} alt="" />
        : <div className="cal-nomedia"><Film size={28} /><span>Pieza en preparación</span></div>}
    </div>
  );
};
