// ==============================================================================
// Edge Function: manage-team
// CreAPP Innovation Hub
//
// Operaciones privilegiadas de gestión de equipo que requieren service_role:
//   - invite: crea el usuario en auth.users y envía la invitación de activación
//             (link type "invite" hacia /admin/set-password). El trigger
//             on_auth_user_created crea el user_profiles automáticamente.
//   - create: alta directa con contraseña definida por el admin (email ya
//             confirmado, sin onboarding).
//   - delete: elimina el usuario de auth.users. El ON DELETE CASCADE de
//             user_profiles borra el perfil asociado. Esto evita los usuarios
//             "fantasma" que quedaban al borrar solo el perfil.
//
// SEGURIDAD: el service_role es acceso total. Antes de ejecutar cualquier
// operación verificamos que quien llama:
//   1. Tenga un JWT válido (lo hace también la plataforma con verify_jwt).
//   2. Tenga rol 'admin' en public.user_profiles.
// ==============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.99.1';

const ACTIVATION_REDIRECT = 'https://creapp.com.ar/admin/set-password';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    // SUPABASE_SERVICE_ROLE_KEY lo inyecta la plataforma por defecto en toda Edge Function.
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: 'Faltan variables de entorno en la función.' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'No autenticado: falta el token de sesión.' }, 401);
    }

    // Cliente con la identidad del llamador (para resolver quién es).
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

    // Cliente service_role para operaciones privilegiadas.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verificar que el llamador es admin.
    const { data: callerProfile, error: profileError } = await admin
      .from('user_profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileError || callerProfile?.role !== 'admin') {
      return json(
        { error: 'No autorizado: solo un administrador puede gestionar el equipo.' },
        403
      );
    }

    const payload = await req.json().catch(() => ({}));
    const action = payload?.action as string | undefined;

    // ---------------------------------------------------------------- INVITE
    if (action === 'invite') {
      const email = String(payload.email || '').trim().toLowerCase();
      const fullName = String(payload.fullName || '').trim();
      const role = payload.role === 'admin' ? 'admin' : 'vendedor';

      if (!email) return json({ error: 'Falta el email a invitar.' }, 400);

      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName, role },
        redirectTo: ACTIVATION_REDIRECT,
      });

      if (error) {
        // Email ya registrado: el flujo viejo dejaba fantasmas. Avisamos claro.
        return json(
          {
            error: error.message,
            code: (error as { code?: string }).code ?? 'invite_failed',
          },
          400
        );
      }

      return json({ success: true, userId: data.user?.id ?? null });
    }

    // ---------------------------------------------------------------- CREATE
    if (action === 'create') {
      const email = String(payload.email || '').trim().toLowerCase();
      const fullName = String(payload.fullName || '').trim();
      const role = payload.role === 'admin' ? 'admin' : 'vendedor';
      const password = String(payload.password || '');

      if (!email) return json({ error: 'Falta el email.' }, 400);
      if (!password) return json({ error: 'Falta la contraseña.' }, 400);

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role },
      });

      if (error) {
        return json(
          { error: error.message, code: (error as { code?: string }).code ?? 'create_failed' },
          400
        );
      }

      return json({ success: true, userId: data.user?.id ?? null });
    }

    // ---------------------------------------------------------------- DELETE
    if (action === 'delete') {
      const userId = String(payload.userId || '').trim();
      if (!userId) return json({ error: 'Falta el userId a eliminar.' }, 400);

      if (userId === caller.id) {
        return json({ error: 'No podés eliminar tu propia cuenta.' }, 400);
      }

      // Borra el usuario de auth.users; user_profiles cae por ON DELETE CASCADE.
      const { error } = await admin.auth.admin.deleteUser(userId);

      if (error) {
        // Si ya no existe en auth.users, limpiamos cualquier perfil huérfano.
        await admin.from('user_profiles').delete().eq('id', userId);
        return json(
          { error: error.message, code: (error as { code?: string }).code ?? 'delete_failed' },
          400
        );
      }

      return json({ success: true });
    }

    return json({ error: `Acción no reconocida: ${action ?? '(vacía)'}` }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado.';
    return json({ error: message }, 500);
  }
});
