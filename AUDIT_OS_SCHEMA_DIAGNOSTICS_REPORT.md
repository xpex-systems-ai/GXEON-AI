# Audit OS Schema Diagnostics Report

## Helper added

Added `getAuditSchemaDiagnostics()` in `artifacts/api-server/src/services/auditCaseService.ts`.

## Read-only checks

The helper runs only metadata/context reads:

- `information_schema.tables` filtered by `table_schema = 'public'` and `table_name like 'audit_%'`.
- `pg_type` joined to `pg_namespace` filtered by public `audit_%` types.
- `current_schema()` and `current_database()`.

## Sanitized response fields

The helper returns only safe fields including:

- `databaseConfigured`
- `expectedTables`
- `foundTables`
- `missingTables`
- `foundEnums`
- `schemaReady`
- `currentSchema`
- `currentDatabase`
- `projectRefHintMasked` derived from host only, when parseable
- public diagnostic `code`
- sanitized error name/code/message class if a metadata query fails

It never returns `DATABASE_URL`, passwords, service-role tokens, raw stack traces, or connection strings.
