# GX-01.7 — pacote para revisão independente

**Revisor: NÃO DESIGNADO. Parecer: AUSENTE.** Codex preparou código/testes/documentos e não é o revisor independente. Fixtures usam token de revisor de teste e declaram isso no relatório; não constituem aceite humano.

Escopo de revisão: diff c4ee457→HEAD final da PR456; limites de dois checks; mudanças Zod4/overrides; app dedicado/TLS/roles/origins/body/rate; pool/grants/atomicidade; digest/imutabilidade/evidenceIds; exportação e ciclo Blob; falhas de recuperação; fronteira monorepo e riscos residuais. Ler [runtime](RUNTIME_DEPENDENCY_BOUNDARY.md), [dependências](DEPENDENCY_SECURITY_CLOSURE.md), [browser](BROWSER_EXPORT_ACCEPTANCE.md), [recovery](DATABASE_RECOVERY_VALIDATION.md), [matriz](ACCEPTANCE_MATRIX.md) e manifest dos recibos.

Roteiro reproduzível: checkout limpo da PR; pnpm10.28.1 install --frozen-lockfile; node scripts/audit-staging/lint.mjs; typecheck; testes PGlite; PG17 em banco próprio TEST_AUDIT_DATABASE_URL/TEST_AUDIT_PILOT_DATABASE_URL; codegen/compat; API/dashboardbuild; CI Linux fullmonorepo; audit com feed explícito; staging testData; baixar JSON no browser; verificar mesmo arquivo após restart/restore. Rodar recovery/restore sequencialmente. Não conectar produção/cliente/Stripe/ML. Ver scripts e workflow audit-os-v1.yml para comandos exatos.

Ata a preencher pelo humano: nome/organização; conflito de interesses/independência; SHA revisado e artefatos; métodos/resultados; achados por severidade e evidence IDs; riscos aceitos com prazo; requisitos remanescentes; decisão **APPROVED / APPROVED WITH CONDITIONS / CHANGES REQUESTED / REJECTED**; assinatura/data. Todos os campos de decisão estão PENDENTES.

Perguntas obrigatórias: riscos fora do bundle podem ser tolerados para homologação limitada? Token por papel é aceitável apenas para single-instance? Ambiente remoto foi testado? Há retenção/backup/incidentes aprovados? O texto comercial restringe a capacidade comprovada? Não usar este documento para anunciar certificação/segurança absoluta. Qualquer alteração após parecer invalida seu alcance até revisão do novo SHA.
