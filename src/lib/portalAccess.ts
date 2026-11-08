// Decisiones puras de acceso por rol (testeables con node --test).
export type AccessRole = 'admin' | 'vendedor' | 'client';

interface Ctx {
  loading: boolean;
  user: unknown;
  role: AccessRole;
}

export type PortalAccess = 'loading' | 'login' | 'redirect-admin' | 'allow';
export type AdminAccess = 'loading' | 'login' | 'redirect-portal' | 'redirect-pipeline' | 'allow';

export function resolvePortalAccess({ loading, user, role }: Ctx): PortalAccess {
  if (loading) return 'loading';
  if (!user) return 'login';
  return role === 'client' ? 'allow' : 'redirect-admin';
}

export function resolveAdminAccess(
  { loading, user, role, allowedRoles }: Ctx & { allowedRoles?: AccessRole[] },
): AdminAccess {
  if (loading) return 'loading';
  if (!user) return 'login';
  if (role === 'client') return 'redirect-portal';
  if (allowedRoles && !allowedRoles.includes(role)) return 'redirect-pipeline';
  return 'allow';
}

export function homePathForRole(role: AccessRole): string {
  return role === 'client' ? '/portal' : '/admin';
}
