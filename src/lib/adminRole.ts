import { isDefaultAdminEmail } from './adminEmails.js';

// El rol de la base manda. El email por defecto solo vale si NO hay perfil
// (bootstrap del Master Admin); nunca pisa un rol 'client' o 'vendedor'.
export function resolveIsAdmin({ email, profileRole }: { email?: string | null; profileRole?: string | null }): boolean {
  if (profileRole) return profileRole === 'admin';
  return isDefaultAdminEmail(email);
}
