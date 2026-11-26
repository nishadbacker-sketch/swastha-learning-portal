-- Allow staff to remove an unused Parent login even when the Parent
-- was linked to a child. The child, assessments, teacher assignments and
-- Swastha student code must never be deleted.
-- The completed-course retention rule is preserved for every linked student.
create or replace function public.staff_remove_unused_parent_account(p_user_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare v_role text; v_child_links integer;
begin
 if (select auth.uid()) is null or not exists (
  select 1 from public.user_roles caller
  where caller.user_id=(select auth.uid())
    and caller.role in ('owner','admin','clinic_admin')
 ) then
  raise exception 'Only Owner, Super Admin or Admin may remove unused Parent accounts' using errcode='42501';
 end if;
 if p_user_id is null or p_user_id=(select auth.uid()) then
  raise exception 'Choose a different Parent account' using errcode='22023';
 end if;
 select ur.role into v_role from public.user_roles ur
  where ur.user_id=p_user_id for update;
 if v_role is distinct from 'parent' then
  raise exception 'Only Parent accounts may be removed' using errcode='42501';
 end if;
 -- Parent retention is mandatory once ANY linked student has a completed course.
 -- Check all currently linked children and registrations BEFORE cascading
 -- guardian links, inside the same locked database transaction.
 if exists (
   select 1 from public.course_completion_certificates cc
    where cc.registration_id in (
       select r.id from public.registrations r where r.parent_user_id=p_user_id
    )
    or cc.student_id in (
       select l.student_id from public.parent_student_links l where l.parent_user_id=p_user_id
    )
 ) or exists (
   select 1 from public.registrations r
   where r.parent_user_id=p_user_id
     and lower(r.status) in ('completed','complete')
 ) then
  raise exception 'Removal blocked: Parent has a completed course. Completed-course accounts must be retained' using errcode='23514';
 end if;
 -- Registration/payment/appointment relationships must not be silently
 -- detached; retain accounts with those records for manual review.
 if exists(select 1 from public.registrations where parent_user_id=p_user_id)
   or exists(select 1 from public.appointment_registration_links where parent_user_id=p_user_id)
 then
   raise exception 'Removal blocked: Parent has a registration or appointment link requiring review' using errcode='23514';
 end if;
 select count(*) into v_child_links from public.parent_student_links
   where parent_user_id=p_user_id;
 -- auth.users deletion cascades only this Parent's guardian links, profile,
 -- and session metadata. It does NOT delete public.students; their permanent
 -- student codes and teachers/assessment/clinical history remain intact.
 -- Other retained FKs with RESTRICT/NO ACTION still block deletion atomically.
 delete from auth.users where id=p_user_id;
 if not found then
  raise exception 'Parent authentication account not found' using errcode='P0002';
 end if;
 insert into public.admin_audit_events(event_type,action,subject_id,actor_id,detail)
 values('parent_account','removed',p_user_id::text,(select auth.uid()),
   'Parent login removed; '||v_child_links::text||' guardian links detached. Student profiles retained.');
 return 'Parent account removed. Student profile and historical records retained.';
end;
$$;
revoke execute on function public.staff_remove_unused_parent_account(uuid) from public,anon,authenticated;
grant execute on function public.staff_remove_unused_parent_account(uuid) to authenticated;
