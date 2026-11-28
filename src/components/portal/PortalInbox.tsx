import React from 'react';
import { InboxThread } from '@/components/inbox/InboxThread';

/**
 * Bandeja de entrada del cliente a nivel campaña: mensajes y sugerencias de
 * piezas con el equipo. El equipo responde desde la suite.
 */
export const PortalInbox: React.FC<{ campaignId: string; onRead?: () => void }> = ({ campaignId, onRead }) => (
  <div className="pinbox">
    <div className="pinbox-head">
      <span className="eyebrow">Bandeja de entrada</span>
      <h2 className="pinbox-title">Hablá con tu equipo</h2>
      <p className="pinbox-sub">
        Dejá tus sugerencias de piezas o cualquier novedad. Te respondemos desde acá.
      </p>
    </div>
    <div className="pinbox-body">
      <InboxThread campaignId={campaignId} role="client" variant="portal" onRead={onRead} />
    </div>
  </div>
);
