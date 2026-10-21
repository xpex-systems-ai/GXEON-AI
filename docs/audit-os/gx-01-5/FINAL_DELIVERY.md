# Entrega GX-01.5 — BLOCKED

1. **Identidade:** candidato de engenharia 1c102b405e79be1b9265419c50b6e07c95da91f9, base dbc29fff9a2c55487f85a83db597f41c493af7a8, branch codex/gxeon-audit-os-v1-gx01. O commit documental de fechamento será revalidado separadamente e identificado na PR/entrega final, sem alegar aprovação do próprio SHA dentro dele. [Snapshot](evidence/current-head.json), [CI](evidence/ci-validation.json).
2. **PR:** [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456), OPEN/DRAFT, sem merge. A Opção B foi preparada; nenhuma infraestrutura dedicada foi provisionada ou configuração externa aplicada.
3. **Arquivos:** entrypoint/config/factory/atestação/testes; pool de conexão sem schemas; asserção de imports no build; workflow com PG dedicado, codegen e restore; cinco exemplos de deploy/env/grants; lockfile e quatro overrides; mensagem de download da UI; 14 documentos e evidências. [Manifesto dos 21 arquivos de implementação](evidence/source-manifest.json), [delta de pacotes](evidence/lockfile-package-delta.json). Lista integral: git diff --name-status 4016b8d32ff1e959e975bc1612a9821d85bfe2af...HEAD. O template com colisão de caixa e o arquivo mockup gerado pelo build não foram incluídos.
4. **Arquitetura dedicada proposta:** frontend estático Vercel → API Node24 Railway → PG17 privado. Exige projetos/IDs aprovados, HTTPS, CORS exato, validação TLS do banco, grants mínimos e credenciais separadas. [Blueprint](DEDICATED_INFRASTRUCTURE_BLUEPRINT.md). Transporte Railway, CA/SAN e ausência de endpoint público do PG permanecem NÃO VERIFICADOS.
5. **Superfície:** 435 declarações em 42 módulos da API geral. Runtime dedicado retém seis rotas workflow mais health/ready, sem importar servidor geral, schemas financeiros, autorunners ou controladores de staging. [Inventário](evidence/api-route-inventory.json), [grafo de build Linux](evidence/ci-pilot-build-boundary.json), [ameaças e contratos](API_ATTACK_SURFACE_REVIEW.md).
6. **Dependências:** markdown-it 14.1.1→14.3.3, linkify-it 5.0.0→5.0.2, caminho Orval de js-yaml 4.2.0→4.3.2 e fast-uri 3.1.2→3.1.8, com overrides por pai. Inventário 76→58 ocorrências, altas 52→38, nenhuma crítica. Audit exit1 continua FAIL; nenhum risco alto aceito formalmente. [Plano completo](DEPENDENCY_REMEDIATION_PLAN.md).
7. **Testes e checks:**

| Validação | Resultado / prova |
| --- | --- |
| Frozen install, lint, typecheck, build Windows | PASS; lint 28 arquivos sem erros; [comandos e hashes](evidence/local-validation.json) |
| Typecheck global Linux | workflow PASS, todos os 10 steps retornados PASS; campo de job inconsistente preservado na evidência |
| Build Linux / Monorepo Health | workflows PASS no candidato |
| PGlite / PostgreSQL HTTP | 13/13 e 14/14 PASS |
| PG dedicado com role mínima | 1/1 PASS em banco novo: atestação, fluxo CLOSED/export, rejeição de grants excessivos e dados não sintéticos |
| Codegen isolado | PASS, cliente gerado compilado, fontes do repo preservadas |
| Staging / autorização / concorrência / rollback / integridade | 14 grupos PASS, fonte limpa no merge de PR |
| Backup/restore | PASS em Windows e Linux, destino novo, hashes e relatório iguais após restart |
| Segurança de dependências | FAIL, 58 ocorrências / 38 altas, exit1 |
| Download real da UI | BLOCKED, browserDownloadVerified=false |

