# GX-01.9 — reconciliação de produto

Data:26/10/2026. Site main 1ab659b8044684f7ad9a93a81399582f19bd6d45. Motor/PR456 fab776b3ad6494ec33aeef8bd5d38dfb64a72ae6 OPEN/DRAFT, sem merge. Clones novos preservam os checkouts/evidências anteriores; colisão conhecida do template Windows excluída.

| Estado | Superfície | Próxima ação |
|---|---|---|
| JÁ IMPLEMENTADO | React/Vite dashboard, AuditWorkflowPage, Express dedicado, Zod4, PG17, dois checks estáticos, hashes/revisão/JSON | reutilizar motor/contratos/transporte, preservar regressões |
| PRECISA INTEGRAR | página OMNIX corporativa com ?view=; portal no dashboard | navegação institucional → portal; histórico e métricas persistidas |
| PRECISA CORRIGIR | acesso atual usa token técnico por papel e não filtra usuário/recurso | acesso sintético individual por sessão, escopo persistente no caso; negar acesso horizontal |
| PRECISA CRIAR | apresentação, dashboard/histórico/estados do produto e upload limitado | um vercel.json e dois checks; exemplos rotulados; nenhum mock como E2E |
| BLOQUEADO | backend remoto dedicado/PG17, identidade de clientes reais, orçamento e abertura pública | pedir autorização concreta somente para ativação; continuar construção/testes locais |

Vercel: site prj_9TzNOpz6Uzz34uHfLrlYAXzXcfgw em xpex-neural, produção conhecida READY; AuditOS prj_owdXFSlvK1GBrWVuYCqeHpTlYjP4 em scope GXEON, prévia dpl_9jfbrXvyxP98hDjpq9ipmyZGHfKn READY. Root/output não retornados pelo conector; conteúdo e SHA ainda serão verificados. Railway agora acessível somente em leitura: dois projetos legados, ambientes production, sem reaproveitar variáveis financeiras, bancos ou configurações. Não criar recurso remoto nem alterar produção.

Atualização de prioridade autorizada: desenvolvimento e prévia sintética não dependem da contratação de revisor externo. Revisão de engenharia/automação não é parecer humano independente ou certificação. Dados reais permanecem bloqueados.
