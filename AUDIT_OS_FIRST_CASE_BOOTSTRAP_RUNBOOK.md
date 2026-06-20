# Audit OS First Internal Case Bootstrap Runbook

## Railway environment checklist

Configure these variables only on the Railway `@workspace/api-server` service:

- `DATABASE_URL`: present in Railway runtime; never paste it into logs, Codex, frontend, or curl output.
- `GXEON_AUDIT_WRITE_MODE=enabled`
- `GXEON_AUDIT_ALLOW_DB_WRITES=true`
- `GXEON_AUDIT_BOOTSTRAP_TOKEN`: strong secret known only to the operator.

## Deploy

Redeploy the Railway API service after adding or rotating the variables.

## Execute bootstrap manually

Set the token locally in the operator shell. Do not hardcode it in command history, frontend code, docs, or screenshots.

```bash
export GXEON_AUDIT_BOOTSTRAP_TOKEN="<operator-secret>"
curl -sS -X POST https://gxeon-api-server-production.up.railway.app/api/v1/audit/bootstrap/first-case \
  -H "Authorization: Bearer $GXEON_AUDIT_BOOTSTRAP_TOKEN" \
  -H "Content-Type: application/json"
```

Expected successful response has `status` equal to `CREATED` on first run or `ALREADY_EXISTS` on repeat runs, `revenueConfirmed: 0`, `fakeClientCreated: false`, `connectorWrites: false`, and `safeMode: true`.

## Verify

```bash
curl -sS https://gxeon-api-server-production.up.railway.app/api/v1/audit/cases
curl -sS https://gxeon-api-server-production.up.railway.app/api/v1/audit/mission-control
```

Confirm the first internal GXEON-AI case appears and revenue remains `0`.

## Safety rollback after success

After the first case is confirmed, disable the controlled write window until an operator auth gate exists:

- Set `GXEON_AUDIT_WRITE_MODE=disabled` or `preview_only`.
- Set `GXEON_AUDIT_ALLOW_DB_WRITES=false`.
- Rotate or remove `GXEON_AUDIT_BOOTSTRAP_TOKEN`.
- Redeploy the Railway API service.
