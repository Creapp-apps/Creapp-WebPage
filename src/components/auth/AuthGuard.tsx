import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/context/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Si la ruta requiere un rol específico (ej: solo 'admin' en Control Center)
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/admin?tab=pipeline" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
