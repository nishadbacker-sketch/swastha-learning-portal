-- Staff-only acknowledgement records. Parent notifications remain unchanged.
CREATE TABLE IF NOT EXISTS public.staff_notification_acknowledgements(
 recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 notification_id uuid NOT NULL REFERENCES public.portal_notification_events(id) ON DELETE CASCADE,
 acknowledged_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(recipient_user_id,notification_id)
);
ALTER TABLE public.staff_notification_acknowledgements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_notification_acknowledgements FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.staff_notification_acknowledgements TO authenticated;
CREATE POLICY "Staff read own acknowledgements"
 ON public.staff_notification_acknowledgements FOR SELECT TO authenticated
 USING(recipient_user_id=(SELECT auth.uid()));
CREATE POLICY "Staff acknowledge only events addressed to them"
 ON public.staff_notification_acknowledgements FOR INSERT TO authenticated
 WITH CHECK(
  recipient_user_id=(SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.portal_notification_events e
    WHERE e.id=notification_id AND e.recipient_user_id=(SELECT auth.uid())
      AND e.event_type IN ('assessment_submitted','custom_assessment_submitted'))
  AND EXISTS (SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id=(SELECT auth.uid())
      AND ur.role IN ('teacher','admin','clinic_admin','owner'))
);
