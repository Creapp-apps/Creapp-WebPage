export type PortalDecision = 'approved' | 'changes_requested';

export type PortalPiece = {
  id: string;
  type: 'reel' | 'carousel' | 'story';
  title: string;
  caption: string;
  coverUrl: string | null;
  mediaUrl: string | null;
  slides: string[];
  status: 'sent' | 'approved' | 'changes_requested';
};

export type PortalCampaign = {
  id: string;
  title: string | null;
  month: string | null;
  concept: string | null;
  aesthetic: string | null;
  client: { name: string; logoUrl: string | null; brandColors: Record<string, string> | null };
  pieces: PortalPiece[];
};
