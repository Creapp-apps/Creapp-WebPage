-- Habilita Realtime en los mensajes de contenido (Plan 5, fusión Creador -> CreAPP).
-- Idempotente: agrega la tabla a la publicación supabase_realtime solo si
-- todavía no está. Se puede correr más de una vez sin error.

do $$
begin
  -- content_messages: mensajes del hilo de cada pieza (se reflejan al instante en el panel).
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'content_messages'
  ) then
    alter publication supabase_realtime add table public.content_messages;
  end if;
end $$;
