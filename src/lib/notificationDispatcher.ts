/**
 * CreAPP Operational OS • Strategic Notification Dispatcher
 * Dispatches real-time events to:
 * 1. FCM Background Web Push (/api/send-fcm-notification)
 * 2. In-App Notification Center & Audio Chime
 * 3. Supabase app_notifications table
 */

export type NotificationType =
  | 'contract_signed'
  | 'proposal_viewed'
  | 'proposal_accepted'
  | 'proposal_expiring'
  | 'lead_assigned'
  | 'lead_new_web'
  | 'lead_sla_warning'
  | 'scraper_completed'
  | 'noc_alert'
  | 'subscription_due'
  | 'commission_earned'
  | 'team_activated';

export interface DispatchNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  targetRole?: 'all' | 'admin' | 'sales';
  targetUserId?: string;
  data?: Record<string, any>;
}

// Global in-memory listeners so active components or contexts can react synchronously
type NotificationListener = (payload: DispatchNotificationPayload) => void;
const activeListeners = new Set<NotificationListener>();

export const subscribeToLocalDispatches = (listener: NotificationListener) => {
  activeListeners.add(listener);
  return () => {
    activeListeners.delete(listener);
  };
};

/**
 * Core dispatch function. Sends both to serverless FCM endpoint and broadcasts locally.
 */
export const dispatchNotification = async (
  payload: DispatchNotificationPayload
): Promise<boolean> => {
  try {
    // 1. Notify all active in-browser subscribers (for instantaneous UI feedback)
    activeListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.warn('[Notifications] Error in local listener:', err);
      }
    });

    // 2. Dispatch to serverless function for Web Push & persistence
    const response = await fetch('/api/send-fcm-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        url: payload.url || '/admin',
      }),
    });

    return response.ok;
  } catch (err) {
    console.warn('[Notifications] Could not dispatch to push server:', err);
    return false;
  }
};

// =========================================================================
// 1. CICLO DE VENTAS & PROPUESTAS
// =========================================================================

export const notifyContractSigned = async (params: {
  clientName: string;
  title: string;
  totalAmount?: string | number;
  contractId?: string;
}) => {
  const amountStr = params.totalAmount ? ` • Total: $${params.totalAmount}` : '';
  return dispatchNotification({
    type: 'contract_signed',
    title: '✍️ ¡Contrato Firmado Digitalmente!',
    body: `El cliente "${params.clientName}" firmó "${params.title}"${amountStr}.`,
    url: '/admin',
    targetRole: 'all',
    data: { contractId: params.contractId, clientName: params.clientName },
  });
};

export const notifyProposalViewed = async (params: {
  clientName: string;
  title: string;
  slug: string;
}) => {
  return dispatchNotification({
    type: 'proposal_viewed',
    title: '👀 ¡Prospecto navegando su propuesta!',
    body: `"${params.clientName}" acaba de abrir la propuesta interactiva "${params.title}".`,
    url: `/propuesta/${params.slug}`,
    targetRole: 'admin',
    data: { slug: params.slug, clientName: params.clientName },
  });
};

export const notifyProposalAccepted = async (params: {
  clientName: string;
  title: string;
  planName?: string;
  slug?: string;
}) => {
  const planInfo = params.planName ? ` (${params.planName})` : '';
  return dispatchNotification({
    type: 'proposal_accepted',
    title: '🚀 ¡Propuesta Aceptada por el Cliente!',
    body: `"${params.clientName}" aceptó la propuesta comercial${planInfo}. Listo para emitir contrato.`,
    url: '/admin',
    targetRole: 'all',
    data: { slug: params.slug, clientName: params.clientName },
  });
};

// =========================================================================
// 2. GESTIÓN DE LEADS & CRM PIPELINE
// =========================================================================

export const notifyLeadAssigned = async (params: {
  leadName: string;
  sellerName?: string;
  sellerId?: string;
}) => {
  const sellerText = params.sellerName ? `a ${params.sellerName}` : 'a tu cartera';
  return dispatchNotification({
    type: 'lead_assigned',
    title: '🎯 Nuevo Prospecto Asignado',
    body: `Se asignó el prospecto "${params.leadName}" ${sellerText}.`,
    url: '/admin',
    targetRole: 'sales',
    targetUserId: params.sellerId,
    data: { leadName: params.leadName },
  });
};

