import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { resolvePortalAccess } from '@/lib/portalAccess';
import PortalLoader from '@/components/portal/PortalLoader';

// Solo deja pasar a role === 'client'. El equipo (admin/vendedor) va a /admin.
// Login compartido: sin sesión se manda a /admin/login (que redirige por rol).
const PortalGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, loading } = useAuth();
  const access = resolvePortalAccess({ loading, user, role });

  // Loader en la estética de la campaña (no el shell negro/violeta de CreAPP).
  if (access === 'loading') return <PortalLoader />;
  if (access === 'login') return <Navigate to="/admin/login" replace />;
  if (access === 'redirect-admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
};

export default PortalGuard;
