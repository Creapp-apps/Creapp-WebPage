// ==============================================================================
// Edge Function: invite-client
// CreAPP Innovation Hub
//
// Da de alta a un cliente del portal: crea (o reutiliza) su usuario con
// role 'client', lo vincula a la empresa en client_members y devuelve el link
// de activación. El envío del email lo hace el front.
//
// Entrada:  { clientId, email, fullName? }
// Salida:   { success: true, activationLink, userId, isNew }
//           { error, code? } con status 400 / 403 (email_is_team) / 500
//
// SEGURIDAD: service_role es acceso total, así que verificamos que quien llama
// tenga JWT válido y rol 'admin' o 'vendedor' en user_profiles.
// ==============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: 'Faltan variables de entorno en la función.' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'No autenticado: falta el token de sesión.' }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return json({ error: 'Sesión inválida o expirada.' }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: callerProfile } = await admin
      .from('user_profiles')
      .select('role')
      .eq('id', caller.id)
      .single();
    if (callerProfile?.role !== 'admin' && callerProfile?.role !== 'vendedor') {
      return json(
        { error: 'No autorizado: solo el equipo puede dar de alta clientes.' },
        403
      );
    }

    // 1. Validación de entrada
    const payload = await req.json().catch(() => ({}));
    const clientId = String(payload?.clientId || '').trim();
    const email = String(payload?.email || '').trim().toLowerCase();
    const fullName = String(payload?.fullName || '').trim();

    if (!clientId) return json({ error: 'Falta el clientId.' }, 400);
    if (!email) return json({ error: 'Falta el email.' }, 400);
    if (!EMAIL_RE.test(email)) {
      return json({ error: 'El email no tiene un formato válido.' }, 400);
    }

    const base = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://creapp.com.ar';
    const redirectTo = `${base}/portal/activar`;

    // 2. ¿Ya existe? (user_profiles se crea por trigger con cada auth.users)
    const { data: existing, error: lookupError } = await admin
      .from('user_profiles')
      .select('id, role')
      .eq('email', email)
      .maybeSingle();
    if (lookupError) {
      return json({ error: lookupError.message, code: 'lookup_failed' }, 500);
    }

    if (existing && (existing.role === 'admin' || existing.role === 'vendedor')) {
      return json(
        {
          error:
            'Ese email ya pertenece al equipo, no se puede dar de alta como cliente.',
          code: 'email_is_team',
        },
        403
      );
    }

    let userId: string;
    let activationLink: string;
    let isNew: boolean;

    if (!existing) {
      // 3. Usuario nuevo: invitación
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { data: { full_name: fullName, role: 'client' }, redirectTo },
      });
      if (error || !data?.user?.id || !data.properties?.action_link) {
        return json(
          {
            error: error?.message ?? 'No se pudo generar el link de activación.',
            code: (error as { code?: string } | null)?.code ?? 'invite_failed',
          },
          500
        );
      }
      userId = data.user.id;
      activationLink = data.properties.action_link;
      isNew = true;
    } else {
      // 4. Cliente existente: recovery para que defina/restablezca su clave
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      });
      if (error || !data?.properties?.action_link) {
        return json(
          {
            error: error?.message ?? 'No se pudo generar el link de acceso.',
            code: (error as { code?: string } | null)?.code ?? 'recovery_failed',
          },
          500
        );
      }
      userId = existing.id;
      activationLink = data.properties.action_link;
      isNew = false;
    }

    // 5. Membresía (idempotente)
    const { error: memberError } = await admin
      .from('client_members')
      .upsert(
        { client_id: clientId, user_id: userId, role: 'owner' },
        { onConflict: 'client_id,user_id', ignoreDuplicates: true }
      );
    if (memberError) {
      return json({ error: memberError.message, code: 'membership_failed' }, 500);
    }

    // 6. Respuesta
    return json({ success: true, activationLink, userId, isNew });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return json({ error: message }, 500);
  }
});
