# GX-01.3 — pacote de revisão independente

**Pessoa revisora: NÃO DESIGNADA. Decisão humana: NÃO EMITIDA.** O usuário atribuiu decisões externas a xpex-systems-ai, sujeito à titularidade/permissões de cada projeto, e determinou que o aceite continue BLOCKED. Não foi enviado pedido de review para pessoa desconhecida, nem atribuído o papel ao Codex.

## Resumo executivo e diff

O fluxo é interno e limitado à inspeção estática de vercel.json submetido com autorização. O GX-01.3 corrige uma segunda forma demonstrada de mutação legada em caso encerrado: descoberta por referência do ativo sem caseId no corpo. A seleção legada agora exclui workflow=gx01-v1. Há novas regressões de autorização por cabeçalhos/query e de descoberta inferida. Dependências vulneráveis da API, lint, gerador e ferramentas mobile receberam atualizações compatíveis; permanecem alertas não críticos explicitamente abertos.

Arquivos principais: auditEvidenceFindingService.ts, auditWorkflow.test.ts, auditStagingServer.ts, scripts/audit-staging/verify.mjs e stage.mjs, pnpm-workspace.yaml, pnpm-lock.yaml e lib/api-spec/package.json. [Diff relevante](evidence/relevant.diff) compara a referência 52e9c69 com a implementação candidata; o diff integral atual está em [Files changed da PR #456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456/files). Conferir SHA antes de assinar. A PR deve permanecer draft.

## Modelo de ameaças

| Ator / entrada | Ativo / fronteira | Ameaça | Controle / prova | Limite residual |
| --- | --- | --- | --- | --- |
| Não autenticado / HTTP | API privada → casos | Ler ou escrever dados | 401/403; auth antes do serviço; cabeçalhos alternativos/query não concedem acesso | Bearer estático, sem identidade nominal |
| Operador | execução → revisão | Aprovar a própria auditoria com o mesmo papel | credencial distinta; operador não revisa; tokens iguais falham | Quem conhece ambas credenciais pode representar ambos papéis |
| Revisor | revisão → operação | Criar/executar/finalizar | 403 fora da função; leitura permitida | somente modelo interno, sem tenants |
| Operador / API legada | legado → caso GX | Alterar CLOSED via UUID equivalente ou descoberta de ativo | guard UUID e exclusão da descoberta inferida; prova red 201 → green 404 | Administrador SQL continua autoridade confiável |
| Requisições concorrentes | transação → banco | Duplicar ou deixar estado parcial | locks, UUID idempotente e rollback injetado | Não há SLA ou teste de carga enterprise |
| Artefato submetido | texto → checks | SSRF, comando, leitura de arquivo, segredo persistido | texto limitado; sem fetch/exec/abertura de paths; validação e triagem de segredos | triagem não é DLP; operador deve sanitizar |
| Alteração de dados após revisão | evidência → relatório | Produzir relatório com prova diferente | fingerprint, referências e hashes; exportação rejeita adulteração | hashes não são assinatura contra admin que reescreve tudo |
| Cadeia de ferramentas | dependência → build | Explorar pacote vulnerável/input de codegen | patches, lockfile e release age; sem codegen de entrada externa | audit residual exit 1, revisão de alcance pendente |
| Integração externa | GitHub status → decisão | Confundir build verde/nome com API válida ou conta correta | matriz por provider+escopo+projectId e causas/limites explícitos | proprietário precisa confirmar titularidade e canônico |

## Matriz de verificação

| Verificação | Evidência exigida para assinar |
| --- | --- |
| HEAD / base / draft | SHA completo conferido no GitHub e checkout; nenhuma mudança posterior sem nova revisão |
| Typecheck e Build Linux | workflows do HEAD entregue concluídos success, sem usar aprovação de commit anterior |
| PGlite / PostgreSQL | suíte atual; regressão inferida é nativa PostgreSQL; sem segredo/cliente real |
| Staging | 14 grupos, papel mínimo, caso novo CLOSED, hashes/referências após reiniciar API e banco |
| Autorização | 401/403, papéis, tokens iguais/ausentes, query/forwarded headers, flags de escrita |
| Rollback / integridade | contagens intactas após falha, relatório adulterado recusado, referências inválidas recusadas |
| Exportação da API | application/json, attachment, hash, referências, comparação persistida |
| Download real | preencher DOWNLOAD_ACCEPTANCE.md e exigir matchesPersistedRecord=true antes/depois do restart |
| Externos | proprietário preencher decisão por projeto e resolver/aceitar formalmente os bloqueios relevantes |
| Dependências | ler dependency-before/after; 0 críticas não significa audit aprovado; avaliar alertas residuais |

## Reprodução segura

Pré-requisitos: Node 24, pnpm 10.28.1 e Docker Compose para PostgreSQL 17. Não carregar .env produtivo. Os scripts criam ambiente por allowlist, usam loopback e dados sintéticos. A alternativa nativa Windows e a distribuição privada de credenciais estão no runbook GX-01.2. Não remover .gx012 nem volumes durante a revisão.

```sh
pnpm install --frozen-lockfile
pnpm run lint:audit
pnpm run typecheck
pnpm --filter @workspace/api-server run typecheck:audit-tests
pnpm --filter @workspace/api-server run test:audit
pnpm run build
pnpm run stage:audit init
pnpm run stage:audit up
pnpm run verify:audit-staging
pnpm run stage:audit stop
```

Para suíte nativa separada: criar somente gx01_test em instância PostgreSQL local de teste, aplicar a migração existente pelo teste e fornecer TEST_AUDIT_DATABASE_URL em canal privado. Jamais usar URL de banco remoto/produtivo. O CI já demonstra o caminho de schema novo; reuso local exige GXEON_AUDIT_TEST_REUSE_SCHEMA=true. O build mobile Windows tem limitações próprias registradas em SECURITY_FINAL_REVIEW.md; build completo Linux é a referência automatizada desta fase.

## Limitações conhecidas e documentos

[Segurança](SECURITY_FINAL_REVIEW.md), [projetos externos](EXTERNAL_DEPLOY_TRIAGE.md), [download](DOWNLOAD_ACCEPTANCE.md) e [decisão](ACCEPTANCE_DECISION.md). Não há tenancy, identidade nominal/SSO, certificação de conformidade, execução irrestrita ou evidência de operação pública homologada. O navegador automatizado não inicializou; nenhum arquivo recebido pela UI foi aprovado. Nenhuma conta/projeto externo foi reconfigurado. Alertas residuais e recursos locais limitados não foram ocultados.

## Checklist e formulário de decisão

- [ ] Sou pessoa autorizada, diferente do responsável pela implementação, com conta identificada e permissão de review.
- [ ] Conferi o HEAD, base, diff relevante/integral e não há commits posteriores não revisados.
- [ ] Conferi logs e resultados dos workflows atuais, contratos e evidências de staging.
- [ ] Reproduzi os negativos de autorização, descoberta legada, concorrência, rollback e integridade necessários.
- [ ] Executei o download real e comparei o arquivo persistido, ou mantive explicitamente E pendente.
- [ ] Avaliei os alertas de dependências e registrei alcance/plano/aceites, sem chamar audit exit 1 de aprovado.
- [ ] O proprietário registrou decisões por projeto externo, sem apagar checks para fabricar aprovação.
- [ ] Não encontrei segredo/cliente real nos artefatos; não aprovo merge ou produção implicitamente.

| Campo | Preenchimento humano |
| --- | --- |
| Nome, usuário GitHub e autorização | PENDENTE |
| Relação com implementação / independência | PENDENTE |
| SHA completo revisado / data | PENDENTE |
| Evidências examinadas e reprodução | PENDENTE |
| Achados, severidade e alterações requeridas | PENDENTE |
| Gates aceitos / gates pendentes e motivo | PENDENTE |
| Decisões externas do proprietário (referências) | PENDENTE |
| Dependências: alcance, correção/aceite, responsável e prazo | PENDENTE |
| Decisão: REQUEST CHANGES / APPROVE FOR FINAL HUMAN APPROVAL / BLOCKED | PENDENTE |
| Link do review independente e assinatura | PENDENTE |

Ao designar a pessoa, xpex-systems-ai poderá solicitar review no GitHub com este pacote. Codex não se declara a pessoa revisora. READY FOR FINAL APPROVAL exige revisão independente concluída, download confirmado e bloqueios relevantes resolvidos/aceitos formalmente. Até lá, **BLOCKED**; sem merge ou produção.
