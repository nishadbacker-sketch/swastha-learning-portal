-- Phase 7: new tables only. Keep existing appointments, students, IDP and notifications untouched.
BEGIN;
CREATE TABLE IF NOT EXISTS public.clinic_sessions(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
 teacher_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 appointment_enquiry_id uuid REFERENCES public.appointment_enquiries(id) ON DELETE SET NULL,
 scheduled_at timestamptz NOT NULL,
 duration_minutes integer NOT NULL DEFAULT 45 CHECK(duration_minutes BETWEEN 5 AND 240),
 session_type text NOT NULL DEFAULT 'individual' CHECK(session_type IN ('individual','group','review','follow_up')),
 status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','attended','absent','cancelled','rescheduled')),
 activities_done text NOT NULL DEFAULT '' CHECK(length(activities_done)<=4000),
 teacher_notes text NOT NULL DEFAULT '' CHECK(length(teacher_notes)<=6000),
 created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clinic_sessions_student_time_idx ON public.clinic_sessions(student_id,scheduled_at DESC);
CREATE INDEX IF NOT EXISTS clinic_sessions_teacher_time_idx ON public.clinic_sessions(teacher_user_id,scheduled_at DESC);

CREATE TABLE IF NOT EXISTS public.clinic_session_goal_links(
 session_id uuid NOT NULL REFERENCES public.clinic_sessions(id) ON DELETE RESTRICT,
 goal_id uuid NOT NULL REFERENCES public.student_development_goals(id) ON DELETE RESTRICT,
 linked_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
 linked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(session_id,goal_id)
);
CREATE TABLE IF NOT EXISTS public.clinic_session_parent_updates(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 session_id uuid NOT NULL UNIQUE REFERENCES public.clinic_sessions(id) ON DELETE RESTRICT,
 student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
 session_date timestamptz NOT NULL,
 summary text NOT NULL CHECK(length(btrim(summary)) BETWEEN 10 AND 3000),
 approved_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
 approved_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clinic_parent_updates_child_idx ON public.clinic_session_parent_updates(student_id,approved_at DESC);

-- Invariant enforcement runs as the table owner, fixed search path.
CREATE OR REPLACE FUNCTION public.clinic_session_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM public.teachers t JOIN public.teacher_assignments ta ON ta.teacher_id=t.id
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
 NEW.updated_at:=now();
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.clinic_session_validate() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER clinic_session_validate_before
 BEFORE INSERT OR UPDATE ON public.clinic_sessions
 FOR EACH ROW EXECUTE FUNCTION public.clinic_session_validate();

CREATE OR REPLACE FUNCTION public.clinic_session_goal_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM public.clinic_sessions s
  JOIN public.student_development_goals g ON g.id=NEW.goal_id
  JOIN public.assessment_assignments a ON a.id=g.assignment_id
  WHERE s.id=NEW.session_id AND a.student_id=s.student_id AND a.status='reviewed'
 ) THEN RAISE EXCEPTION 'Goal must belong to the session student and a reviewed assessment'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.clinic_session_goal_validate() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER clinic_session_goal_validate_before
 BEFORE INSERT OR UPDATE ON public.clinic_session_goal_links
 FOR EACH ROW EXECUTE FUNCTION public.clinic_session_goal_validate();

CREATE OR REPLACE FUNCTION public.clinic_parent_update_validate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE target_student uuid;target_time timestamptz; target_status text;
BEGIN
 SELECT student_id,scheduled_at,status INTO target_student,target_time,target_status
 FROM public.clinic_sessions WHERE id=NEW.session_id;
 IF target_student IS NULL OR target_status<>'attended' THEN
  RAISE EXCEPTION 'Only attended sessions may have approved parent updates'; END IF;
 IF NEW.student_id IS DISTINCT FROM target_student OR NEW.session_date IS DISTINCT FROM target_time THEN
  RAISE EXCEPTION 'Parent update must match the actual attended session'; END IF;
 IF TG_OP='UPDATE' AND (OLD.session_id IS DISTINCT FROM NEW.session_id OR
  OLD.student_id IS DISTINCT FROM NEW.student_id OR OLD.approved_by IS DISTINCT FROM NEW.approved_by) THEN
  RAISE EXCEPTION 'Parent update ownership cannot be changed'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.clinic_parent_update_validate() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER clinic_parent_update_validate_before
 BEFORE INSERT OR UPDATE ON public.clinic_session_parent_updates
 FOR EACH ROW EXECUTE FUNCTION public.clinic_parent_update_validate();

ALTER TABLE public.clinic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_session_goal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_session_parent_updates ENABLE ROW LEVEL SECURITY;

-- Owner inherits Super Admin and Admin through has_role(); clinic_admin is the clinic Admin.
CREATE POLICY "Session staff read scoped" ON public.clinic_sessions FOR SELECT TO authenticated USING(
 public.has_role('admin') OR public.has_role('clinic_admin')
 OR (public.has_role('teacher') AND teacher_user_id=(SELECT auth.uid())
 AND EXISTS(SELECT 1 FROM public.teachers t JOIN public.teacher_assignments ta ON ta.teacher_id=t.id
  WHERE t.user_id=(SELECT auth.uid()) AND t.status='active' AND ta.student_id=student_id))
);
CREATE POLICY "Session staff create scoped" ON public.clinic_sessions FOR INSERT TO authenticated WITH CHECK(
 created_by=(SELECT auth.uid()) AND
 (public.has_role('admin') OR public.has_role('clinic_admin')
 OR (public.has_role('teacher') AND teacher_user_id=(SELECT auth.uid())
 AND EXISTS(SELECT 1 FROM public.teachers t JOIN public.teacher_assignments ta ON ta.teacher_id=t.id
 WHERE t.user_id=(SELECT auth.uid()) AND t.status='active' AND ta.student_id=student_id)))
);
CREATE POLICY "Session staff update scoped" ON public.clinic_sessions FOR UPDATE TO authenticated
 USING(public.has_role('admin') OR public.has_role('clinic_admin')
 OR (public.has_role('teacher') AND teacher_user_id=(SELECT auth.uid())))
 WITH CHECK(public.has_role('admin') OR public.has_role('clinic_admin')
 OR (public.has_role('teacher') AND teacher_user_id=(SELECT auth.uid())
 AND EXISTS(SELECT 1 FROM public.teachers t JOIN public.teacher_assignments ta ON ta.teacher_id=t.id
 WHERE t.user_id=(SELECT auth.uid()) AND t.status='active' AND ta.student_id=student_id)));
CREATE POLICY "Session goal staff read" ON public.clinic_session_goal_links FOR SELECT TO authenticated USING(
 EXISTS(SELECT 1 FROM public.clinic_sessions s WHERE s.id=session_id)
);
CREATE POLICY "Session goal staff link" ON public.clinic_session_goal_links FOR INSERT TO authenticated WITH CHECK(
 linked_by=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.clinic_sessions s WHERE s.id=session_id)
);
CREATE POLICY "Approved summaries parent and staff read" ON public.clinic_session_parent_updates FOR SELECT TO authenticated USING(
 public.has_role('admin') OR public.has_role('clinic_admin')
 OR EXISTS(SELECT 1 FROM public.parent_student_links l
  WHERE l.student_id=student_id AND l.parent_user_id=(SELECT auth.uid()))
 OR EXISTS(SELECT 1 FROM public.clinic_sessions s WHERE s.id=session_id AND s.teacher_user_id=(SELECT auth.uid())
  AND public.has_role('teacher'))
);
CREATE POLICY "Clinic leadership approves parent summaries" ON public.clinic_session_parent_updates FOR INSERT TO authenticated WITH CHECK(
 approved_by=(SELECT auth.uid()) AND (public.has_role('admin') OR public.has_role('clinic_admin'))
);
CREATE POLICY "Clinic leadership amends summaries" ON public.clinic_session_parent_updates FOR UPDATE TO authenticated
 USING(public.has_role('admin') OR public.has_role('clinic_admin'))
 WITH CHECK(public.has_role('admin') OR public.has_role('clinic_admin'));

REVOKE ALL ON TABLE public.clinic_sessions,public.clinic_session_goal_links,public.clinic_session_parent_updates FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE ON public.clinic_sessions TO authenticated;
GRANT SELECT,INSERT ON public.clinic_session_goal_links TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.clinic_session_parent_updates TO authenticated;
COMMIT;
