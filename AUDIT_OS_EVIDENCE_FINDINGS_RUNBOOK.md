# Audit OS Evidence + Findings Runbook

## Goal
Create the first manual baseline finding and evidence for the internal GXEON-AI Audit Case without scraping, payment calls, fake revenue, fake clients, external webhooks, or connector writes.

## Preconditions
1. `GET /api/v1/audit/schema-diagnostics` returns `schemaReady=true`.
2. `GET /api/v1/audit/cases` returns at least one internal GXEON-AI case.
3. `GXEON_AUDIT_WRITE_MODE=enabled` only during the explicit operator write window.
4. `GXEON_AUDIT_ALLOW_DB_WRITES=true` only during the explicit operator write window.
5. `GXEON_AUDIT_OPERATOR_TOKEN` is configured temporarily.

## Operator flow
1. Open Audit OS Mission Control.
2. Confirm the Evidence + Findings safety banner.
3. Paste the temporary operator token into the password field. It is kept only in React state.
4. Click **Criar prévia de achado** and review the preview.
5. Click **Salvar achado** only if the preview is clean.
6. Click **Criar prévia de evidência** and review the preview.
7. Click **Salvar evidência** only if the evidence is redacted and reference-only.
8. Confirm counts update for the selected case.

## Shutdown checklist
1. Set `GXEON_AUDIT_WRITE_MODE=preview_only`.
2. Set `GXEON_AUDIT_ALLOW_DB_WRITES=false`.
3. Rotate or remove the temporary operator token.
4. Do not change Railway variables automatically from GXEON.
