# Audit OS Deploy Readiness Checklist

Status: PARTIAL / schema apply blocked by stop gates.
Branch: feature/audit-os-schema-apply-first-case
Date: 2026-06-18

## Merge baseline
- PR #383 is present in local history via merge commit `eb6a15e`.
- Audit OS intake and cases routes are present locally.
- No production environment variables were changed by this mission.

## Redeploy checklist
- Redeploy API after merge if backend route or schema artifacts are consumed by runtime deployment.
- Redeploy dashboard after merge if `/audit-os` presentation changes are added in a later mission.
- Keep default write mode disabled in production until schema validation passes.
- Enable `GXEON_AUDIT_WRITE_MODE=enabled` and `GXEON_AUDIT_ALLOW_DB_WRITES=true` only for controlled validation after tables exist.

## Safety checklist
- Do not run `pnpm run supabase:go-live` for this mission.
- Do not run `pnpm run production:activate` for this mission.
- Do not call payment, webhook, scraping, or connector-write paths.
- Do not commit real `.env` files or print database secrets.
