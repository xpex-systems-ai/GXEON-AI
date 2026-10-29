# GX-01.7 — reconciliação de capacidades

| Área | Fonte no GXEON-AI | Categoria / ação |
|---|---|---|
| Caso/ativo/escopo/evidência/achado/report |api-server/src/services/auditWorkflowService.ts, api-zod/src/auditWorkflow.ts; db |TESTADO no fluxo Audit OS; reutilização candidata com nova modelagem tenant, não pronta para clientes |
| Checks de Vercel |auditWorkflowChecks.ts |TESTADO apenas arquivo fornecido; não auditoria de conta/deployment |
| Página Audit OS |gxeon-dashboard/src/pages/AuditWorkflowPage.tsx |TESTADO loading/erro/empty e exportaçãoJSON local; não dashboard Commerce |
| Entrypoint dedicado |audit-pilot.ts e auditPilot* |CONFIRMADO/TESTADO local; remoto BLOCKED |
| Conectores/ecossistema |inventário de fontes evidence/reuse-inventory.json |código/documentação de integração; não comprova conexão/permissão/saúde de serviço |
| Roles/tokens |workflow+pilot guards |TESTADO single-instance; não identidade nominal, membership, isolamento multiempresa |
| Site e MCP corporativo |fontes públicas do mapa canônico |DOCUMENTADO; não engine de vendedor/Commerce |
| Catálogo/estoque/marketing/vendas/CS/executivo |workforce alvo |PLANEJADO, sem conector ML nem dados reais |
| Cobrança/planos/cartões comerciais |fora da missão e do runtimevalidado |não reutilizar caminhos financeiros para desbloquear agentes |

Reconciliação: preservar a arquitetura e provar somente a menor unidade existente. Reusar depois o padrão de envelope tipado, evidenceIds, hashes, transação e revisão; não copiar tokens globais como autorização tenant. Schemas legados de lib/db/mobile continuam emZod3; a migração scoped4 não homologa os demais módulos.

Código duplicado/incompleto: muitos módulos/rotas gerais compartilham responsabilidade operacional; o runtime dedicado evita importar esse agregado. A contagem histórica de435declarações/42módulos pertence ao inventário GX015 e não é repetida como métrica atual. O inventário atual lista arquivos existentes, sem métricas de completude. Próxima missão deve escolher módulo por evidência, não fazer consolidação/rebrand em lote.
