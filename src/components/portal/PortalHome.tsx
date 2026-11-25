import React, { useEffect, useMemo, useState } from 'react';
import {
  Layers, CheckCircle2, Clock, CalendarClock, ClipboardCheck, CalendarDays, BarChart3, ArrowRight,
} from 'lucide-react';
import type { PortalCampaign } from '@/lib/portalTypes';
import type { PortalSection } from '@/components/portal/PortalShell';
import { progressSummary } from '@/lib/portalView';
import { BrandMarkView } from '@/components/portal/BrandMark';
import { getMyCalendarPieces } from '@/lib/calendarService';
import type { CalendarPiece } from '@/lib/calendarTypes';
import { nextPublication, upcomingPublications } from '@/lib/portalHome';
import { liveStats } from '@/lib/portalLive';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const mesLabel = (month: string | null): string => {
  const m = /^(\d{4})-(\d{2})/.exec(month ?? '');
  return m ? MESES[Number(m[2]) - 1] ?? '' : '';
};
const dayLabel = (d: Date): string =>
  new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(d);

interface Props {
  campaign: PortalCampaign;
  campaignId: string | null;
  onNavigate: (s: PortalSection) => void;
  pendingCount: number;
}

/** Home del portal: resumen de la campaña con estado, próximas publicaciones, rail
 * de piezas y atajos a las secciones. Spec §5.2. Acentos del tema del cliente. */
