-- Portal de clientes: alta y activación por invitación.
-- Migración idempotente: garantiza que el enum public.user_role incluya 'client'.
-- (Si ya fue agregado por 20261107140000_client_access.sql, esta sentencia no hace nada.)
--
-- Pendiente (configuración manual, NO SQL): en el dashboard de Supabase,
-- Auth → URL Configuration → Redirect URLs, agregar:
--   <base>/portal/activar
--   <base>/portal/login
-- Lo ejecuta el usuario en el dashboard; no se puede hacer desde una migración.

alter type public.user_role add value if not exists 'client';
