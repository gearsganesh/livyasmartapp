-- Automatic human-readable identifiers for core LIVYA records.
-- UUID primary keys remain unchanged and continue to power all foreign-key relationships.

CREATE SEQUENCE IF NOT EXISTS public.livya_patient_code_seq AS bigint;
CREATE SEQUENCE IF NOT EXISTS public.livya_appointment_number_seq AS bigint;
CREATE SEQUENCE IF NOT EXISTS public.livya_lab_booking_number_seq AS bigint;
CREATE SEQUENCE IF NOT EXISTS public.livya_order_number_seq AS bigint;
CREATE SEQUENCE IF NOT EXISTS public.livya_invoice_number_seq AS bigint;

ALTER TABLE public."Appointment"
  ADD COLUMN IF NOT EXISTS "appointmentNumber" varchar(40);

CREATE TABLE IF NOT EXISTS public."Invoice" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoiceNumber" varchar(40) NOT NULL UNIQUE,
  "patientId" uuid NOT NULL REFERENCES public."Patient"("id") ON DELETE RESTRICT,
  "invoiceDate" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" timestamp without time zone,
  "status" varchar(30) NOT NULL DEFAULT 'DRAFT'
    CHECK ("status" IN ('DRAFT','SENT','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED')),
  "currency" varchar(3) NOT NULL DEFAULT 'INR',
  "subtotal" numeric(12,2) NOT NULL DEFAULT 0 CHECK ("subtotal" >= 0),
  "tax" numeric(12,2) NOT NULL DEFAULT 0 CHECK ("tax" >= 0),
  "total" numeric(12,2) NOT NULL DEFAULT 0 CHECK ("total" >= 0),
  "notes" text,
  "createdAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Invoice_patientId_invoiceDate_idx"
  ON public."Invoice" ("patientId", "invoiceDate");
CREATE INDEX IF NOT EXISTS "Invoice_status_dueDate_idx"
  ON public."Invoice" ("status", "dueDate");

-- Start sequences after existing identifiers, without resetting any issued number.
SELECT setval('public.livya_patient_code_seq',
  COALESCE((SELECT MAX(substring("patientCode" from '([0-9]+)$')::bigint)
    FROM public."Patient" WHERE "patientCode" ~ '^LIV[0-9]+$'), 0) + 1, false);
SELECT setval('public.livya_appointment_number_seq',
  COALESCE((SELECT MAX(substring("appointmentNumber" from '([0-9]+)$')::bigint)
    FROM public."Appointment" WHERE "appointmentNumber" ~ '^APT[0-9]+$'), 0) + 1, false);
SELECT setval('public.livya_lab_booking_number_seq',
  COALESCE((SELECT MAX(substring("bookingNumber" from '([0-9]+)$')::bigint)
    FROM public."LabBooking" WHERE "bookingNumber" ~ '^LAB[0-9]+$'), 0) + 1, false);
SELECT setval('public.livya_order_number_seq',
  COALESCE((SELECT MAX(substring("orderNumber" from '([0-9]+)$')::bigint)
    FROM public."StoreOrder" WHERE "orderNumber" ~ '^ORD[0-9]+$'), 0) + 1, false);
SELECT setval('public.livya_invoice_number_seq',
  COALESCE((SELECT MAX(substring("invoiceNumber" from '([0-9]+)$')::bigint)
    FROM public."Invoice" WHERE "invoiceNumber" ~ '^INV[0-9]+$'), 0) + 1, false);

-- Backfill legacy rows before making the patient code mandatory.
UPDATE public."Patient"
SET "patientCode" = 'LIV' || lpad(nextval('public.livya_patient_code_seq')::text,
                                  greatest(4, length(currval('public.livya_patient_code_seq')::text)), '0')
WHERE "patientCode" IS NULL OR btrim("patientCode") = '';

UPDATE public."Appointment"
SET "appointmentNumber" = 'APT' || lpad(nextval('public.livya_appointment_number_seq')::text,
                                       greatest(4, length(currval('public.livya_appointment_number_seq')::text)), '0')
WHERE "appointmentNumber" IS NULL OR btrim("appointmentNumber") = '';

UPDATE public."LabBooking"
SET "bookingNumber" = 'LAB' || lpad(nextval('public.livya_lab_booking_number_seq')::text,
                                   greatest(4, length(currval('public.livya_lab_booking_number_seq')::text)), '0')
WHERE "bookingNumber" IS NULL OR btrim("bookingNumber") = '';

UPDATE public."StoreOrder"
SET "orderNumber" = 'ORD' || lpad(nextval('public.livya_order_number_seq')::text,
                                 greatest(4, length(currval('public.livya_order_number_seq')::text)), '0')
WHERE "orderNumber" IS NULL OR btrim("orderNumber") = '';

UPDATE public."Invoice"
SET "invoiceNumber" = 'INV' || lpad(nextval('public.livya_invoice_number_seq')::text,
                                   greatest(4, length(currval('public.livya_invoice_number_seq')::text)), '0')
WHERE "invoiceNumber" IS NULL OR btrim("invoiceNumber") = '';

