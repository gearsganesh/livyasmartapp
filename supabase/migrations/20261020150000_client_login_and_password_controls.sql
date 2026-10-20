ALTER TABLE public."User"
  ADD COLUMN IF NOT EXISTS "mustChangePassword" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Patient_userId_idx" ON public."Patient" ("userId");

COMMENT ON COLUMN public."User"."mustChangePassword" IS
  'When true, the user must change their temporary password before accessing any protected application page.';
