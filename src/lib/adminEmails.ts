// Fuente única de los emails admin por defecto (front y server).
// SOLO casillas exactas que controla CreAPP. Nunca prefijos ni dominios ajenos:
// antes cualquier "admin@loquesea" pasaba como admin (un cliente con casilla
// admin@sudominio.com pasaba requireAdmin en /api/launches).
const DEFAULT_ADMIN_EMAILS = new Set(['creapp.ar@gmail.com', 'admin@creapp.com.ar']);

export const isDefaultAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return DEFAULT_ADMIN_EMAILS.has(email.toLowerCase().trim());
};
