#!/bin/sh
set -eu
app_password=$(cat /run/secrets/app_password)
case "$app_password" in ''|*[!a-zA-Z0-9_-]*) exit 1;; esac
if [ "${#app_password}" -lt 43 ] || [ "$POSTGRES_DB" != gx01_pilot ] || [ "$POSTGRES_USER" != gx01_pilot_owner ]; then exit 1; fi
psql --no-psqlrc --quiet -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOF
SET log_statement='none'; SET log_min_error_statement='panic';
CREATE ROLE gx01_pilot_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 8 PASSWORD '$app_password';
REVOKE ALL ON DATABASE gx01_pilot FROM PUBLIC;
GRANT CONNECT ON DATABASE gx01_pilot TO gx01_pilot_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO gx01_pilot_app;
GRANT SELECT, INSERT ON audit_assets,audit_evidences,audit_findings,audit_reports TO gx01_pilot_app;
GRANT SELECT, INSERT, UPDATE ON audit_cases TO gx01_pilot_app;
EOF
unset app_password
