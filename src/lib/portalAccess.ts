// Decisiones puras de acceso por rol (testeables con node --test).
export type AccessRole = 'admin' | 'vendedor' | 'client';

interface Ctx {
  loading: boolean;
  user: unknown;
  role: AccessRole;
  // false = no se pudo leer el rol real de la base (timeout, red, fila faltante).
  // Sin rol verificado NUNCA se deja pasar: antes se asumía 'vendedor' y un
  // cliente con red lenta entraba al panel interno.
  roleResolved?: boolean;
}

export type PortalAccess = 'loading' | 'login' | 'unverified' | 'redirect-admin' | 'allow';
export type AdminAccess = 'loading' | 'login' | 'unverified' | 'redirect-portal' | 'redirect-pipeline' | 'allow';

export function resolvePortalAccess({ loading, user, role, roleResolved = true }: Ctx): PortalAccess {
  if (loading) return 'loading';
  if (!user) return 'login';
  if (!roleResolved) return 'unverified';
  return role === 'client' ? 'allow' : 'redirect-admin';
}

export function resolveAdminAccess(
  { loading, user, role, allowedRoles, roleResolved = true }: Ctx & { allowedRoles?: AccessRole[] },
): AdminAccess {
  if (loading) return 'loading';
  if (!user) return 'login';
  if (!roleResolved) return 'unverified';
  if (role === 'client') return 'redirect-portal';
  if (allowedRoles && !allowedRoles.includes(role)) return 'redirect-pipeline';
  return 'allow';
}

export function homePathForRole(role: AccessRole): string {
  return role === 'client' ? '/portal' : '/admin';
}
