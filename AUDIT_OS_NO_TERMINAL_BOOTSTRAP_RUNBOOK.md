# Audit OS no-terminal bootstrap runbook

1. Redeploy Railway with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GXEON_AUDIT_DB_PROVIDER=auto` or `supabase_rest`, `GXEON_AUDIT_WRITE_MODE=enabled`, `GXEON_AUDIT_ALLOW_DB_WRITES=true`, and `GXEON_AUDIT_BOOTSTRAP_TOKEN`.
2. Open Audit OS Mission Control and use **Bootstrap sem terminal**.
3. Paste `GXEON_AUDIT_BOOTSTRAP_TOKEN` into the password field. The dashboard keeps it in React state only and does not persist it.
4. Click **1. Rodar diagnóstico**. Continue only when `schemaReady=true` or the Supabase REST provider reports all required tables accessible.
5. Click **2. Criar primeiro caso**. `CREATED` and `ALREADY_EXISTS` are both success states.
6. Click **3. Verificar caso** to refresh cases and Mission Control.
7. After success, set `GXEON_AUDIT_WRITE_MODE=preview_only`, set `GXEON_AUDIT_ALLOW_DB_WRITES=false`, and rotate or remove `GXEON_AUDIT_BOOTSTRAP_TOKEN`.
