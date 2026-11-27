-- Draft only. Apply to the Swastha portal database before deploying /free-assessment.
-- Public screening submissions get a NEW pending student ID. A guardian's phone
-- is a matching hint only; it never authenticates access to an existing child.
create table if not exists public.child_screening_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  appointment_enquiry_id uuid not null unique references public.appointment_enquiries(id) on delete restrict,
  guardian_whatsapp text not null,
  responses jsonb not null,
  source text not null default 'public_free_screening',
  completed_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  constraint screening_responses_object check (jsonb_typeof(responses) = 'object')
);
create index if not exists child_screening_student_idx on public.child_screening_submissions(student_id,completed_at desc);
create index if not exists child_screening_whatsapp_idx on public.child_screening_submissions(guardian_whatsapp);
alter table public.child_screening_submissions enable row level security;
revoke all on public.child_screening_submissions from anon,authenticated;
-- No anonymous or general authenticated access to answers. Later staff/parent
-- reports must use verified, role- and student-scoped policies or server endpoints.

create or replace function public.swastha_record_public_screening(p_request jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_enquiry uuid;
  v_student uuid;
  v_code text;
  v_submission uuid;
  v_answers jsonb := p_request->'screening_answers';
begin
  if jsonb_typeof(v_answers) is distinct from 'object'
     or (select count(*) from jsonb_each_text(v_answers)) <> 25
     or exists (
       select 1 from jsonb_each_text(v_answers) a
       where a.key !~ '^(?:[1-9]|1[0-9]|2[0-5])$'
       or a.value not in ('yes','sometimes','no')
     ) then
    raise exception 'Invalid questionnaire';
  end if;
  -- Single transaction: appointment, permanent student ID, and all answers.
  -- A phone number can be shared by siblings and is not a secure identifier.
  insert into public.appointment_enquiries
    (submission_key,guardian_name,whatsapp_number,contact_differs,contact_number,
     child_name,date_of_birth,age_range,current_class,preferred_date,preferred_time,
     reason,consent,source)
  values (
    (p_request->>'submission_key')::uuid,p_request->>'guardian_name',p_request->>'whatsapp_number',
    coalesce((p_request->>'contact_differs')::boolean,false),nullif(p_request->>'contact_number',''),
    p_request->>'child_name',(p_request->>'date_of_birth')::date,nullif(p_request->>'age_range',''),
    p_request->>'current_class',nullif(p_request->>'preferred_date','')::date,
    nullif(p_request->>'preferred_time',''),p_request->>'reason',true,
    p_request->>'source'
  ) returning id into v_enquiry;
  insert into public.students (full_name,date_of_birth,current_class,preferred_language,status)
  values (p_request->>'child_name',(p_request->>'date_of_birth')::date,p_request->>'current_class','en','pending')
  returning id,student_code into v_student,v_code;
  insert into public.child_screening_submissions
    (student_id,appointment_enquiry_id,guardian_whatsapp,responses)
  values (v_student,v_enquiry,p_request->>'whatsapp_number',v_answers)
  returning id into v_submission;
  return jsonb_build_object('student_code',v_code,'screening_id',v_submission);
end;
$$;
revoke execute on function public.swastha_record_public_screening(jsonb) from public,anon,authenticated;
grant execute on function public.swastha_record_public_screening(jsonb) to service_role;

-- When a clinic staff member verifies and links an enquiry to an established
-- parent/student record, move the screening to that permanent student ID.
-- Do not delete or overwrite either student's historical records.
create or replace function public.swastha_relink_screening_after_verified_appointment()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.child_screening_submissions
     set student_id = NEW.student_id
   where appointment_enquiry_id = NEW.enquiry_id
     and student_id is distinct from NEW.student_id;
  return NEW;
end;
$$;
revoke execute on function public.swastha_relink_screening_after_verified_appointment() from public,anon,authenticated;
drop trigger if exists swastha_verified_appointment_screening_relink on public.appointment_registration_links;
create trigger swastha_verified_appointment_screening_relink
after insert or update of student_id on public.appointment_registration_links
for each row execute function public.swastha_relink_screening_after_verified_appointment();
