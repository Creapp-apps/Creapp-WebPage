import React from 'react';
import type { PortalPiece } from '@/lib/portalTypes';
import { PieceReview } from '@/components/portal/PieceReview';

interface Props {
  pieces: PortalPiece[];
  index: number;
  onIndex: (i: number) => void;
  busy: boolean;
  error: string | null;
  onApprove: () => void;
  onSendChanges: (comment: string) => void;
  onApproveRemaining: () => void;
}

/** Sección Revisión del portal: el flujo de aprobar piezas, sin cambios de lógica.
 * Extraído de PortalView para montarse como una sección del shell. Spec §5.5.
 * Sin piezas (campaña en vivo ya publicada) → nota honesta, no PieceReview vacío. */
export const PortalReviewSection: React.FC<Props> = (props) => {
  if (props.pieces.length === 0) {
    return (
      <div className="cal-state cal-empty">
        <h3>Nada para revisar por acá</h3>
        <p>Tu campaña ya está publicada. Mirá cómo viene en Calendario e Insights.</p>
      </div>
    );
  }
  return <PieceReview {...props} />;
};
