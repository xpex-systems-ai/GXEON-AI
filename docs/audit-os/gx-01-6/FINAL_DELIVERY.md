# GX-01.6 — entrega técnica candidata

**BLOCKED.** [PR456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) permanece DRAFT, sem merge ou produção. Este documento será atualizado com SHA candidato e validação CI antes da entrega final. HEAD de entrada 5b58ead338a24ff168a43a2d71fc2639c355afb4, branch codex/gxeon-audit-os-v1-gx01, base main.

Mudanças: onze resoluções em nove dependências, body-parser patch/encoding restrito, preflight Zod do intake, admissão HTTP por papel/processo, listener pg sanitizado e regressão de falhas; fixtures de compatibilidade no CI; quinze documentos e evidências reais/sintéticas identificadas. [Matriz](DEPENDENCY_REMEDIATION_MATRIX.md), [riscos](RESIDUAL_SECURITY_RISKS.md), [aceite](ACCEPTANCE_MATRIX.md).

Dependências64→10 (40→5high), audit FAIL. PGlite15/15, PostgreSQL16/16, grants1/1, staging14grupos, dependency smoke7grupos/11versões, codegen/recovery/restore PASS locais. BuildWindows monorepo FAIL em Metro timeout; API/dashboard build passaram. Typecheck/lint/health locais consultáveis nos logs anexados; Linux e finalSHA ainda requerem consulta atual. Não usar resultados históricos como prova de HEAD final.

Browser: interface carregou CLOSED e preparou JSON, ferramenta não entregou caminho do download. GateD BLOCKED. Runtime dedicado LOCAL VERIFIED; remoto TLS/rede/grants NOT TESTED / BLOCKED — AUTHORIZATION REQUIRED. Recovery local com matchesPersistedRecord=true, arquivo de API, não download. Revisor independente não designado. Custos propostos40–70USD/mês não aprovados; despesas reais NOT VERIFIED.

PróximaGX01.7: designar revisor independente, decidir riscos/migrações das cinco altas, obter recibo real de download e verificar mesmo arquivo após restart, aprovar IDs/limite/período de homologação; só então ensaiarTLS/rede/grants remotos. Piloto é Configuration Integrity Audit de umvercel.json, dois checks; nenhuma cobrança ou certificação prometida.
