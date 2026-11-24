BEGIN;
DROP POLICY IF EXISTS "Clinic Admin read confirmed course registrations for certificates" ON public.registrations;
CREATE POLICY "Clinic Admin read confirmed course registrations for certificates"
 ON public.registrations FOR SELECT TO authenticated
 USING (public.has_role('clinic_admin') AND status='confirmed');
DROP POLICY IF EXISTS "Clinic Admin read course titles for certificates" ON public.packages;
CREATE POLICY "Clinic Admin read course titles for certificates"
 ON public.packages FOR SELECT TO authenticated USING (public.has_role('clinic_admin'));
COMMIT;