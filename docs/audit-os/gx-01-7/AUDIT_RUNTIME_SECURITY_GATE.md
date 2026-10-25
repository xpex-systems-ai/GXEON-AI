# GX-01.7 — gate de segurança do runtime

**Estado da trilha A: BLOCKED para aceite final/piloto.** Há pacote pronto para revisão; isso não equivale ao estado READY FOR INDEPENDENT REVIEW enquanto decisões residuais/remotas continuam abertas.

| Gate | Resultado | Evidência / próximo responsável |
|---|---|---|
| Imports dedicados e Zod4 sem v3 retido | TESTADO PASS local; candidato de código validado; reconferir CI no HEAD final | audit-pilot-boundary.json |
| Token inválido/ausente e permissões por ação | TESTADO em17 testes PG e16 PGlite | suites auditWorkflow/auditPilot |
| DB role mínimo | TESTADO1/1; atualização de evidência/relatório negada | auditPilotDatabase |
| Roteamento same-origin e JSON, sem fallback HTML na rota API | TESTADO14 grupos loopback | acceptance.json |
| Exportação real e integridade | TESTADO PASS browser antes/depois restart | browser-*-restart.json |
| Audit global | FAIL4 ocorrências; sem waiver | retained-audit-groups.json |
| TLS HTTP/DB, proxy, allowlist remota, rate distribuído | BLOCKED, não medido | owner autoriza plano remoto |
| Reviewer independente nominal | BLOCKED, não designado | proprietário designa pessoa |
| Orçamento e projeto dedicado | BLOCKED, aprovação pendente | proprietário |

Nomes de configuração dedicada, sem valores: NODE_ENV, PORT, DATABASE_URL, GXEON_AUDIT_OPERATOR_TOKEN, GXEON_AUDIT_REVIEWER_TOKEN e os nomes adicionais da configuração fonte auditPilotConfig.ts (ver inventário de ambiente em evidence/runtime-env-names.json). Não transportar config privada .gx012, dumps ou tokens para PR. O helper loopback usa variáveis STAGING próprias; produção deve recusá-las. Inicialização dedicada deve falhar sem TLS/segredos distintos/config completa.

Limites: dois checks estáticos de configuração Vercel fornecida; nenhuma auditoria genérica, exploração remota ou aprovação autônoma. Achados refletem o arquivo recebido; ausência de header estático não prova header ausente no deployment. Caso CLOSED fixture é apenas simulação explicitamente identificada de papel revisor para teste, nunca assinatura humana.

O candidato de código6daddeea4f1f19ff4861719a2a13d2c35fbe9443 passou nos quatro workflows após correção do caminho de arquivo Metro; este documento de fechamento gera novo commit, que exige nova consulta de CI. Ver source-candidate-ci.json e recibo final da PR.
