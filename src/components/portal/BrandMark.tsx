import React, { useState } from 'react';
import type { PortalCampaign } from '@/lib/portalTypes';
import { pickBrandMark } from '@/lib/portalView';

/** Marca del cliente: logo si existe (con fallback a texto si falla la imagen),
 * si no el nombre. Usado por el header del home y el mark del sidebar. */
export const BrandMarkView: React.FC<{ client: PortalCampaign['client'] }> = ({ client }) => {
  const mark = pickBrandMark(client);
  const [broken, setBroken] = useState(false);
  return mark.kind === 'logo' && !broken
    ? <img className="brandlogo" src={mark.url} alt="" aria-label={mark.name} onError={() => setBroken(true)} />
    : <span className="brandname">{mark.name}</span>;
};
