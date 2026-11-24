-- Phase 5: Narrow exposure of Owner-account identity helper.
-- Staging-first, additive hardening. Does not modify user roles or student data.
-- Retains the authenticated SELECT paths used by Super Admin / Clinic Admin.
BEGIN;
CREATE OR REPLACE FUNCTION public.is_creator_account(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
 SELECT (SELECT auth.uid()) IS NOT NULL
   AND (public.has_role('admin') OR public.has_role('clinic_admin'))
   AND EXISTS(
     SELECT 1 FROM public.user_roles ur
     WHERE ur.user_id = p_user_id AND ur.role = 'owner'
   );
$function$;
REVOKE ALL ON FUNCTION public.is_creator_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_creator_account(uuid) TO authenticated;
COMMIT;