export const notifyNewWebLead = async (params: {
  name: string;
  phone: string;
  meetingDate: string;
  meetingTime: string;
  idea?: string;
}) => {
  return dispatchNotification({
    type: 'lead_new_web',
    title: '🔥 Nuevo Lead desde la Web',
    body: `${params.name} agendó llamada para el ${params.meetingDate} a las ${params.meetingTime} hs.`,
    url: '/admin',
    targetRole: 'all',
    data: { phone: params.phone, idea: params.idea },
  });
};

export const notifyLeadSlaWarning = async (params: {
  leadName: string;
  daysInactive: number;
  stageName: string;
  sellerId?: string;
}) => {
  return dispatchNotification({
    type: 'lead_sla_warning',
    title: '⏰ Alerta SLA: Contacto Demorado',
    body: `Han pasado ${params.daysInactive} días sin interacción con "${params.leadName}" en etapa "${params.stageName}".`,
    url: '/admin',
    targetRole: 'all',
    targetUserId: params.sellerId,
    data: { leadName: params.leadName, stage: params.stageName },
  });
};

export const notifyScraperCompleted = async (params: {
  query: string;
  totalFound: number;
  qualifiedCount: number;
}) => {
  return dispatchNotification({
    type: 'scraper_completed',
    title: '🤖 Scraper B2B Completado',
    body: `Escaneo finalizado para "${params.query}": ${params.totalFound} prospectos detectados, ${params.qualifiedCount} con WhatsApp verificado.`,
    url: '/admin',
    targetRole: 'all',
    data: { query: params.query, qualified: params.qualifiedCount },
  });
};

// =========================================================================
// 3. NOC & TELEMETRÍA (SOLO MASTER ADMIN)
// =========================================================================

export const notifyNocAlert = async (params: {
  serviceName: string;
  severity: 'critical' | 'high' | 'warning';
  message: string;
}) => {
  const icon = params.severity === 'critical' ? '🔴' : '⚠️';
  return dispatchNotification({
    type: 'noc_alert',
    title: `${icon} Alerta NOC • ${params.serviceName}`,
    body: `[${params.severity.toUpperCase()}] ${params.message}`,
    url: '/admin',
    targetRole: 'admin',
    data: { service: params.serviceName, severity: params.severity },
  });
};

// =========================================================================
// 4. FINANZAS & MRR RECURRENTE
// =========================================================================

export const notifySubscriptionDue = async (params: {
  clientName: string;
  serviceName: string;
  amount: string | number;
  currency?: string;
  dueDate?: string;
}) => {
  const curr = params.currency || 'ARS';
  const dueInfo = params.dueDate ? ` para el ${params.dueDate}` : '';
  return dispatchNotification({
    type: 'subscription_due',
    title: '💵 Cobro de Abono Próximo a Vencer',
    body: `Vence el abono mensual de "${params.clientName}" (${params.serviceName}) por $${params.amount} ${curr}${dueInfo}.`,
    url: '/admin',
    targetRole: 'admin',
    data: { clientName: params.clientName, amount: params.amount },
  });
};

export const notifyCommissionEarned = async (params: {
  sellerName?: string;
  sellerId?: string;
  amount: string | number;
  currency?: string;
  contractTitle: string;
}) => {
  const curr = params.currency || 'USD';
  return dispatchNotification({
    type: 'commission_earned',
    title: '🏆 ¡Comisión Acreditada!',
    body: `Se acreditó una comisión de $${params.amount} ${curr} por el contrato "${params.contractTitle}".`,
    url: '/admin',
    targetRole: 'sales',
    targetUserId: params.sellerId,
    data: { amount: params.amount, contract: params.contractTitle },
  });
};

// =========================================================================
// 5. EQUIPO & SEGURIDAD
// =========================================================================

export const notifyTeamMemberActivated = async (params: {
  memberName: string;
  memberEmail: string;
}) => {
  return dispatchNotification({
    type: 'team_activated',
    title: '🤝 Nuevo Miembro Activado',
    body: `${params.memberName} (${params.memberEmail}) definió su contraseña y completó el Onboarding oficial.`,
    url: '/admin',
    targetRole: 'admin',
    data: { email: params.memberEmail },
  });
};
