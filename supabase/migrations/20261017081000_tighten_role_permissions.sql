-- Tighten write permissions by role to match the current LIVYA UI module map.
CREATE OR REPLACE FUNCTION public.livya_has_role(allowed_roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(public.livya_current_role() = ANY(allowed_roles), false)
$$;
GRANT EXECUTE ON FUNCTION public.livya_has_role(text[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.livya_has_role(text[]) FROM anon;

DROP POLICY IF EXISTS patient_insert ON public."Patient";
DROP POLICY IF EXISTS patient_update ON public."Patient";
DROP POLICY IF EXISTS patient_delete ON public."Patient";
CREATE POLICY patient_insert ON public."Patient" FOR INSERT TO authenticated WITH CHECK (public.livya_has_role(ARRAY['SUPERADMIN','ADMIN']));
CREATE POLICY patient_update ON public."Patient" FOR UPDATE TO authenticated USING (public.livya_has_role(ARRAY['SUPERADMIN','ADMIN'])) WITH CHECK (public.livya_has_role(ARRAY['SUPERADMIN','ADMIN']));
CREATE POLICY patient_delete ON public."Patient" FOR DELETE TO authenticated USING (public.livya_is_admin());

DROP POLICY IF EXISTS appointment_insert ON public."Appointment";
DROP POLICY IF EXISTS appointment_update ON public."Appointment";
DROP POLICY IF EXISTS appointment_delete ON public."Appointment";
CREATE POLICY appointment_insert ON public."Appointment" FOR INSERT TO authenticated WITH CHECK (public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','STAFF']));
CREATE POLICY appointment_update ON public."Appointment" FOR UPDATE TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','STAFF'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','STAFF']));
CREATE POLICY appointment_delete ON public."Appointment" FOR DELETE TO authenticated USING(public.livya_is_admin());

DROP POLICY IF EXISTS alert_write ON public."VitalAlert";
CREATE POLICY alert_write ON public."VitalAlert" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','THERAPIST','STAFF'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','THERAPIST','STAFF']));
DROP POLICY IF EXISTS record_write ON public."ClinicalRecord";
CREATE POLICY record_write ON public."ClinicalRecord" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST']));
DROP POLICY IF EXISTS prescription_write ON public."Prescription";
CREATE POLICY prescription_write ON public."Prescription" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN']));
DROP POLICY IF EXISTS prescription_item_write ON public."PrescriptionItem";
CREATE POLICY prescription_item_write ON public."PrescriptionItem" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN']));
DROP POLICY IF EXISTS nutrition_write ON public."NutritionAssessment";
CREATE POLICY nutrition_write ON public."NutritionAssessment" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST']));
DROP POLICY IF EXISTS plans_write ON public."PatientPlan";
CREATE POLICY plans_write ON public."PatientPlan" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST']));
DROP POLICY IF EXISTS consumption_write ON public."PlanConsumption";
CREATE POLICY consumption_write ON public."PlanConsumption" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','STAFF'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','STAFF']));
DROP POLICY IF EXISTS ai_review_write ON public."AIReview";
CREATE POLICY ai_review_write ON public."AIReview" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN']));
DROP POLICY IF EXISTS lab_booking_write ON public."LabBooking";
CREATE POLICY lab_booking_write ON public."LabBooking" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','STAFF'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','STAFF']));
DROP POLICY IF EXISTS store_order_write ON public."StoreOrder";
CREATE POLICY store_order_write ON public."StoreOrder" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','STAFF'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','STAFF']));
DROP POLICY IF EXISTS store_order_item_write ON public."StoreOrderItem";
CREATE POLICY store_order_item_write ON public."StoreOrderItem" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','STAFF'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','STAFF']));
DROP POLICY IF EXISTS medicine_write ON public."Medicine";
CREATE POLICY medicine_write ON public."Medicine" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','STAFF'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','STAFF']));
DROP POLICY IF EXISTS program_write ON public."Program";
CREATE POLICY program_write ON public."Program" FOR ALL TO authenticated USING(public.livya_is_admin()) WITH CHECK(public.livya_is_admin());
DROP POLICY IF EXISTS therapy_write ON public."Therapy";
CREATE POLICY therapy_write ON public."Therapy" FOR ALL TO authenticated USING(public.livya_is_admin()) WITH CHECK(public.livya_is_admin());
DROP POLICY IF EXISTS product_write ON public."StoreProduct";
CREATE POLICY product_write ON public."StoreProduct" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','STAFF'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','STAFF']));
DROP POLICY IF EXISTS lab_partner_write ON public."LabPartner";
CREATE POLICY lab_partner_write ON public."LabPartner" FOR ALL TO authenticated USING(public.livya_is_admin()) WITH CHECK(public.livya_is_admin());
DROP POLICY IF EXISTS therapist_write ON public."Therapist";
CREATE POLICY therapist_write ON public."Therapist" FOR ALL TO authenticated USING(public.livya_is_admin()) WITH CHECK(public.livya_is_admin());
DROP POLICY IF EXISTS therapy_assignment_write ON public."TherapistAssignment";
CREATE POLICY therapy_assignment_write ON public."TherapistAssignment" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','THERAPIST','STAFF'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','THERAPIST','STAFF']));
DROP POLICY IF EXISTS sop_write ON public."SOP";
CREATE POLICY sop_write ON public."SOP" FOR ALL TO authenticated USING(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','THERAPIST'])) WITH CHECK(public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','THERAPIST']));
DROP POLICY IF EXISTS role_permission_write ON public."RolePermission";
CREATE POLICY role_permission_write ON public."RolePermission" FOR ALL TO authenticated USING(public.livya_current_role()='SUPERADMIN') WITH CHECK(public.livya_current_role()='SUPERADMIN');
DROP POLICY IF EXISTS message_insert ON public."Message";
CREATE POLICY message_insert ON public."Message" FOR INSERT TO authenticated WITH CHECK(public.livya_is_staff() AND "senderId"=auth.uid());
DROP POLICY IF EXISTS message_update ON public."Message";
CREATE POLICY message_update ON public."Message" FOR UPDATE TO authenticated USING(public.livya_is_staff()) WITH CHECK(public.livya_is_staff());
DROP POLICY IF EXISTS message_delete ON public."Message";
CREATE POLICY message_delete ON public."Message" FOR DELETE TO authenticated USING(public.livya_is_admin());
DROP POLICY IF EXISTS audit_insert ON public."AuditLog";
CREATE POLICY audit_insert ON public."AuditLog" FOR INSERT TO authenticated WITH CHECK(public.livya_is_staff() AND "actorId"=auth.uid());
