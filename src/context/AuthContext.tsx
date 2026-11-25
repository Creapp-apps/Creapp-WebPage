import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { isDefaultAdminEmail } from '../lib/adminEmails';

export type UserRole = 'admin' | 'vendedor' | 'client';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isVendedor: boolean;
  roleResolved: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  listUsers: () => Promise<UserProfile[]>;
  createSalesUser: (params: {
    email: string;
    password?: string;
    fullName: string;
    role?: Exclude<UserRole, 'client'>;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  deleteUserProfile: (userId: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Para distinguir un login real (usuario distinto) de un simple token-refresh
  // del mismo usuario y así volver a loading SOLO cuando hace falta.
  const lastUserIdRef = useRef<string | null>(null);
  // true solo cuando el rol salió de la base (o es Master Admin por email).
  const [roleResolved, setRoleResolved] = useState(false);
  const fetchingRef = useRef(false);
  // Usuario cuyo rol ya se verificó: un refresh fallido no lo expulsa.
  const resolvedUserIdRef = useRef<string | null>(null);

  // Lee el rol REAL de la base. Fail-closed: si no se puede leer (timeout, red,
  // fila faltante) el rol queda SIN verificar y los guards no dejan pasar.
  // Antes se asumía 'vendedor' a los 2,5 s: un cliente con red móvil lenta
  // entraba al panel interno (incidente Materalia, 2026-11-24).
  const fetchProfile = async (currentUser: User) => {
    fetchingRef.current = true;
    try {
      const ATTEMPTS = 3;
      const TIMEOUT_MS = 8000;
      for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        let data: any = null;
        let error: any = null;
        try {
          const queryPromise = supabase
            .from('user_profiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();
          const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: new Error('Timeout al consultar perfil') }), TIMEOUT_MS)
          );
          ({ data, error } = await Promise.race([queryPromise, timeoutPromise]));
        } catch (err) {
          error = err;
        }

        if (data) {
          setProfile(data as UserProfile);
          setRoleResolved(true);
          resolvedUserIdRef.current = currentUser.id;
          return;
        }
        if (error) {
          console.warn(`Perfil no disponible (intento ${attempt}/${ATTEMPTS}):`, error?.message || error);
          continue;
        }
        break; // respondió sin fila: reintentar no cambia nada
      }

      // Sin perfil legible. Solo los Master Admin por email entran igual.
      if (isDefaultAdminEmail(currentUser.email)) {
        setProfile({
          id: currentUser.id,
          email: currentUser.email || '',
          role: 'admin',
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
        });
        setRoleResolved(true);
        resolvedUserIdRef.current = currentUser.id;
      } else if (resolvedUserIdRef.current !== currentUser.id) {
        // Nunca se verificó a este usuario: sin acceso. Si ya estaba verificado
        // (refresh de token con red caída) se conserva el perfil que tenía.
        setProfile(null);
        setRoleResolved(false);
      }
    } finally {
      fetchingRef.current = false;
      // Recién acá soltamos el loading: los guards nunca evalúan con un rol adivinado.
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Timeout de seguridad estricto: después de 3 segundos NUNCA dejar la app congelada en loading
    const safetyTimer = setTimeout(() => {
      // Si el perfil todavía se está consultando, NO soltar: lo suelta fetchProfile.
      if (isMounted && loading && !fetchingRef.current) {
        console.warn('Safety timeout: desbloqueando loading de AuthGuard.');
        setLoading(false);
      }
    }, 3000);

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) {
          console.warn('Error en getSession:', error.message);
        }

        if (session?.user) {
          lastUserIdRef.current = session.user.id;
          setUser(session.user);
          await fetchProfile(session.user);
        } else {
          lastUserIdRef.current = null;
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Error al inicializar sesión:', err);
        if (isMounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listener de cambios de auth: NUNCA hacer await síncrono que bloquee el mutex de Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session?.user) {
        // ¿Es un login real (usuario distinto) o un refresh del mismo usuario?
        const changed = lastUserIdRef.current !== session.user.id;
        lastUserIdRef.current = session.user.id;
        setUser(session.user);
        if (changed) {
          // Login real: volvemos a loading y descartamos el perfil anterior, para
          // que los guards no evalúen con el rol DEFAULT ('vendedor') antes de tener
          // el perfil real. Eso causaba el flash de /admin al entrar un cliente.
          setProfile(null);
          setRoleResolved(false);
          resolvedUserIdRef.current = null;
          setLoading(true);
        }
        // Ejecutar en background fuera del ciclo de eventos de auth.
        // fetchProfile suelta loading cuando el rol real está listo.
        setTimeout(() => {
          if (isMounted) fetchProfile(session.user);
        }, 0);
      } else {
        lastUserIdRef.current = null;
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      if (!roleResolved) setLoading(true);
      await fetchProfile(user);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Error al cerrar sesión:', e);
    } finally {
      setUser(null);
      setProfile(null);
      setRoleResolved(false);
    }
  };

  // Listar todos los usuarios del equipo
  const listUsers = async (): Promise<UserProfile[]> => {
    try {
      const listPromise = supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: [], error: new Error('Timeout') }), 3000)
      );

      const { data, error } = await Promise.race([listPromise, timeoutPromise]);

      if (error) throw error;
      return (data || []) as UserProfile[];
    } catch (err) {
      console.warn('Error listing team users:', err);
      return [];
    }
  };

  // Crear un nuevo vendedor o usuario sin cerrar la sesión del admin activo
  const createSalesUser = async ({
    email,
    password,
    fullName,
    role = 'vendedor',
  }: {
    email: string;
    password?: string;
    fullName: string;
    role?: Exclude<UserRole, 'client'>;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Operación privilegiada vía Edge Function (service_role). Reemplaza el
      // viejo signUp, que sobre un email ya existente en auth.users dejaba
      // usuarios "fantasma" y provocaba "Auth session missing!" al activar.
      //   - Con contraseña del admin  -> action 'create' (alta directa confirmada).
      //   - Sin contraseña (onboarding) -> action 'invite' (link de activación).
      const { data, error } = await supabase.functions.invoke('manage-team', {
        body: password
          ? { action: 'create', email: normalizedEmail, fullName, role, password }
          : { action: 'invite', email: normalizedEmail, fullName, role },
      });

      if (error) {
        // functions.invoke envuelve los errores HTTP; intentamos extraer el mensaje real del body.
        let message = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) message = body.error;
        } catch { /* sin cuerpo JSON legible */ }
        return { success: false, error: message };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      // Email de bienvenida vía Resend (no bloqueante). El link de activación
      // lo envía Supabase; este correo es informativo/branding.
      try {
        const { sendWelcomeEmail } = await import('@/lib/emailService');
        await Promise.race([
          sendWelcomeEmail({
            email: normalizedEmail,
            fullName,
            password: password || undefined,
            role,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
      } catch (emailErr) {
        console.warn('Aviso al enviar email vía Resend:', emailErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error creating sales user:', err);
      return { success: false, error: err.message || 'Error inesperado al crear usuario' };
    }
  };

  const updateUserRole = async (
    userId: string,
    newRole: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al actualizar rol' };
    }
  };

  const deleteUserProfile = async (userId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Borra el usuario de auth.users vía Edge Function (service_role).
      // El ON DELETE CASCADE de user_profiles elimina el perfil. Antes se
      // borraba solo el perfil y quedaba el user de Auth huérfano (fantasma).
      const { data, error } = await supabase.functions.invoke('manage-team', {
        body: { action: 'delete', userId },
      });

      if (error) {
        let message = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) message = body.error;
        } catch { /* sin cuerpo JSON legible */ }
        return { success: false, error: message };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Error al eliminar usuario' };
    }
  };

  // Último recurso = menor privilegio ('client'), nunca 'vendedor'.
  const role: UserRole = profile?.role || (isDefaultAdminEmail(user?.email) ? 'admin' : 'client');
  const isAdmin = role === 'admin';
  const isVendedor = role === 'vendedor';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        isAdmin,
        isVendedor,
        roleResolved,
        loading,
        signOut,
        listUsers,
        createSalesUser,
        updateUserRole,
        deleteUserProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
