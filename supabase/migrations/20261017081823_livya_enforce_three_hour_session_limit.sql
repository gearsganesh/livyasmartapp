-- Enforce a hard three-hour session age at the RLS role-check boundary.
CREATE OR REPLACE FUNCTION public.livya_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT u.role::text
  FROM public."User" u
  WHERE u.id=auth.uid()
    AND u."isActive"=true
    AND EXISTS (
      SELECT 1 FROM auth.sessions s
      WHERE s.id=NULLIF(auth.jwt()->>'session_id','')::uuid
        AND s.created_at >= now() - interval '3 hours'
    )
  LIMIT 1
$$;
