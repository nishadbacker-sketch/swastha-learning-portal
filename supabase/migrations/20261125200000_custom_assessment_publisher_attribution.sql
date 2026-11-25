-- Staff-only creator attribution for custom assessment catalogue.
-- "Published by" reflects the original created_by owner, not a separate publishing actor.
create or replace function public.get_custom_assessment_publishers()
returns table (template_id uuid, creator_name text, creator_staff_id text, creator_user_id uuid)
language sql
stable
security definer
set search_path = ''
as $function$
  select t.id, coalesce(nullif(btrim(p.full_name),''),'Unknown creator')::text,
         nullif(btrim(p.staff_code),'')::text, t.created_by
  from public.custom_assessment_templates t
  left join public.profiles p on p.id = t.created_by
  where (select auth.uid()) is not null
    and exists (
      select 1 from public.user_roles ur
      where ur.user_id = (select auth.uid())
        and (
          ur.role in ('owner','admin','clinic_admin')
          or (ur.role='teacher' and exists (
            select 1 from public.teachers staff
            where staff.user_id = ur.user_id and staff.status = 'active'
          ))
        )
    )
    and (t.status = 'published' or t.created_by = (select auth.uid())
         or exists (
           select 1 from public.user_roles ur2
           where ur2.user_id = (select auth.uid()) and ur2.role in ('owner','admin','clinic_admin')
         ));
$function$;
revoke all on function public.get_custom_assessment_publishers() from PUBLIC;
revoke all on function public.get_custom_assessment_publishers() from anon;
grant execute on function public.get_custom_assessment_publishers() to authenticated;
