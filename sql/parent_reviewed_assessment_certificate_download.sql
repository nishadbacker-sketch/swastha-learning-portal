-- Parent-downloadable assessment certificates, gated by reviewed assessment,
-- genuine reviewed result and officially configured Swastha staff names.
-- No existing certificates or student records are modified.
BEGIN;

CREATE TABLE IF NOT EXISTS public.assessment_certificate_signatories (
  id boolean PRIMARY KEY DEFAULT true CHECK(id=true),
  programme_coordinator text NOT NULL CHECK(length(btrim(programme_coordinator)) BETWEEN 2 AND 120),
  director text NOT NULL CHECK(length(btrim(director)) BETWEEN 2 AND 120),
  configured_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assessment_certificate_signatories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assessment_certificate_signatories FROM PUBLIC,anon,authenticated;

-- Secure staff RPC instead of allowing direct writes or exposing settings to Parents.
CREATE OR REPLACE FUNCTION public.configure_assessment_certificate_signatories(
 p_programme_coordinator text,p_director text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role('admin') OR public.has_role('clinic_admin')) THEN
  RAISE EXCEPTION 'Only authorised clinic administrators can configure certificate signatories';
 END IF;
 IF length(btrim(coalesce(p_programme_coordinator,''))) NOT BETWEEN 2 AND 120
 OR length(btrim(coalesce(p_director,''))) NOT BETWEEN 2 AND 120 THEN
  RAISE EXCEPTION 'Enter the actual Programme Coordinator and Director names (2-120 characters)';
 END IF;
 INSERT INTO public.assessment_certificate_signatories(id,programme_coordinator,director,configured_by,updated_at)
 VALUES(true,btrim(p_programme_coordinator),btrim(p_director),auth.uid(),now())
 ON CONFLICT(id) DO UPDATE SET
  programme_coordinator=excluded.programme_coordinator,
  director=excluded.director,configured_by=excluded.configured_by,updated_at=excluded.updated_at;
END;
$fn$;
REVOKE ALL ON FUNCTION public.configure_assessment_certificate_signatories(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.configure_assessment_certificate_signatories(text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_reviewed_assessment_certificate(p_assignment_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
 a public.assessment_assignments%ROWTYPE;
 s public.students%ROWTYPE;
 signers public.assessment_certificate_signatories%ROWTYPE;
 reviewed_date date;
 certificate_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT (public.has_role('parent') OR public.has_role('student')) THEN
  RAISE EXCEPTION 'Only a linked Parent or Student may download this certificate';
 END IF;

 -- Lock assignment to make concurrent requests idempotent. Never create for another child.
 SELECT * INTO a FROM public.assessment_assignments WHERE id=p_assignment_id FOR UPDATE;
 IF NOT FOUND OR a.status<>'reviewed' THEN
  RAISE EXCEPTION 'Assessment must be reviewed before a certificate can be downloaded';
 END IF;
 IF NOT EXISTS(
  SELECT 1 FROM public.parent_student_links l
  WHERE l.student_id=a.student_id AND l.parent_user_id=auth.uid()
 ) THEN
  RAISE EXCEPTION 'This assessment is not linked to your account';
 END IF;

 SELECT r.reviewed_at::date INTO reviewed_date
 FROM public.assessment_results r
 WHERE r.assignment_id=a.id AND r.reviewed_at IS NOT NULL
 ORDER BY r.reviewed_at DESC LIMIT 1;
 IF reviewed_date IS NULL OR reviewed_date>current_date THEN
  RAISE EXCEPTION 'Approved Teacher review evidence is required';
 END IF;

 -- Previously issued, non-revoked references remain stable on repeated downloads.
 SELECT c.id INTO certificate_id FROM public.assessment_completion_certificates c WHERE c.assignment_id=a.id;
 IF FOUND THEN
  IF EXISTS(SELECT 1 FROM public.assessment_completion_certificates c WHERE c.id=certificate_id AND c.revoked_at IS NOT NULL) THEN
   RAISE EXCEPTION 'This certificate was revoked; contact Swastha Learning Clinic';
  END IF;
  RETURN certificate_id;
 END IF;

 SELECT * INTO signers FROM public.assessment_certificate_signatories WHERE id=true;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'Clinic certificate names are not configured yet; please contact Swastha Learning Clinic';
 END IF;
 SELECT * INTO s FROM public.students WHERE id=a.student_id;
 IF NOT FOUND OR nullif(btrim(coalesce(s.student_code,'')),'') IS NULL THEN
  RAISE EXCEPTION 'Student record and unique Student ID are required';
 END IF;

 INSERT INTO public.assessment_completion_certificates(
  assignment_id,student_id,student_name,student_code,assessment_title,assessment_level,
  completion_date,issued_by,programme_coordinator,approving_director
 ) VALUES(
  a.id,a.student_id,s.full_name,s.student_code,
  CASE a.assessment_level
   WHEN 'LP' THEN 'Lower Primary Learning Assessment'
   WHEN 'UP' THEN 'Upper Primary Learning Assessment'
   WHEN 'HS' THEN 'High School Learning Assessment'
   WHEN 'HSS' THEN 'Higher Secondary Learning Assessment'
   ELSE a.assessment_level||' Learning Assessment'
  END,
  a.assessment_level,reviewed_date,signers.configured_by,
  signers.programme_coordinator,signers.director
 ) RETURNING id INTO certificate_id;
 RETURN certificate_id;
END;
$fn$;
REVOKE ALL ON FUNCTION public.claim_reviewed_assessment_certificate(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_reviewed_assessment_certificate(uuid) TO authenticated;

-- Hide certificates if teacher approval is withdrawn after issuance.
DROP POLICY IF EXISTS "Parents read linked issued assessment completion certificates" ON public.assessment_completion_certificates;
CREATE POLICY "Parents read linked issued assessment completion certificates"
 ON public.assessment_completion_certificates FOR SELECT TO authenticated
 USING(
  revoked_at IS NULL
  AND EXISTS(
   SELECT 1 FROM public.parent_student_links l
   WHERE l.student_id=assessment_completion_certificates.student_id
     AND l.parent_user_id=(SELECT auth.uid())
  )
  AND EXISTS(
   SELECT 1 FROM public.assessment_assignments a
   JOIN public.assessment_results r ON r.assignment_id=a.id AND r.reviewed_at IS NOT NULL
   WHERE a.id=assessment_completion_certificates.assignment_id
     AND a.status='reviewed'
  )
 );

CREATE OR REPLACE FUNCTION public.verify_assessment_completion_certificate(p_reference_code text)
 RETURNS TABLE(reference_code text,assessment_title text,student_initials text,completion_date date,issued_at timestamptz,valid boolean)
 LANGUAGE sql SECURITY DEFINER SET search_path TO '' STABLE
AS $fn$
 SELECT c.reference_code,c.assessment_title,left(c.student_name,1)||'.',c.completion_date,c.issued_at,true
 FROM public.assessment_completion_certificates c
 JOIN public.assessment_assignments a ON a.id=c.assignment_id AND a.status='reviewed'
 WHERE c.reference_code=p_reference_code AND c.revoked_at IS NULL
 AND EXISTS(SELECT 1 FROM public.assessment_results r WHERE r.assignment_id=a.id AND r.reviewed_at IS NOT NULL)
 LIMIT 1;
$fn$;
REVOKE ALL ON FUNCTION public.verify_assessment_completion_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_assessment_completion_certificate(text) TO anon,authenticated;
COMMIT;