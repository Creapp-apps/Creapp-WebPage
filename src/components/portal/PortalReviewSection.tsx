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
 * Extraído de PortalView para montarse como una sección del shell. Spec §5.5. */
export const PortalReviewSection: React.FC<Props> = (props) => (
  <PieceReview {...props} />
);
