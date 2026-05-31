# GXEON Step 01 — Provisionar Banco de Dados

Este procedimento ativa a persistência financeira PostgreSQL no Railway sem commitar segredos no repositório.

## Pré-requisitos

- Railway CLI instalado e autenticado (`railway login`).
- Projeto Railway correto selecionado/linkado.
- `pnpm install` já executado no workspace.

## Execução automatizada

```bash
pnpm run db:provision:railway
```

O comando executa:

1. `railway add postgres` para criar o PostgreSQL no Railway.
2. Exige `DATABASE_URL` exportado no shell após o provisionamento.
3. `pnpm --filter @workspace/db run push` para aplicar o schema Drizzle.
4. `pnpm run db:validate:financial -- --write-smoke` para validar tabelas, ENUMs e permissão de escrita em transação com rollback.

Se o Railway já tiver PostgreSQL criado, use:

```bash
export GXEON_SKIP_RAILWAY_ADD_POSTGRES=true
export DATABASE_URL='postgresql://user:password@host:5432/gxeon'
pnpm run db:provision:railway
```

## Validação manual equivalente

```bash
export DATABASE_URL='postgresql://user:password@host:5432/gxeon'
cd lib/db && pnpm run push
cd ../..
pnpm run db:validate:financial -- --write-smoke
```

O relatório de validação é salvo em `artifacts/DATABASE_PROVISIONING_REPORT.json`.

## Objetos esperados

Tabelas financeiras esperadas:

- `actor_wallets`
- `global_transactions`
- `payment_attempts`
- `financial_ledger`
- `payment_webhook_events`

ENUMs financeiros esperados:

- `ledger_entry_type`
- `ledger_source_type`
- `payment_attempt_status`
- `transaction_status`
- `wallet_status`
- `webhook_processing_status`

> Observação: o checklist operacional anterior menciona “7 tipos ENUM”, mas lista 6 nomes. O schema Drizzle atual define os 6 ENUMs acima; a validação automatizada segue o schema versionado.

## Critério de aceite

O banco está pronto para avançar quando o relatório retornar:

```json
{
  "status": "PASS",
  "checks": {
    "connection": true,
    "tables_present": true,
    "enums_present": true,
    "enum_values_present": true,
    "write_smoke_passed": true
  }
}
```
