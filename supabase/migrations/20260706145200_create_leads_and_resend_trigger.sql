-- =========================================================
-- Create leads table and Resend email trigger
-- =========================================================

-- Enable pg_net extension if not enabled (required for calling external APIs)
create extension if not exists pg_net;

-- 1. Create the leads table to persist form submissions
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  meeting_type text not null,
  meeting_date date not null,
  meeting_time text not null,
  idea text,
  budget text,
  urgency text,
  timezone text,
  created_at timestamptz not null default now()
);

-- 2. Enable Row-Level Security (RLS)
alter table public.leads enable row level security;

-- 3. Create RLS Policy to allow public INSERT (so any client on the landing page can submit the form)
create policy "Allow public inserts to leads" on public.leads
  for insert with check (true);

-- 4. Create trigger function to securely send email via Resend
create or replace function public.send_lead_email_via_resend()
returns trigger as $$
declare
  resend_api_key text := 're_51PYxQyh_GtTF4KbdeVTt9o4AHSVRF3v4';
  email_body text;
begin
  -- Build a beautifully formatted HTML email body
  email_body := '<h3>🚀 Nuevo Lead desde la Web (CreAPP)</h3>' ||
                '<p>Se ha agendado una llamada con los siguientes detalles:</p>' ||
                '<table style="width:100%; max-width:600px; border-collapse:collapse; font-family:sans-serif; color:#333;">' ||
                '  <tr style="background:#f9f9f9;"><td style="padding:8px; border:1px solid #ddd; font-weight:bold; width:150px;">Nombre</td><td style="padding:8px; border:1px solid #ddd;">' || NEW.name || '</td></tr>' ||
                '  <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Email</td><td style="padding:8px; border:1px solid #ddd;"><a href="mailto:' || NEW.email || '">' || NEW.email || '</a></td></tr>' ||
                '  <tr style="background:#f9f9f9;"><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">WhatsApp / Tel</td><td style="padding:8px; border:1px solid #ddd;"><a href="https://wa.me/' || regexp_replace(NEW.phone, '\D', '', 'g') || '">' || NEW.phone || '</a></td></tr>' ||
                '  <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Tipo Reunión</td><td style="padding:8px; border:1px solid #ddd;">' || case when NEW.meeting_type = 'video' then '🎥 Videollamada (Google Meet)' else '📞 Llamada de Voz' end || '</td></tr>' ||
                '  <tr style="background:#f9f9f9;"><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Fecha y Hora</td><td style="padding:8px; border:1px solid #ddd; font-weight:bold; color:#9B30FF;">' || to_char(NEW.meeting_date, 'DD/MM/YYYY') || ' a las ' || NEW.meeting_time || ' hs</td></tr>' ||
                '  <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Zona Horaria</td><td style="padding:8px; border:1px solid #ddd;">' || coalesce(NEW.timezone, 'No especificada') || '</td></tr>' ||
                '  <tr style="background:#f9f9f9;"><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Presupuesto</td><td style="padding:8px; border:1px solid #ddd;">' || coalesce(NEW.budget, 'No provisto') || '</td></tr>' ||
                '  <tr><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Urgencia</td><td style="padding:8px; border:1px solid #ddd;">' || coalesce(NEW.urgency, 'No provista') || '</td></tr>' ||
                '  <tr style="background:#f9f9f9;"><td style="padding:8px; border:1px solid #ddd; font-weight:bold;">Idea / Objetivo</td><td style="padding:8px; border:1px solid #ddd; font-style:italic;">' || coalesce(nullif(NEW.idea, ''), 'Sin descripción de idea.') || '</td></tr>' ||
                '</table>' ||
                '<br/><hr style="border:0; border-top:1px solid #eee;"/><p style="font-size:11px; color:#999;">Este email fue enviado automáticamente por el sistema de CreAPP.</p>';

  -- Call pg_net http_post function asynchronously
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || resend_api_key
    ),
    body := jsonb_build_object(
      'from', 'CreAPP Leads <onboarding@resend.dev>',
      'to', array['creapp.ar@gmail.com'],
      'subject', '🚀 Nuevo Lead: ' || NEW.name || ' (' || to_char(NEW.meeting_date, 'DD/MM') || ' ' || NEW.meeting_time || 'hs)',
      'html', email_body
    )
  );

  return NEW;
end;
$$ language plpgsql security definer;

-- 5. Attach the trigger to public.leads table
create trigger on_lead_inserted
  after insert on public.leads
  for each row execute function public.send_lead_email_via_resend();
