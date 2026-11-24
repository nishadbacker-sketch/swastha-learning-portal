-- Phase 3A: teacher assignment in-portal alert, additive to existing event system.
-- Staging first. This migration does not backfill historical assignments.
-- Add an event/source type; preserve all existing supported values.
BEGIN;
ALTER TABLE public.portal_notification_events
  DROP CONSTRAINT portal_notification_events_event_type_check;
ALTER TABLE public.portal_notification_events
  ADD CONSTRAINT portal_notification_events_event_type_check
  CHECK (event_type IN (
    'assessment_assigned','assessment_submitted','assessment_approved',
    'custom_assessment_assigned','custom_assessment_submitted','custom_assessment_approved',
    'activity_assigned','teacher_assigned'
  ));
ALTER TABLE public.portal_notification_events
  DROP CONSTRAINT portal_notification_events_source_type_check;
ALTER TABLE public.portal_notification_events
  ADD CONSTRAINT portal_notification_events_source_type_check
  CHECK (source_type IN ('assessment','custom_assessment','activity','teacher_assignment'));

CREATE FUNCTION public.swastha_notify_teacher_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Generate exactly one event for the teacher who was assigned.
  -- Only active teachers with the teacher role receive it.
  INSERT INTO public.portal_notification_events
    (recipient_user_id, student_id, event_type, source_type, source_id)
  SELECT t.user_id, NEW.student_id, 'teacher_assigned', 'teacher_assignment', NEW.id
  FROM public.teachers AS t
  JOIN public.user_roles AS r ON r.user_id=t.user_id AND r.role='teacher'
  WHERE t.id=NEW.teacher_id AND t.status='active'
  ON CONFLICT (recipient_user_id,event_type,source_type,source_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.swastha_notify_teacher_assignment() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER swastha_notify_teacher_assignment
AFTER INSERT ON public.teacher_assignments
FOR EACH ROW EXECUTE FUNCTION public.swastha_notify_teacher_assignment();

-- The original recipient-only RLS SELECT policy and staff-acknowledgement policy remain unchanged.
COMMIT;
