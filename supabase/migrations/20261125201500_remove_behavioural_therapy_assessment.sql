-- Remove the requested Behavioural Therapy assessment template only if it has no assignments.
-- Preserve all student records, answers, and existing assessed records.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.custom_assessment_assignments a
    JOIN public.custom_assessment_templates t ON t.id = a.template_id
    WHERE t.title = 'Behavioural Therapy — Informal Skills Assessment'
  ) THEN
    RAISE EXCEPTION 'Cannot remove Behavioural Therapy assessment: student assignments exist';
  END IF;

  DELETE FROM public.custom_assessment_templates
  WHERE title = 'Behavioural Therapy — Informal Skills Assessment';
END $$;
