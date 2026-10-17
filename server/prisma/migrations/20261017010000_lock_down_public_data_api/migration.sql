-- Defence in depth for the public Supabase Data API.
-- The Express API uses the server-side PostgreSQL connection; browser clients must not
-- read/write these clinical tables directly through Supabase's anon/authenticated roles.

DO $$
DECLARE
  table_name text;
  app_tables text[] := ARRAY[
    'User', 'Session', 'Patient', 'Appointment', 'VitalAlert', 'ClinicalRecord',
    'Medicine', 'Prescription', 'PrescriptionItem', 'NutritionAssessment', 'Program',
    'PatientPlan', 'PlanConsumption', 'SOP', 'RolePermission', 'AIReview', 'Therapy',
    'Therapist', 'TherapistAssignment', 'StoreProduct', 'StoreOrder', 'StoreOrderItem',
    'LabPartner', 'LabBooking', 'Message', 'AuditLog'
  ];
BEGIN
  FOREACH table_name IN ARRAY app_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
      END IF;

      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
      END IF;
    END IF;
  END LOOP;
END
$$;
