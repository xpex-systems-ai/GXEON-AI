# GX-01.7 — matriz unificada

| Gate | Evidência/estado | Dependência e decisão |
|---|---|---|
| P0 runtime AuditOS |Zod4/limites/roles/bundle TESTADO; auditglobal FAIL4 |risco residual e homologação remota pendentes |
| P1 integridade/export |browser arquivo real+hash antes/depois restart TESTADO PASS; restore/falhas PASS |não substitui aceite remoto |
| P2 regressão/reviewer |16 PGlite/17 PG/1grants/14staging PASS; CI final deve constar no reciboPR |reviewer nominal não designado |
| P3 infra/budget |plano e orçamentoA DOCUMENTADO |nenhuma autorização/provisão; BLOCKED |
| P4 OMNIX canônico |repo corporativo/site/metadados/fontes reconciliados |documento/código não prova operaçãoenterprise |
| P5 MercadoLivre |índice oficial parcial, páginas integrais403 |BLOCKED — POLICY OR EVIDENCE GAP |
| P6 CatalogMVP |um agente read-only especificado |PLANEJADO, sem integração/dados reais |
| P7 tenant/MCP |contratos e controles alvo DOCUMENTADO |PLANEJADO, sem plugin/publicação/IdP |
| P8 comercial |propostaB2B e modelosA/B DOCUMENTADO |sem cobrança/cliente/receita; decisão humana |

**TrilhaA: BLOCKED. TrilhaB: BLOCKED — POLICY OR EVIDENCE GAP** (arquitetura parcial documentada, sem afirmar SPECIFICATION COMPLETE para o gate jurídico crítico). **Global: NO-GO.** Cerrar testes locais não fecha gates remotos/humanos. PR456 DRAFT e sem merge/deploy.

Categorias: CONFIRMADO=fonte observada; TESTADO=execução registrada sob escopo; DOCUMENTADO=decisão/proposta escrita; PLANEJADO=capacidade futura; BLOCKED=pré-requisito não atendido. NOT VERIFIED identifica lacuna factual, sem convertê-la em permissão. Na reconciliação original: IMPLEMENTADO corresponde a fonte existente; PARCIAL a escopo limitado/testes ausentes; PLANEJADO/BLOQUEADO/NÃO VERIFICADO permanecem explícitos, sem promover documento a runtime.

[MatrizA](../../audit-os/gx-01-7/ACCEPTANCE_MATRIX.md), [auditoriaML](../../omnix-ai/gx-01-7/MERCADO_LIVRE_OFFICIAL_API_AND_POLICY_AUDIT.md), [decisões](EXECUTIVE_DECISION_MEMO.md), [entrega27itens](FINAL_DELIVERY.md).
