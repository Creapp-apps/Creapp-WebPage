import { supabase } from './supabaseClient';
import type {
  Proposal,
  ProposalInclusion,
  ProposalExclusion,
  ProposalMilestone,
  ProposalPayment,
  ProposalProjectOption,
  ProposalInfrastructureCost,
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

  const [inclusions, exclusions, milestones, payments, projectOptions, infrastructureCosts] = await Promise.all([
    supabase.from('proposal_inclusions').select('*').eq('proposal_id', proposal.id).order('sort_order'),
    supabase.from('proposal_exclusions').select('*').eq('proposal_id', proposal.id).order('sort_order'),
    supabase.from('proposal_milestones').select('*').eq('proposal_id', proposal.id).order('sort_order'),
    supabase.from('proposal_payments').select('*').eq('proposal_id', proposal.id).order('sort_order'),
    supabase.from('proposal_project_options').select('*').eq('proposal_id', proposal.id).order('sort_order'),
    supabase.from('proposal_infrastructure_costs').select('*').eq('proposal_id', proposal.id).order('sort_order'),
  ]);

  return {
    ...proposal,
    inclusions: (inclusions.data || []) as ProposalInclusion[],
    exclusions: (exclusions.data || []) as ProposalExclusion[],
    milestones: (milestones.data || []) as ProposalMilestone[],
    payments: (payments.data || []) as ProposalPayment[],
    project_options: (projectOptions.data || []) as ProposalProjectOption[],
    infrastructure_costs: (infrastructureCosts.data || []) as ProposalInfrastructureCost[],
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

  if (error) {
    // PostgREST error 42703 means column does not exist. We retry without newer columns
    if (error.code === '42703') {
      console.warn('Some columns do not exist. Retrying update without new fields.');
      const { weekly_breakdown, methodology, ...retryUpdates } = updates;
      const { data: retryData, error: retryError } = await supabase
        .from('proposals')
        .update(retryUpdates)
        .eq('id', id)
        .select()
        .single();
      if (retryError) throw retryError;
      return retryData as Proposal;
    }
    throw error;
  }
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

type ChildTable = 'proposal_inclusions' | 'proposal_exclusions' | 'proposal_milestones' | 'proposal_payments' | 'proposal_project_options' | 'proposal_infrastructure_costs';

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
    hero_badge: '⚙️ TECNOLOGÍA PARA ASTILLEROS',
    hero_title: 'La plataforma que tu operación necesita para escalar con confianza.',
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
    { week_range: '1-2', title: 'Discovery & Setup', icon_name: 'LayoutDashboard', description: 'Setup inicial del proyecto, definición de arquitectura y variables.', control_milestone: 'SETUP INICIAL', price: '400' },
    { week_range: '3-4', title: 'Frontend & E-commerce', icon_name: 'LayoutDashboard', description: 'Desarrollo de vistas y componentes interactivos aprobados.', control_milestone: 'FRONTEND COMPLETO', price: '400' },
    { week_range: '5-6', title: 'Configurador 3D', icon_name: 'Box', description: 'Integración del modelo 3D dinámico y control orbital.', control_milestone: '3D EXPERIMENTADO', price: '400' },
    { week_range: '7-8', title: 'IA & n8n', icon_name: 'Cpu', description: 'Integración del asistente de inteligencia artificial y flujos automatizados.', control_milestone: 'IA INTEGRADA', price: '400' },
    { week_range: '9-10', title: 'CRM Admin', icon_name: 'Database', description: 'Panel de administración y control de datos multi-inquilino.', control_milestone: 'ADMIN COMPLETO', price: '400' },
    { week_range: '11-12', title: 'QA & Deploy', icon_name: 'Rocket', description: 'Control de calidad final, testing E2E y despliegue a producción.', control_milestone: 'DEPLOY COMPLETO', price: '400' },
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

export async function seedCbkrApp(): Promise<string> {
  // Create the main proposal
  const proposal = await createProposal({
    slug: 'cbkr-app-v2',
    client_name: 'Cannabunker',
    date: 'Junio 2026',
    location: 'Buenos Aires, Argentina',
    description: 'Desarrollo e integración de cbkr App v2: una solución móvil premium e intuitiva orientada al cultivador, con arquitectura modular encastrable, control de curado interactivo y soporte impulsado por IA.',
    total_value: 'USD 2.200',
    brand_color_primary: '#A855F7',
    brand_color_secondary: '#EC4899',
    client_logo_url: null,
    developer_signature_url: null,
    status: 'published',
    hero_badge: 'SOFTWARE DE CULTIVO DE ALTA GAMA',
    hero_title: 'cbkr App v2',
    contract_text: `CONTRATO DE SERVICIOS TECNOLÓGICOS Y DESARROLLO DE SOFTWARE

Entre CreAPP Software Lab y Cannabunker, representado en este acto por [input:Representante Legal], con DNI [input:DNI] en su carácter de [input:Cargo del Firmante], se acuerda el desarrollo integral del software de cultivo "cbkr App v2" conforme a los términos y alcances técnicos especificados en la presente propuesta comercial por un valor total de {total_value}.

Ambas partes expresan su conformidad y aceptación de las fases del cronograma estratégico y el esquema de pagos detallados en esta propuesta, firmando digitalmente este documento el día [input:Fecha de Firma].`,
  });

  // Seed inclusions
  await upsertChildItems('proposal_inclusions', proposal.id, [
    { title: 'Frontend Mobile-First', description: 'Interfaz fluida y optimizada.', tooltip: 'Desarrollo mobile-first con Next.js y Tailwind CSS v4 para garantizar la mejor experiencia al cultivador.', icon_name: 'LayoutDashboard' },
    { title: 'Arquitectura Encastrable', description: 'Estructura modular para expansión.', tooltip: 'Código modular y desacoplado preparado para encastrar futuras expansiones de IoT, e-commerce o cursos sin afectar el núcleo.', icon_name: 'Box' },
    { title: 'Dashboard de Cultivo', description: 'Fotoperíodo dinámico e interactivo.', tooltip: 'Hero inmersivo con fotoperíodo automático basado en la hora del sistema, chips de estado y barra interactiva de curado "Cocinando".', icon_name: 'Clock' },
    { title: 'Mapeo de Suelos Vivos', description: 'Tarjetas detalladas y bitácoras.', tooltip: 'Pestaña con tarjetas completas de suelos activos, plantas (genéticas) y registro dinámico de fases del ciclo biológico.', icon_name: 'Database' },
    { title: 'Acciones Rápidas (+)', description: 'Módulo flotante de riego y dosis.', tooltip: 'Menú central para registro rápido de Riego (💧), Té de Compost (🫖) y Enmiendas (🍄) con lógica de advertencias por historial.', icon_name: 'Cpu' },
    { title: 'SueloIA & Asistencia', description: 'Simulador de chat y FAQ dinámica.', tooltip: 'Acordeón de preguntas frecuentes, simulador de asistente inteligente SueloIA y enlace pre-configurado de soporte vía WhatsApp.', icon_name: 'MessageSquare' },
  ]);

  // Seed exclusions
  await upsertChildItems('proposal_exclusions', proposal.id, [
    { title: 'Costos de servidores e infraestructura', tooltip: 'Las plataformas de base de datos en la nube (como Supabase), hosting (Vercel) y APIs externas corren por cuenta del cliente.' },
    { title: 'Creación de contenido y multimedia', tooltip: 'Los videos tutoriales en bucle de 15s para el Wizard y los copys comerciales de la app deberán ser provistos por Cannabunker.' },
    { title: 'Hardware e instalación física IoT', tooltip: 'La aplicación queda estructurada para recibir datos, pero la adquisición, ensamble y configuración física de sensores no se incluye.' },
    { title: 'Redacción legal y condiciones', tooltip: 'El redactado final de términos y condiciones de uso y políticas de tratamiento de datos personales deben ser validados por profesionales legales.' },
  ]);

  // Seed milestones
  await upsertChildItems('proposal_milestones', proposal.id, [
    { week_range: '1-4', title: 'CORE SETUP, ONBOARDING & DNI', icon_name: 'LayoutDashboard', description: 'Next.js. Configuración inicial de estilos variables. Flujo de onboarding dinámico (Kit vs Suelo Existente). Wizard interactivo de armado con video. Tarjeta digital DNI Biológico de suelo.', control_milestone: 'ONBOARDING COMPLETO', price: '550' },
    { week_range: '5-8', title: 'DASHBOARD & CONTROL INMERSIVO', icon_name: 'Clock', description: 'UI Hero reactiva. Control visual de fotoperíodo. Lógica del proceso de curado ("Cocinando" - 21 días). Menú flotante (+) para cargas rápidas: Riego, Té, Enmiendas. Alertas preventivas.', control_milestone: 'DASHBOARD VALIDADO', price: '550' },
    { week_range: '9-12', title: 'MAPEO, DOSIS & SOPORTE', icon_name: 'Database', description: 'Listado detallado en tarjetas del estado de suelos vivos. Calculadoras exactas de volumen de riego (5%) y té de compost (10% + receta). FAQs. Simulador de asistencia SueloIA.', control_milestone: 'SUELOS & CALC LISTAS', price: '550' },
    { week_range: '13-16', title: 'QA ESTÉTICO & CIERRE', icon_name: 'Rocket', description: 'Optimización de espaciados Bento UI. Escalamiento táctil (press-scale) y micro-interacciones. Pruebas responsive de desborde CSS en móviles. E2E testing y despliegue final.', control_milestone: 'QA VISUAL & RELEASE', price: '550' },
  ]);

  // Seed payments
  await upsertChildItems('proposal_payments', proposal.id, [
    { percentage: '25%', label: 'Kick-off (Inicio)', description: 'Inicio de Fase 1', tooltip: 'Pago inicial de $550 USD al firmar el contrato para comenzar la estructuración de datos, entorno y Wizard de bienvenida.' },
    { percentage: '25%', label: 'Hito Dashboard', description: 'Fin de Mes 2', tooltip: 'Pago de $550 USD tras la aprobación del panel principal, barra de curado "Cocinando" y menú flotante de acciones rápidas.' },
    { percentage: '25%', label: 'Hito Suelos & IA', description: 'Fin de Mes 3', tooltip: 'Pago de $550 USD al finalizar la integración de múltiples suelos vivos, calculadoras de riego/tés y soporte inteligente SueloIA.' },
    { percentage: '25%', label: 'Hito Entrega Final', description: 'Fin de Mes 4', tooltip: 'Pago final de $550 USD tras completar el QA gráfico de espaciados Bento, responsive general en celulares y entrega formal.' },
  ]);

  // Seed project options
  await upsertChildItems('proposal_project_options', proposal.id, [
    {
      title: 'cbkr App v2 - Desarrollo Integral',
      tagline: 'Seleccionado',
      description: 'Propuesta completa mobile-first con arquitectura modular encastrable, control de curado temporal de 21 días, registro inteligente de riegos/tés con advertencias anti-sobredosis y asistencia integrada con SueloIA.',
      demo_url: null,
      github_url: null,
      features: ['Arquitectura Encastrable Modular', 'Dashboard de Cultivo Inmersivo', 'Calculadoras de Riego y Té', 'SueloIA Asistente de FAQ'],
      style_variant: 'premium',
    }
  ]);

  // Seed infrastructure costs
  await upsertChildItems('proposal_infrastructure_costs', proposal.id, [
    { provider: 'Supabase', is_optional: false, monthly_cost: 'USD 0/mes', title: 'Base de datos & Auth', description: 'Plan gratuito para el almacenamiento y autenticación de usuarios de cbkr.' },
    { provider: 'Vercel', is_optional: false, monthly_cost: 'USD 0/mes', title: 'Application Hosting', description: 'Alojamiento global con CDN de alta velocidad para la aplicación móvil.' },
    { provider: 'OpenAI API', is_optional: true, monthly_cost: 'USD 5/mes', title: 'Asistente SueloIA', description: 'Consumo variable según cantidad de consultas y volumen de usuarios en el chat.' },
  ]);

  return proposal.id;
}
