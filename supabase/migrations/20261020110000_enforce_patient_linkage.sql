-- Require a real patient relationship for orders and therapy sessions.
-- The active project currently has no rows in these tables; fail safely if that changes.
ALTER TABLE public."StoreOrder" ALTER COLUMN "patientId" SET NOT NULL;
ALTER TABLE public."StoreOrder" DROP CONSTRAINT IF EXISTS "StoreOrder_patientId_fkey";
ALTER TABLE public."StoreOrder"
  ADD CONSTRAINT "StoreOrder_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES public."Patient"("id") ON DELETE RESTRICT;

ALTER TABLE public."TherapistAssignment" ALTER COLUMN "patientId" SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'TherapistAssignment_patientId_fkey'
      AND conrelid = 'public."TherapistAssignment"'::regclass
  ) THEN
    ALTER TABLE public."TherapistAssignment"
      ADD CONSTRAINT "TherapistAssignment_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES public."Patient"("id") ON DELETE RESTRICT;
  END IF;
END;
$$;
CREATE INDEX IF NOT EXISTS "TherapistAssignment_patientId_scheduledAt_idx"
  ON public."TherapistAssignment" ("patientId", "scheduledAt");
