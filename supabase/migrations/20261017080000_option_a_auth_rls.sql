-- Supabase-first authentication and RLS for LIVYA CureHub.
-- Applied to project wbwbvyhvxynfcvisgiun as livya_option_a_supabase_auth_rls.
ALTER TABLE public."User" ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.livya_current_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT u.role::text FROM public."User" u
  WHERE u.id=auth.uid() AND u."isActive"=true LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.livya_is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(public.livya_current_role() IN
    ('SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','THERAPIST','STAFF'),false)
$$;
CREATE OR REPLACE FUNCTION public.livya_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(public.livya_current_role() IN ('SUPERADMIN','ADMIN'),false)
$$;
GRANT EXECUTE ON FUNCTION public.livya_current_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.livya_is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.livya_is_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.livya_current_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.livya_is_staff() FROM anon;
REVOKE EXECUTE ON FUNCTION public.livya_is_admin() FROM anon;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['User','Session','Patient','Appointment','VitalAlert','ClinicalRecord','Medicine','Prescription','PrescriptionItem','NutritionAssessment','Program','PatientPlan','PlanConsumption','SOP','RolePermission','AIReview','Therapy','Therapist','TherapistAssignment','StoreProduct','StoreOrder','StoreOrderItem','LabPartner','LabBooking','Message','AuditLog'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon',t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated',t);
  END LOOP;
END $$;

GRANT SELECT ("id","email","fullName","role","isActive","createdAt","updatedAt") ON public."User" TO authenticated;
DROP POLICY IF EXISTS livya_user_select ON public."User";
CREATE POLICY livya_user_select ON public."User" FOR SELECT TO authenticated
USING (id=auth.uid() OR public.livya_is_admin());
REVOKE ALL ON TABLE public."Session" FROM anon,authenticated;

GRANT SELECT,INSERT,UPDATE,DELETE ON public."Patient",public."Appointment",public."VitalAlert",public."ClinicalRecord",public."Medicine",public."Prescription",public."PrescriptionItem",public."NutritionAssessment",public."Program",public."PatientPlan",public."PlanConsumption",public."SOP",public."RolePermission",public."AIReview",public."Therapy",public."Therapist",public."TherapistAssignment",public."StoreProduct",public."StoreOrder",public."StoreOrderItem",public."LabPartner",public."LabBooking",public."Message",public."AuditLog" TO authenticated;

-- Remove old policies on the application data tables so the policy set is deterministic.
DO $$ DECLARE r record; BEGIN
 FOR r IN SELECT schemaname,tablename,policyname FROM pg_policies WHERE schemaname='public'
 AND tablename=ANY(ARRAY['Patient','Appointment','VitalAlert','ClinicalRecord','Medicine','Prescription','PrescriptionItem','NutritionAssessment','Program','PatientPlan','PlanConsumption','SOP','RolePermission','AIReview','Therapy','Therapist','TherapistAssignment','StoreProduct','StoreOrder','StoreOrderItem','LabPartner','LabBooking','Message','AuditLog'])
 LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',r.policyname,r.schemaname,r.tablename); END LOOP;
END $$;

CREATE POLICY patient_read ON public."Patient" FOR SELECT TO authenticated USING (public.livya_is_staff() OR "userId"=auth.uid());
CREATE POLICY patient_insert ON public."Patient" FOR INSERT TO authenticated WITH CHECK (public.livya_is_staff());
CREATE POLICY patient_update ON public."Patient" FOR UPDATE TO authenticated USING (public.livya_is_staff()) WITH CHECK (public.livya_is_staff());
CREATE POLICY patient_delete ON public."Patient" FOR DELETE TO authenticated USING (public.livya_is_admin());

CREATE POLICY appointment_read ON public."Appointment" FOR SELECT TO authenticated USING (public.livya_is_staff() OR EXISTS(SELECT 1 FROM public."Patient" p WHERE p.id="Appointment"."patientId" AND p."userId"=auth.uid()));
CREATE POLICY appointment_insert ON public."Appointment" FOR INSERT TO authenticated WITH CHECK (public.livya_is_staff());
CREATE POLICY appointment_update ON public."Appointment" FOR UPDATE TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());
CREATE POLICY appointment_delete ON public."Appointment" FOR DELETE TO authenticated USING(public.livya_is_admin());

