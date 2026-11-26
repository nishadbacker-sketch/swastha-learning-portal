
-- Independent staff-led delivery; Parent assignments, results and review workflow
-- are not modified. Staff-only sessions protect evaluations and child answers.
create table if not exists public.staff_student_intakes (
  student_id uuid primary key references public.students(id) on delete restrict,
  guardian_name text,
  guardian_phone text,
  consent_recorded boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.staff_student_intakes enable row level security;

create table if not exists public.staff_assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  assessment_kind text not null check (assessment_kind in ('standard','custom')),
  assessment_level text not null check (assessment_level in ('LP','UP','HS','HSS')),
  template_id uuid references public.custom_assessment_templates(id) on delete restrict,
  question_ids text[] not null default '{}'::text[],
  answers jsonb not null default '{}'::jsonb,
  evaluation text not null default '',
  strengths text not null default '',
  support_needs text not null default '',
  recommendations text not null default '',
  status text not null default 'draft' check (status in ('draft','submitted')),
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  constraint staff_assessment_kind_template check (
    (assessment_kind='standard' and template_id is null)
    or (assessment_kind='custom' and template_id is not null)
  ),
  constraint staff_assessment_answers_object check (jsonb_typeof(answers)='object'),
  constraint staff_assessment_question_count check (cardinality(question_ids) between 1 and 350)
);
create index if not exists staff_assessments_by_student_idx on public.staff_assessment_sessions(student_id,created_at desc);
create index if not exists staff_assessments_by_created_idx on public.staff_assessment_sessions(created_by,created_at desc);
alter table public.staff_assessment_sessions enable row level security;

