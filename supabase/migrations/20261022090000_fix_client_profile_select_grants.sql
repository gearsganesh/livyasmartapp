-- Keep the client auth/profile lookup aligned with client/src/auth.jsx.
-- The profile loader reads mustChangePassword after Supabase Auth succeeds.
-- Grant only the profile columns required by the signed-in user's own profile
-- (or the existing admin policy), while leaving RLS responsible for row access.
GRANT SELECT ("id", "email", "fullName", "role", "isActive", "mustChangePassword", "createdAt", "updatedAt")
ON TABLE public."User" TO authenticated;
