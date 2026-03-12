import { supabase } from './supabaseClient';
import type {
  Proposal,
  ProposalInclusion,
  ProposalExclusion,
  ProposalMilestone,
  ProposalPayment,
  ProposalProjectOption,
  FullProposal,
} from './proposalTypes';

// =========================================================
// Public — Read by slug (for client-facing view)
// =========================================================

export async function getProposalBySlug(slug: string): Promise<FullProposal | null> {
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !proposal) return null;

  const [inclusions, exclusions, milestones, payments, projectOptions] = await Promise.all([
    supabase.from('proposal_inclusions').select('*').eq('proposal_id', proposal.id).order('sort_order'),
    supabase.from('proposal_exclusions').select('*').eq('proposal_id', proposal.id).order('sort_order'),
    supabase.from('proposal_milestones').select('*').eq('proposal_id', proposal.id).order('sort_order'),
    supabase.from('proposal_payments').select('*').eq('proposal_id', proposal.id).order('sort_order'),
    supabase.from('proposal_project_options').select('*').eq('proposal_id', proposal.id).order('sort_order'),
  ]);

  return {
    ...proposal,
    inclusions: (inclusions.data || []) as ProposalInclusion[],
    exclusions: (exclusions.data || []) as ProposalExclusion[],
    milestones: (milestones.data || []) as ProposalMilestone[],
    payments: (payments.data || []) as ProposalPayment[],
    project_options: (projectOptions.data || []) as ProposalProjectOption[],
  } as FullProposal;
}

// =========================================================
// Admin — CRUD Operations
// =========================================================

export async function getAllProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Proposal[];
}

export async function createProposal(proposal: Omit<Proposal, 'id' | 'created_at' | 'updated_at'>): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .insert(proposal)
    .select()
    .single();

  if (error) throw error;
  return data as Proposal;
}

