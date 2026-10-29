# GX-01.8 — pacote e formulário de revisão independente

Data-base: 25/10/2026. Candidato de código: `d71996bc73502f6c2352c0c687ef1cba90012ea4`. PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT. Preparação de engenharia; liberação global NO-GO.

**READY FOR INDEPENDENT REVIEW (preparação). Revisão efetiva: BLOCKED — INDEPENDENT REVIEW REQUIRED.** Não existe pessoa designada nem review formal na reconciliação GitHub. Nenhuma execução automática substitui esse parecer.

Sequência reproduzível para uma pessoa qualificada: confirmar [PR 456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT e SHAs; examinar diff desde main e delta desde GX 017; conferir [freeze](RELEASE_CANDIDATE_FREEZE_REPORT.md); reproduzir instalação, lint/types, PGlite/PG/grants; ler quatro advisories, SBOM e externos; confrontar modelo de ameaças com APIs/DB; validar relatório real baixado, hashes e restore; analisar planos remoto, orçamento, dados e contrato; registrar achados em arquivo/review referenciando SHA. O revisor deve usar novo diretório de saída/banco isolado e não apagar dumps/caches.

| Área | Material de revisão | Condição pendente |
| --- | --- | --- |
| Código/contratos/autorização | fonte em links do modelo; local-command-matrix e CI final | análise humana de papéis/rotas/limites |
| Segurança/dependências | SECURITY_RESIDUAL_FINAL_MATRIX + DEPLOYABLE_RUNTIME_SBOM + feed integral | decisão residual e scanner de imagem/Node/PG |
| Banco/evidências/relatório | EVIDENCE_CHAIN_VERIFICATION + BUSINESS_CONTINUITY_AND_RECOVERY | ensaio remoto independente |
| Infra/operação/custo | REMOTE_HOMOLOGATION_BLUEPRINT + REMOTE_TEST_MATRIX + HOMOLOGATION_COST_MODEL | aprovação e execução futura |
| Dados/contrato/OMNIX | [oferta](../../omnix-ai/gx-01-8/FIRST_CONTRACTABLE_SERVICE_PACKAGE.md), [políticas](../../omnix-ai/gx-01-8/MERCADO_LIVRE_POLICY_CLOSURE_REQUEST.md), [MCP](../../omnix-ai/gx-01-8/OMNIX_MCP_RELEASE_PREREQUISITES.md) | revisão jurídica/negocial e capacidade futura |

Formulário de nomeação e parecer (campos deliberadamente vazios):

| Campo humano | Preenchimento pelo responsável |
| --- | --- |
| Nome | |
| Organização | |
| Qualificação | |
| Declaração de independência / conflitos | |
| SHA examinado | |
| Escopo | |
| Prazo | |
| Documentos examinados | |
| Testes reproduzidos e evidências | |
| Achados e prioridades | |
| Riscos residuais | |
| Condições / ações obrigatórias | |
| Responsável por registrar o parecer | |
| Decisão | |
| Data | |
| Assinatura ou referência verificável | |

Decisões possíveis: APPROVED / APPROVED WITH CONDITIONS / CHANGES REQUESTED / REJECTED. Nenhuma selecionada. O fundador pode nomear um revisor; o implementador não preenche os campos. Um parecer sobre candidato anterior não cobre mudança de código posterior. A aprovação técnica sozinha não autoriza gastos, provisionamento ou piloto.
