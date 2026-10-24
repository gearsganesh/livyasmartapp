-- Allow all designated clinical staff roles to manage appointments, while clients remain request-only.
DROP POLICY IF EXISTS appointment_insert ON public."Appointment";
CREATE POLICY appointment_insert ON public."Appointment"
FOR INSERT TO authenticated
WITH CHECK (
  public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','THERAPIST','STAFF']::text[])
  OR (
    public.livya_has_role(ARRAY['CLIENT']::text[])
    AND "status"::text = 'REQUESTED'
    AND "clinicianId" IS NULL
    AND EXISTS (SELECT 1 FROM public."Patient" p WHERE p.id="Appointment"."patientId" AND p."userId"=auth.uid())
  )
);
DROP POLICY IF EXISTS appointment_update ON public."Appointment";
CREATE POLICY appointment_update ON public."Appointment"
FOR UPDATE TO authenticated
USING (public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','THERAPIST','STAFF']::text[]))
WITH CHECK (public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','THERAPIST','STAFF']::text[]));