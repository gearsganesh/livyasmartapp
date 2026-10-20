-- Patient-linked private report storage and structured lab-result foundation.
create table if not exists public."PatientReport" (
  id uuid primary key default gen_random_uuid(),
  "patientId" uuid not null references public."Patient"(id) on delete cascade,
  "reportType" varchar(80) not null default 'Laboratory',
  title varchar(180) not null,
  "reportDate" date not null,
  "originalFileName" varchar(255) not null,
  "storagePath" text not null unique,
  "mimeType" varchar(100) not null default 'application/pdf',
  "fileSize" bigint not null,
  "extractionStatus" varchar(40) not null default 'NOT_STARTED',
  "reviewStatus" varchar(40) not null default 'PENDING',
  "extractionError" text,
  "uploadedBy" uuid,
  "extractedAt" timestamptz,
  "reviewedBy" uuid,
  "reviewedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint patient_report_pdf_only check ("mimeType" = 'application/pdf'),
  constraint patient_report_size check ("fileSize" > 0 and "fileSize" <= 20971520)
);
create index if not exists patient_report_patient_date_idx on public."PatientReport" ("patientId","reportDate" desc);
create index if not exists patient_report_status_idx on public."PatientReport" ("extractionStatus","reviewStatus");

create table if not exists public."LabResult" (
  id uuid primary key default gen_random_uuid(),
  "reportId" uuid not null references public."PatientReport"(id) on delete cascade,
  "patientId" uuid not null references public."Patient"(id) on delete cascade,
  "testName" varchar(180) not null,
  "testCode" varchar(100),
  value numeric,
  unit varchar(80),
  "referenceRangeText" varchar(160),
  "referenceLow" numeric,
  "referenceHigh" numeric,
  "labFlag" varchar(40),
  "resultDate" date not null,
  confidence numeric,
  "sourceText" text,
  "reviewStatus" varchar(40) not null default 'PENDING',
  "reviewedBy" uuid,
  "reviewedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint lab_result_confidence check (confidence is null or (confidence >= 0 and confidence <= 1))
);
create index if not exists lab_result_patient_test_date_idx on public."LabResult" ("patientId","testName","resultDate");
create index if not exists lab_result_report_idx on public."LabResult" ("reportId");

alter table public."PatientReport" enable row level security;
alter table public."LabResult" enable row level security;

drop policy if exists patient_report_read on public."PatientReport";
create policy patient_report_read on public."PatientReport" for select to authenticated
using (livya_has_role(array['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','STAFF']::text[]) or exists (select 1 from public."Patient" p where p.id = "PatientReport"."patientId" and p."userId" = auth.uid()));
drop policy if exists patient_report_insert on public."PatientReport";
create policy patient_report_insert on public."PatientReport" for insert to authenticated
with check (livya_has_role(array['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','STAFF']::text[]) and exists (select 1 from public."Patient" p where p.id = "PatientReport"."patientId"));
drop policy if exists patient_report_update on public."PatientReport";
create policy patient_report_update on public."PatientReport" for update to authenticated
using (livya_has_role(array['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST']::text[])) with check (livya_has_role(array['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST']::text[]));
drop policy if exists patient_report_delete on public."PatientReport";
create policy patient_report_delete on public."PatientReport" for delete to authenticated using (livya_has_role(array['SUPERADMIN','ADMIN']::text[]));

drop policy if exists lab_result_read on public."LabResult";
create policy lab_result_read on public."LabResult" for select to authenticated
using (livya_has_role(array['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','STAFF']::text[]) or exists (select 1 from public."Patient" p where p.id = "LabResult"."patientId" and p."userId" = auth.uid()));
drop policy if exists lab_result_insert on public."LabResult";
create policy lab_result_insert on public."LabResult" for insert to authenticated with check (livya_has_role(array['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST']::text[]));
drop policy if exists lab_result_update on public."LabResult";
create policy lab_result_update on public."LabResult" for update to authenticated using (livya_has_role(array['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST']::text[])) with check (livya_has_role(array['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST']::text[]));
drop policy if exists lab_result_delete on public."LabResult";
create policy lab_result_delete on public."LabResult" for delete to authenticated using (livya_has_role(array['SUPERADMIN','ADMIN']::text[]));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patient-reports','patient-reports',false,20971520,array['application/pdf'])
on conflict (id) do update set public=false, file_size_limit=20971520, allowed_mime_types=array['application/pdf'];
drop policy if exists patient_reports_storage_read on storage.objects;
create policy patient_reports_storage_read on storage.objects for select to authenticated using (bucket_id='patient-reports' and (livya_has_role(array['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','STAFF']::text[]) or exists (select 1 from public."Patient" p where p.id::text=(storage.foldername(name))[1] and p."userId"=auth.uid())));
drop policy if exists patient_reports_storage_insert on storage.objects;
create policy patient_reports_storage_insert on storage.objects for insert to authenticated with check (bucket_id='patient-reports' and livya_has_role(array['SUPERADMIN','ADMIN','CLINICIAN','NUTRITIONIST','STAFF']::text[]) and exists (select 1 from public."Patient" p where p.id::text=(storage.foldername(name))[1]));
drop policy if exists patient_reports_storage_delete on storage.objects;
create policy patient_reports_storage_delete on storage.objects for delete to authenticated using (bucket_id='patient-reports' and livya_has_role(array['SUPERADMIN','ADMIN']::text[]));
