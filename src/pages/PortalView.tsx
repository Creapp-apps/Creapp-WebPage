import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getMyCampaigns, submitDecision } from '@/lib/portalService';
import type { PortalCampaign, PortalDecision } from '@/lib/portalTypes';
import { campaignViewState, pickCampaign } from '@/lib/portalView';
import { orderReview, firstPendingIndex, nextPendingIndex } from '@/lib/reviewQueue';
import { PieceReview } from '@/components/portal/PieceReview';
import { AgencyFootCredit } from '@/components/portal/AgencyBadge';
import PortalLoader from '@/components/portal/PortalLoader';
import { PortalSplash } from '@/components/portal/PortalSplash';
import { usePortalTheme } from '@/components/portal/usePortalTheme';
import { themeFor } from '@/lib/portalThemes';
import { hasSeenSplash, markSplashSeen } from '@/lib/splashSession';
import '@/components/portal/portal.css';

const PortalView: React.FC = () => {
  const { signOut } = useAuth();
  const [campaigns, setCampaigns] = useState<PortalCampaign[] | undefined>(undefined);
  const [params, setParams] = useSearchParams();
  const [loadError, setLoadError] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [splashDone, setSplashDone] = useState(false);
  // La splash completa (cohete + despegue) corre una vez por sesión del navegador.
  const shouldSplash = useMemo(() => !hasSeenSplash(), []);
  // Mínimo de loader diseñado (~2s): la carga se siente intencional, no un flash.
  const [minShown, setMinShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinShown(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let alive = true;
    getMyCampaigns()
      .then((c) => alive && setCampaigns(c))
      .catch(() => { if (alive) { setLoadError(true); setCampaigns([]); } });
    return () => { alive = false; };
  }, []);

  const decide = useCallback(async (id: string, decision: PortalDecision, comment?: string): Promise<boolean> => {
    setBusyIds((s) => new Set(s).add(id));
    setErrors((e) => ({ ...e, [id]: '' }));
    try {
      await submitDecision(id, decision, comment);
      setCampaigns((cs) => cs && cs.map((c) => ({ ...c, pieces: c.pieces.map((p) => (p.id === id ? { ...p, status: decision } : p)) })));
      return true;
    } catch {
      setErrors((e) => ({ ...e, [id]: 'No pudimos enviar tu respuesta. Probá de nuevo en un momento.' }));
      return false;
    } finally {
      setBusyIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }, []);

  const campaign: PortalCampaign | null | undefined = campaigns === undefined ? undefined : pickCampaign(campaigns, params.get('campaign'));
  const state = campaignViewState(campaign);
  const pieces = useMemo(() => orderReview(campaign?.pieces ?? []), [campaign]);
  const { style: themeStyle, dataTheme } = usePortalTheme(campaign);
  const accent = useMemo(() => {
    if (!campaign) return null;
    const t = themeFor(campaign.aesthetic, campaign.client.brandColors?.primary ?? null);
    return { color: t.accent, deep: t.accentDeep, bg: t.bg };
  }, [campaign]);

  // Al cambiar de campaña, arranca en la primera pendiente.
  useEffect(() => { setIdx(firstPendingIndex(pieces)); }, [campaign?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    const nxt = nextPendingIndex(pieces, idx);
    if (nxt !== null) setIdx(nxt);
  }, [pieces, idx]);

  // Splash de arranque (una vez por sesión): cubre la carga y despega cuando los
  // datos están listos; al terminar revela el contenido.
  if (shouldSplash && !splashDone) {
    return (
      <PortalSplash
        ready={campaigns !== undefined}
        accent={accent}
        onDone={() => { markSplashSeen(); setSplashDone(true); }}
      />
    );
  }

  if (state === 'loading' || !minShown) {
    return <PortalLoader />;
  }
  if (state === 'empty' || !campaign) {
    return (
      <div className="portal" data-theme={dataTheme} style={themeStyle}>
        <div className="wrap">
          <div className="topbar">
            <span />
            <button type="button" className="signout" onClick={() => signOut()}>
              <LogOut size={14} aria-hidden /> Cerrar sesión
            </button>
          </div>
        </div>
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

  const current = pieces[idx];
  const approveCurrent = async () => { if (current && await decide(current.id, 'approved')) advance(); };
  const sendChangesCurrent = async (c: string) => { if (current && await decide(current.id, 'changes_requested', c)) advance(); };
  const approveRemaining = async () => { for (const p of pieces) if (p.status === 'sent') await decide(p.id, 'approved'); };

  return (
    <div className="portal" data-theme={dataTheme} style={themeStyle}>
      <div className="wrap sp-reveal">
        <div className="topbar">
          <div className="left">
            {campaigns && campaigns.length >= 2 ? (
              <div className="campaign-switch">
                <span className="cs-lab">Campaña</span>
                <div className="cs-field">
                  <select
                    value={campaign.id}
                    onChange={(e) => setParams({ campaign: e.target.value }, { replace: true })}
                  >
                    {campaigns.map((c, i) => (
                      <option key={c.id} value={c.id}>{[c.month, c.title].filter(Boolean).join(' · ') || `Campaña ${i + 1}`}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="cs-chev" aria-hidden />
                </div>
              </div>
            ) : <span />}
          </div>
          <button type="button" className="signout" onClick={() => signOut()}>
            <LogOut size={14} aria-hidden /> Cerrar sesión
          </button>
        </div>

        <PieceReview
          pieces={pieces}
          index={idx}
          onIndex={setIdx}
          busy={!!current && busyIds.has(current.id)}
          error={current ? errors[current.id] : null}
          onApprove={approveCurrent}
          onSendChanges={sendChangesCurrent}
          onApproveRemaining={approveRemaining}
        />

        <AgencyFootCredit />
      </div>
    </div>
  );
};

export default PortalView;
