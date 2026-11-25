-- Restricted email lookup for the existing Creator / Super Admin User Management screen.
-- Registered addresses are stored in auth.users, not public.profiles.
create or replace function public.get_managed_user_emails()
returns table(user_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $function$
  select au.id, au.email::text
  from auth.users as au
  join public.user_roles as target_role on target_role.user_id = au.id
  where (select auth.uid()) is not null
    and exists (
      select 1 from public.user_roles as caller_role
      where caller_role.user_id = (select auth.uid())
        and caller_role.role in ('owner', 'admin')
    )
    and (
      exists (
        select 1 from public.user_roles as caller_role
        where caller_role.user_id = (select auth.uid())
          and caller_role.role = 'owner'
      )
      or (
        target_role.role <> 'owner'
      )
    );
$function$;

revoke all on function public.get_managed_user_emails() from public;
revoke all on function public.get_managed_user_emails() from anon;
grant execute on function public.get_managed_user_emails() to authenticated;