ALTER TABLE public."Patient" ALTER COLUMN "patientCode" SET NOT NULL;
ALTER TABLE public."Appointment" ALTER COLUMN "appointmentNumber" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_appointmentNumber_key" ON public."Appointment" ("appointmentNumber");
ALTER TABLE public."LabBooking" ALTER COLUMN "bookingNumber" SET NOT NULL;
ALTER TABLE public."StoreOrder" ALTER COLUMN "orderNumber" SET NOT NULL;

CREATE OR REPLACE FUNCTION public.livya_assign_patient_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE n bigint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    n := nextval('public.livya_patient_code_seq');
    NEW."patientCode" := 'LIV' || lpad(n::text, greatest(4, length(n::text)), '0');
  ELSE
    NEW."patientCode" := OLD."patientCode";
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.livya_assign_appointment_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE n bigint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    n := nextval('public.livya_appointment_number_seq');
    NEW."appointmentNumber" := 'APT' || lpad(n::text, greatest(4, length(n::text)), '0');
  ELSE
    NEW."appointmentNumber" := OLD."appointmentNumber";
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.livya_assign_lab_booking_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE n bigint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    n := nextval('public.livya_lab_booking_number_seq');
    NEW."bookingNumber" := 'LAB' || lpad(n::text, greatest(4, length(n::text)), '0');
  ELSE
    NEW."bookingNumber" := OLD."bookingNumber";
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.livya_assign_order_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE n bigint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    n := nextval('public.livya_order_number_seq');
    NEW."orderNumber" := 'ORD' || lpad(n::text, greatest(4, length(n::text)), '0');
  ELSE
    NEW."orderNumber" := OLD."orderNumber";
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.livya_assign_invoice_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE n bigint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    n := nextval('public.livya_invoice_number_seq');
    NEW."invoiceNumber" := 'INV' || lpad(n::text, greatest(4, length(n::text)), '0');
  ELSE
    NEW."invoiceNumber" := OLD."invoiceNumber";
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS livya_patient_code_autogen ON public."Patient";
CREATE TRIGGER livya_patient_code_autogen BEFORE INSERT OR UPDATE OF "patientCode"
ON public."Patient" FOR EACH ROW EXECUTE FUNCTION public.livya_assign_patient_code();

DROP TRIGGER IF EXISTS livya_appointment_number_autogen ON public."Appointment";
CREATE TRIGGER livya_appointment_number_autogen BEFORE INSERT OR UPDATE OF "appointmentNumber"
ON public."Appointment" FOR EACH ROW EXECUTE FUNCTION public.livya_assign_appointment_number();

DROP TRIGGER IF EXISTS livya_lab_booking_number_autogen ON public."LabBooking";
CREATE TRIGGER livya_lab_booking_number_autogen BEFORE INSERT OR UPDATE OF "bookingNumber"
ON public."LabBooking" FOR EACH ROW EXECUTE FUNCTION public.livya_assign_lab_booking_number();

DROP TRIGGER IF EXISTS livya_order_number_autogen ON public."StoreOrder";
CREATE TRIGGER livya_order_number_autogen BEFORE INSERT OR UPDATE OF "orderNumber"
ON public."StoreOrder" FOR EACH ROW EXECUTE FUNCTION public.livya_assign_order_number();

DROP TRIGGER IF EXISTS livya_invoice_number_autogen ON public."Invoice";
CREATE TRIGGER livya_invoice_number_autogen BEFORE INSERT OR UPDATE OF "invoiceNumber"
ON public."Invoice" FOR EACH ROW EXECUTE FUNCTION public.livya_assign_invoice_number();

-- These SECURITY DEFINER functions are trigger-only, not callable from the API.
REVOKE ALL ON FUNCTION public.livya_assign_patient_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.livya_assign_appointment_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.livya_assign_lab_booking_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.livya_assign_order_number() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.livya_assign_invoice_number() FROM PUBLIC, anon, authenticated;

ALTER TABLE public."Invoice" ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."Invoice" TO authenticated;
REVOKE ALL ON public."Invoice" FROM anon;

DROP POLICY IF EXISTS invoice_read ON public."Invoice";
CREATE POLICY invoice_read ON public."Invoice" FOR SELECT TO authenticated
USING (
  public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','STAFF']::text[])
  OR EXISTS (
    SELECT 1 FROM public."Patient" p
    WHERE p.id = "Invoice"."patientId" AND p."userId" = auth.uid()
  )
);

DROP POLICY IF EXISTS invoice_insert ON public."Invoice";
CREATE POLICY invoice_insert ON public."Invoice" FOR INSERT TO authenticated
WITH CHECK (public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','STAFF']::text[]));

DROP POLICY IF EXISTS invoice_update ON public."Invoice";
CREATE POLICY invoice_update ON public."Invoice" FOR UPDATE TO authenticated
USING (public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','STAFF']::text[]))
WITH CHECK (public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','STAFF']::text[]));

DROP POLICY IF EXISTS invoice_delete ON public."Invoice";
CREATE POLICY invoice_delete ON public."Invoice" FOR DELETE TO authenticated
USING (public.livya_is_admin());
