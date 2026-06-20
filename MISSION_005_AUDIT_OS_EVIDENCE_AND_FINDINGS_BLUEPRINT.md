# MISSION_005_AUDIT_OS_EVIDENCE_AND_FINDINGS_BLUEPRINT

## Objective

Add the Evidence + Findings layer for the first real GXEON-AI Audit Case after MISSION_004 confirms a real case exists.

## Preconditions

- `GET /api/v1/audit/schema-diagnostics` must return `schemaReady=true`.
- `GET /api/v1/audit/cases` must return at least one real internal case.
- Mission Control case count must be at least 1.
- Revenue must remain R$0 unless backed by a real accepted/paid event.
- Connector writes must remain false unless a later mission explicitly enables a safe write path.

## Schema map

### `audit_findings`

Required fields:

- `case_id` — required UUID FK to `audit_cases.id`.
- `title` — required text.
- `severity` — required `audit_severity`, default `MEDIUM`.
- `summary` — required text.

Optional/default fields:

- `module_key` — optional `audit_module_key`.
- `recommendation` — optional text.
- `status` — default `OPEN`.
- `metadata`, `created_at`, `updated_at` — standard metadata/timestamps.

Indexes:

- `audit_findings_case_id_idx`
- `audit_findings_module_key_idx`
- `audit_findings_severity_idx`

### `audit_evidences`

Required fields:

- `type` — required `audit_evidence_type`.
- `title` — required text.

Relationship fields:

- `case_id` — optional UUID FK to `audit_cases.id`.
- `finding_id` — optional UUID FK to `audit_findings.id`.

Reference-only evidence fields:

- `reference_url` — optional external/reference URL; do not scrape.
- `redacted_text` — optional redacted excerpt or operator note; never store secrets.
- `captured_at` — default current timestamp.
- `metadata`, `created_at`, `updated_at` — standard metadata/timestamps.

Indexes:

- `audit_evidences_case_id_idx`
- `audit_evidences_finding_id_idx`
- `audit_evidences_type_idx`

## Endpoint plan

MISSION_005 should add or verify protected write routes only after schema readiness:

1. `POST /api/v1/audit/findings`
   - Requires approved operator/auth gate.
   - Body: `caseId`, `moduleKey`, `title`, `severity`, `summary`, `recommendation`, optional `metadata`.
   - Must reject when writes are disabled or schema is not ready.

2. `GET /api/v1/audit/cases/:caseId/findings`
   - Read-only list for a case.

3. `POST /api/v1/audit/evidences`
   - Requires approved operator/auth gate.
   - Body: `caseId`, optional `findingId`, `type`, `title`, optional `referenceUrl`, optional `redactedText`, optional `metadata`.
   - Must reject secrets and raw credentials in `redactedText` / URLs.
   - Must not scrape `referenceUrl`.

4. `GET /api/v1/audit/cases/:caseId/evidences`
   - Read-only list for a case.

5. Optional: `GET /api/v1/audit/findings/:findingId/evidences`
   - Read-only list of evidence linked to one finding.

## Safety constraints

- Do not create evidence or findings until MISSION_004 first case is confirmed.
- Do not create fake clients, fake revenue, payment events, or connector writes.
- Do not store secrets, service role keys, tokens, or unredacted credentials.
- Do not run migrations in MISSION_005 unless separately approved by the operator.
