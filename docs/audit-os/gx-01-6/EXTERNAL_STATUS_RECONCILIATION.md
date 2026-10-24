# GX-01.6 — reconciliação dos status externos

Mesmo HEAD inicial 5b58ead338a24ff168a43a2d71fc2639c355afb4: endpoint combinado padrão devolveu30contextos (23failure/7success); per_page=100 devolveu42 (29failure/13success). Diferença12 =6failure+6success: paginação comprovada pelas respostas brutas. Não são12projetos novos. Combined status devolve o status mais recente por contexto; contextos homônimos podem representar execuções/scopes distintos. Check-runs são outra fonte (29 no baseline), não somar como projetos.

Inventário Vercel read-only em24/10: xpex-neural62, gxeon16, junior-senas-projects-4226acc3 26 IDs. Esses104 recursos de conta incluem outros produtos, não104recursos do GX01. Respostas sem next cursor; preservar scope+projectId como identidade. A tabela histórica daGX015 é fonte de hipóteses, nunca prova da causa de novo deployment. Railway indisponível por reautenticação; Netlify sem conector validado. Nenhum recurso/configuração/check foi alterado ou desativado.

[Matriz por contexto/URL/SHA](evidence/external-status-reconciliation.json) contém provider, scope, projectId atual quando provado, causa histórica separada de atual, classificação/relevância e intervenção. IDs não identificados permanecem NOT_VERIFIED; nomes iguais não foram fundidos. Snapshot final do SHA após push deve ser lido em FINAL_DELIVERY/evidence/candidate-ci.json ou final-ci.json, quando presentes; baseline42 não deve ser apresentado como contagem de HEAD futuro.