CREATE POLICY alert_read ON public."VitalAlert" FOR SELECT TO authenticated USING(public.livya_is_staff() OR EXISTS(SELECT 1 FROM public."Patient" p WHERE p.id="VitalAlert"."patientId" AND p."userId"=auth.uid()));
CREATE POLICY alert_write ON public."VitalAlert" FOR ALL TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());
CREATE POLICY record_read ON public."ClinicalRecord" FOR SELECT TO authenticated USING(public.livya_is_staff() OR EXISTS(SELECT 1 FROM public."Patient" p WHERE p.id="ClinicalRecord"."patientId" AND p."userId"=auth.uid()));
CREATE POLICY record_write ON public."ClinicalRecord" FOR ALL TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());
CREATE POLICY prescription_read ON public."Prescription" FOR SELECT TO authenticated USING(public.livya_is_staff() OR EXISTS(SELECT 1 FROM public."Patient" p WHERE p.id="Prescription"."patientId" AND p."userId"=auth.uid()));
CREATE POLICY prescription_write ON public."Prescription" FOR ALL TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());
CREATE POLICY prescription_item_read ON public."PrescriptionItem" FOR SELECT TO authenticated USING(public.livya_is_staff() OR EXISTS(SELECT 1 FROM public."Prescription" pr JOIN public."Patient" p ON p.id=pr."patientId" WHERE pr.id="PrescriptionItem"."prescriptionId" AND p."userId"=auth.uid()));
CREATE POLICY prescription_item_write ON public."PrescriptionItem" FOR ALL TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());
CREATE POLICY nutrition_read ON public."NutritionAssessment" FOR SELECT TO authenticated USING(public.livya_is_staff() OR EXISTS(SELECT 1 FROM public."Patient" p WHERE p.id="NutritionAssessment"."patientId" AND p."userId"=auth.uid()));
CREATE POLICY nutrition_write ON public."NutritionAssessment" FOR ALL TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());
CREATE POLICY plans_read ON public."PatientPlan" FOR SELECT TO authenticated USING(public.livya_is_staff() OR EXISTS(SELECT 1 FROM public."Patient" p WHERE p.id="PatientPlan"."patientId" AND p."userId"=auth.uid()));
CREATE POLICY plans_write ON public."PatientPlan" FOR ALL TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());
CREATE POLICY consumption_read ON public."PlanConsumption" FOR SELECT TO authenticated USING(public.livya_is_staff() OR EXISTS(SELECT 1 FROM public."Patient" p WHERE p.id="PlanConsumption"."patientId" AND p."userId"=auth.uid()));
CREATE POLICY consumption_write ON public."PlanConsumption" FOR ALL TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());
CREATE POLICY ai_review_read ON public."AIReview" FOR SELECT TO authenticated USING(public.livya_is_staff() OR EXISTS(SELECT 1 FROM public."Patient" p WHERE p.id="AIReview"."patientId" AND p."userId"=auth.uid()));
CREATE POLICY ai_review_write ON public."AIReview" FOR ALL TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());
CREATE POLICY lab_booking_read ON public."LabBooking" FOR SELECT TO authenticated USING(public.livya_is_staff() OR EXISTS(SELECT 1 FROM public."Patient" p WHERE p.id="LabBooking"."patientId" AND p."userId"=auth.uid()));
CREATE POLICY lab_booking_write ON public."LabBooking" FOR ALL TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());
CREATE POLICY store_order_read ON public."StoreOrder" FOR SELECT TO authenticated USING(public.livya_is_staff() OR EXISTS(SELECT 1 FROM public."Patient" p WHERE p.id="StoreOrder"."patientId" AND p."userId"=auth.uid()));
CREATE POLICY store_order_write ON public."StoreOrder" FOR ALL TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());
CREATE POLICY store_order_item_read ON public."StoreOrderItem" FOR SELECT TO authenticated USING(public.livya_is_staff() OR EXISTS(SELECT 1 FROM public."StoreOrder" o JOIN public."Patient" p ON p.id=o."patientId" WHERE o.id="StoreOrderItem"."orderId" AND p."userId"=auth.uid()));
CREATE POLICY store_order_item_write ON public."StoreOrderItem" FOR ALL TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());

