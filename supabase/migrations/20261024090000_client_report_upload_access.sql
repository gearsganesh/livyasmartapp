-- Private report storage access: staff can access reports; clients only their linked patient folder.
DROP POLICY IF EXISTS patient_reports_storage_read ON storage.objects;
CREATE POLICY patient_reports_storage_read ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'patient-reports'
  AND (
    public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','THERAPIST','STAFF']::text[])
    OR EXISTS (
      SELECT 1 FROM public."Patient" p
      WHERE p.id::text = split_part(name,'/',1)
        AND p."userId" = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS patient_reports_storage_insert ON storage.objects;
CREATE POLICY patient_reports_storage_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'patient-reports'
  AND (
    (
      public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','THERAPIST','STAFF']::text[])
      AND EXISTS (SELECT 1 FROM public."Patient" p WHERE p.id::text = split_part(name,'/',1))
    )
    OR EXISTS (
      SELECT 1 FROM public."Patient" p
      WHERE p.id::text = split_part(name,'/',1)
        AND p."userId" = auth.uid()
        AND public.livya_has_role(ARRAY['CLIENT']::text[])
    )
  )
);

DROP POLICY IF EXISTS patient_reports_storage_delete ON storage.objects;
CREATE POLICY patient_reports_storage_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'patient-reports'
  AND public.livya_has_role(ARRAY['SUPERADMIN','ADMIN']::text[])
);

-- Clients may add reports only to their own linked patient profile. Staff upload on behalf of patients.
DROP POLICY IF EXISTS patient_report_insert ON public."PatientReport";
CREATE POLICY patient_report_insert ON public."PatientReport"
FOR INSERT TO authenticated
WITH CHECK (
  (
    public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','THERAPIST','STAFF']::text[])
    AND EXISTS (SELECT 1 FROM public."Patient" p WHERE p.id = "PatientReport"."patientId")
  )
  OR (
    public.livya_has_role(ARRAY['CLIENT']::text[])
    AND "uploadedBy" = auth.uid()
    AND "reviewStatus"::text = 'PENDING'
    AND EXISTS (
      SELECT 1 FROM public."Patient" p
      WHERE p.id = "PatientReport"."patientId" AND p."userId" = auth.uid()
    )
  )
);

-- Report review metadata can only be changed by authorized staff; clients may not edit or delete uploaded reports.
DROP POLICY IF EXISTS patient_report_update ON public."PatientReport";
CREATE POLICY patient_report_update ON public."PatientReport"
FOR UPDATE TO authenticated
USING (public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST']::text[]))
WITH CHECK (public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST']::text[]));