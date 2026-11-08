import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { resolvePortalAccess } from '@/lib/portalAccess';

// Solo deja pasar a role === 'client'. El equipo (admin/vendedor) va a /admin.
// Login compartido: sin sesión se manda a /admin/login (que redirige por rol).
const PortalGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, loading } = useAuth();
  const access = resolvePortalAccess({ loading, user, role });

  if (access === 'loading') {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (access === 'login') return <Navigate to="/admin/login" replace />;
  if (access === 'redirect-admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
};

export default PortalGuard;
