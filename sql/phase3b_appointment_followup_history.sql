-- Phase 3B: persistent, deduplicated appointment reminder history.
-- Existing appointment_enquiries and appointment_followup_history remain unchanged.
-- Staging first; schedule runs at 00:15 Asia/Kolkata (18:45 UTC).
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE public.appointment_followup_notification_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 enquiry_id uuid NOT NULL REFERENCES public.appointment_enquiries(id) ON DELETE RESTRICT,
 recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 followup_date date NOT NULL,
 kind text NOT NULL CHECK (kind IN ('due_tomorrow','due_today','overdue')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (enquiry_id,recipient_user_id,followup_date,kind)
);
CREATE INDEX appointment_followup_notification_recipient_idx
 ON public.appointment_followup_notification_history(recipient_user_id,created_at DESC);
ALTER TABLE public.appointment_followup_notification_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointment_followup_notification_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.appointment_followup_notification_history TO authenticated;
CREATE POLICY "Staff read own appointment reminder history"
 ON public.appointment_followup_notification_history FOR SELECT TO authenticated
 USING (
  recipient_user_id = (SELECT auth.uid())
  AND (
   public.has_role('admin') OR public.has_role('clinic_admin')
   OR public.has_role('owner') OR public.has_role('teacher')
  )
 );

CREATE SCHEMA IF NOT EXISTS swastha_private;
REVOKE ALL ON SCHEMA swastha_private FROM PUBLIC, anon, authenticated;
CREATE FUNCTION swastha_private.record_appointment_followup_reminders(
 p_today date DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $body$
DECLARE inserted_count integer;
BEGIN
 INSERT INTO public.appointment_followup_notification_history
 (enquiry_id,recipient_user_id,followup_date,kind)
 SELECT a.id,ur.user_id,a.next_followup_date,
 CASE
  WHEN a.next_followup_date < p_today THEN 'overdue'
  WHEN a.next_followup_date = p_today THEN 'due_today'
  ELSE 'due_tomorrow'
 END
 FROM public.appointment_enquiries a
 CROSS JOIN public.user_roles ur
 WHERE a.next_followup_date IS NOT NULL
  AND a.next_followup_date <= p_today + 1
  AND a.status NOT IN ('completed','not_interested')
  AND (
   ur.role IN ('admin','owner','clinic_admin')
   OR (
    ur.role='teacher'
    AND EXISTS (
     SELECT 1 FROM public.teachers t
      WHERE t.user_id=ur.user_id AND t.status='active'
    )
   )
  )
 ON CONFLICT (enquiry_id,recipient_user_id,followup_date,kind) DO NOTHING;
 GET DIAGNOSTICS inserted_count = ROW_COUNT;
 RETURN inserted_count;
END;
$body$;
REVOKE ALL ON FUNCTION swastha_private.record_appointment_followup_reminders(date)
 FROM PUBLIC,anon,authenticated;
SELECT cron.schedule(
 'swastha-appointment-followup-history-daily',
 '45 18 * * *',
 'SELECT swastha_private.record_appointment_followup_reminders();'
);
COMMIT;
