-- Acknowledgements for staff notification popup; no existing parent tables changed.
CREATE TABLE IF NOT EXISTS public.staff_notification_acknowledgements (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 event_id uuid NOT NULL REFERENCES public.portal_notification_events(id) ON DELETE CASCADE,
 acknowledged_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,event_id)
);
ALTER TABLE public.staff_notification_acknowledgements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_notification_acknowledgements FROM public, anon, authenticated;
GRANT SELECT, INSERT ON public.staff_notification_acknowledgements TO authenticated;
DROP POLICY IF EXISTS "Staff read own acknowledgements" ON public.staff_notification_acknowledgements;
CREATE POLICY "Staff read own acknowledgements" ON public.staff_notification_acknowledgements FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS "Staff acknowledge only addressed events" ON public.staff_notification_acknowledgements;
CREATE POLICY "Staff acknowledge only addressed events" ON public.staff_notification_acknowledgements FOR INSERT TO authenticated
 WITH CHECK (
  user_id=(SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.portal_notification_events n
     WHERE n.id=event_id AND n.recipient_user_id=(SELECT auth.uid())
  )
 );
