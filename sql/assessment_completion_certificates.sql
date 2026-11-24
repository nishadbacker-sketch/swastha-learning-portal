-- Review-gated completion certificate for a real, approved standard assessment.
-- Additive independent of existing course certificate records.
BEGIN;
CREATE TABLE public.assessment_completion_certificates(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 assignment_id uuid NOT NULL UNIQUE REFERENCES public.assessment_assignments(id),
 student_id uuid NOT NULL REFERENCES public.students(id),
 reference_code text NOT NULL UNIQUE DEFAULT ('SLA-'||upper(replace(gen_random_uuid()::text,'-',''))),
 student_name text NOT NULL,
 student_code text NOT NULL,
 assessment_title text NOT NULL,
 assessment_level text NOT NULL,
 completion_date date NOT NULL,
 issued_at timestamptz NOT NULL DEFAULT now(),
 issued_by uuid NOT NULL REFERENCES auth.users(id),
 programme_coordinator text NOT NULL,
 approving_director text NOT NULL,
 revoked_at timestamptz,
 CONSTRAINT assessment_completion_ref_format CHECK(reference_code ~ '^SLA-[A-F0-9]{32}$'),
 CONSTRAINT assessment_completion_text_valid CHECK(
  length(btrim(student_name))>0 AND length(btrim(student_code))>0
  AND length(btrim(assessment_title))>0 AND length(btrim(programme_coordinator))>1
  AND length(btrim(approving_director))>1
 )
);
ALTER TABLE public.assessment_completion_certificates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assessment_completion_certificates FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.assessment_completion_certificates TO authenticated;

CREATE POLICY "Parents read linked issued assessment completion certificates"
 ON public.assessment_completion_certificates FOR SELECT TO authenticated
 USING(revoked_at IS NULL AND EXISTS(
  SELECT 1 FROM public.parent_student_links l
  WHERE l.student_id=assessment_completion_certificates.student_id
  AND l.parent_user_id=(SELECT auth.uid())
 ));
CREATE POLICY "Authorised staff read assessment completion certificates"
 ON public.assessment_completion_certificates FOR SELECT TO authenticated
 USING(public.has_role('admin') OR public.has_role('clinic_admin')
  OR (public.has_role('teacher') AND EXISTS(
   SELECT 1 FROM public.teachers t
   JOIN public.teacher_assignments ta ON ta.teacher_id=t.id
   WHERE t.user_id=(SELECT auth.uid()) AND t.status='active'
   AND ta.student_id=assessment_completion_certificates.student_id
  )));
CREATE OR REPLACE FUNCTION public.issue_assessment_completion_certificate(
 p_assignment_id uuid,p_coordinator_name text,p_director_name text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE a public.assessment_assignments%ROWTYPE; s public.students%ROWTYPE;
 reviewed_date date; certificate_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role('admin') OR public.has_role('clinic_admin')) THEN
  RAISE EXCEPTION 'Only authorised clinic administrators may issue certificates';
 END IF;
 IF length(btrim(coalesce(p_coordinator_name,'')))<2 OR length(btrim(coalesce(p_director_name,'')))<2
 OR length(p_coordinator_name)>120 OR length(p_director_name)>120 THEN
  RAISE EXCEPTION 'Official Coordinator and Director names are required';
 END IF;
 SELECT * INTO a FROM public.assessment_assignments WHERE id=p_assignment_id FOR UPDATE;
 IF NOT FOUND OR a.status<>'reviewed' THEN
  RAISE EXCEPTION 'Teacher-reviewed standard assessment required';
 END IF;
 SELECT r.reviewed_at::date INTO reviewed_date
 FROM public.assessment_results r
 WHERE r.assignment_id=a.id AND r.reviewed_at IS NOT NULL
 ORDER BY r.reviewed_at DESC LIMIT 1;
 IF reviewed_date IS NULL OR reviewed_date>current_date THEN
  RAISE EXCEPTION 'Approved assessment review date is required';
 END IF;
 SELECT * INTO s FROM public.students WHERE id=a.student_id;
 IF s.id IS NULL OR nullif(btrim(coalesce(s.student_code,'')),'') IS NULL THEN
  RAISE EXCEPTION 'Student and unique Student ID are required';
 END IF;
 IF EXISTS(SELECT 1 FROM public.assessment_completion_certificates WHERE assignment_id=a.id) THEN
  RAISE EXCEPTION 'An assessment completion certificate is already issued';
 END IF;
 INSERT INTO public.assessment_completion_certificates (
 assignment_id,student_id,student_name,student_code,assessment_title,assessment_level,
 completion_date,issued_by,programme_coordinator,approving_director
 ) VALUES(
 a.id,s.id,s.full_name,s.student_code,
 CASE a.assessment_level
 WHEN 'LP' THEN 'Lower Primary Learning Assessment'
 WHEN 'UP' THEN 'Upper Primary Learning Assessment'
 WHEN 'HS' THEN 'High School Learning Assessment'
 WHEN 'HSS' THEN 'Higher Secondary Learning Assessment'
 ELSE a.assessment_level || ' Learning Assessment'
 END,
 a.assessment_level,reviewed_date,auth.uid(),btrim(p_coordinator_name),btrim(p_director_name)
 ) RETURNING id INTO certificate_id;
 RETURN certificate_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.issue_assessment_completion_certificate(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.issue_assessment_completion_certificate(uuid,text,text) TO authenticated;

-- Public scan returns only initials, assessment title, dates and validity. Never reveal private child data.
CREATE OR REPLACE FUNCTION public.verify_assessment_completion_certificate(p_reference_code text)
 RETURNS TABLE(reference_code text,assessment_title text,student_initials text,completion_date date,issued_at timestamptz,valid boolean)
 LANGUAGE sql SECURITY DEFINER SET search_path TO '' STABLE
AS $fn$
 SELECT c.reference_code,c.assessment_title,left(c.student_name,1)||'.',c.completion_date,c.issued_at,true
 FROM public.assessment_completion_certificates c
 WHERE c.reference_code=p_reference_code AND c.revoked_at IS NULL
 LIMIT 1;
$fn$;
REVOKE ALL ON FUNCTION public.verify_assessment_completion_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_assessment_completion_certificate(text) TO anon,authenticated;
COMMIT;