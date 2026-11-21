import { isDefaultAdminEmail } from './adminEmails.js';

export function resolveIsAdmin({ email, profileRole }: { email?: string | null; profileRole?: string | null }): boolean {
  return profileRole === 'admin' || isDefaultAdminEmail(email);
}
