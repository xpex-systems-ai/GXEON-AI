# GXEON Company Memory Map

## Mapa da memória

| Tipo de memória | Local primário | Exemplos | Regra |
| --- | --- | --- | --- |
| Code memory | GitHub | Código, commits, PRs, ADRs, API contracts | Mudanças via branch, review e CI. |
| Document memory | Microsoft 365 | Documentos, apresentações, email, calendário | Sem credenciais em documentos compartilhados. |
| Operational memory | Supabase + GXEON OS | Eventos, tasks, estados, logs resumidos | Dados sensíveis classificados e protegidos. |
| Agent memory | Home Center Agents | Missões, permissões, propostas e resultados | Agentes não devem reter segredos em outputs. |
| Evidence memory | Supabase storage + docs/assets placeholders | Prints redigidos, validações, relatórios | Evidência segura; nunca screenshot com token. |
| Decision memory | GitHub ADRs + Microsoft 365 | Contexto, decisão, alternativa, rollback | Toda decisão relevante precisa de impacto e reversão. |

## Regra central

Memória corporativa é um ativo operacional. Ela deve reduzir ambiguidade, acelerar decisão e preservar rastreabilidade sem criar vazamento de dados.
