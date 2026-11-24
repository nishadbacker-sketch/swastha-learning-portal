-- Phase 2 — Super Admin notification history
-- Applied and verified in swastha-learning-staging on 2026-11-24.
-- Apply to production only after the UI and role-isolation checks pass.
-- Additive SELECT-only policies; retain original recipient-only policies.

begin;
create policy "Super Admin reads notification event history"
on public.portal_notification_events for select to authenticated
using (public.has_role('admin') or public.has_role('owner'));

create policy "Super Admin reads staff notification acknowledgements"
on public.staff_notification_acknowledgements for select to authenticated
using (public.has_role('admin') or public.has_role('owner'));
commit;

-- Verify:
-- select tablename,policyname,cmd,qual from pg_policies
-- where schemaname='public' and tablename in
-- ('portal_notification_events','staff_notification_acknowledgements');
