import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Users, Eye, BarChart3, Heart, MessageCircle, Send, Bookmark, Instagram } from 'lucide-react';
import { getMyInsights } from '@/lib/insightsService';
import { freshnessLabel, topPieces } from '@/lib/insightsMapper';
import type { InsightsResult } from '@/lib/insightsService';
import type { AccountMetric, PieceInsight } from '@/lib/insightsTypes';

const nf = new Intl.NumberFormat('es-AR');
const fmt = (n: number | null): string => (n == null ? '—' : nf.format(n));

/** Sparkline de una sola serie (accent del cliente). Sin ejes ni labels por punto. */
const Sparkline: React.FC<{ series: { v: number }[] }> = ({ series }) => {
  if (series.length < 2) return <div className="ins-spark ins-spark-empty" />;
  const vals = series.map((s) => s.v);
  const max = Math.max(...vals), min = Math.min(...vals);
  const span = max - min || 1;
  const W = 100, H = 30;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - ((v - min) / span) * (H - 4) - 2;
    return [x, y] as const;
  });
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `0,${H} ${line} ${W},${H}`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className="ins-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <polygon className="ins-spark-area" points={area} />
      <polyline className="ins-spark-line" points={line} />
      <circle className="ins-spark-dot" cx={lx} cy={ly} r={2.4} />
    </svg>
  );
};

const METRIC_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  reach: Eye, profile_views: Users, accounts_engaged: Users, total_interactions: BarChart3, views: Eye,
};

const StatTile: React.FC<{ metric: AccountMetric }> = ({ metric }) => {
  const Icon = METRIC_ICON[metric.key] ?? BarChart3;
  return (
    <div className="ins-tile">
      <div className="ins-tile-head"><Icon size={15} /> <span>{metric.label}</span></div>
      <div className="ins-tile-num">{fmt(metric.total)}</div>
      <Sparkline series={metric.series} />
    </div>
  );
};

const PieceCardRow: React.FC<{ piece: PieceInsight }> = ({ piece }) => (
  <div className="ins-piece">
    {piece.coverUrl
      ? <img className="ins-piece-cover" src={piece.coverUrl} alt="" loading="lazy" />
      : <div className="ins-piece-cover ins-piece-nocover" />}
    <div className="ins-piece-body">
      {piece.caption && <p className="ins-piece-cap">{piece.caption}</p>}
      <div className="ins-piece-metrics">
        <span title="Alcance"><Eye size={13} /> {fmt(piece.reach)}</span>
        <span title="Me gusta"><Heart size={13} /> {fmt(piece.likes)}</span>
        <span title="Comentarios"><MessageCircle size={13} /> {fmt(piece.comments)}</span>
        <span title="Compartidos"><Send size={13} /> {fmt(piece.shares)}</span>
        <span title="Guardados"><Bookmark size={13} /> {fmt(piece.saved)}</span>
      </div>
    </div>
    {piece.permalink && (
      <a className="ins-piece-link" href={piece.permalink} target="_blank" rel="noopener noreferrer" aria-label="Ver en Instagram">
        <Instagram size={15} />
      </a>
    )}
  </div>
);

/** Sección Insights del portal: cuenta (stat tiles + sparklines) + piezas (ordenable). */
export const PortalInsights: React.FC = () => {
  const [data, setData] = useState<InsightsResult | undefined>(undefined);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'reach' | 'saved'>('reach');

  const load = useCallback((refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(false);
    getMyInsights(refresh ? { refresh: true } : undefined)
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const sortedPieces = useMemo(
    () => (data ? topPieces(data.payload.pieces, sortBy) : []),
    [data, sortBy],
  );

  if (data === undefined && !error) return <div className="ins-state">Cargando tus estadísticas…</div>;
  if (error) {
    return (
      <div className="ins-state">
        <p>No pudimos cargar tus estadísticas.</p>
        <button type="button" className="ins-retry" onClick={() => load()}>Reintentar</button>
      </div>
    );
  }
  const payload = data!.payload;
  if (payload.needsConnection) {
    return (
      <div className="ins-state ins-empty">
        <h3>Todavía no conectamos tus estadísticas</h3>
        <p>En cuanto enlacemos tu cuenta de Instagram, vas a ver acá el alcance, los seguidores y el rendimiento de cada pieza.</p>
      </div>
    );
  }

  return (
    <div className="ins">
      <div className="ins-head">
        <div className="ins-fresh">Actualizado {freshnessLabel(data!.fetchedAt, new Date())}</div>
        <button type="button" className="ins-refresh" disabled={refreshing} onClick={() => load(true)}>
          <RefreshCw size={14} className={refreshing ? 'ins-spin' : undefined} /> Actualizar
        </button>
      </div>

      <section className="ins-sec">
        <h2 className="ins-sec-title">Tu cuenta</h2>
        <div className="ins-tiles">
          {payload.followerCount != null && (
            <div className="ins-tile ins-tile-hero">
              <div className="ins-tile-head"><Users size={15} /> <span>Seguidores</span></div>
              <div className="ins-tile-num">{fmt(payload.followerCount)}</div>
            </div>
          )}
          {payload.account.map((m) => <StatTile key={m.key} metric={m} />)}
        </div>
        {payload.account.length === 0 && payload.followerCount == null && (
          <p className="ins-note">Todavía no hay métricas de cuenta para mostrar.</p>
        )}
      </section>

      <section className="ins-sec">
        <div className="ins-sec-head">
          <h2 className="ins-sec-title">Tus piezas</h2>
          <div className="ins-sort">
            <button type="button" className={sortBy === 'reach' ? 'on' : ''} onClick={() => setSortBy('reach')}>Alcance</button>
            <button type="button" className={sortBy === 'saved' ? 'on' : ''} onClick={() => setSortBy('saved')}>Guardados</button>
          </div>
        </div>
        {sortedPieces.length > 0
          ? <div className="ins-pieces">{sortedPieces.map((p) => <PieceCardRow key={p.mediaId} piece={p} />)}</div>
          : <p className="ins-note">Cuando publiquemos tus primeras piezas, vas a ver acá su rendimiento.</p>}
      </section>
    </div>
  );
};
