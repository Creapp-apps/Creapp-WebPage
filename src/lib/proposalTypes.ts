// =========================================================
// Proposal Generator Types
// =========================================================

export interface Proposal {
  id: string;
  slug: string;
  client_name: string;
  date: string;
  location: string;
  description: string;
  total_value: string;
  brand_color_primary: string;
  brand_color_secondary: string;
  client_logo_url: string | null;
  hero_badge: string | null;
  hero_title: string | null;
  developer_signature_url: string | null;
  status: 'draft' | 'published' | 'signed';
  contract_text: string | null;
  contract_description?: string | null;
  created_at: string;
  updated_at: string;
  signed_contract_url?: string;
  signed_at?: string;
  weekly_breakdown?: any;
  methodology?: any;
}

export interface ProposalInclusion {
  id: string;
  proposal_id: string;
  title: string;
  description: string;
  tooltip: string;
  icon_name: string;
  sort_order: number;
}

export interface ProposalExclusion {
  id: string;
  proposal_id: string;
  title: string;
  tooltip: string;
  sort_order: number;
}

export interface ProposalMilestone {
  id: string;
  proposal_id: string;
  week_range: string;
  title: string;
  icon_name: string;
  sort_order: number;
  description?: string;
  control_milestone?: string;
  price?: string;
}

export interface ProposalPayment {
  id: string;
  proposal_id: string;
  percentage: string;
  label: string;
  description: string;
  tooltip: string;
  sort_order: number;
}

export interface ProposalProjectOption {
  id: string;
  proposal_id: string;
  title: string;
  tagline: string;
  description: string;
  demo_url: string | null;
  github_url: string | null;
  features: string[];
  style_variant: 'premium' | 'standard';
  sort_order: number;
}

export interface ProposalInfrastructureCost {
  id: string;
  proposal_id: string;
  title: string;
  provider: string;
  monthly_cost: string;
  description: string;
  is_optional: boolean;
  sort_order: number;
}

export interface FullProposal extends Proposal {
  inclusions: ProposalInclusion[];
  exclusions: ProposalExclusion[];
  milestones: ProposalMilestone[];
  payments: ProposalPayment[];
  project_options: ProposalProjectOption[];
  infrastructure_costs: ProposalInfrastructureCost[];
}
