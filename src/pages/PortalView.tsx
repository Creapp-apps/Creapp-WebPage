import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getMyCampaign, submitDecision } from '@/lib/portalService';
import type { PortalCampaign, PortalDecision, PortalPiece } from '@/lib/portalTypes';
import { campaignViewState, groupPieces, progressSummary } from '@/lib/portalView';
import { CampaignHero } from '@/components/portal/CampaignHero';
import { PieceRail } from '@/components/portal/PieceRail';
import { PieceCard } from '@/components/portal/PieceCard';
import { PiecePlayer } from '@/components/portal/PiecePlayer';
import { AgencyFootCredit } from '@/components/portal/AgencyBadge';
import PortalLoader from '@/components/portal/PortalLoader';
import '@/components/portal/portal.css';

const PortalView: React.FC = () => {
  const [campaign, setCampaign] = useState<PortalCampaign | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<{ id: string; changes: boolean } | null>(null);
  // Mínimo de loader diseñado (~2s): la carga se siente intencional, no un flash.
  const [minShown, setMinShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinShown(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let alive = true;
    getMyCampaign()
      .then((c) => alive && setCampaign(c))
      .catch(() => { if (alive) { setLoadError(true); setCampaign(null); } });
    return () => { alive = false; };
  }, []);

  const decide = useCallback(async (id: string, decision: PortalDecision, comment?: string): Promise<boolean> => {
    setBusyIds((s) => new Set(s).add(id));
    setErrors((e) => ({ ...e, [id]: '' }));
    try {
      await submitDecision(id, decision, comment);
      setCampaign((c) => c && { ...c, pieces: c.pieces.map((p) => (p.id === id ? { ...p, status: decision } : p)) });
      return true;
    } catch {
      setErrors((e) => ({ ...e, [id]: 'No pudimos enviar tu respuesta. Probá de nuevo en un momento.' }));
      return false;
    } finally {
      setBusyIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }, []);

  const state = campaignViewState(campaign);
  const pieces = campaign?.pieces ?? [];
  const groups = useMemo(() => groupPieces(pieces), [pieces]);
  const prog = progressSummary(pieces);
  const openPiece: PortalPiece | undefined = open ? pieces.find((p) => p.id === open.id) : undefined;

  if (state === 'loading' || !minShown) {
    return <PortalLoader />;
  }
  if (state === 'empty' || !campaign) {
    return (
      <div className="portal">
        <div className="empty">
          <div>
            <div className="eyebrow">Tu agencia te presenta</div>
            <h1>Tu campaña se está preparando</h1>
            <p>{loadError ? 'Estamos terminando los últimos detalles. Volvé a pasar en un rato.' : 'Apenas tengamos las primeras piezas listas, las vas a ver acá para que las mires y aprobes.'}</p>
            <AgencyFootCredit />
          </div>
        </div>
      </div>
    );
  }

  const approvePending = async () => { for (const id of prog.pendingIds) await decide(id, 'approved'); };

  return (
    <div className="portal">
      <div className="wrap">
        <CampaignHero campaign={campaign} />
        {groups.map((g) => (
          <PieceRail key={g.type} type={g.type} count={g.pieces.length}>
            {g.pieces.map((p, i) => (
              <PieceCard
                key={p.id}
                piece={p}
                index={i}
                busy={busyIds.has(p.id)}
                error={errors[p.id]}
                onOpen={() => setOpen({ id: p.id, changes: false })}
                onApprove={() => decide(p.id, 'approved')}
                onRequestChanges={() => setOpen({ id: p.id, changes: true })}
              />
            ))}
          </PieceRail>
        ))}
        <AgencyFootCredit />
      </div>

      <div className="footer">
        <div className="in">
          <span><b>{prog.approved} de {prog.total}</b> aprobadas · {prog.pending > 0 && `${prog.pending} ${prog.pending === 1 ? 'espera' : 'esperan'} tu mirada`}{prog.pending > 0 && prog.changes > 0 && ' · '}{prog.changes > 0 && `${prog.changes} con cambios pedidos`}{prog.pending === 0 && prog.changes === 0 && 'todo listo'}</span>
          {prog.pending > 0 && (
            <div className="cta">
              <button type="button" className="btn approve approve-all" disabled={busyIds.size > 0} onClick={approvePending}>Aprobar pendientes</button>
            </div>
          )}
        </div>
      </div>

      {openPiece && (
        <PiecePlayer
          key={openPiece.id}
          piece={openPiece}
          startWithChanges={open?.changes}
          busy={busyIds.has(openPiece.id)}
          error={errors[openPiece.id]}
          onClose={() => setOpen(null)}
          onApprove={async () => { if (await decide(openPiece.id, 'approved')) setOpen(null); }}
          onSendChanges={async (c) => { if (await decide(openPiece.id, 'changes_requested', c)) setOpen(null); }}
        />
      )}
    </div>
  );
};

export default PortalView;
