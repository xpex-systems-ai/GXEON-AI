# Audit OS Schema Visibility Fix Runbook

## After merge/deploy

1. Redeploy the Railway API Server.
2. Run the safe read-only precheck:

```bash
curl -sS https://gxeon-api-server-production.up.railway.app/api/v1/audit/schema-diagnostics
```

3. Confirm `foundTables` includes all required tables before running bootstrap again:
   - `audit_assets`
   - `audit_cases`
   - `audit_operator_notes`
4. If `foundTables` is empty or required tables are missing, verify Railway `DATABASE_URL` points to the expected Supabase project ref `zphpeynirstwzrzgvbct`.
5. Do not paste or expose `DATABASE_URL`, passwords, service-role keys, or the bootstrap token in chat, logs, tickets, or screenshots.
6. Only after diagnostics show the required tables should the operator retry the protected bootstrap curl with the private bearer token.

## Codex safety note

Codex did not call the production bootstrap endpoint and did not run migrations or DB push.