export const PortalHome: React.FC<Props> = ({ campaign, campaignId, onNavigate, pendingCount }) => {
  const [cal, setCal] = useState<CalendarPiece[] | undefined>(undefined);
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    let alive = true;
    getMyCalendarPieces(campaignId).then((p) => alive && setCal(p)).catch(() => alive && setCal([]));
    return () => { alive = false; };
  }, [campaignId]);

  const live = !!campaign.live;
  const prog = progressSummary(campaign.pieces);
  const mes = mesLabel(campaign.month);
  const upcoming = useMemo(() => (cal ? upcomingPublications(cal, now, 3) : []), [cal, now]);
  const next = useMemo(() => (cal ? nextPublication(cal, now) : null), [cal, now]);
  // En vivo las tarjetas y el rail salen del calendario (no de campaign.pieces=[]).
  const stats = useMemo(() => (cal ? liveStats(cal, now) : null), [cal, now]);

  return (
    <div className="home">
      <header className="home-head">
        <div className="home-brand"><BrandMarkView client={campaign.client} /></div>
        <div className="home-eyebrow">{campaign.client.name}{mes ? ` · Campaña de ${mes}` : ''}</div>
        <h1 className="home-title">{campaign.title || (mes ? `Campaña de ${mes}` : 'Tu campaña')}</h1>
        {campaign.concept && <p className="home-concept">{campaign.concept}</p>}
      </header>

      <div className="home-stats">
        {live ? (
          <>
            <div className="home-stat">
              <div className="home-stat-ic"><Layers size={18} /></div>
              <div className="home-stat-num">{stats ? stats.total : '·'}</div>
              <div className="home-stat-lab">{stats && stats.total === 1 ? 'publicación' : 'publicaciones'}</div>
            </div>
            <div className="home-stat">
              <div className="home-stat-ic ok"><CheckCircle2 size={18} /></div>
              <div className="home-stat-num">{stats ? stats.published : '·'}</div>
              <div className="home-stat-lab">publicadas</div>
            </div>
            <div className="home-stat">
              <div className="home-stat-ic accent"><CalendarClock size={18} /></div>
              <div className="home-stat-num home-stat-sm">{cal === undefined ? '·' : stats?.next ? dayLabel(stats.next) : '—'}</div>
              <div className="home-stat-lab">{cal === undefined ? 'cargando…' : stats?.next ? 'próxima publicación' : 'todo publicado'}</div>
            </div>
          </>
        ) : (
          <>
            <div className="home-stat">
              <div className="home-stat-ic"><Layers size={18} /></div>
              <div className="home-stat-num">{prog.total}</div>
              <div className="home-stat-lab">{prog.total === 1 ? 'pieza esta campaña' : 'piezas esta campaña'}</div>
            </div>
            <div className="home-stat">
              <div className="home-stat-ic ok"><CheckCircle2 size={18} /></div>
              <div className="home-stat-num">{prog.approved}</div>
              <div className="home-stat-lab">aprobadas</div>
            </div>
            <div className="home-stat">
              <div className="home-stat-ic warn"><Clock size={18} /></div>
              <div className="home-stat-num">{prog.pending}</div>
              <div className="home-stat-lab">{prog.pending === 1 ? 'espera tu mirada' : 'esperan tu mirada'}</div>
            </div>
            <div className="home-stat">
              <div className="home-stat-ic accent"><CalendarClock size={18} /></div>
              <div className="home-stat-num home-stat-sm">{cal === undefined ? '·' : next?.date ? dayLabel(next.date) : '—'}</div>
              <div className="home-stat-lab">{cal === undefined ? 'cargando…' : next?.date ? 'próxima publicación' : 'en revisión'}</div>
            </div>
          </>
        )}
      </div>

      {upcoming.length > 0 && (
        <section className="home-sec">
          <div className="home-sec-head">
            <h2>Próximas publicaciones</h2>
            <button type="button" className="home-link" onClick={() => onNavigate('calendario')}>Ver calendario <ArrowRight size={14} /></button>
          </div>
          <div className="home-upcoming">
            {upcoming.map((p) => (
              <button type="button" key={p.id} className="home-up" aria-label={`Ver ${p.date ? dayLabel(p.date) : 'publicación'} en el calendario`} onClick={() => onNavigate('calendario')}>
                {p.coverUrl && <img src={p.coverUrl} alt="" loading="lazy" />}
                <span className="home-up-date">{p.date ? dayLabel(p.date) : ''}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="home-sec">
        <div className="home-sec-head">
          <h2>Tus piezas</h2>
          <button type="button" className="home-link" onClick={() => onNavigate(live ? 'calendario' : 'revision')}>
            {live ? 'Ver calendario' : `Revisar ${pendingCount > 0 ? `(${pendingCount})` : ''}`} <ArrowRight size={14} />
          </button>
        </div>
        {live ? (
          cal && cal.length > 0 ? (
            <div className="home-rail">
              {cal.map((p) => (
                <button type="button" key={p.id} className="home-piece" aria-label="Ver en el calendario" onClick={() => onNavigate('calendario')}>
                  {p.coverUrl ? <img src={p.coverUrl} alt="" loading="lazy" /> : <span className="home-piece-noc" />}
                  {p.published && <span className="home-piece-ok"><CheckCircle2 size={14} /></span>}
                </button>
              ))}
            </div>
          ) : (
            <p className="home-empty">Cuando se publiquen tus piezas vas a verlas acá.</p>
          )
        ) : campaign.pieces.length > 0 ? (
          <div className="home-rail">
            {campaign.pieces.map((pc) => (
              <button type="button" key={pc.id} className="home-piece" aria-label={`Revisar ${pc.title}`} onClick={() => onNavigate('revision')} title={pc.title}>
                {pc.coverUrl
                  ? <img src={pc.coverUrl} alt="" loading="lazy" />
                  : <span className="home-piece-noc" />}
                {pc.status === 'approved' && <span className="home-piece-ok"><CheckCircle2 size={14} /></span>}
              </button>
            ))}
          </div>
        ) : (
          <p className="home-empty">Todavía estamos preparando las piezas de esta campaña.</p>
        )}
      </section>

      <div className="home-shortcuts">
        {!live && <button type="button" onClick={() => onNavigate('revision')}><ClipboardCheck size={17} /> Revisión</button>}
        <button type="button" onClick={() => onNavigate('calendario')}><CalendarDays size={17} /> Calendario</button>
        <button type="button" onClick={() => onNavigate('insights')}><BarChart3 size={17} /> Insights</button>
      </div>
    </div>
  );
};