| Provider / scope / projectId | Contexto | Estado baseline | Execução | Causa atual |
|---|---|---|---|---|
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-w39m | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-9swq | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-kzqy | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-veq5 | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-72nc | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-gv35 | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-hq7w | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-9qd3 | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-4wdd | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-e7uq | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-g32e | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-p9ip | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-lpgw | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-l2h7 | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-wir1 | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-j5ud | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-glwt | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-b61u | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-2ban | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-wsd2 | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Vercel / NOT_VERIFIED / NOT_VERIFIED | Vercel – gxeon-ai-axlh | failure | [link](https://vercel.com/knowledge/why-is-my-account-deployment-blocked) | NOT VERIFIED |
| Netlify / NOT_VERIFIED / NOT_VERIFIED | netlify/gleaming-raindrop-1a263b/deploy-preview | success | [link](https://deploy-preview-456--gleaming-raindrop-1a263b.netlify.app) | NOT VERIFIED |
| Netlify / NOT_VERIFIED / NOT_VERIFIED | netlify/wonderful-phoenix-260614/deploy-preview | success | [link](https://deploy-preview-456--wonderful-phoenix-260614.netlify.app) | NOT VERIFIED |
| Netlify / NOT_VERIFIED / NOT_VERIFIED | netlify/gxeonai/deploy-preview | success | [link](https://deploy-preview-456--gxeonai.netlify.app) | NOT VERIFIED |
| Vercel / gxeon / prj_owdXFSlvK1GBrWVuYCqeHpTlYjP4 | Vercel – gxeon-audit-os | success | [link](https://vercel.com/gxeon/gxeon-audit-os/5eNJ3BvDraGSnhrutckvrvpH7wMM) | NOT VERIFIED |
| Vercel / xpex-neural / prj_RYR5u33XB5nE0UkSwyAGKSQft1gZ | Vercel – gxeon-ail | success | [link](https://vercel.com/xpex-neural/gxeon-ail/BtU7GE2jFCy6z1WWjaaL7vg155Ph) | NOT VERIFIED |
| Netlify / NOT_VERIFIED / NOT_VERIFIED | netlify/gxeon/deploy-preview | failure | [link](https://app.netlify.com/projects/gxeon/deploys/6ad8c3a15cb5387663887968) | NOT VERIFIED |
| Vercel / junior-senas-projects-4226acc3 / prj_kssB4fuFxooxei5CYvt091ihp77z | Vercel – gxeon-ai-a | failure | [link](https://vercel.com/junior-senas-projects-4226acc3/gxeon-ai-a/DVwtCtchC1vn6rFznKCfMHQ6shv8) | NOT VERIFIED |
| Vercel / xpex-neural / prj_tQcb12xWLeTTY6h7Vhw6w4yp5frg | Vercel – ai-ia | success | [link](https://vercel.com/xpex-neural/ai-ia/GnW4KoTQDN1jSGjNWqCM3G5ypbUm) | NOT VERIFIED |
| Netlify / NOT_VERIFIED / NOT_VERIFIED | netlify/startling-platypus-66e8e2/deploy-preview | success | [link](https://deploy-preview-456--startling-platypus-66e8e2.netlify.app) | NOT VERIFIED |
| Vercel / junior-senas-projects-4226acc3 / prj_F3OFtryPk4YmYwXc3zEJkbZTRZkv | Vercel – gxeon-ai-aoo | success | [link](https://vercel.com/junior-senas-projects-4226acc3/gxeon-ai-aoo/2v6AmxqnL8XizfFEUziWXPpoCons) | NOT VERIFIED |
| Netlify / NOT_VERIFIED / NOT_VERIFIED | netlify/coruscating-salmiakki-302f81/deploy-preview | success | [link](https://deploy-preview-456--coruscating-salmiakki-302f81.netlify.app) | NOT VERIFIED |
| Vercel / junior-senas-projects-4226acc3 / prj_R2ILQClNw9Zk8XCbj0EalzflwtVO | Vercel – gxeon-ai-api-server | success | [link](https://vercel.com/junior-senas-projects-4226acc3/gxeon-ai-api-server/7S3vjDahE4MRAdbEmwBWzWnV86SP) | NOT VERIFIED |
| Netlify / NOT_VERIFIED / NOT_VERIFIED | netlify/gxeonaik/deploy-preview | failure | [link](https://app.netlify.com/projects/gxeonaik/deploys/6ad8c3a17597b49072091d90) | NOT VERIFIED |
| Vercel / xpex-neural / prj_wu5d2rPcPUhdhIQ01P0Y4BddaJT2 | Vercel – gxeon-ai | failure | [link](https://vercel.com/xpex-neural/gxeon-ai/6TjjKvHCtkMZ2DsAyQLtxmGdDTvq) | NOT VERIFIED |
| Vercel / junior-senas-projects-4226acc3 / prj_STlhUAtwut0oWBsWD5PjmCFLhjBq | Vercel – gxeon-ai-api-server-611a | success | [link](https://vercel.com/junior-senas-projects-4226acc3/gxeon-ai-api-server-611a/BUGUwmoX69WWRrstoW5W62ufxc2v) | NOT VERIFIED |
| Vercel / xpex-neural / prj_hODQYobRkk4O6rpZkGZgNkFrNwA4 | Vercel – gxeon-ai-ia | success | [link](https://vercel.com/xpex-neural/gxeon-ai-ia/GyYaeZ1YLHFeeiwUGTiriYEk1jbD) | NOT VERIFIED |
| Vercel / junior-senas-projects-4226acc3 / prj_u4vHMlTnqVXLaJwnpTEn8T0JMOmD | Vercel – gxeo | failure | [link](https://vercel.com/junior-senas-projects-4226acc3/gxeo/8aeDfQJYgDsAMy6CjL8CbRZn3LdV) | NOT VERIFIED |
| Vercel / xpex-neural / prj_AqiT3Idishevz42J1s9E5LZ3SA85 | Vercel – gxeon-ai-api-server-sxv4 | failure | [link](https://vercel.com/xpex-neural/gxeon-ai-api-server-sxv4/BNhbfbTDzzLxpYMkGxJWHHiWQJdS) | NOT VERIFIED |
| Vercel / xpex-neural / prj_EMDNZwGOLK3bdtOHcVecT84xp4Dp | Vercel – gxeon-ai01 | success | [link](https://vercel.com/xpex-neural/gxeon-ai01/Dh3GPJvYF9oNrVTK7F6bVDTFZ7Av) | NOT VERIFIED |
| Vercel / xpex-neural / prj_mo5cvJX4AXuPNsYXtQO3zYARLsLh | Vercel – gxeon-ai-mockup-sandbox | failure | [link](https://vercel.com/xpex-neural/gxeon-ai-mockup-sandbox/Fg3wnzoQDywXW1XWWNrSocF9cyPQ) | NOT VERIFIED |
| Vercel / xpex-neural / prj_UBNjAlz7cWsPvNDILUk66440E7nn | Vercel – gxeon-ai-gxeon-dashboard | failure | [link](https://vercel.com/xpex-neural/gxeon-ai-gxeon-dashboard/GmHBbp9ixwaQAo3rfijF9z6h5Nyi) | NOT VERIFIED |

Decisão pendente do proprietário: confirmar titularidade e projetos canônicos, finalidade de integrações legadas e quais checks condicionam GX01. Backend com nome api-server em projeto estático não comprova API dedicada. Não repetir deploy para “limpar” status; não alterar integração sem aprovação específica.
