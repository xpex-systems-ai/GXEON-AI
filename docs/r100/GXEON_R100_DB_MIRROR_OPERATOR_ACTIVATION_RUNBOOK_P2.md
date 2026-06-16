# Runbook P2 — Ativação segura do R$100 DB Mirror

## Flags permitidas

| Flag | Default | Uso |
| --- | --- | --- |
| `DATABASE_URL` | unset | Configura Postgres somente no backend. Nunca expor ao frontend. |
| `GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED` | `false` | Permite aplicar schema pelo endpoint guardado. Ativar temporariamente e voltar para `false`. |
| `GXEON_R100_DB_MIRROR_ENABLED` | `false` | Habilita writes guardados de probe/snapshot depois que o schema está pronto. |

## Sequência Railway/API

1. Configure `DATABASE_URL` somente no backend.
2. Rode diagnóstico:
   ```bash
   curl -s http://localhost:3000/api/r100-db/schema-diagnostics
   ```
3. Rode dry-run sem escrita:
   ```bash
   curl -s -X POST http://localhost:3000/api/r100-db/schema-dry-run -H 'Content-Type: application/json' -d '{}'
   ```
4. Se o operador aprovar, configure temporariamente `GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=true` no backend e aplique:
   ```bash
   curl -s -X POST http://localhost:3000/api/r100-db/apply-schema -H 'Content-Type: application/json' -d '{"action":"APPLY_R100_DB_MIRROR_SCHEMA_OPERATOR_APPROVED"}'
   ```
5. Volte `GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=false`.
6. Configure `GXEON_R100_DB_MIRROR_ENABLED=true` no backend e redeploy.
7. Rode smoke test:
   ```bash
   curl -s -X POST http://localhost:3000/api/r100-db/activation-smoke-test -H 'Content-Type: application/json' -d '{"action":"RUN_R100_DB_MIRROR_ACTIVATION_SMOKE_TEST"}'
   ```
8. Rode probe e snapshot redigido:
   ```bash
   curl -s -X POST http://localhost:3000/api/r100-db/probe -H 'Content-Type: application/json' -d '{"action":"CREATE_SAFE_R100_DB_MIRROR_PROBE"}'
   curl -s -X POST http://localhost:3000/api/r100-db/export-safe-snapshot -H 'Content-Type: application/json' -d '{"action":"EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR"}'
   curl -s http://localhost:3000/api/r100-db/latest-snapshot
   ```

## Reversão

- Setar `GXEON_R100_DB_MIRROR_ENABLED=false` para bloquear novos writes guardados.
- Setar `GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=false` para bloquear aplicação de schema.
- Não remover tabelas sem backup/manual review; elas são memória operacional redigida.

## Provas de semântica de receita

- O contrato de status, readiness, dry-run, apply, probe e snapshot mantém `providerVerifiedRevenueBrl: 0`.
- O contrato mantém `realRevenueClaimedAutomatically: false`.
- O snapshot é `SAFE_REDACTED` e não representa receita liquidada por provedor.
