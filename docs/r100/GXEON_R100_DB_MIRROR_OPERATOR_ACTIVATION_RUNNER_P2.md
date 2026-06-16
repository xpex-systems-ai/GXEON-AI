# GXEON R$100 DB Mirror Operator Activation Runner P2

## O que foi implementado

- Diagnóstico profundo e read-only para `r100_state_snapshots` e `r100_state_audit_events`, incluindo tabelas existentes, colunas exigidas, colunas disponíveis, colunas ausentes, colunas extras e prontidão.
- Dry-run de schema que mostra os comandos equivalentes à migration `lib/db/drizzle/0001_r100_state_mirror.sql` sem executar SQL.
- Runner guardado para aplicar apenas o schema do DB Mirror R$100 com dupla trava:
  - `GXEON_R100_DB_SCHEMA_OPERATOR_APPLY_ENABLED=true` no backend.
  - body com `action: "APPLY_R100_DB_MIRROR_SCHEMA_OPERATOR_APPROVED"`.
- Smoke test de ativação que executa readiness, diagnostics, status e latest snapshot sem escrever no banco.
- Console `/ops/r100-db-mirror` atualizado para as quatro etapas: diagnóstico, schema guardado, flag de mirror e primeiro snapshot seguro.

## Limites de segurança

- Manual-first e preview-only.
- Nenhum endpoint chama provedor de pagamento.
- Nenhum checkout, invoice, captura de webhook ou contato externo é criado.
- Nenhuma secret, `DATABASE_URL`, Pix key, link de pagamento, e-mail, telefone, WhatsApp, notes ou private notes é retornado.
- O DB Mirror é memória operacional, não settlement.
- `providerVerifiedRevenueBrl` permanece `0`.
- `realRevenueClaimedAutomatically` permanece `false`.

## Endpoints novos

- `GET /api/r100-db/schema-diagnostics`
- `POST /api/r100-db/schema-dry-run`
- `POST /api/r100-db/apply-schema`
- `POST /api/r100-db/activation-smoke-test`

Todos usam `Cache-Control: no-store` e resposta no envelope `success/data/error`.
