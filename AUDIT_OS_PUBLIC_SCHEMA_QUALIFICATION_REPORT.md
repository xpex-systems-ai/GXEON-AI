# Audit OS Public Schema Qualification Report

## Change

`validateAuditSchemaReadiness()` now performs read-only probes against fully qualified public schema tables:

- `select 1 from public.audit_assets limit 1`
- `select 1 from public.audit_cases limit 1`
- `select 1 from public.audit_operator_notes limit 1`

## Expected impact

If Railway connects to the correct Supabase project and has read permission on `public`, readiness no longer depends on the session `search_path` resolving unqualified `audit_*` names.

## Safety

The probes are `SELECT 1 ... LIMIT 1` only. They do not mutate database state and preserve the idempotency path in `bootstrapFirstInternalAuditCase()`.
