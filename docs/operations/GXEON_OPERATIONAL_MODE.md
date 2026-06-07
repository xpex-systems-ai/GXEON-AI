# GXEON Operational Mode

GXEON is now positioned as a private operator QG with real data pending. The active mode is `PRIVATE_OPERATOR_QG`, the data mode is `REAL_DATA_PENDING`, and connector activation is controlled.

## Why records were archived, not deleted

The prior seed records remain useful for future development, QA, and visual regression testing. They were not deleted because the P0-P5 architecture and helper functions depend on stable shapes. Instead, active operational collections are empty by default and the legacy seed records are clearly marked as archived sandbox/dev records.

## Empty states

Each operational stage starts empty until a real operator action creates a real record:

- P0 Opportunities: aguardando primeira oportunidade real.
- P1 Tasks: nenhuma tarefa operacional criada ainda.
- P2 Executions: nenhuma execução real em andamento.
- P3 Validations: nenhuma entrega real aguardando validação.
- P4 Releases: nenhum release financeiro pronto ainda.
- P5 Ledger: nenhum lançamento financeiro real registrado ainda.

## Connector activation order

Controlled activation order remains:

1. GitHub
2. Vercel
3. Railway
4. Supabase
5. Radar X

No connector card initiates authentication or external API calls during P1.

## No-secret policy

Credentials stay inside provider dashboards. GXEON frontend must not include service-role keys, database URLs, private keys, gateway secrets, API keys, OAuth tokens, or payment credentials.

## Preserved routes

- `/ops/opportunities`
- `/ops/tasks`
- `/ops/execution`
- `/ops/validation`
- `/ops/release`
- `/ops/ledger`
- `/ops/monetization`
