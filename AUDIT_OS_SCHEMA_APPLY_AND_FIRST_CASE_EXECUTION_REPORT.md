# Audit OS Schema Apply and First Case Execution Report

```json
{
  "status": "PARTIAL",
  "branch": "feature/audit-os-schema-apply-first-case",
  "files_created": [
    "AUDIT_OS_DEPLOY_READINESS_CHECKLIST.md",
    "AUDIT_OS_SCHEMA_DISCOVERY_REPORT.md",
    "AUDIT_OS_SCHEMA_DEPLOYMENT_PLAN.md",
    "AUDIT_OS_SUPABASE_PREFLIGHT_REPORT.json",
    "AUDIT_OS_SCHEMA_APPLY_REPORT.md",
    "AUDIT_OS_DATABASE_TABLE_VALIDATION.json",
    "AUDIT_OS_WRITE_MODE_VALIDATION_REPORT.json",
    "AUDIT_OS_FIRST_INTERNAL_CASE_REPORT.md",
    "AUDIT_OS_FIRST_CASE_PAYLOAD.json",
    "AUDIT_OS_DASHBOARD_FIRST_CASE_VALIDATION.md",
    "AUDIT_OS_SCHEMA_APPLY_AND_FIRST_CASE_EXECUTION_REPORT.md",
    "artifacts/audit-os-first-case-payload.json",
    "lib/db/drizzle/0002_audit_os_schema.sql"
  ],
  "files_modified": [],
  "commands_run": [
    "git checkout -B feature/audit-os-schema-apply-first-case",
    "sed -n '1,240p' lib/db/src/schema/audit.ts",
    "sed -n '1,160p' lib/db/src/schema/index.ts",
    "cat lib/db/drizzle.config.ts",
    "cat lib/db/package.json",
    "find lib/db/drizzle -maxdepth 2 -type f | sort | tail -50",
    "cat supabase/config.toml | sed -n '1,60p'",
    "DATABASE_URL='postgresql://user:pass@localhost:5432/db' pnpm --filter @workspace/db exec drizzle-kit generate --config ./drizzle.config.ts",
    "python3 filter generated SQL to create lib/db/drizzle/0002_audit_os_schema.sql",
    "node safe Supabase preflight script without printing secrets",
    "pnpm install",
    "pnpm run typecheck:libs",
    "pnpm --filter @workspace/api-server run build",
    "PORT=3000 BASE_PATH=/ pnpm --filter @workspace/gxeon-dashboard run build"
  ],
  "commands_not_run_for_safety": [
    "pnpm --filter @workspace/db run push",
    "pnpm run supabase:go-live",
    "pnpm run production:activate",
    "pnpm run supabase:activate:push",
    "payment commands",
    "external webhook calls",
    "connector write commands",
    "scraping commands"
  ],
  "stop_gate_results": [
    { "gate": "OFFICIAL_SUPABASE_PROJECT_CONFIRMATION", "status": "PASS", "evidence": "supabase/config.toml project_id is zphpeynirstwzrzgvbct" },
    { "gate": "DATABASE_SECRET_PRESENT_BUT_MASKED", "status": "FAIL", "evidence": "DATABASE_URL is absent in this execution environment" },
    { "gate": "AUDIT_SCHEMA_MIGRATION_IDENTIFIED", "status": "PASS", "evidence": "lib/db/drizzle/0002_audit_os_schema.sql created" },
    { "gate": "OPERATOR_SCHEMA_APPLY_FLAG", "status": "FAIL", "evidence": "GXEON_ALLOW_SCHEMA_APPLY=true is absent" }
  ],
  "schema_apply_status": "SQL_GENERATED_MANUAL_REQUIRED",
  "database_tables_validated": [],
  "first_case_status": "PREVIEW_ONLY",
  "first_case_id": "",
  "write_guard_status": "ENFORCED",
  "secret_guard_status": "ENFORCED",
  "mission_control_case_count": 0,
  "mission_control_revenue_confirmed": "R$0",
  "build_results": [
    { "command": "pnpm --filter @workspace/api-server run build", "status": "PASS" },
    { "command": "PORT=3000 BASE_PATH=/ pnpm --filter @workspace/gxeon-dashboard run build", "status": "PASS_WITH_BUNDLE_SIZE_WARNING" }
  ],
  "typecheck_results": [
    { "command": "pnpm run typecheck:libs", "status": "PASS" }
  ],
  "known_blockers": [
    "DATABASE_URL is not configured in this execution environment.",
    "GXEON_ALLOW_SCHEMA_APPLY=true is not configured in this execution environment.",
    "Database connection and table validation were not run.",
    "First internal case was not inserted because schema validation was blocked."
  ],
  "manual_operator_actions_required": [
    "Redeploy API after merge if API code changed.",
    "Redeploy dashboard after merge if frontend changed.",
    "Only enable GXEON_AUDIT_WRITE_MODE=enabled and GXEON_AUDIT_ALLOW_DB_WRITES=true after schema validation.",
    "Apply or push lib/db/drizzle/0002_audit_os_schema.sql only against Supabase project zphpeynirstwzrzgvbct after confirming DATABASE_URL and GXEON_ALLOW_SCHEMA_APPLY=true.",
    "Open /audit-os and verify the first internal case appears after creation."
  ],
  "next_recommended_mission": "MISSION_005_AUDIT_OS_EVIDENCE_AND_FINDINGS"
}
```
