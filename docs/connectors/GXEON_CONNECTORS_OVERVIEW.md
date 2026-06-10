# GXEON Connectors Overview

## Visão executiva

Conectores são os canais entre GXEON OS e a infraestrutura operacional. O modelo atual é read-only first, backend-only secrets e documentação honesta de status.

| Provider | Status | Uso | Próxima ação |
| --- | --- | --- | --- |
| GitHub | `CONNECTED_READONLY` | Código, PRs, issues, ADRs | Manter auditoria e preparar escrita via PR controlado. |
| Vercel | `CONNECTED_READONLY` | Frontend, deploys, dashboard | Manter observabilidade e validação de build. |
| Railway | `PARTIAL_READONLY` | Runtime, APIs, workers, logs | Completar leitura antes de ação mutável. |
| Supabase | `PARTIAL_READONLY` | Memória, eventos, storage, evidências | Completar políticas de dados e storage seguro. |
| Microsoft 365 | `P0_READY_PENDING_ENV` | Email, calendar, OneDrive, documents | Configurar ambiente aprovado sem commit de segredo. |

## Security boundary

- Nada de segredo no frontend.
- Nada de credencial real em docs.
- Rotas backend filtram resposta antes do dashboard.
- Provedores parciais continuam marcados como parciais.
- Mutação externa exige approval gate.

## Expected next actions

1. Validar environment readiness por conector.
2. Documentar scopes mínimos.
3. Criar tarefas por provider com evidência esperada.
4. Testar read-only endpoints antes de qualquer mutação.
5. Registrar status em roadmap e report.
