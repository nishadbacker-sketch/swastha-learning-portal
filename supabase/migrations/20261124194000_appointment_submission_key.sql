alter table public.appointment_enquiries
  add column if not exists submission_key uuid;
create unique index if not exists appointment_enquiries_submission_key_uq
  on public.appointment_enquiries (submission_key)
  where submission_key is not null;
-- Unique non-null request keys prevent a repeated browser request from
-- creating another appointment or notification; preexisting rows stay NULL.