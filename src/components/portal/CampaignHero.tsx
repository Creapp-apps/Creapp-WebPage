import React from 'react';
import type { PortalCampaign } from '@/lib/portalTypes';
import { pickBrandMark, paletteSwatches, styleTags, progressSummary } from '@/lib/portalView';
import { AgencyBadge } from './AgencyBadge';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function mesLabel(c: PortalCampaign): string {
  const m = /^(\d{4})-(\d{2})/.exec(c.month ?? '');
  return m ? MESES[Number(m[2]) - 1] ?? '' : '';
}

export const BrandMarkView: React.FC<{ client: PortalCampaign['client'] }> = ({ client }) => {
  const mark = pickBrandMark(client);
  return mark.kind === 'logo'
    ? <img className="brandlogo" src={mark.url} alt={mark.name} />
    : <span className="brandname">{mark.name}</span>;
};

export const CampaignHero: React.FC<{ campaign: PortalCampaign }> = ({ campaign }) => {
  const mes = mesLabel(campaign);
  const prog = progressSummary(campaign.pieces);
  const tags = styleTags(campaign.aesthetic);
  const n = prog.total;
  return (
    <>
      <div className="topbar">
        <div className="mono">
          <div>
            <small>Portal de campaña · <span className="creapp">CreAPP</span></small>
            <BrandMarkView client={campaign.client} />
          </div>
        </div>
        <div className="right"><AgencyBadge /></div>
      </div>

      <div className="hero">
        <div className="eyebrow">Tu agencia te presenta</div>
        <h1>{campaign.title ? campaign.title : <>Campaña de <span className="mes serif">{mes}</span></>}</h1>
        <p className="lead">
          {n === 1 ? 'Una pieza pensada' : `${n} piezas pensadas`} para tu marca{mes ? ' este mes' : ''}. Mirá cada una, dejanos tu mirada y aprobá lo que te enamore.
        </p>

        {campaign.concept && (
          <div className="concept">
            <div className="k">Concepto del mes</div>
            <div className="d" style={{ color: 'var(--ink)', fontSize: 16 }}>{campaign.concept}</div>
          </div>
        )}

        <div className="identity">
          <div className="palette">
            {paletteSwatches(campaign.client.brandColors).map((c, i) => <div key={c + i} className="sw" style={{ background: c }} />)}
          </div>
          {tags.length > 0 && <div className="tags">{tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>}
        </div>

        <div className="progress">
          <div className="lab"><b>{prog.approved}</b> de {n} aprobadas</div>
          <div className="bar"><i style={{ width: `${prog.pct}%` }} /></div>
          <div className="lab">{prog.pending === 0 ? 'Todo aprobado' : `${prog.pending} ${prog.pending === 1 ? 'espera' : 'esperan'} tu mirada`}</div>
        </div>
      </div>
    </>
  );
};
