# MISSÃO 003 — Financial Runtime Validation

## Status executivo

- **Branch:** `feature/financial-runtime`
- **Status:** implementado e validado estaticamente
- **Score operacional:** 86/100
- **Bloqueador de runtime real:** `DATABASE_URL` não está configurado no ambiente local da validação, então o smoke test com PostgreSQL real foi criado, mas não pôde executar contra banco provisionado.

## Auditoria de integração

A integração financeira passa a usar `@workspace/db` como fonte única de verdade para PostgreSQL, Drizzle ORM e schema financeiro. O módulo `lib/db` agora mantém singletons lazy para `Pool` e Drizzle, evitando múltiplas instâncias e evitando falha no boot do API Server quando rotas não financeiras são iniciadas sem `DATABASE_URL`.

## Arquivos alterados

- `lib/db/src/index.ts` — adiciona singleton lazy de `Pool`/Drizzle, helpers `getPool`, `getDb`, `isDatabaseConfigured` e `closeDb`.
- `artifacts/api-server/src/services/financial/walletService.ts` — cria `WalletService` com listagem e criação via Drizzle.
- `artifacts/api-server/src/services/financial/transactionService.ts` — cria `TransactionService` com listagem e criação via Drizzle.
- `artifacts/api-server/src/services/financial/ledgerService.ts` — cria `LedgerService` com listagem e criação via Drizzle.
- `artifacts/api-server/src/services/financial/metrics.ts` — adiciona métricas de latência e totais financeiros.
- `artifacts/api-server/src/services/financial/types.ts` — centraliza tipos dos serviços financeiros.
- `artifacts/api-server/src/services/financial/index.ts` — exporta a camada de serviços financeiros.
- `artifacts/api-server/src/routes/financial.ts` — cria endpoints `GET /api/v1/financial/health`, `GET /api/v1/financial/wallets` e `GET /api/v1/financial/transactions`.
- `artifacts/api-server/src/routes/index.ts` — registra o roteador financeiro no API Server.
- `artifacts/api-server/src/tests/financialRuntimeSmoke.ts` — cria smoke test de conexão, insert wallet, insert transaction, insert ledger entry e rollback validation.
- `artifacts/api-server/package.json` — adiciona script `smoke:financial`.
- `FINANCIAL_RUNTIME_VALIDATION_REPORT.md` — relatório final da missão.

## Smoke tests cobertos

- Conexão banco: `select 1` via Drizzle.
- Insert wallet: inserção em `actor_wallets`.
- Insert transaction: inserção em `global_transactions`.
- Insert ledger entry: inserção em `financial_ledger`.
- Rollback validation: todos os inserts rodam dentro de transação com rollback intencional e validação posterior de contagem zero.

## Métricas adicionadas

- `databaseLatencyMs`
- `totalWallets`
- `totalTransactions`
- `totalLedgerEntries`

## Riscos encontrados

1. **Banco não configurado no ambiente local:** sem `DATABASE_URL`, o smoke test real fica bloqueado.
2. **Dependência de migrations aplicadas:** endpoints e serviços assumem que a migration `0000_financial_foundation.sql` já foi aplicada no PostgreSQL alvo.
3. **Listagens operacionais sem autenticação adicional:** os endpoints adicionados são `GET` read-only, mas podem exigir política de autenticação/escopos antes de exposição pública.
4. **Runtime CJS legado:** há um runtime financeiro legado em `server/runtime/financialDb.cjs` que usa `pg` diretamente; ele não foi removido para preservar compatibilidade, mas deve ser convergido gradualmente para `@workspace/db`.

## Próximos passos

1. Provisionar/exportar `DATABASE_URL` e executar `pnpm --filter @workspace/api-server run smoke:financial` contra PostgreSQL real.
2. Aplicar `pnpm --filter @workspace/db run push` no ambiente alvo antes de habilitar rotas financeiras.
3. Adicionar autenticação/read scopes aos endpoints financeiros se forem expostos fora de rede operacional confiável.
4. Migrar gradualmente fluxos CJS em `server/runtime/financialDb.cjs` para os serviços Drizzle compartilhados.
