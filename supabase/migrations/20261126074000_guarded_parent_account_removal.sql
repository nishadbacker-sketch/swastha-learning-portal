-- Parent-account removal is limited to UNUSED accounts. Never remove an
-- account once its child's course has completed or clinical records exist.
-- Student records, course certificates, and assessment history are preserved.
create or replace function public.staff_remove_unused_parent_account(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v_role text;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.user_roles caller
    where caller.user_id = (select auth.uid())
      and caller.role in ('owner', 'admin', 'clinic_admin')
  ) then
    raise exception 'Only Owner, Super Admin or Admin may remove unused Parent accounts'
      using errcode = '42501';
  end if;

  if p_user_id is null or p_user_id = (select auth.uid()) then
    raise exception 'Choose a different Parent account' using errcode = '22023';
  end if;

  select ur.role into v_role
  from public.user_roles ur
  where ur.user_id = p_user_id
  for update;

  if v_role is distinct from 'parent' then
    raise exception 'Only Parent accounts may be removed' using errcode = '42501';
  end if;

  -- Permanently disallow removal for any parent with completed courses.
  -- Use both student and registration relations to capture historical links.
  if exists (
    select 1 from public.course_completion_certificates cc
    where cc.registration_id in (
      select r.id from public.registrations r where r.parent_user_id = p_user_id
    )
    or cc.student_id in (
      select l.student_id from public.parent_student_links l where l.parent_user_id = p_user_id
    )
  ) or exists (
    select 1 from public.registrations r
    where r.parent_user_id = p_user_id and lower(r.status) in ('completed', 'complete')
  ) then
    raise exception 'Removal blocked: this Parent has a completed course. Completed-course accounts must be retained'
      using errcode = '23514';
  end if;

  -- For safety, other child/financial/assessment records also prevent
  -- account deletion; removing a guardian must never orphan a child's
  -- learning history or compromise financial records.
  if exists (select 1 from public.parent_student_links where parent_user_id = p_user_id)
    or exists (select 1 from public.registrations where parent_user_id = p_user_id)
    or exists (select 1 from public.appointment_registration_links where parent_user_id = p_user_id)
  then
    raise exception 'Removal blocked: this Parent is linked to a child or registration. Preserve the child history and review the account manually'
      using errcode = '23514';
  end if;

  -- Foreign-key RESTRICT/NO ACTION constraints remain in force.
  -- If any other retained record depends on the account, the transaction
  -- fails atomically rather than deleting those retained records.
  delete from auth.users where id = p_user_id;
  if not found then
    raise exception 'Parent authentication account not found' using errcode = 'P0002';
  end if;

  return 'Unused Parent account removed';
end;
$$;

revoke execute on function public.staff_remove_unused_parent_account(uuid)
  from public, anon, authenticated;
grant execute on function public.staff_remove_unused_parent_account(uuid)
  to authenticated;
