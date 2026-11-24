-- STAGING ONLY: align Teacher IDP create/update access with production.
-- Restricts actions to an active Teacher assigned to a student with a reviewed assessment.
-- No existing row updates, no Parent changes, no production application.
BEGIN;
GRANT INSERT,UPDATE ON public.student_development_goals TO authenticated;
CREATE POLICY "Staging assigned staff creates approved IDP goals"
 ON public.student_development_goals FOR INSERT TO authenticated
 WITH CHECK(
  created_by=(SELECT auth.uid())
  AND EXISTS (
   SELECT 1 FROM public.assessment_assignments aa
   WHERE aa.id=assignment_id AND aa.status='reviewed'
   AND (public.has_role('admin') OR (
    public.has_role('teacher') AND EXISTS (
     SELECT 1 FROM public.teacher_assignments ta
      JOIN public.teachers t ON t.id=ta.teacher_id
     WHERE ta.student_id=aa.student_id AND t.user_id=(SELECT auth.uid()) AND t.status='active'
    )
   ))
  )
 );
CREATE POLICY "Staging assigned staff updates approved IDP goals"
 ON public.student_development_goals FOR UPDATE TO authenticated
 USING(
  public.has_role('admin') OR (
   public.has_role('teacher') AND EXISTS(
    SELECT 1 FROM public.assessment_assignments aa
    JOIN public.teacher_assignments ta ON ta.student_id=aa.student_id
    JOIN public.teachers t ON t.id=ta.teacher_id
    WHERE aa.id=assignment_id AND aa.status='reviewed'
      AND t.user_id=(SELECT auth.uid()) AND t.status='active'
   )
  )
 )
 WITH CHECK(
  EXISTS(SELECT 1 FROM public.assessment_assignments aa
   WHERE aa.id=assignment_id AND aa.status='reviewed')
  AND (public.has_role('admin') OR (
   public.has_role('teacher') AND EXISTS(
    SELECT 1 FROM public.assessment_assignments aa
    JOIN public.teacher_assignments ta ON ta.student_id=aa.student_id
    JOIN public.teachers t ON t.id=ta.teacher_id
    WHERE aa.id=assignment_id AND t.user_id=(SELECT auth.uid()) AND t.status='active'
   )
  ))
 );
COMMIT;
