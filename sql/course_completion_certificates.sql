BEGIN;
CREATE TABLE IF NOT EXISTS public.course_completion_certificates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 registration_id uuid NOT NULL UNIQUE REFERENCES public.registrations(id),
 student_id uuid NOT NULL REFERENCES public.students(id),
 package_id uuid NOT NULL REFERENCES public.packages(id),
 reference_code text NOT NULL UNIQUE DEFAULT ('SLC-' || upper(replace(gen_random_uuid()::text,'-',''))),
 student_name text NOT NULL,
 student_code text NOT NULL,
 course_title text NOT NULL,
 completion_date date NOT NULL,
 issued_at timestamptz NOT NULL DEFAULT now(),
 issued_by uuid NOT NULL REFERENCES auth.users(id),
 programme_coordinator text NOT NULL,
 approving_director text NOT NULL,
 revoked_at timestamptz,
 CONSTRAINT course_completion_ref_format CHECK(reference_code ~ '^SLC-[A-F0-9]{32}$'),
 CONSTRAINT course_completion_names_nonempty CHECK(length(btrim(student_name))>0 AND length(btrim(course_title))>0 AND length(btrim(programme_coordinator))>0 AND length(btrim(approving_director))>0)
);
ALTER TABLE public.course_completion_certificates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.course_completion_certificates FROM anon,authenticated;
GRANT SELECT ON public.course_completion_certificates TO authenticated;
DROP POLICY IF EXISTS "Parents read issued certificates for own linked students" ON public.course_completion_certificates;
CREATE POLICY "Parents read issued certificates for own linked students" ON public.course_completion_certificates
 FOR SELECT TO authenticated USING(
 revoked_at IS NULL AND EXISTS(
 SELECT 1 FROM public.parent_student_links l
 WHERE l.student_id=course_completion_certificates.student_id
 AND l.parent_user_id=(SELECT auth.uid())
 )
 );
DROP POLICY IF EXISTS "Authorised staff read issued certificates" ON public.course_completion_certificates;
CREATE POLICY "Authorised staff read issued certificates" ON public.course_completion_certificates FOR SELECT TO authenticated
 USING(
 public.has_role('admin') OR public.has_role('clinic_admin')
 OR (public.has_role('teacher') AND EXISTS(
 SELECT 1 FROM public.teachers t JOIN public.teacher_assignments ta ON ta.teacher_id=t.id
 WHERE t.user_id=(SELECT auth.uid()) AND t.status='active' AND ta.student_id=course_completion_certificates.student_id
 ))
 );
CREATE OR REPLACE FUNCTION public.issue_course_completion_certificate(
 p_registration_id uuid,p_completion_date date,p_coordinator_name text,p_director_name text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE r public.registrations%ROWTYPE;s public.students%ROWTYPE;p public.packages%ROWTYPE;
 result_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role('admin') OR public.has_role('clinic_admin')) THEN
  RAISE EXCEPTION 'Authorised clinic administrators only';
 END IF;
 IF p_completion_date IS NULL OR p_completion_date>current_date THEN
  RAISE EXCEPTION 'Completion date must not be in the future';
 END IF;
 IF length(btrim(coalesce(p_coordinator_name,'')))<2 OR length(btrim(coalesce(p_director_name,'')))<2 OR length(p_coordinator_name)>120 OR length(p_director_name)>120 THEN
  RAISE EXCEPTION 'Enter the real coordinator and director names (2–120 characters)';
 END IF;
 SELECT * INTO r FROM public.registrations WHERE id=p_registration_id FOR UPDATE;
 IF NOT FOUND OR r.status<>'confirmed' OR NOT r.consent_recorded THEN
  RAISE EXCEPTION 'Confirmed, consented course registration required';
 END IF;
 SELECT * INTO s FROM public.students WHERE id=r.student_id;
 SELECT * INTO p FROM public.packages WHERE id=r.package_id;
 IF s.id IS NULL OR p.id IS NULL OR s.student_code IS NULL THEN
  RAISE EXCEPTION 'Student unique ID and registered course must be present';
 END IF;
 IF EXISTS(SELECT 1 FROM public.course_completion_certificates WHERE registration_id=r.id) THEN
  RAISE EXCEPTION 'Certificate has already been issued for this registration';
 END IF;
 INSERT INTO public.course_completion_certificates(
 registration_id,student_id,package_id,student_name,student_code,course_title,
 completion_date,issued_by,programme_coordinator,approving_director
 ) VALUES (r.id,r.student_id,r.package_id,s.full_name,s.student_code,p.name,
 p_completion_date,auth.uid(),btrim(p_coordinator_name),btrim(p_director_name))
 RETURNING id INTO result_id;
 RETURN result_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.issue_course_completion_certificate(uuid,date,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.issue_course_completion_certificate(uuid,date,text,text) TO authenticated;

-- Minimal public verification: never reveal a minor's full name or guardian data.
CREATE OR REPLACE FUNCTION public.verify_course_completion_certificate(p_reference_code text)
RETURNS TABLE(reference_code text,course_title text,student_initials text,completion_date date,issued_at timestamptz,valid boolean)
LANGUAGE sql SECURITY DEFINER SET search_path TO '' STABLE
AS $fn$
 SELECT c.reference_code,c.course_title,
  left(c.student_name,1)||'.',
  c.completion_date,c.issued_at,true
 FROM public.course_completion_certificates c
 WHERE c.reference_code=p_reference_code AND c.revoked_at IS NULL
 LIMIT 1;
$fn$;
REVOKE ALL ON FUNCTION public.verify_course_completion_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_course_completion_certificate(text) TO anon,authenticated;
COMMIT;