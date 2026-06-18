# Audit OS Runtime Binding Baseline

## Repository baseline
- Branch prepared for execution: `feature/audit-os-runtime-binding`.
- Baseline commit inspected: `ea9f9dc` (`Merge pull request #380 from xpex-systems-ai/codex/criar-fundacao-do-gxeon-audit-os`).
- Audit OS foundation files confirmed:
  - `artifacts/gxeon-dashboard/src/pages/AuditOsPage.tsx`
  - `artifacts/gxeon-dashboard/src/services/auditOsService.ts`
  - `artifacts/api-server/src/routes/auditV1.ts`
  - `artifacts/api-server/src/routes/index.ts`

## Runtime binding finding
- Dashboard API calls use `apiUrl()` from `artifacts/gxeon-dashboard/src/services/apiBase.ts`.
- Before this mission, Vercel preview hosts without `VITE_GXEON_API_BASE_URL` threw `BACKEND_URL_MISCONFIGURED` from URL resolution.
- Audit OS page already had degraded-safe fallbacks for health/modules/schema-map fetch failures, but URL resolution could still surface as backend misconfiguration noise.

## API endpoint baseline
- `artifacts/api-server/src/routes/auditV1.ts` exposes read-only GET endpoints under `/api/v1/audit/*` through `artifacts/api-server/src/routes/index.ts`.
- Endpoints do not require `DATABASE_URL`; health reports database configuration as a boolean.

## Supabase binding baseline
- `supabase/config.toml` previously referenced `telxvphgrsvsnxvmjkce`.
- Operator-confirmed project ref for this mission is `zphpeynirstwzrzgvbct`.