export async function updateProposal(id: string, updates: Partial<Proposal>): Promise<Proposal> {
  const { data, error } = await supabase
    .from('proposals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Proposal;
}

export async function deleteProposal(id: string): Promise<void> {
  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =========================================================
// Admin — Child table CRUD (generic pattern)
// =========================================================

type ChildTable = 'proposal_inclusions' | 'proposal_exclusions' | 'proposal_milestones' | 'proposal_payments' | 'proposal_project_options';

export async function upsertChildItems<T extends Record<string, unknown>>(
  table: ChildTable,
  proposalId: string,
  items: T[]
): Promise<void> {
  // Delete existing items for this proposal
  await supabase.from(table).delete().eq('proposal_id', proposalId);

  // Insert new items
  if (items.length > 0) {
    const itemsWithProposalId = items.map((item, index) => {
      // Destructure to remove `id` entirely — setting it to undefined
      // would still send null to PostgREST, violating NOT NULL constraint
      const { id: _removed, ...rest } = item as Record<string, unknown>;
      return {
        ...rest,
        proposal_id: proposalId,
        sort_order: index,
      };
    });

    const { error } = await supabase.from(table).insert(itemsWithProposalId);
    if (error) throw error;
  }
}

// =========================================================
// Admin — Seed data for Astilleros Vision (initial import)
// =========================================================

export async function seedAstillerosVision(): Promise<string> {
  // Create the main proposal
  const proposal = await createProposal({
    slug: 'astilleros-vision',
    client_name: 'Astillero Vision',
    date: 'Marzo 2026',
    location: 'Olivos, BSAS',
    description: 'Nos especializamos en diseñar aplicaciones y softwares totalmente a medida, según el requisito operativo del cliente.',
    total_value: 'USD 1.750',
    brand_color_primary: '#ff007f',
    brand_color_secondary: '#9d00ff',
    client_logo_url: null,
    developer_signature_url: null,
    status: 'published',
    contract_text: null,
  });

  // Seed inclusions
  await upsertChildItems('proposal_inclusions', proposal.id, [
    { title: 'Frontend Web', description: 'Institucional autogestionable con catálogo.', tooltip: 'Desarrollo de interfaz de alta fidelidad optimizada para conversión y SEO, con panel de administración.', icon_name: 'LayoutDashboard' },
    { title: 'Configurador 3D', description: 'Personalización en tiempo real de embarcaciones.', tooltip: 'Integración de motor 3D interactivo (WebGL) para visualización 360 y cambios de material dinámicos.', icon_name: 'Box' },
    { title: 'Asistente IA (RAG)', description: 'Ventas y soporte 24/7 con IA entrenada.', tooltip: 'Sistema inteligente alimentado por la documentación interna del astillero para responder consultas técnicas al instante.', icon_name: 'MessageSquare' },
    { title: 'CRM a Medida', description: 'Gestión de catálogo, stock y clientes.', tooltip: 'Panel reservado para la gestión integral de prospectos comerciales, inventario y seguimiento posventa.', icon_name: 'Database' },
    { title: 'n8n Automation', description: 'Flujos lógicos y envío automático.', tooltip: 'Automatización de procesos repetitivos: desde la captura del lead hasta el envío automático del PDF de propuesta al cliente.', icon_name: 'Cpu' },
    { title: 'E-commerce', description: 'Tienda de repuestos con MercadoPago/Stripe.', tooltip: 'Módulo de comercio electrónico seguro y escalable para la comercialización directa de accesorios y repuestos.', icon_name: 'CheckCircle2' },
  ]);

  // Seed exclusions
  await upsertChildItems('proposal_exclusions', proposal.id, [
    { title: 'Modelado y optimización 3D', tooltip: 'Los archivos de modelos 3D en formato .glb o .gltf deben ser provistos por el cliente. No se incluye creación desde cero.' },
    { title: 'Creación de contenido', tooltip: 'Las fotografías, videos corporativos y la redacción de los textos comerciales (copywriting) deben ser facilitados por el cliente.' },
    { title: 'Costos de infraestructura', tooltip: 'El abono de plataformas de hosting, dominios y consumos de APIs de terceros (como OpenAI o n8n Cloud) corren por cuenta de Astillero Vision.' },
    { title: 'Textos legales y condiciones', tooltip: 'La redacción de textos con validez legal, políticas de privacidad y términos y condiciones del sistema no están contemplados en el desarrollo.' },
  ]);

  // Seed milestones
  await upsertChildItems('proposal_milestones', proposal.id, [
    { week_range: '1-2', title: 'Discovery & Setup', icon_name: 'LayoutDashboard' },
    { week_range: '3-4', title: 'Frontend & E-commerce', icon_name: 'LayoutDashboard' },
    { week_range: '5-6', title: 'Configurador 3D', icon_name: 'Box' },
    { week_range: '7-8', title: 'IA & n8n', icon_name: 'Cpu' },
    { week_range: '9-10', title: 'CRM Admin', icon_name: 'Database' },
    { week_range: '11-12', title: 'QA & Deploy', icon_name: 'Rocket' },
  ]);

  // Seed payments
  await upsertChildItems('proposal_payments', proposal.id, [
    { percentage: '20%', label: 'Prototipo Inicial', description: 'Estética y arquitectura', tooltip: 'Setup inicial, investigación integral de UX/UI, configuración del servidor y primera estructura visual del proyecto.' },
    { percentage: '25%', label: 'Prototipo Visual', description: 'UI/UX aprobado', tooltip: 'Aprobación del diseño completo en alta fidelidad (Figma/Código), con estilos, animaciones y flujos de usuario cerrados.' },
    { percentage: '25%', label: 'Funcional', description: 'Acceso a pruebas', tooltip: 'Despliegue de los módulos operativos en el servidor de pruebas (Staging) para QA y verificación del cliente.' },
    { percentage: '30%', label: 'Entrega Final', description: 'Sistema en producción', tooltip: 'Migración final a servidores de producción, vinculación de dominio, auditoría de seguridad y entrega de credenciales.' },
  ]);

  // Seed project options
  await upsertChildItems('proposal_project_options', proposal.id, [
    {
      title: 'Experiencia Premium 3D',
      tagline: 'Recomendado',
      description: 'Versión completa con motor de visualización interactivo (WebGL). Permite a los usuarios personalizar materiales, colores y accesorios visualizando la embarcación en 360° y en tiempo real.',
      demo_url: 'https://astilleros-vision.vercel.app',
      github_url: 'https://github.com/MazaSebastian/AstillerosVision/tree/main',
      features: JSON.stringify(['Configurador 3D Interactivo', 'Catálogo Dinámico', 'Cotización en Tiempo Real', 'Asistente de IA (RAG)']),
      style_variant: 'premium',
    },
    {
      title: 'E-Commerce Standard',
      tagline: 'Low Cost',
      description: 'Alternativa orientada a la compra rápida y estructurada mediante un catálogo fotográfico clásico. Prescinde del módulo 3D para optimizar costos de infraestructura técnica e inversión inicial.',
      demo_url: null,
      github_url: 'https://github.com/MazaSebastian/AstillerosVision/tree/LowCost',
      features: JSON.stringify(['Catálogo Fotográfico Integrado', 'Proceso de compra ágil', 'Cotización Tradicional', 'Asistente de IA (RAG)']),
      style_variant: 'standard',
    },
  ]);

  return proposal.id;
}
