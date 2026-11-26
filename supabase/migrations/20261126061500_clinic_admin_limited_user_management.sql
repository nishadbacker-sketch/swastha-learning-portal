-- Clinic Admin can see only parent and teacher accounts, and promote a parent to teacher.
create or replace function public.clinic_admin_list_parent_teacher_accounts()
returns table (user_id uuid, full_name text, email text, staff_code text, account_role text, teacher_status text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'clinic_admin'
  ) then
    raise exception 'Clinic Admin access required' using errcode = '42501';
  end if;

  return query
  select ur.user_id, coalesce(nullif(btrim(p.full_name), ''), 'Unnamed account')::text,
         au.email::text, p.staff_code::text, ur.role::text, t.status::text
  from public.user_roles ur
  join auth.users au on au.id = ur.user_id
  left join public.profiles p on p.id = ur.user_id
  left join public.teachers t on t.user_id = ur.user_id
  where ur.role in ('parent', 'teacher')
  order by p.full_name nulls last, ur.user_id;
end;
$$;

create or replace function public.clinic_admin_promote_parent_to_teacher(p_user_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare existing_role text;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'clinic_admin'
  ) then
    raise exception 'Clinic Admin access required' using errcode = '42501';
  end if;
  if p_user_id is null or p_user_id = (select auth.uid()) then
    raise exception 'Select a different parent account' using errcode = '22023';
  end if;

  select r.role into existing_role from public.user_roles r
  where r.user_id = p_user_id for update;
  if existing_role is distinct from 'parent' then
    raise exception 'Only existing Parent accounts may be promoted to Teacher' using errcode = '42501';
  end if;

  -- Install/activate the teacher row before switching role. The existing
  -- role-change trigger then links all students automatically.
  insert into public.teachers(user_id, status)
  values (p_user_id, 'active')
  on conflict (user_id) do update set status = 'active';

  update public.user_roles set role = 'teacher' where user_id = p_user_id and role = 'parent';
  if not found then
    raise exception 'Parent role changed concurrently; promotion cancelled' using errcode = '40001';
  end if;
  return 'Parent promoted to active Teacher';
end;
$$;

revoke execute on function public.clinic_admin_list_parent_teacher_accounts() from public, anon, authenticated;
revoke execute on function public.clinic_admin_promote_parent_to_teacher(uuid) from public, anon, authenticated;
grant execute on function public.clinic_admin_list_parent_teacher_accounts() to authenticated;
grant execute on function public.clinic_admin_promote_parent_to_teacher(uuid) to authenticated;
