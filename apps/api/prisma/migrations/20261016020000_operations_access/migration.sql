ALTER TABLE "AppUser" ADD COLUMN "allProjects" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "AppUser" ADD COLUMN "projectIds" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "AppUser" DROP CONSTRAINT "AppUser_role_check";
ALTER TABLE "AppUser" ADD CONSTRAINT "AppUser_role_check" CHECK(role IN ('OWNER','MANAGER','EMPLOYEE','PROCUREMENT','FINANCE','VIEWER'));
ALTER TABLE "StoredFile" ADD COLUMN "projectId" TEXT;
DO $$ DECLARE company_id UUID; BEGIN
 FOR company_id IN SELECT id FROM "Company" LOOP
  PERFORM set_config('app.company_id',company_id::text,true);
  UPDATE "StoredFile" f SET "projectId"=d->>'projectId' FROM "CompanyWorkspace" w, jsonb_array_elements(w.payload->'documents') d WHERE w."companyId"=company_id AND w."companyId"=f."companyId" AND d->>'id'=f.id;
 END LOOP;
 PERFORM set_config('app.company_id','',true);
END $$;
CREATE TABLE "PasswordRecovery" ("tokenHash" TEXT PRIMARY KEY,"userId" UUID NOT NULL REFERENCES "AppUser"(id) ON DELETE CASCADE,"expiresAt" TIMESTAMPTZ NOT NULL,"consumedAt" TIMESTAMPTZ);
CREATE INDEX "PasswordRecovery_userId_idx" ON "PasswordRecovery"("userId");
CREATE TABLE "AuditEvent" (id UUID PRIMARY KEY,"companyId" UUID NOT NULL REFERENCES "Company"(id),"actorId" UUID,"actorName" TEXT NOT NULL,action TEXT NOT NULL,collection TEXT NOT NULL,"recordId" TEXT,"projectId" TEXT,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp());
CREATE INDEX "AuditEvent_company_created_idx" ON "AuditEvent"("companyId","createdAt" DESC,id DESC);
ALTER TABLE "AuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEvent" FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_company ON "AuditEvent" USING ("companyId"::text=current_setting('app.company_id',true)) WITH CHECK ("companyId"::text=current_setting('app.company_id',true));
CREATE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit events are immutable'; END $$;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
