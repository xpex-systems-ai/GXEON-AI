# Audit OS Bootstrap Mission Control Sync Report

- `GET /api/v1/audit/cases` already reads `audit_cases` from the configured database when available.
- `GET /api/v1/audit/mission-control` now merges the read-backed case listing into the `cases` block, so the first internal case count is reflected after bootstrap.
- Revenue remains hard-coded to zero-confirmed values in mission control.
- Frontend code was not changed and does not call the bootstrap endpoint automatically.
- Bootstrap token remains operator-only and must never be exposed to frontend runtime variables.
