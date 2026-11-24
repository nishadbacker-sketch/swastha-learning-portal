-- STAGING-ONLY parity fix for the existing production IDP history trigger.
-- Production already has the function and trigger; do not apply there.
BEGIN;
CREATE OR REPLACE FUNCTION public.record_student_goal_progress_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $body$
BEGIN
 IF (OLD.status,OLD.current_percent,OLD.progress_notes,OLD.target_date,OLD.responsible_staff_user_id)
 IS DISTINCT FROM
 (NEW.status,NEW.current_percent,NEW.progress_notes,NEW.target_date,NEW.responsible_staff_user_id) THEN
  INSERT INTO public.student_goal_progress_history(
   goal_id,changed_by,old_status,new_status,old_current_percent,new_current_percent,
   old_progress_notes,new_progress_notes,old_target_date,new_target_date,
   old_responsible_staff_user_id,new_responsible_staff_user_id
  ) VALUES (
   NEW.id,(SELECT auth.uid()),OLD.status,NEW.status,OLD.current_percent,NEW.current_percent,
   OLD.progress_notes,NEW.progress_notes,OLD.target_date,NEW.target_date,
   OLD.responsible_staff_user_id,NEW.responsible_staff_user_id
  );
 END IF;
 RETURN NEW;
END;
$body$;
REVOKE ALL ON FUNCTION public.record_student_goal_progress_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER record_student_goal_progress_update
 AFTER UPDATE OF status,current_percent,progress_notes,target_date,responsible_staff_user_id
 ON public.student_development_goals
 FOR EACH ROW EXECUTE FUNCTION public.record_student_goal_progress_change();
COMMIT;
