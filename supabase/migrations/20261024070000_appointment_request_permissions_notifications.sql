-- Appointment requests: client may create a request only for their linked patient.
DROP POLICY IF EXISTS appointment_insert ON public."Appointment";
CREATE POLICY appointment_insert ON public."Appointment"
FOR INSERT TO authenticated
WITH CHECK (
  public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','STAFF']::text[])
  OR (
    public.livya_has_role(ARRAY['CLIENT']::text[])
    AND "status"::text = 'REQUESTED'
    AND "clinicianId" IS NULL
    AND EXISTS (
      SELECT 1 FROM public."Patient" p
      WHERE p.id = "Appointment"."patientId" AND p."userId" = auth.uid()
    )
  )
);

-- Only staff may approve, reschedule, or cancel appointments.
DROP POLICY IF EXISTS appointment_update ON public."Appointment";
CREATE POLICY appointment_update ON public."Appointment"
FOR UPDATE TO authenticated
USING (public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','STAFF']::text[]))
WITH CHECK (public.livya_has_role(ARRAY['SUPERADMIN','ADMIN','CLINICIAN','STAFF']::text[]));

-- In-app notifications: request goes to staff queue; status changes notify the client.
CREATE OR REPLACE FUNCTION public.livya_appointment_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_patient_user_id uuid;
  v_actor uuid;
  v_subject text;
  v_body text;
BEGIN
  SELECT p."userId" INTO v_patient_user_id FROM public."Patient" p WHERE p.id = NEW."patientId";
  IF TG_OP = 'INSERT' AND NEW."status"::text = 'REQUESTED' AND v_patient_user_id IS NOT NULL THEN
    v_actor := COALESCE(auth.uid(), v_patient_user_id);
    INSERT INTO public."Message"(id,"patientId","senderId","recipientId",subject,body,"createdAt")
    VALUES(gen_random_uuid(),NEW."patientId",v_actor,NULL,'Appointment request awaiting review',
      'A client has requested "' || NEW.title || '" for ' ||
      to_char(NEW."startAt",'DD Mon YYYY HH12:MI AM') ||
      '. Please review it in the staff Appointments page.',now());
  ELSIF TG_OP = 'UPDATE' AND NEW."status" IS DISTINCT FROM OLD."status" AND v_patient_user_id IS NOT NULL THEN
    v_actor := COALESCE(auth.uid(),NEW."clinicianId",v_patient_user_id);
    IF NEW."status"::text = 'CONFIRMED' THEN
      v_subject := 'Your appointment is confirmed';
      v_body := 'Your appointment "' || NEW.title || '" is approved and confirmed for ' ||
        to_char(NEW."startAt",'DD Mon YYYY HH12:MI AM') ||
        CASE WHEN NEW.location IS NOT NULL AND NEW.location <> '' THEN ' at ' || NEW.location ELSE '' END ||
        '. If you need to change this time, please contact the care team.';
    ELSIF NEW."status"::text = 'CANCELLED' THEN
      v_subject := 'Appointment request update';
      v_body := 'Your appointment request "' || NEW.title || '" for ' ||
        to_char(NEW."startAt",'DD Mon YYYY HH12:MI AM') ||
        ' was declined or cancelled by the care team. Please contact the care team to arrange another time.';
    ELSE
      v_subject := 'Appointment status updated';
      v_body := 'Your appointment "' || NEW.title || '" status is now ' ||
        replace(lower(NEW."status"::text),'_',' ') || '.';
    END IF;
    INSERT INTO public."Message"(id,"patientId","senderId","recipientId",subject,body,"createdAt")
    VALUES(gen_random_uuid(),NEW."patientId",v_actor,v_patient_user_id,v_subject,v_body,now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointment_notifications_after_insert ON public."Appointment";
DROP TRIGGER IF EXISTS appointment_notifications_after_update ON public."Appointment";
CREATE TRIGGER appointment_notifications_after_insert AFTER INSERT ON public."Appointment"
FOR EACH ROW EXECUTE FUNCTION public.livya_appointment_notifications();
CREATE TRIGGER appointment_notifications_after_update AFTER UPDATE OF status ON public."Appointment"
FOR EACH ROW EXECUTE FUNCTION public.livya_appointment_notifications();