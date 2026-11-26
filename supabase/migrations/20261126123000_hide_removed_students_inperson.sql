-- Exclude archived students from new in-person assessments, preserving historical sessions.
CREATE OR REPLACE FUNCTION public.staff_assessment_students()
 RETURNS TABLE(student_id uuid, student_code text, student_name text, current_class text, date_of_birth date, preferred_language text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if (select auth.uid()) is null or not exists
 (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin','clinic_admin','teacher'))
 then raise exception 'Staff access required' using errcode='42501'; end if;
 return query select s.id,s.student_code,s.full_name,s.current_class,s.date_of_birth,s.preferred_language
 from public.students s where s.removed_at is null and public.staff_assessment_can_access(s.id)
 order by s.full_name,s.id limit 3000;
end;
$function$
;

-- Prevent stale clients from starting sessions for archived students.
CREATE OR REPLACE FUNCTION public.staff_assessment_start(p_student_id uuid, p_kind text, p_level text, p_template_id uuid, p_question_ids text[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_class text; v_grade integer; v_expected text; v_questions text[]; 
begin
 if not public.staff_assessment_can_access(p_student_id) then
  raise exception 'Student not found or staff access denied' using errcode='42501'; end if;
 if exists(select 1 from public.students s where s.id=p_student_id and s.removed_at is not null) then
  raise exception 'This student was removed from active use and cannot start new assessments' using errcode='23514';
 end if;
 select current_class into v_class from public.students where id=p_student_id;
 v_grade := (regexp_match(coalesce(v_class,''),'[0-9]+'))[1]::integer;
 v_expected := case when v_grade between 1 and 4 then 'LP'
                    when v_grade between 5 and 7 then 'UP'
                    when v_grade between 8 and 10 then 'HS'
                    when v_grade between 11 and 12 then 'HSS'
                    else null end;
 if v_expected is null or p_level is distinct from v_expected then
  raise exception 'The assessment level must match the student class (1–12)'; end if;
 if p_kind not in ('standard','custom') then raise exception 'Unsupported assessment type'; end if;
 if p_kind='custom' then
  if p_template_id is null or not exists(
   select 1 from public.custom_assessment_templates t
   where t.id=p_template_id and t.status='published'
     and (lower(t.level)='all' or upper(t.level)=p_level)
  ) then raise exception 'Published template does not match student class'; end if;
  select array_agg(q->>'id') into v_questions
   from public.custom_assessment_templates t,
    lateral jsonb_array_elements(t.structure) sec,
    lateral jsonb_array_elements(sec->'categories') cat,
    lateral jsonb_array_elements(cat->'questions') q
   where t.id=p_template_id;
  if v_questions is null then raise exception 'Template has no questions'; end if;
 else
  if p_template_id is not null then raise exception 'Standard assessment cannot use a custom template'; end if;
  v_questions:=p_question_ids;
  if v_questions is null or cardinality(v_questions) not between 1 and 350
   or exists(select 1 from unnest(v_questions) key where key !~ ('^'||p_level||'_[A-Za-z0-9]+_[0-9]+$'))
   or (select count(distinct key) from unnest(v_questions) key)<>cardinality(v_questions)
  then raise exception 'Invalid standard question list'; end if;
 end if;
 if cardinality(v_questions) not between 1 and 350 then raise exception 'Invalid question count'; end if;
 insert into public.staff_assessment_sessions
 (student_id,assessment_kind,assessment_level,template_id,question_ids,created_by,updated_by)
 values(p_student_id,p_kind,p_level,p_template_id,v_questions,(select auth.uid()),(select auth.uid()))
 returning id into v_id;
 return v_id;
end;
$function$
;
