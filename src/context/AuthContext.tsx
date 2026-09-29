import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, createClient } from '@supabase/supabase-js';
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
    password: string;
    fullName: string;
    role?: UserRole;
  }) => Promise<{ success: boolean; error?: string }>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper para determinar si un correo es considerado master admin por defecto
const isDefaultAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return (
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
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile from user_profiles:', error.message);
      }

      if (data) {
        setProfile(data as UserProfile);
      } else {
        // Fallback inteligente si la tabla aún no se creó o el registro no existe
        const defaultRole: UserRole = isDefaultAdminEmail(currentUser.email) ? 'admin' : 'vendedor';
        setProfile({
          id: currentUser.id,
          email: currentUser.email || '',
          role: defaultRole,
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
        });
      }
    } catch (err) {
      console.error('Unexpected error loading user profile:', err);
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user).finally(() => {
          if (isMounted) setLoading(false);
        });
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // Listar todos los usuarios del equipo (solo accesible si se tienen permisos)
  const listUsers = async (): Promise<UserProfile[]> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as UserProfile[];
    } catch (err) {
      console.error('Error listing team users:', err);
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
    password: string;
    fullName: string;
    role?: UserRole;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        return { success: false, error: 'Configuración de Supabase no encontrada en .env' };
      }

      // Cliente temporal aislado para que NO sobrescriba el session token del admin en localStorage
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data, error } = await tempClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Si se creó el usuario en Auth, aseguramos que tenga registro en user_profiles
      if (data.user) {
        await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            email: email.trim().toLowerCase(),
            role: role,
            full_name: fullName,
            updated_at: new Date().toISOString(),
          });
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
