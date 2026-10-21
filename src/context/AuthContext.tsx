import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

export type UserRole = 'admin' | 'vendedor';

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
  loading: boolean;
  signOut: () => Promise<void>;
  listUsers: () => Promise<UserProfile[]>;
  createSalesUser: (params: {
    email: string;
    password?: string;
    fullName: string;
    role?: UserRole;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  deleteUserProfile: (userId: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper para determinar si un correo es considerado master admin por defecto
const isDefaultAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return (
    lower === 'creapp.ar@gmail.com' ||
    lower === 'creapp@creapp.com' ||
    lower === 'admin@creapp.com.ar' ||
    lower === 'admin@creapp.com' ||
    lower.startsWith('admin@')
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (currentUser: User) => {
    try {
      const queryPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Timeout al consultar perfil') }), 2500)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        console.warn('Advertencia al consultar user_profiles:', error.message);
      }

      if (data) {
        setProfile(data as UserProfile);
      } else {
        const defaultRole: UserRole = isDefaultAdminEmail(currentUser.email) ? 'admin' : 'vendedor';
        setProfile({
          id: currentUser.id,
          email: currentUser.email || '',
          role: defaultRole,
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
        });
      }
    } catch (err) {
      console.warn('Error al cargar perfil:', err);
      const defaultRole: UserRole = isDefaultAdminEmail(currentUser.email) ? 'admin' : 'vendedor';
      setProfile({
        id: currentUser.id,
        email: currentUser.email || '',
        role: defaultRole,
      });
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Timeout de seguridad estricto: después de 3 segundos NUNCA dejar la app congelada en loading
    const safetyTimer = setTimeout(() => {
      if (isMounted && loading) {
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
          setUser(session.user);
          await fetchProfile(session.user);
        } else {
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
        setUser(session.user);
        // Ejecutar en background fuera del ciclo de eventos de auth
        setTimeout(() => {
          if (isMounted) fetchProfile(session.user);
        }, 0);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
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
    role?: UserRole;
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

  const role: UserRole = profile?.role || (isDefaultAdminEmail(user?.email) ? 'admin' : 'vendedor');
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
