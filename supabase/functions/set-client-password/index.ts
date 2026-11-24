// ==============================================================================
// Edge Function: set-client-password
// CreAPP Innovation Hub
//
// Asigna una contraseña directa al usuario cliente de una empresa, para que el
// equipo pueda entregarla a mano (cuando el cliente perdió el acceso al email y
// el recovery link no le llega). Invalida la clave anterior.
//
// Entrada:  { clientId, password }
// Salida:   { success: true, email }
//           { error, code? } con status 400 / 401 / 403 / 404 / 500
//
// SEGURIDAD: service_role es acceso total. Verificamos que quien llama tenga JWT
// válido y rol 'admin' o 'vendedor'. El target DEBE ser rol 'client' y miembro
// de ese clientId: nunca se puede pisar la clave de un miembro del equipo.
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

const MIN_PASSWORD = 12;

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
        { error: 'No autorizado: solo el equipo puede gestionar el acceso de clientes.' },
        403
      );
    }

    // 1. Validación de entrada
    const payload = await req.json().catch(() => ({}));
    const clientId = String(payload?.clientId || '').trim();
    const password = String(payload?.password || '');

    if (!clientId) return json({ error: 'Falta el clientId.', code: 'missing_client' }, 400);
    if (password.length < MIN_PASSWORD) {
      return json(
        { error: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.`, code: 'weak_password' },
        400
      );
    }

    // 2. Resolver el usuario cliente de esa empresa (preferimos el owner).
    const { data: members, error: memberError } = await admin
      .from('client_members')
      .select('user_id, role')
      .eq('client_id', clientId);
    if (memberError) {
      return json({ error: memberError.message, code: 'lookup_failed' }, 500);
    }
    const list = (members ?? []) as { user_id: string; role: string }[];
    if (list.length === 0) {
      return json({ error: 'Ese cliente todavía no tiene acceso dado de alta.', code: 'no_access' }, 404);
    }
    const target = list.find((m) => m.role === 'owner') ?? list[0];

    // 3. El target DEBE ser rol 'client': jamás pisamos la clave del equipo.
    const { data: targetProfile, error: profileError } = await admin
      .from('user_profiles')
      .select('role, email')
      .eq('id', target.user_id)
      .single();
    if (profileError || !targetProfile) {
      return json({ error: 'No se encontró el perfil del cliente.', code: 'profile_not_found' }, 404);
    }
    if (targetProfile.role !== 'client') {
      return json(
        { error: 'El usuario asociado no es un cliente; no se puede resetear su clave acá.', code: 'not_a_client' },
        403
      );
    }

    // 4. Asignar la contraseña (invalida la anterior) y CONFIRMAR el email.
    //    Entregamos una clave directa justamente para saltear la activación por
    //    mail: si el cliente nunca abrió el link, su email sigue sin confirmar y
    //    signInWithPassword falla con "email_not_confirmed" (que el front mostraba
    //    como "Credenciales inválidas"). email_confirm:true lo deja usable al toque.
    const { error: updateError } = await admin.auth.admin.updateUserById(target.user_id, {
      password,
      email_confirm: true,
    });
    if (updateError) {
      return json({ error: updateError.message, code: 'update_failed' }, 500);
    }

    // 5. Guardar la clave para el equipo (texto plano, tradeoff aceptado).
    //    Writer service_role: no pasa por RLS. Si falla, no abortamos el reset
    //    (la clave ya quedó aplicada); solo logueamos.
    const { error: credError } = await admin
      .from('client_portal_credentials')
      .upsert({
        client_id: clientId,
        email: targetProfile.email ?? null,
        password_plain: password,
        updated_at: new Date().toISOString(),
        updated_by: caller.id,
      });
    if (credError) {
      console.error('No se pudo guardar la credencial del portal:', credError.message);
    }

    // 6. Respuesta (sin devolver la clave: ya la tiene quien la generó y envió).
    return json({ success: true, email: targetProfile.email ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return json({ error: message }, 500);
  }
});
