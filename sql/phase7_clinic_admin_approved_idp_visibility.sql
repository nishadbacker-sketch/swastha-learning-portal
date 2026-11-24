-- Phase 7 follow-up: allow Clinic Admin read-only access to reviewed assessment IDs
-- and their approved IDP goals for session linking.
-- No unreviewed results, no edit privileges, no Parent policy changes.
BEGIN;
CREATE POLICY "Clinic Admin read reviewed assessments for sessions"
 ON public.assessment_assignments FOR SELECT TO authenticated
 USING(public.has_role('clinic_admin') AND status='reviewed');
CREATE POLICY "Clinic Admin read approved IDP goals for sessions"
 ON public.student_development_goals FOR SELECT TO authenticated
 USING(public.has_role('clinic_admin') AND EXISTS(
  SELECT 1 FROM public.assessment_assignments a
  WHERE a.id=assignment_id AND a.status='reviewed'
 ));
COMMIT;
