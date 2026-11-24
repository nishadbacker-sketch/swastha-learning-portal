-- DRAFT: apply after staging RLS and role tests. Does NOT email anyone.
-- Immutable, per-recipient event history: standard/custom assessment, activity.
CREATE TABLE IF NOT EXISTS public.portal_notification_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
 event_type text NOT NULL CHECK (event_type IN
  ('assessment_assigned','assessment_submitted','assessment_approved',
   'custom_assessment_assigned','custom_assessment_submitted','custom_assessment_approved',
   'activity_assigned')),
 source_type text NOT NULL CHECK (source_type IN
  ('assessment','custom_assessment','activity')),
 source_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(recipient_user_id,event_type,source_type,source_id)
);
CREATE INDEX IF NOT EXISTS portal_notification_events_recipient_idx
 ON public.portal_notification_events(recipient_user_id,created_at DESC);
ALTER TABLE public.portal_notification_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_notification_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.portal_notification_events TO authenticated;
CREATE POLICY "Recipients see their own notification history"
 ON public.portal_notification_events FOR SELECT TO authenticated
 USING (recipient_user_id=(SELECT auth.uid()));
-- Never allow browser INSERT/UPDATE/DELETE; events come only from trusted triggers.

CREATE OR REPLACE FUNCTION public.swastha_record_portal_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_source text;
 v_event text;
BEGIN
 IF TG_TABLE_NAME='assessment_assignments' THEN
   v_source:='assessment';
 ELSIF TG_TABLE_NAME='custom_assessment_assignments' THEN
   v_source:='custom_assessment';
 ELSIF TG_TABLE_NAME='student_activity_assignments' THEN
   v_source:='activity';
 ELSE
   RETURN NEW;
 END IF;

 IF TG_OP='INSERT' THEN
   IF v_source='activity' THEN v_event:='activity_assigned';
   ELSE v_event:=v_source||'_assigned'; END IF;
 ELSIF TG_OP='UPDATE' AND v_source<>'activity'
    AND NEW.status IS DISTINCT FROM OLD.status
    AND NEW.status IN ('submitted','reviewed') THEN
   v_event:=v_source||CASE WHEN NEW.status='submitted' THEN '_submitted' ELSE '_approved' END;
 ELSE
   RETURN NEW;
 END IF;

 IF v_event IN ('assessment_assigned','custom_assessment_assigned',
   'assessment_approved','custom_assessment_approved','activity_assigned') THEN
   INSERT INTO public.portal_notification_events(recipient_user_id,student_id,event_type,source_type,source_id)
   SELECT DISTINCT l.parent_user_id,NEW.student_id,v_event,v_source,NEW.id
   FROM public.parent_student_links l WHERE l.student_id=NEW.student_id
   ON CONFLICT(recipient_user_id,event_type,source_type,source_id) DO NOTHING;
 ELSIF v_event IN ('assessment_submitted','custom_assessment_submitted') THEN
   -- Assigned teacher(s), assignment creator and authorized clinic reviewers.
   INSERT INTO public.portal_notification_events(recipient_user_id,student_id,event_type,source_type,source_id)
   SELECT DISTINCT recipients.user_id,NEW.student_id,v_event,v_source,NEW.id FROM (
     SELECT NEW.assigned_by AS user_id
     UNION
     SELECT t.user_id FROM public.teacher_assignments ta
       JOIN public.teachers t ON t.id=ta.teacher_id AND t.status='active'
       WHERE ta.student_id=NEW.student_id
     UNION
     SELECT ur.user_id FROM public.user_roles ur
       WHERE ur.role IN ('owner','admin','clinic_admin')
   ) AS recipients WHERE recipients.user_id IS NOT NULL
   ON CONFLICT(recipient_user_id,event_type,source_type,source_id) DO NOTHING;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.swastha_record_portal_notification() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS swastha_notify_assessment ON public.assessment_assignments;
CREATE TRIGGER swastha_notify_assessment
 AFTER INSERT OR UPDATE OF status ON public.assessment_assignments FOR EACH ROW
 EXECUTE FUNCTION public.swastha_record_portal_notification();

DROP TRIGGER IF EXISTS swastha_notify_custom_assessment ON public.custom_assessment_assignments;
CREATE TRIGGER swastha_notify_custom_assessment
 AFTER INSERT OR UPDATE OF status ON public.custom_assessment_assignments FOR EACH ROW
 EXECUTE FUNCTION public.swastha_record_portal_notification();

DROP TRIGGER IF EXISTS swastha_notify_activity ON public.student_activity_assignments;
CREATE TRIGGER swastha_notify_activity AFTER INSERT ON public.student_activity_assignments
 FOR EACH ROW EXECUTE FUNCTION public.swastha_record_portal_notification();

-- No backfill on production: no past-user notifications are generated or mailed.
