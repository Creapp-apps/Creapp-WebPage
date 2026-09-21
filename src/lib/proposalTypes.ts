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
  proposal_type?: 'project' | 'service';
}

export interface ServiceDetails {
  plan_name?: string;
  billing_frequency?: 'monthly' | 'quarterly' | 'annual';
  setup_fee?: string;
  recurring_fee?: string;
  sla_uptime?: string;
  support_channels?: string;
  response_time_critical?: string;
  response_time_normal?: string;
  min_term_months?: string;
  auto_renew?: boolean;
  limits?: {
    users?: string;
    branches?: string;
    storage?: string;
    custom_notes?: string;
  };
}

export interface MethodologyPillar {
  id?: string;
  title: string;
  description: string;
  color?: string;
}

export function getPillars(meth: any, defaultPrimary = '#ff007f', defaultSecondary = '#9d00ff'): MethodologyPillar[] {
  if (meth?.pillars && Array.isArray(meth.pillars) && meth.pillars.length > 0) {
    return meth.pillars;
  }
  const p1Title = meth?.incremental_title || "CO-CREACIÓN GERENCIAL Y OPERATIVA";
  const p1Desc = meth?.incremental_text || "Trabajo intensivo en oficinas con la dirección para definir controles gerenciales y mesas de trabajo con DJs/técnicos líderes para optimizar la usabilidad nocturna en salón.";
  const p2Title = meth?.planning_title || "Feedback Operativo & Salones Piloto";
  const p2Desc = meth?.planning_text || "Para garantizar que el sistema responda a la dinámica nocturna real, {client_name} validará las funciones en salones seleccionados antes del despliegue masivo.";

  return [
    { title: p1Title, description: p1Desc, color: defaultPrimary || '#a855f7' },
    { title: p2Title, description: p2Desc, color: defaultSecondary || '#ec4899' }
  ];
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
