import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCampaignPreview, type CampaignPreview } from '@/lib/portalPreviewService';
import { groupPieces } from '@/lib/portalView';
import { CampaignHero } from '@/components/portal/CampaignHero';
import { PieceRail } from '@/components/portal/PieceRail';
import { PieceCard } from '@/components/portal/PieceCard';
import { PiecePlayer } from '@/components/portal/PiecePlayer';
import PortalLoader from '@/components/portal/PortalLoader';
import '@/components/portal/portal.css';

const noop = () => {};

const PortalPreview: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<CampaignPreview | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setPreview(undefined);
    setLoadError(false);
    if (!clientId) { setPreview(null); return; }
    getCampaignPreview(clientId)
      .then((p) => alive && setPreview(p))
      .catch(() => { if (alive) { setLoadError(true); setPreview(null); } });
    return () => { alive = false; };
  }, [clientId]);

  const groups = useMemo(() => groupPieces(preview?.campaign.pieces ?? []), [preview]);

  const banner = (
    <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#7c3aed', color: '#fff', padding: '10px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13, fontWeight: 600 }}>
      <span>Vista previa del equipo — así lo ve el cliente</span>
      <button type="button" onClick={() => navigate('/admin?tab=content_campaigns')} style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        Volver al admin
      </button>
    </div>
  );

  if (preview === undefined) return <PortalLoader />;

  if (!preview) {
    return (
      <div className="portal">
        {banner}
        <div className="empty">
          <div>
            <h1>Sin campaña para previsualizar</h1>
            <p>{loadError ? 'No pudimos cargar la vista previa. Probá de nuevo en un momento.' : 'Este cliente todavía no tiene una campaña para previsualizar.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const { campaign, draftJobIds } = preview;
  const openPiece = openId ? campaign.pieces.find((p) => p.id === openId) : undefined;
  return (
    <div className="portal">
      {banner}
      <div className="wrap">
        <CampaignHero campaign={campaign} />
        {groups.map((g) => (
          <PieceRail key={g.type} type={g.type} count={g.pieces.length}>
            {g.pieces.map((p, i) => (
              <PieceCard
                key={p.id}
                piece={p}
                index={i}
                busy={false}
                error={undefined}
                readOnly
                draft={draftJobIds.includes(p.id)}
                onOpen={() => setOpenId(p.id)}
                onApprove={noop}
                onRequestChanges={noop}
              />
            ))}
          </PieceRail>
        ))}
      </div>

      {openPiece && (
        <PiecePlayer
          key={openPiece.id}
          piece={openPiece}
          busy={false}
          readOnly
          onClose={() => setOpenId(null)}
          onApprove={noop}
          onSendChanges={noop}
        />
      )}
    </div>
  );
};

export default PortalPreview;
