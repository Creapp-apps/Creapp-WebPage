import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/context/AuthContext';
import { resolveAdminAccess } from '@/lib/portalAccess';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();

  const access = resolveAdminAccess({ loading, user, role, allowedRoles });

  if (access === 'loading') {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (access === 'login') return <Navigate to="/admin/login" replace />;
  // Un cliente nunca queda atrapado en el panel: va a su portal.
  if (access === 'redirect-portal') return <Navigate to="/portal" replace />;
  // Ruta con rol específico (ej: solo 'admin' en Control Center)
  if (access === 'redirect-pipeline') return <Navigate to="/admin?tab=pipeline" replace />;

  return <>{children}</>;
};

export default AuthGuard;
