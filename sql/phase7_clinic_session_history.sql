-- Phase 7 audit trail and approved Parent-summary integrity.
BEGIN;
CREATE OR REPLACE FUNCTION public.clinic_session_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM public.teachers t JOIN public.teacher_assignments ta ON ta.teacher_id=t.id
  JOIN public.user_roles ur ON ur.user_id=t.user_id AND ur.role='teacher'
  WHERE t.user_id=NEW.teacher_user_id AND t.status='active' AND ta.student_id=NEW.student_id
 ) THEN RAISE EXCEPTION 'An active assigned Teacher is required'; END IF;
 IF NEW.appointment_enquiry_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM public.appointment_registration_links l
  WHERE l.enquiry_id=NEW.appointment_enquiry_id AND l.student_id=NEW.student_id
 ) THEN RAISE EXCEPTION 'Appointment is not linked to this student'; END IF;
 IF TG_OP='UPDATE' AND
 (NEW.student_id IS DISTINCT FROM OLD.student_id OR
  NEW.teacher_user_id IS DISTINCT FROM OLD.teacher_user_id OR
  NEW.created_by IS DISTINCT FROM OLD.created_by OR
  NEW.created_at IS DISTINCT FROM OLD.created_at)
 THEN RAISE EXCEPTION 'Session identity and teacher cannot be changed'; END IF;
 IF TG_OP='UPDATE' AND OLD.status='attended' AND NEW.status<>'attended'
 AND EXISTS(SELECT 1 FROM public.clinic_session_parent_updates u WHERE u.session_id=NEW.id)
 THEN RAISE EXCEPTION 'Cannot change attendance after a Parent summary is approved'; END IF;
 NEW.updated_at:=now();
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.clinic_session_validate() FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS public.clinic_session_history(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 session_id uuid NOT NULL REFERENCES public.clinic_sessions(id) ON DELETE RESTRICT,
 changed_by uuid REFERENCES auth.users(id),
 changed_at timestamptz NOT NULL DEFAULT now(),
 previous_status text NOT NULL,
 new_status text NOT NULL,
 previous_activities text NOT NULL,
 new_activities text NOT NULL,
 previous_notes text NOT NULL,
 new_notes text NOT NULL
);
CREATE INDEX IF NOT EXISTS clinic_session_history_session_idx ON public.clinic_session_history(session_id,changed_at DESC);
ALTER TABLE public.clinic_session_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Session change history staff only" ON public.clinic_session_history FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.clinic_sessions s WHERE s.id=session_id));
REVOKE ALL ON TABLE public.clinic_session_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.clinic_session_history TO authenticated;
CREATE OR REPLACE FUNCTION public.clinic_session_log_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
 IF (OLD.status,OLD.activities_done,OLD.teacher_notes) IS DISTINCT FROM
    (NEW.status,NEW.activities_done,NEW.teacher_notes) THEN
  INSERT INTO public.clinic_session_history(
   session_id,changed_by,previous_status,new_status,previous_activities,new_activities,
   previous_notes,new_notes
  ) VALUES(
   NEW.id,(SELECT auth.uid()),OLD.status,NEW.status,OLD.activities_done,NEW.activities_done,
   OLD.teacher_notes,NEW.teacher_notes
  );
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.clinic_session_log_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER clinic_session_log_after_update
 AFTER UPDATE OF status,activities_done,teacher_notes ON public.clinic_sessions
 FOR EACH ROW EXECUTE FUNCTION public.clinic_session_log_change();
COMMIT;
