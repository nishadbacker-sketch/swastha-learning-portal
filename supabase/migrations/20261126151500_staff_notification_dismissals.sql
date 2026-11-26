-- Per-recipient dismissal of transient staff top-bar appointment alerts.
-- Does not alter or delete any appointment, follow-up, notification event, or history record.
create table if not exists public.staff_notification_dismissals (
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_key text not null,
  cleared_at timestamptz not null default now(),
  primary key (user_id, alert_key),
  constraint staff_notification_dismissals_alert_key_nonempty check (char_length(alert_key) between 1 and 180)
);
alter table public.staff_notification_dismissals enable row level security;
create policy "Staff read own dismissed notifications"
  on public.staff_notification_dismissals for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Staff dismiss own notifications"
  on public.staff_notification_dismissals for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists(select 1 from public.user_roles r where r.user_id = (select auth.uid())
      and r.role in ('owner','admin','clinic_admin','teacher'))
  );
grant select, insert on public.staff_notification_dismissals to authenticated;
revoke all on public.staff_notification_dismissals from anon;
