// Fuente única de los emails admin por defecto (front y server).
export const isDefaultAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return (
    lower === 'creapp.ar@gmail.com' ||
    lower === 'creapp@creapp.com' ||
    lower === 'admin@creapp.com.ar' ||
    lower === 'admin@creapp.com' ||
    lower.startsWith('admin@')
  );
};