-- SECURITY DEFINER RPCs use an explicit caller/target check.
create or replace function public.staff_assessment_can_access(p_student_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select (select auth.uid()) is not null
   and (
     exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin','clinic_admin'))
     or exists(
       select 1 from public.user_roles r
       join public.teachers t on t.user_id=r.user_id and t.status='active'
       join public.teacher_assignments ta on ta.teacher_id=t.id
       where r.user_id=(select auth.uid()) and r.role='teacher' and ta.student_id=p_student_id
     )
   );
$$;

create or replace function public.staff_assessment_create_student(
 p_full_name text, p_date_of_birth date, p_current_class text,
 p_language text, p_guardian_name text, p_guardian_phone text, p_consent boolean
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_id uuid;
begin
 if (select auth.uid()) is null or not exists (
   select 1 from public.user_roles r where r.user_id=(select auth.uid())
     and r.role in ('owner','admin','clinic_admin','teacher')
 ) or (exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role='teacher')
   and not exists(select 1 from public.teachers t where t.user_id=(select auth.uid()) and t.status='active'))
 then raise exception 'Only active staff can create student profiles' using errcode='42501'; end if;
 if coalesce(p_consent,false)=false then raise exception 'Guardian consent must be recorded'; end if;
 if length(btrim(coalesce(p_full_name,''))) not between 2 and 150
   or length(btrim(coalesce(p_current_class,''))) not between 1 and 80
   or p_language not in ('en','ml')
   or p_date_of_birth is null or p_date_of_birth > current_date
 then raise exception 'Enter valid student name, date of birth, class and language'; end if;
 if length(coalesce(p_guardian_name,''))>150 or length(coalesce(p_guardian_phone,''))>30
 then raise exception 'Guardian information is too long'; end if;
 insert into public.students(student_code,full_name,date_of_birth,current_class,preferred_language,status)
 values ('',btrim(p_full_name),p_date_of_birth,btrim(p_current_class),p_language,'active')
 returning id into v_id;
 insert into public.staff_student_intakes(student_id,guardian_name,guardian_phone,consent_recorded,created_by)
 values(v_id,nullif(btrim(coalesce(p_guardian_name,'')),''),
   nullif(btrim(coalesce(p_guardian_phone,'')),''),true,(select auth.uid()));
 return v_id;
end;
$$;

create or replace function public.staff_assessment_students()
returns table(student_id uuid,student_code text,student_name text,current_class text,date_of_birth date,preferred_language text)
language plpgsql stable security definer set search_path=''
as $$
begin
 if (select auth.uid()) is null or not exists
 (select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role in ('owner','admin','clinic_admin','teacher'))
 then raise exception 'Staff access required' using errcode='42501'; end if;
 return query select s.id,s.student_code,s.full_name,s.current_class,s.date_of_birth,s.preferred_language
 from public.students s where public.staff_assessment_can_access(s.id)
 order by s.full_name,s.id limit 3000;
end;
$$;

create or replace function public.staff_assessment_start(
 p_student_id uuid,p_kind text,p_level text,p_template_id uuid,p_question_ids text[]
) returns uuid language plpgsql security definer set search_path=''
as $$
declare v_id uuid; v_class text; v_grade integer; v_expected text; v_questions text[]; 
begin
 if not public.staff_assessment_can_access(p_student_id) then
  raise exception 'Student not found or staff access denied' using errcode='42501'; end if;
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
$$;

create or replace function public.staff_assessment_sessions_list()
returns table(id uuid,student_id uuid,student_name text,student_code text,
 assessment_kind text,assessment_level text,template_id uuid,status text,created_at timestamptz,submitted_at timestamptz)
language plpgsql stable security definer set search_path=''
as $$
begin
 if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
 return query select x.id,x.student_id,s.full_name,s.student_code,
 x.assessment_kind,x.assessment_level,x.template_id,x.status,x.created_at,x.submitted_at
 from public.staff_assessment_sessions x join public.students s on s.id=x.student_id
 where public.staff_assessment_can_access(x.student_id)
 order by x.created_at desc limit 500;
end;
$$;

create or replace function public.staff_assessment_session_get(p_id uuid)
returns table(id uuid,student_id uuid,student_name text,student_code text,current_class text,
 assessment_kind text,assessment_level text,template_id uuid,question_ids text[],
 answers jsonb,evaluation text,strengths text,support_needs text,recommendations text,status text,submitted_at timestamptz)
language plpgsql stable security definer set search_path=''
as $$
begin
 return query select x.id,x.student_id,s.full_name,s.student_code,s.current_class,
 x.assessment_kind,x.assessment_level,x.template_id,x.question_ids,
 x.answers,x.evaluation,x.strengths,x.support_needs,x.recommendations,x.status,x.submitted_at
 from public.staff_assessment_sessions x join public.students s on s.id=x.student_id
 where x.id=p_id and public.staff_assessment_can_access(x.student_id);
end;
$$;

create or replace function public.staff_assessment_save(
 p_id uuid,p_answers jsonb,p_evaluation text,p_strengths text,
 p_support_needs text,p_recommendations text,p_submit boolean default false
) returns text language plpgsql security definer set search_path=''
as $$
declare v record; entry record; v_required_id text; v_answer jsonb; v_kind text;
begin
 select * into v from public.staff_assessment_sessions where id=p_id for update;
 if not found or not public.staff_assessment_can_access(v.student_id) then
  raise exception 'Session not found or permission denied' using errcode='42501'; end if;
 if v.status<>'draft' then raise exception 'Submitted assessments are locked'; end if;
 if p_answers is null or jsonb_typeof(p_answers)<>'object' or length(p_answers::text)>250000
 then raise exception 'Invalid assessment answers'; end if;
 if length(coalesce(p_evaluation,''))>5000 or length(coalesce(p_strengths,''))>4000
 or length(coalesce(p_support_needs,''))>4000 or length(coalesce(p_recommendations,''))>5000
 then raise exception 'Evaluation text too long'; end if;
 for entry in select key,value from jsonb_each(p_answers) loop
   if not (entry.key=any(v.question_ids)) or jsonb_typeof(entry.value)<>'object' then
    raise exception 'Unexpected question answer'; end if;
   if length(coalesce(entry.value->>'observation',''))>2000
     or length(coalesce(entry.value->>'written_answer',''))>5000 then
    raise exception 'Question observation is too long'; end if;
   if entry.value ? 'score' and entry.value->>'score' is not null
     and entry.value->>'score' not in ('0','1','2','3','NA') then
    raise exception 'Rating must be 0–3 or NA'; end if;
 end loop;
 if coalesce(p_submit,false) then
  if length(btrim(coalesce(p_evaluation,'')))<10 then
   raise exception 'Enter a meaningful assessor evaluation (10+ characters)'; end if;
  foreach v_required_id in array v.question_ids loop
   v_answer:=p_answers->v_required_id;
   if v_answer is null then raise exception 'Answer all questions before submitting'; end if;
   if v.assessment_kind='standard' then
    if v_answer->>'score' not in ('0','1','2','3','NA') or v_answer->>'score' is null
     then raise exception 'A rating or NA is required for every standard question'; end if;
   else
    -- The published template is immutable; verify the response type from it.
    select coalesce(q->>'response_type','rating') into v_kind
      from public.custom_assessment_templates t,
       lateral jsonb_array_elements(t.structure) sec,
       lateral jsonb_array_elements(sec->'categories') cat,
       lateral jsonb_array_elements(cat->'questions') q
      where t.id=v.template_id and q->>'id'=v_required_id limit 1;
    if v_kind='written' and length(btrim(coalesce(v_answer->>'written_answer','')))=0
      then raise exception 'Written answer missing'; end if;
    if v_kind='rating' and (v_answer->>'score' not in ('0','1','2','3','NA') or v_answer->>'score' is null)
      then raise exception 'Rating missing'; end if;
    if v_kind='multiple_choice' and not exists (
       select 1 from public.custom_assessment_templates t,
        lateral jsonb_array_elements(t.structure) sec,
        lateral jsonb_array_elements(sec->'categories') cat,
        lateral jsonb_array_elements(cat->'questions') q,
        lateral jsonb_array_elements(q->'options') opt
       where t.id=v.template_id and q->>'id'=v_required_id and opt->>'id'=v_answer->>'choice'
    ) then raise exception 'Choose a valid option'; end if;
   end if;
  end loop;
 end if;
 update public.staff_assessment_sessions
 set answers=p_answers,evaluation=coalesce(p_evaluation,''),strengths=coalesce(p_strengths,''),
 support_needs=coalesce(p_support_needs,''),recommendations=coalesce(p_recommendations,''),
 status=case when p_submit then 'submitted' else 'draft' end,
 submitted_at=case when p_submit then now() else null end,
 updated_at=now(),updated_by=(select auth.uid())
 where id=p_id;
 return case when p_submit then 'submitted' else 'draft' end;
end;
$$;

revoke all on public.staff_student_intakes from anon,authenticated;
revoke all on public.staff_assessment_sessions from anon,authenticated;
revoke execute on function public.staff_assessment_can_access(uuid) from public,anon;
revoke execute on function public.staff_assessment_create_student(text,date,text,text,text,text,boolean) from public,anon;
revoke execute on function public.staff_assessment_students() from public,anon;
revoke execute on function public.staff_assessment_start(uuid,text,text,uuid,text[]) from public,anon;
revoke execute on function public.staff_assessment_sessions_list() from public,anon;
revoke execute on function public.staff_assessment_session_get(uuid) from public,anon;
revoke execute on function public.staff_assessment_save(uuid,jsonb,text,text,text,text,boolean) from public,anon;
grant execute on function public.staff_assessment_can_access(uuid) to authenticated;
grant execute on function public.staff_assessment_create_student(text,date,text,text,text,text,boolean) to authenticated;
grant execute on function public.staff_assessment_students() to authenticated;
grant execute on function public.staff_assessment_start(uuid,text,text,uuid,text[]) to authenticated;
grant execute on function public.staff_assessment_sessions_list() to authenticated;
grant execute on function public.staff_assessment_session_get(uuid) to authenticated;
grant execute on function public.staff_assessment_save(uuid,jsonb,text,text,text,text,boolean) to authenticated;
