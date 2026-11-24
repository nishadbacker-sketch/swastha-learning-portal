-- Phase 8: prevent overlapping live appointments for the same Teacher or Student.
-- Additive trigger only; existing sessions/appointments are not modified.
BEGIN;
CREATE OR REPLACE FUNCTION public.clinic_session_prevent_overlap()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
  IF NEW.status NOT IN ('scheduled','rescheduled') THEN RETURN NEW; END IF;
  -- Serialize competing inserts/updates by Teacher and student; locks release on commit.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('swastha-session-teacher-'||NEW.teacher_user_id::text,0));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('swastha-session-student-'||NEW.student_id::text,0));
  IF EXISTS(
    SELECT 1 FROM public.clinic_sessions existing
    WHERE existing.id IS DISTINCT FROM NEW.id
      AND existing.status IN ('scheduled','rescheduled')
      AND (existing.student_id=NEW.student_id OR existing.teacher_user_id=NEW.teacher_user_id)
      AND NEW.scheduled_at < existing.scheduled_at + existing.duration_minutes * INTERVAL '1 minute'
      AND existing.scheduled_at < NEW.scheduled_at + NEW.duration_minutes * INTERVAL '1 minute'
  ) THEN
    RAISE EXCEPTION 'Session overlaps an existing Teacher or student appointment';
  END IF;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.clinic_session_prevent_overlap() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER clinic_session_no_overlap_before
 BEFORE INSERT OR UPDATE OF scheduled_at,duration_minutes,student_id,teacher_user_id,status
 ON public.clinic_sessions
 FOR EACH ROW EXECUTE FUNCTION public.clinic_session_prevent_overlap();
COMMIT;
