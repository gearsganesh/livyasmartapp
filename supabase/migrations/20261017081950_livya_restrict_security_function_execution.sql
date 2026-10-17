-- Prevent anonymous callers from invoking security-definer helpers exposed in public.
REVOKE EXECUTE ON FUNCTION public.livya_current_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.livya_is_staff() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.livya_is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.livya_has_role(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.livya_current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.livya_is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.livya_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.livya_has_role(text[]) TO authenticated;
