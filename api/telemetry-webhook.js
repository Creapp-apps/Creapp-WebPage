// =========================================================================
// CreAPP Mission Control — Telemetry Ingestion Webhook (Serverless)
// Compatible con Sentry Webhooks y Direct Push desde Apps del Ecosistema
// =========================================================================

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 1. Cabeceras CORS para permitir ingesta desde cualquier app cliente
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, sentry-hook-signature'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', message: 'CreAPP Telemetry NOC Ingestion Endpoint' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase credentials not configured on server' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = req.body || {};

    let incidentData = null;

    // A) DETECCIÓN SI ES UN WEBHOOK DE SENTRY
    if (body.action && (body.data?.issue || body.data?.event)) {
      const issue = body.data.issue || {};
      const event = body.data.event || {};
      const projectSlug = body.data.project?.slug || 'unknown-app';

      // Mapear slug de Sentry a app_id de CreAPP
      let appId = 'celebra-eventos';
      if (projectSlug.includes('celebra')) appId = 'celebra-eventos';
      else if (projectSlug.includes('contenido')) appId = 'creador-contenidos';
      else if (projectSlug.includes('trazapp')) appId = 'trazapp-cloud';
      else if (projectSlug.includes('belcalis')) appId = 'belcalis-salon';
      else if (projectSlug.includes('hub')) appId = 'creapp-hub';

      const stackFrames = event.entries?.find((e) => e.type === 'exception')?.data?.values?.[0]?.stacktrace?.frames || [];
      const topFrame = stackFrames[stackFrames.length - 1] || {};
      const fileSource = topFrame.filename ? `${topFrame.filename}:${topFrame.lineno || 0}` : null;

      const tenantTag = event.tags?.find((t) => t.key === 'tenant_id' || t.key === 'tenant')?.value || null;
      const tenantNameTag = event.tags?.find((t) => t.key === 'tenant_name')?.value || tenantTag;

      incidentData = {
        app_id: appId,
        title: issue.title || event.title || 'Error no identificado (Sentry)',
        error_type: event.entries?.find((e) => e.type === 'exception')?.data?.values?.[0]?.type || 'RuntimeError',
        severity: issue.level === 'fatal' || issue.level === 'critical' ? 'critical' : 'error',
        message: issue.culprit || event.message || issue.title || 'Excepción en tiempo de ejecución',
        stack_trace: stackFrames.map((f) => `at ${f.function || 'anonymous'} (${f.filename}:${f.lineno}:${f.colno})`).join('\n') || null,
        file_source: fileSource,
        url_path: event.tags?.find((t) => t.key === 'url')?.value || null,
        tenant_id: tenantTag,
        tenant_name: tenantNameTag,
        breadcrumbs: event.entries?.find((e) => e.type === 'breadcrumbs')?.data?.values || [],
        user_device: {
          browser: event.contexts?.browser?.name ? `${event.contexts.browser.name} ${event.contexts.browser.version}` : 'Desconocido',
          os: event.contexts?.os?.name ? `${event.contexts.os.name} ${event.contexts.os.version}` : 'Desconocido',
          device: event.contexts?.device?.model || 'Desktop/Mobile'
        },
        status: 'open',
        occurrence_count: issue.count ? parseInt(issue.count) : 1
      };
    } 
    // B) DETECCIÓN SI ES UN DIRECT PUSH DESDE UNA APP DE CREAPP
    else {
      incidentData = {
        app_id: body.appId || body.app_id || 'celebra',
        title: body.title || 'Excepción no capturada',
        error_type: body.errorType || body.error_type || 'RuntimeError',
        severity: body.severity || 'error',
        message: body.message || 'Error en tiempo de ejecución',
        stack_trace: body.stackTrace || body.stack_trace || null,
        file_source: body.fileSource || body.file_source || null,
        url_path: body.urlPath || body.url_path || null,
        tenant_id: body.tenantId || body.tenant_id || null,
        tenant_name: body.tenantName || body.tenant_name || null,
        breadcrumbs: body.breadcrumbs || [],
        user_device: body.userDevice || body.user_device || {},
        status: 'open',
        occurrence_count: 1
      };
    }

    // Insertar en la base de datos de Supabase
    const { data: inserted, error: insertError } = await supabase
      .from('app_incidents')
      .insert([incidentData])
      .select()
      .single();

    if (insertError) {
      console.error('[Telemetry Webhook] Error guardando incidente:', insertError);
      return res.status(500).json({ error: 'Failed to record incident in database', details: insertError.message });
    }

    // Actualizar contador en app_monitored_fleet
    try {
      await supabase.rpc('increment_app_error_count', { target_app_id: incidentData.app_id });
    } catch (_) {
      // Fallback update
      await supabase
        .from('app_monitored_fleet')
        .update({ 
          error_count_24h: 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', incidentData.app_id);
    }

    return res.status(200).json({
      success: true,
      message: 'Incident registered successfully in CreAPP Mission Control',
      incidentId: inserted?.id
    });
  } catch (err) {
    console.error('[Telemetry Webhook] Error interno:', err);
    return res.status(500).json({ error: 'Internal server error processing telemetry' });
  }
}
