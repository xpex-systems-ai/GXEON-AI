-- Blueprint only. Apply manually only after authorization in a NEW dedicated DB.
-- The existing reviewed 0002_audit_os_schema.sql must already be applied by its owner.
-- Create gx01_pilot_app privately with a generated password before this script.
DO $$ BEGIN
  IF current_database() <> 'gx01_pilot' OR current_user = 'gx01_pilot_app' OR
     current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN
    RAISE EXCEPTION 'DEDICATED_POSTGRES17_OWNER_REQUIRED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='gx01_pilot_app' AND NOT rolsuper
      AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls) THEN
    RAISE EXCEPTION 'RESTRICTED_APP_ROLE_REQUIRED';
  END IF;
  IF EXISTS (SELECT 1 FROM audit_cases WHERE metadata->'scope'->>'testData' IS DISTINCT FROM 'true') THEN
    RAISE EXCEPTION 'SYNTHETIC_DATABASE_REQUIRED';
  END IF;
END $$;
REVOKE ALL ON DATABASE gx01_pilot FROM PUBLIC;
GRANT CONNECT ON DATABASE gx01_pilot TO gx01_pilot_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO gx01_pilot_app;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM gx01_pilot_app;
GRANT SELECT, INSERT ON audit_assets,audit_evidences,audit_findings,audit_reports TO gx01_pilot_app;
GRANT SELECT, INSERT, UPDATE ON audit_cases TO gx01_pilot_app;
-- No owner role, superuser, CREATE, DELETE, TRUNCATE, TRIGGER or evidence/report UPDATE.