Os [quatro runs e logs](evidence/ci-validation.json) pertencem ao candidato 1c102b405e79be1b9265419c50b6e07c95da91f9. O staging Linux executou o merge 833638da58309ee06d10b70048eaff136b0a38ae, sourceDirty=false; pais base e HEAD foram conferidos pela API. Os 21 hashes LF do candidato correspondem aos arquivos testados localmente. Checks de outro SHA não aprovam o fechamento final.

8. **Download:** IAB não anexou webview; tentativa Edge expirou e resetou o kernel. Nenhum arquivo recebido pela UI foi comprovado. A mensagem da interface agora declara somente preparação. [Roteiro manual](BROWSER_DOWNLOAD_ACCEPTANCE.md). Content-Disposition e API/CI não substituem o gate F.
9. **Recuperação:** [backup Linux](evidence/ci-backup-restore.json), [backup Windows](evidence/local-backup-restore.json). As cinco tabelas foram comparadas, banco de destino criado novo, PG reiniciado e relatório da origem revalidado. matchesPersistedRecord=true. Dump privado não versionado. RPO24h/RTO60min são metas propostas, não homologadas; cutover remoto e restore com grants do piloto ainda pendentes.
10. **Infra externa:** [matriz por provider/scope/projectId](evidence/external-project-matrix.json) preserva as 49 linhas históricas e classifica todos os statuses do candidato. IDs dedicados Vercel/API/PG ainda não designados. Railway consultado contém projetos de outros escopos, que não foram alterados. Acesso antes403 tornou-se disponível para alguns deployments e revelou STATIC_BUILD_NO_OUT_DIR neste SHA; não transportar causas antigas.
11. **Custos:** [premissas e fontes oficiais](PILOT_COST_AND_CAPACITY.md). Base estimada US$40/mês para um developer seat e uso pequeno; faixa condicional US$40–70 não é teto. Assentos, picos, backup, retenção, CI e impostos podem aumentar o gasto. **Custo efetivo confirmado na conta: NÃO VERIFICADO.** Nenhuma contratação.
12. **Revisão independente:** NÃO DESIGNADA; nenhuma aprovação humana registrada. [Pacote e formulário](INDEPENDENT_SECURITY_REVIEW_PACKAGE.md). Codex não é revisor independente e fixtures não representam pessoas.
13. **Aceite:** [matriz A–L](ACCEPTANCE_MATRIX.md). Implementado/testado, proposto e bloqueado permanecem separados.
14. **Bloqueios restantes:** riscos altos sem aceite formal; download da UI; revisor humano; infraestrutura/identidades/escopos/custos aprovados; TLS/rede privada/grants remotos; decisão sobre checks externos e limites operacionais.
15. **Ações humanas indispensáveis:** designar revisor e owner de segurança; executar download e verificador no arquivo real antes/depois do restart; corrigir ou aceitar cada risco com escopo/prazo/evidência; confirmar titularidade e IDs de projetos; aprovar orçamento e ações externas específicas somente depois da revisão. Não enviar credenciais ao chat.
16. **Recomendação:** **BLOCKED**. Plano de piloto preparado e não executado. Manter PR em rascunho, sem merge, produção, contratação ou ativação financeira. [Plano controlado](CONTROLLED_PILOT_PLAN.md).

Limitações preservadas: primeiro staging expirou (code23) durante build mobile concorrente, depois passou14/14; primeira tentativa de restore falhou genericamente, reexecução concluiu, causa não instrumentada. Typecheck teve workflow/steps concluídos mas campo de job in_progress/null na API; dados não foram reescritos. Checkout Windows tem colisão de nomes preexistente; checkout antigo e suas alterações foram preservados. Nenhuma métrica ou evidência de cliente foi inventada.

## Complemento de fronteira no fechamento

A atestação também passou a recusar associação da role de aplicação a qualquer outro papel, inclusive NOINHERIT que permita SET ROLE. Acrescentada regressão PG17 específica e mesma pré-condição no exemplo de grants. Lint28/0 e typecheck de testes passaram; este delta exige o CI do próprio commit, reconsultado na PR/entrega final. [Hashes e escopo do complemento](evidence/final-boundary-followup.json). A evidência CI já versionada pertence ao candidato anterior1c102b4 e não é aprovação deste complemento.
