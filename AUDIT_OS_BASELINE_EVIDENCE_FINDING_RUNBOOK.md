# Audit OS Baseline Evidence + Finding Runbook

1. Confirm the first internal GXEON-AI Audit Case exists in Mission Control.
2. Open a temporary write window only for the operator action:
   - `GXEON_AUDIT_WRITE_MODE=enabled`
   - `GXEON_AUDIT_ALLOW_DB_WRITES=true`
   - set a temporary `GXEON_AUDIT_OPERATOR_TOKEN`
3. In Audit OS Mission Control, paste the temporary operator token in the Evidence + Findings panel.
4. Click **Criar baseline seguro** once.
5. Accept either `CREATED` or `ALREADY_EXISTS` as safe success.
6. Verify `GET /api/v1/audit/baseline/status` returns `readyForReports=true`.
7. Close the write window immediately:
   - `GXEON_AUDIT_WRITE_MODE=preview_only`
   - `GXEON_AUDIT_ALLOW_DB_WRITES=false`
   - rotate or remove the temporary token.

Safety invariants: no fake client, no fake revenue, no connector writes, no payment calls, no scraping, no secret persistence.
