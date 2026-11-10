-- =========================================================
-- Generalize leads table to support BOTH the meeting scheduler
-- and the inline contact form (#contacto), and make the Resend
-- email trigger null-safe for leads without a scheduled meeting.
-- The Resend API key is read from Supabase Vault (no plaintext in SQL).
-- =========================================================

-- 1. Make meeting-specific columns optional (the inline contact form
--    does not schedule a meeting, it only sends a message).
alter table public.leads alter column meeting_type drop not null;
alter table public.leads alter column meeting_date drop not null;
alter table public.leads alter column meeting_time drop not null;

-- 2. Track the origin of the lead and store the free-text message.
alter table public.leads add column if not exists source text not null default 'scheduler';
alter table public.leads add column if not exists message text;

-- 3. Rebuild the trigger function: null-safe, key from Vault, compact HTML.
create or replace function public.send_lead_email_via_resend()
returns trigger
language plpgsql
security definer
as $fn$
declare
  resend_api_key text;
  body_html text;
  subj text;
begin
  select decrypted_secret into resend_api_key
  from vault.decrypted_secrets where name = 'resend_api_key' limit 1;

  -- Fail safe: if the key is not in Vault, persist the lead but skip the email.
  if resend_api_key is null or resend_api_key = '' then
    return new;
  end if;

  subj := 'Nuevo lead web: ' || new.name;

  body_html := format(
    '<h3>Nuevo lead desde la web (CreAPP)</h3>'
    '<p><b>Nombre:</b> %s<br><b>Email:</b> %s<br><b>Tel/WhatsApp:</b> %s<br>'
    '<b>Origen:</b> %s<br><b>Reunion:</b> %s %s<br>'
    '<b>Presupuesto:</b> %s<br><b>Urgencia:</b> %s<br>'
    '<b>Idea/Mensaje:</b> %s</p>',
    new.name, new.email, new.phone, new.source,
    coalesce(to_char(new.meeting_date, 'DD/MM/YYYY'), '-'),
    coalesce(new.meeting_time, ''),
    coalesce(new.budget, '-'),
    coalesce(new.urgency, '-'),
    coalesce(nullif(new.idea, ''), nullif(new.message, ''), '-')
  );

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || resend_api_key
    ),
    body := jsonb_build_object(
      'from', 'CreAPP Leads <onboarding@resend.dev>',
      'to', array['creapp.ar@gmail.com'],
      'subject', subj,
      'html', body_html
    )
  );

  return new;
end;
$fn$;

-- NOTE: store the Resend key once in Supabase Vault (SQL editor):
--   select vault.create_secret('re_your_rotated_key', 'resend_api_key', 'Resend key para emails de leads');
-- To rotate later:
--   select vault.update_secret((select id from vault.secrets where name = 'resend_api_key'), 're_new_key');
-- (Rotate the previously hardcoded key immediately — it was committed to git.)
