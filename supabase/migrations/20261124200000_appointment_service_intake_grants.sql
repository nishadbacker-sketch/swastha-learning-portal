-- Allow the server-only service role to save validated appointments.
-- Explicitly preserve the existing anon/authenticated restrictions.
grant select, insert on table public.appointment_enquiries to service_role;
