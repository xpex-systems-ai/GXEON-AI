# GX-01.6 — entrega e decisão técnica

**BLOCKED.** [PR #456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) aberta em **DRAFT**, merged=false. Branch codex/gxeon-audit-os-v1-gx01; base main. Nenhum merge, deploy produtivo, contratação, alteração de DNS/configuração externa ou ação financeira foi executado.

1. **SHA:** implementação candidata 1af24f61c376225c3e94928a1f58c59b2f7e597e; base dbc29fff9a2c55487f85a83db597f41c493af7a8; checkout CI 380dec6654d0a9635146e490278b09bab2fcf177, pais conferidos, sourceDirty=false. Este documento integra o commit documental posterior; seu próprio hash e os checks desse HEAD são registrados na descrição da PR e na mensagem final após nova consulta, sem atribuir a ele provas de outro SHA. [Prova](evidence/candidate-checkout-proof.json).
2. **PR:** DRAFT/open; zero reviews formais no snapshot. A consulta final na PR prevalece para estado dinâmico.
3. **Arquivos:** nove fontes/configurações: auditPilotApp.ts, auditWorkflowChecks.ts, auditPilot.test.ts, lib/db/src/pool.ts, dependency-smoke.mjs, recovery-failures.mjs, audit-os-v1.yml, pnpm-workspace.yaml e pnpm-lock.yaml; quinze documentos e evidências. [Lista completa GX016](evidence/gx016-changed-files.json). A colisão preexistente Windows, mockup gerado e cinco relatórios root gerados pelo health permanecem locais, fora dos commits.
4. **Vulnerabilidades:** baseline 64 (40 altas,18 moderadas,6 baixas) → final audit 10 (5 altas,4 moderadas,1 baixa),0 críticas; exit1 **FAIL**. 64 registros,53 IDs GHSA distintos antes,9 advisories residuais. Auditoria final do mesmo lock confirmou a contagem. [Matriz completa](DEPENDENCY_REMEDIATION_MATRIX.md).
5. **Correções:** onze resoluções em nove módulos, mantendo linhas; parser2.4, inflate=false/415, checks oversized antes do Zod, admissão60/min/papel e quatro respostas ativas, evento de pool sanitizado; fixtures de compatibilidade e recovery adicionadas ao CI. Sem upgrade major cego.
6. **Residual:** Zod em runtime; duas altas image-size em Metro, node-forge sem fix reconhecido e http-cache-semantics sem fix reconhecido; demais moderadas/baixa descritas. Nenhum aceite formal. [Riscos](RESIDUAL_SECURITY_RISKS.md).
7. **Runtime:** LOCAL VERIFIED por factory/config/testes/boundary; forbiddenImports vazio, body-parser2.4.0 e Zod3.25.76 visíveis no bundle. Token por papel não comprova pessoa ou isolamento multi-tenant. Não houve runtime remoto homologado.
8. **Navegador:** UI real carregou CLOSED e mensagem de arquivo preparado. Wait de download expirou; nenhum path/arquivo recebido foi provado. browserDownloadVerified=false, gateD BLOCKED, procedimento manual pronto. [Evidência e limites](BROWSER_EXPORT_EVIDENCE.md).
9. **Infra remota:** NOT TESTED / BLOCKED — AUTHORIZATION REQUIRED para TLS/hostname/rede privada/grants na OpçãoB. Inventário Vercel reconsultado read-only; Railway requer reautenticação. Nenhuma provisão nova.
10. **Recovery:** local e Linux CI candidato PASS; API503 com PG parado, volta sem reiniciar API, três leituras iguais/sem mutação; dump restaurado em banco novo, cinco tabelas comparadas, restart/IDs/hashes/referências válidos; matchesPersistedRecord=true para API/CI. Dump e DB local preservados. [Provas](RECOVERY_INTEGRITY_VERIFICATION.md).
11. **Externos:** diferença30 (23falhas/7sucessos) vs42 (29/13) no baseline provada como paginação. Candidato consultado com42 contextos:28failure/11success/3pending; estes números são snapshot, não resultado final de futuro HEAD. Scope+projectId separados, homônimos não fundidos, causa histórica separada da causa atual não verificada. Nenhum check desativado. [Matriz](EXTERNAL_STATUS_RECONCILIATION.md).
12. **Revisão:** BLOCKED — INDEPENDENT REVIEWER NOT ASSIGNED. Formulário humano em branco com quatro decisões; fixture de credencial não simula aprovação.
13. **Custos:** planejamento40–70USD/mês condicionado a consumo/umeditor; proposta70USD/30dias com alertas humanos não é cap contratual/automático. Custo real NOT VERIFIED; despesas não autorizadas. [Pedido revisável](PILOT_BUDGET_APPROVAL_REQUEST.md).
14. **CI:** quatro workflows do candidato SUCCESS; seis jobs confirmados. Nova consulta obrigatória do HEAD documental ao encerrar. Build Windows monorepo FAIL por timeout Metro; build API/dashboard local PASS e Linux CI completo PASS. Não omitir falhas de fixture/orquestração documentadas.
15. **Aceite:** A/C/F LOCAL VERIFIED, J documentado; B/D/E/G/H/I BLOCKED ou parcial; K candidato PASS, finalHEAD na PR. [Matriz detalhada](ACCEPTANCE_MATRIX.md).
16. **Bloqueios:** riscos não formalmente tratados, arquivo de UI sem recibo, ambiente remoto/TLS/rede sem autorização/prova, decisão de projetos/checks, reviewer não designado, orçamento/retention/support não aprovados.
17. **Decisões humanas:** nomear revisor independente; tratar cada risco e prazo; realizar recebimento real e dupla verificação; confirmar contas/IDs/titularidade; autorizar escopo/região/duração/limite de homologação; decidir retenção, suporte e eventual preço. Sem credenciais em mensagens ou documentos.
18. **GX-01.7:** fechar esses gates em ordem, mantendo Configuration Integrity Audit estática de um vercel.json/dois checks. Liberar piloto somente após decisão humana explícita documentada, sem expansão comercial, certificação ou produção presumida.

| Workflow candidato | Run | Resultado |
|---|---|---|
| [GXEON Typecheck](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/40123078249) | 40123078249 | SUCCESS |
| [GXEON Monorepo Health](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/40123078297) | 40123078297 | SUCCESS |
| [Audit OS V1](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/40123078306) | 40123078306 | SUCCESS |
| [GXEON Build](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/40123078272) | 40123078272 | SUCCESS |

| Comando / verificação | Ambiente | Resultado |
|---|---|---|
| pnpm10.28.1 install --frozen-lockfile | Windows Node24.19 e Linux Node24 CI | PASS |
| pnpm run lint:audit | Windows30arquivos + Linux | PASS,0erros |
| pnpm run typecheck e typecheck:audit-tests | Windows + Linux CI | PASS |
| pnpm run build | Linux CI | PASS |
| pnpm run build | Windows | FAIL: Metro startup timeout; nenhuma limpeza do checkout anterior |
| pnpm run health:report | Windows + CI | PASS; health é relatório, não segurança/deploy aprovados |
| pnpm --filter @workspace/api-server run test:audit | PGlite e PG17 | 15/15 e16/16 PASS |
| pnpm --filter @workspace/api-server run test:audit-pilot-db | PG17 | 1/1 PASS |
| node scripts/audit-staging/dependency-smoke.mjs | Loopback Windows/Linux | 7grupos/11versões PASS |
| node scripts/audit-staging/codegen-smoke.mjs | Isolado Windows/Linux | PASS; fontes geradas não modificadas |
| pnpm run verify:audit-staging | NativePG17 local e DockerPG17 CI | 14grupos PASS |
| node scripts/audit-staging/recovery-failures.mjs | Local/CI | PASS,503 e reconnect sem mutation |
| node scripts/audit-staging/backup-restore.mjs | Local/CI | PASS, banco novo/sem overwrite |
| pnpm audit --json | pnpm10.28.1 Windows,lock final | FAIL,10ocorrências/5high; JSON íntegro preservado |
| UI download + verify-report antes/depois | Navegador real | BLOCKED; somente preparação visível |
| TLS/rede/grants remotos e aceite independente | Não executado | NOT TESTED / BLOCKED |

[Validação candidata](evidence/candidate-validation.json), [manifesto de fontes LF](evidence/source-manifest.json), [logs locais sanitizados](evidence/final-types.log.gz). Node local24.19.0, pnpm10.28.1, minimumReleaseAge1440 preservado. Verificação de segredos conhecidos e links passou para os arquivos selecionados; não é garantia universal de detecção. Nenhum valor de env/config privada/log bruto de client/dump foi incluído. Variáveis necessárias estão listadas somente por nome no plano remoto.
