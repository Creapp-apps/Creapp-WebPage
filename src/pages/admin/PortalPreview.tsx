import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCampaignPreview, type CampaignPreview } from '@/lib/portalPreviewService';
import { orderReview, firstPendingIndex } from '@/lib/reviewQueue';
import { PieceReview } from '@/components/portal/PieceReview';
import PortalLoader from '@/components/portal/PortalLoader';
import { usePortalTheme } from '@/components/portal/usePortalTheme';
import '@/components/portal/portal.css';

const noop = () => {};

const PortalPreview: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<CampaignPreview | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [idx, setIdx] = useState(0);

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

  const pieces = useMemo(() => orderReview(preview?.campaign.pieces ?? []), [preview]);
  const { style: themeStyle, dataTheme } = usePortalTheme(preview ? preview.campaign : null);

  useEffect(() => { setIdx(firstPendingIndex(pieces)); }, [preview?.campaign.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="portal" data-theme={dataTheme} style={themeStyle}>
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

  return (
    <div className="portal" data-theme={dataTheme} style={themeStyle}>
      {banner}
      <div className="wrap">
        <PieceReview
          pieces={pieces}
          index={idx}
          onIndex={setIdx}
          busy={false}
          readOnly
          onApprove={noop}
          onSendChanges={noop}
          onApproveRemaining={noop}
        />
      </div>
    </div>
  );
};

export default PortalPreview;
