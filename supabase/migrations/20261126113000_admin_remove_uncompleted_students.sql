-- Admin-only soft removal for students without completed assessments/courses.
-- Retains permanent student IDs, clinical history, drafts and financial records.
alter table public.students
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by uuid;

create or replace function public.admin_remove_uncompleted_student(p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_code text;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.user_roles r
    where r.user_id = (select auth.uid())
      and r.role in ('owner', 'admin', 'clinic_admin')
  ) then
    raise exception 'Only an authorized administrator may remove a student'
      using errcode = '42501';
  end if;

  select s.full_name, s.student_code
    into v_name, v_code
  from public.students s where s.id=p_student_id and s.removed_at is null
  for update;

  if not found then
    raise exception 'Student not found or already removed'
      using errcode = 'P0002';
  end if;

  -- A submitted or reviewed assessment counts as completed for retention.
  if exists (
    select 1 from public.assessment_assignments a
    where a.student_id=p_student_id
      and lower(a.status) in ('submitted','reviewed','approved','completed','complete')
  ) or exists (
    select 1 from public.assessment_results r
    join public.assessment_assignments a on a.id=r.assignment_id
    where a.student_id=p_student_id
  ) or exists (
    select 1 from public.custom_assessment_assignments a
    where a.student_id=p_student_id
      and (lower(a.status) in ('submitted','reviewed','approved','completed','complete') or a.reviewed_at is not null)
  ) or exists (
    select 1 from public.staff_assessment_sessions a
    where a.student_id=p_student_id
      and (a.submitted_at is not null or lower(a.status) in ('submitted','reviewed','completed','complete'))
  ) or exists (
    select 1 from public.assessment_completion_certificates c
    where c.student_id=p_student_id
  ) then
    raise exception 'Removal blocked: student has completed or submitted assessments. History must be retained'
      using errcode = '23514';
  end if;

  if exists (
    select 1 from public.course_completion_certificates c
    where c.student_id=p_student_id
  ) or exists (
    select 1 from public.registrations r
    where r.student_id=p_student_id
      and lower(r.status) in ('completed','complete')
  ) or exists (
    select 1 from public.student_activity_assignments a
    where a.student_id=p_student_id and lower(a.status) in ('completed','complete')
  ) or exists (
    select 1 from public.payments p
    join public.registrations r on r.id=p.registration_id
    where r.student_id=p_student_id and lower(p.status) in ('paid','captured','success','completed')
  ) then
    raise exception 'Removal blocked: student has a completed course, activity or payment record'
      using errcode = '23514';
  end if;

  -- Archive instead of deleting: student code, assessments, clinical notes,
  -- appointment history and other records are retained intact.
  update public.students
  set removed_at=now(), removed_by=(select auth.uid()), status='inactive'
  where id=p_student_id;

  -- Stop active parent/student and teacher/student access. No student,
  -- assessment, course or clinical history row is deleted.
  delete from public.parent_student_links where student_id=p_student_id;
  delete from public.teacher_assignments where student_id=p_student_id;

  insert into public.admin_audit_events(event_type,action,subject_id,actor_id,detail)
  values ('student_account','removed_from_active_use',p_student_id::text,(select auth.uid()),
    'Student '||coalesce(v_code,'')||' ('||v_name||') removed from active use. Historical records retained.');
  return 'Student removed from active use. All historical records retained.';
end;
$$;
revoke execute on function public.admin_remove_uncompleted_student(uuid) from public, anon, authenticated;
grant execute on function public.admin_remove_uncompleted_student(uuid) to authenticated;
