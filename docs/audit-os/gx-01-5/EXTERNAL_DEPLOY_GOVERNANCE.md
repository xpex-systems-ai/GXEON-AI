# Governança de projetos e checks externos

GX-01.5 · 2026-10-21 · PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT · integração main · estado global **BLOCKED**. Implementação e testes não equivalem a aprovação humana ou autorização de deploy.

Decisão usa **provider+scope+projectId**; nome homônimo não é identidade. [Matriz GX01449linhas](../gx-01-4/evidence/canonical-matrix.json) preservada como histórico; [inventário Vercel reconsultado](evidence/vercel-projects.json) identifica projetos associados ao repo em3contas; Railway reconsultado encontrou somente gxeon-plugin-production e xpex-systems-command-staging (outros escopos, não novo GX-01). Não alterar/reutilizar por inferência. [Reconsulta de status do candidato](evidence/current-head.json) e [matriz atual](evidence/external-project-matrix.json) são a fonte para este HEAD, não reutilizar causas de um deploy anterior.

Arquitetura escolhida exige frontend Vercel dedicado + API Railway dedicada + PG17 isolado ainda semIDs. Candidatos existentes são apenas recomendação até titular confirmar escopo/owner/vínculo/build/output/domínio/variáveis e autorizar o projeto exato. API dedicada não existe no Railway consultado; serviços atuais não foram modificados. Netlify não é necessário na OpçãoB, mas status não pode ser desligado ou ignorado automaticamente.

| Categoria | Recomendação ao titular, sem execução |
| --- | --- |
| Frontend GX necessário | designar projeto exato, validar raiz/build/output/APIorigin e proteção; planejar configuração só após autorização |
| Outro módulo | manter intacto, encaminhar ao respectivo owner; não declarar sem impacto só porque fora do piloto |
| Legado/duplicado provável | confirmar titularidade/relevância porID; decidir retenção/desvinculação em solicitação específica posterior |
| Conta bloqueada | status pode apontar bloqueio genérico; confirmar scope/ID/motivo com provedor, não atribuir causa ao código |
| Inacessível403 | titular fornecer acesso de leitura/log sanitizado;403não prova causa do build |
| Causa desconhecida | registrar como NÃO VERIFICADO; não transportar erro de SHA anterior |
| Netlify sem scope/siteId | titular fornecer IDs/root/build/publish/functions/logs e relevância; sem reconfiguração nesta fase |

No HEAD de referência4016… a reconsulta retornou42statuses:29failure13success0pending,28checkruns e0reviews. Esse número é histórico de entrada. O candidato/final terá nova captura. Sucesso de preview não comprova API/auth/banco; falhas externas e regras de branch exigem decisão formal do titular xpex-systems-ai, sujeito à confirmação de permissões. Nenhum check desabilitado/projeto excluído/transferido/publicado manualmente.
