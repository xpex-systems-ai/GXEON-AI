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

## Reconsulta do candidato 1c102b405e79be1b9265419c50b6e07c95da91f9

2026-10-21T13:42:12.326Z: 42 statuses, 28 failure, 13 success, 1 pending. Quatro workflows de engenharia concluídos com success; nenhuma revisão humana. [Snapshot](evidence/current-head.json), [deployments deste SHA](evidence/deployments.json), [Railway](evidence/railway-projects.json). Estados pendentes não foram considerados concluídos. Os nomes homônimos são resolvidos por scope/ID. A leitura agora disponível de gxeo e gxeon-ai-a confirmou STATIC_BUILD_NO_OUT_DIR neste SHA; o403histórico não foi mantido como causa atual.

| Contexto | Estado | Provider | Scope | ProjectId | Classificação | Causa verificada / limite |
| --- | --- | --- | --- | --- | --- | --- |
| Vercel – gxeon-ai-api-server-sxv4 | pending | Vercel | xpex-neural | prj_AqiT3Idishevz42J1s9E5LZ3SA85 | Não identificado | No current deployment cause verified |
| Vercel – gxeon-ai-gxeon-dashboard | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-w39m | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-kzqy | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-veq5 | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-9swq | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-72nc | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-gv35 | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-hq7w | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-9qd3 | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-4wdd | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-g32e | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-e7uq | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-lpgw | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-p9ip | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-l2h7 | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-wir1 | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-glwt | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-j5ud | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-wsd2 | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-b61u | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-2ban | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| Vercel – gxeon-ai-axlh | failure | Vercel | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Account blocked reported; physical project/scope/cause unverified |
| netlify/coruscating-salmiakki-302f81/deploy-preview | success | Netlify | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Provider completed; does not prove API/auth/database |
| netlify/wonderful-phoenix-260614/deploy-preview | success | Netlify | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Provider completed; does not prove API/auth/database |
| netlify/gxeonai/deploy-preview | success | Netlify | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Provider completed; does not prove API/auth/database |
| Vercel – gxeon-ail | success | Vercel | xpex-neural | prj_RYR5u33XB5nE0UkSwyAGKSQft1gZ | Duplicado provável | Provider completed; does not prove API/auth/database |
| netlify/gxeonaik/deploy-preview | failure | Netlify | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | No current deployment cause verified |
| Vercel – gxeon-ai-a | failure | Vercel | junior-senas-projects-4226acc3 | prj_kssB4fuFxooxei5CYvt091ihp77z | Candidato canônico | STATIC_BUILD_NO_OUT_DIR |
| Vercel – gxeon-ai-mockup-sandbox | failure | Vercel | xpex-neural | prj_mo5cvJX4AXuPNsYXtQO3zYARLsLh | Projeto de outro módulo | STATIC_BUILD_NO_OUT_DIR |
| netlify/startling-platypus-66e8e2/deploy-preview | success | Netlify | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Provider completed; does not prove API/auth/database |
| Vercel – gxeo | failure | Vercel | junior-senas-projects-4226acc3 | prj_u4vHMlTnqVXLaJwnpTEn8T0JMOmD | Candidato canônico | STATIC_BUILD_NO_OUT_DIR |
| Vercel – gxeon-audit-os | success | Vercel | gxeon | prj_owdXFSlvK1GBrWVuYCqeHpTlYjP4 | Candidato canônico | Provider completed; does not prove API/auth/database |
| netlify/gleaming-raindrop-1a263b/deploy-preview | success | Netlify | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | Provider completed; does not prove API/auth/database |
| Vercel – gxeon-ai-ia | success | Vercel | xpex-neural | prj_hODQYobRkk4O6rpZkGZgNkFrNwA4 | Duplicado provável | Provider completed; does not prove API/auth/database |
| Vercel – gxeon-ai-aoo | success | Vercel | junior-senas-projects-4226acc3 | prj_F3OFtryPk4YmYwXc3zEJkbZTRZkv | Duplicado provável | Provider completed; does not prove API/auth/database |
| netlify/gxeon/deploy-preview | failure | Netlify | NOT_VERIFIED | NOT_VERIFIED | Identity/relevance not verified | No current deployment cause verified |
| Vercel – gxeon-ai-api-server-611a | success | Vercel | junior-senas-projects-4226acc3 | prj_STlhUAtwut0oWBsWD5PjmCFLhjBq | Duplicado provável | Provider completed; does not prove API/auth/database |
| Vercel – gxeon-ai | failure | Vercel | xpex-neural | NOT_VERIFIED | Identity/relevance not verified | No current deployment cause verified |
| Vercel – gxeon-ai-api-server | success | Vercel | junior-senas-projects-4226acc3 | prj_R2ILQClNw9Zk8XCbj0EalzflwtVO | Não identificado | Provider completed; does not prove API/auth/database |
| Vercel – ai-ia | success | Vercel | xpex-neural | prj_tQcb12xWLeTTY6h7Vhw6w4yp5frg | Duplicado provável | Provider completed; does not prove API/auth/database |
| Vercel – gxeon-ai01 | success | Vercel | xpex-neural | prj_EMDNZwGOLK3bdtOHcVecT84xp4Dp | Duplicado provável | Provider completed; does not prove API/auth/database |