CREATE POLICY medicine_read ON public."Medicine" FOR SELECT TO authenticated USING(true);
CREATE POLICY medicine_write ON public."Medicine" FOR ALL TO authenticated USING(public.livya_is_admin()) WITH CHECK(public.livya_is_admin());
CREATE POLICY program_read ON public."Program" FOR SELECT TO authenticated USING(true);
CREATE POLICY program_write ON public."Program" FOR ALL TO authenticated USING(public.livya_is_admin()) WITH CHECK(public.livya_is_admin());
CREATE POLICY therapy_read ON public."Therapy" FOR SELECT TO authenticated USING(true);
CREATE POLICY therapy_write ON public."Therapy" FOR ALL TO authenticated USING(public.livya_is_admin()) WITH CHECK(public.livya_is_admin());
CREATE POLICY product_read ON public."StoreProduct" FOR SELECT TO authenticated USING(true);
CREATE POLICY product_write ON public."StoreProduct" FOR ALL TO authenticated USING(public.livya_is_admin()) WITH CHECK(public.livya_is_admin());
CREATE POLICY lab_partner_read ON public."LabPartner" FOR SELECT TO authenticated USING(public.livya_is_staff());
CREATE POLICY lab_partner_write ON public."LabPartner" FOR ALL TO authenticated USING(public.livya_is_admin()) WITH CHECK(public.livya_is_admin());
CREATE POLICY therapist_read ON public."Therapist" FOR SELECT TO authenticated USING(public.livya_is_staff());
CREATE POLICY therapist_write ON public."Therapist" FOR ALL TO authenticated USING(public.livya_is_admin()) WITH CHECK(public.livya_is_admin());
CREATE POLICY therapy_assignment_read ON public."TherapistAssignment" FOR SELECT TO authenticated USING(public.livya_is_staff() OR ("patientId" IS NOT NULL AND EXISTS(SELECT 1 FROM public."Patient" p WHERE p.id="TherapistAssignment"."patientId" AND p."userId"=auth.uid())));
CREATE POLICY therapy_assignment_write ON public."TherapistAssignment" FOR ALL TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());
CREATE POLICY sop_read ON public."SOP" FOR SELECT TO authenticated USING(public.livya_is_staff());
CREATE POLICY sop_write ON public."SOP" FOR ALL TO authenticated USING(public.livya_is_admin()) WITH CHECK(public.livya_is_admin());
CREATE POLICY role_permission_read ON public."RolePermission" FOR SELECT TO authenticated USING(public.livya_is_admin());
CREATE POLICY role_permission_write ON public."RolePermission" FOR ALL TO authenticated USING(public.livya_current_role()='SUPERADMIN') WITH CHECK(public.livya_current_role()='SUPERADMIN');

CREATE POLICY message_read ON public."Message" FOR SELECT TO authenticated USING(public.livya_is_staff() OR "recipientId"=auth.uid() OR EXISTS(SELECT 1 FROM public."Patient" p WHERE p.id="Message"."patientId" AND p."userId"=auth.uid()));
CREATE POLICY message_insert ON public."Message" FOR INSERT TO authenticated WITH CHECK(public.livya_is_staff() OR "recipientId"=auth.uid());
CREATE POLICY message_update ON public."Message" FOR UPDATE TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());
CREATE POLICY message_delete ON public."Message" FOR DELETE TO authenticated USING(public.livya_is_admin());
CREATE POLICY audit_read ON public."AuditLog" FOR SELECT TO authenticated USING(public.livya_is_admin());
CREATE POLICY audit_insert ON public."AuditLog" FOR INSERT TO authenticated WITH CHECK(public.livya_is_staff());
