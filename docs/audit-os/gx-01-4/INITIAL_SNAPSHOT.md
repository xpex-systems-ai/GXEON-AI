# GX-01.4 — snapshot inicial

Data: 2026-10-20 (America/Sao_Paulo). PR #456 OPEN/DRAFT, merged=false. HEAD confirmado por Git e API: **7687bf248cfc6034af198926a2b07d045ca9b715**; base main dbc29fff9a2c55487f85a83db597f41c493af7a8. Checkout limpo antes desta fase. Revisor independente não designado; nenhum review submetido. Decisor externo: xpex-systems-ai, sujeito à titularidade/permissões.

## Revalidação anterior a alterações

Quatro workflows do mesmo HEAD consultados novamente: Typecheck 39488840676, Build 39488840670, Audit OS V1 39488840677 e Monorepo Health 39488840660, todos success. Não aprova commits posteriores. Consulta REST paginada por 100: 42 commit statuses (29 failure, 13 success), 28 check runs. O conector combinado retorna apenas 30 statuses; não foi usado como inventário completo. Primeira página de branches: 100, inventário incompleto; branch da PR e main confirmadas diretamente. Regras de main retornam []; não comprova inexistência de exigências administrativas.

| Classificação | Estado observado |
| --- | --- |
| IMPLEMENTADO | Fluxo estático autorizado, revisão por papéis distintos, transações, relatório com hash, guards legados, integração PGlite/PostgreSQL e staging |
| PARCIAL | Ambiente local demonstrado; autenticação por tokens não identifica nominalmente duas pessoas; ausência de tenancy |
| PLANEJADO | Decisão de infraestrutura isolada e piloto condicionado a gates |
| BLOQUEADO | Download real, revisão humana, risco alto residual, escolha/correção autorizada de infraestrutura externa |
| NÃO VERIFICADO | Backend público canônico, isolamento do banco Railway existente, logs Netlify e detalhes de cinco projetos Vercel com 403 |

## Novas observações

Audit fresco, sem alterar lockfile: 89 ocorrências (60 altas, 24 moderadas, 5 baixas, 0 críticas), 89 entradas, exit 1. A GX-01.3 registrou 91 ocorrências/88 entradas. A diferença anterior à correção é mudança do feed e não redução atribuída ao código. Snapshots e comparação serão preservados no registro de riscos.

Inventário read-only: 16 projetos Vercel (9 xpex-neural, 5 junior-senas-projects-4226acc3, 2 gxeon); detalhes de gxeon agora acessíveis, junior-senas permanece 403. Railway: dois projetos, cinco serviços, fontes em outros repositórios; o ambiente chamado production não se torna teste pelo nome staging do projeto. Nenhum serviço GXEON-AI compatível foi comprovado.

Navegador: cua.getState falhou antes de abrir página com `failed to write kernel assets: O sistema não pode encontrar o caminho especificado. (os error 3)`. Sem clique, novo caso UI ou arquivo recebido. Não houve acesso alternativo ao gerenciador de downloads.

Evidência de infraestrutura: [snapshot sanitizado](evidence/infrastructure-source.json). Só nomes de variáveis; valores e identidades pessoais omitidos. Nenhuma alteração externa, recursos pagos, Stripe, DNS, merge ou produção autorizados/executados. A missão continuará com correções compatíveis, regressão no SHA entregue e pacote de decisão; estado inicial **BLOCKED**.
