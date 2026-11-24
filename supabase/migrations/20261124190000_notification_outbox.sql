-- Swastha Phase 2: private, fail-closed outbox for appointment staff alerts.
-- Does not send messages, alter historical records, or touch existing linkage triggers.
create schema if not exists swastha_private;
revoke all on schema swastha_private from PUBLIC, anon, authenticated;
grant usage on schema swastha_private to service_role;

create table if not exists swastha_private.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('appointment_enquiry_received')),
  entity_id uuid not null,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0 and attempt_count <= 10),
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  unique (event_type, entity_id)
);
create index if not exists notification_outbox_due_idx on swastha_private.notification_outbox (next_attempt_at, created_at) where status in ('pending','failed');
alter table swastha_private.notification_outbox enable row level security;
revoke all on swastha_private.notification_outbox from PUBLIC, anon, authenticated;
grant select,insert,update on swastha_private.notification_outbox to service_role;

create or replace function swastha_private.queue_appointment_staff_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into swastha_private.notification_outbox(event_type,entity_id)
  values ('appointment_enquiry_received',new.id)
  on conflict (event_type,entity_id) do nothing;
  return new;
end;
$$;
revoke all on function swastha_private.queue_appointment_staff_notification() from PUBLIC,anon,authenticated;
-- PostgreSQL fires triggers under the table owner's trusted function context.
drop trigger if exists swastha_queue_appointment_staff_notification on public.appointment_enquiries;
create trigger swastha_queue_appointment_staff_notification
after insert on public.appointment_enquiries
for each row execute function swastha_private.queue_appointment_staff_notification();
