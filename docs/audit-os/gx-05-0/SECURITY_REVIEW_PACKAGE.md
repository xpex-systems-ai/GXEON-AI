# GX-05.0 — Pacote de revisão de segurança

Base de inspeção: `cbc4d37dba7d57bbc601cfd0d46507549ccfab2a`, mais o diff de trabalho GX-05.0. Consolidação local em 2026-10-29 UTC, após os checks `gx050-final2` e audit posterior à instalação OIDC. O código ainda está sem commit final nesta consolidação; o recibo principal deve vinculá-lo ao SHA entregue. Preparação de engenharia por Codex; **revisor humano independente NÃO DESIGNADO**. Este documento não concede aceite de segurança, autorização de produção, merge ou abertura a dados de clientes.

O SHA da revisão humana deve ser o candidato final, incluindo mudanças GX-05.0 posteriores a esta base. Aprovação de SHA anterior, conclusão de testes ou este relatório não aprovam automaticamente o diff posterior. Inventário atual de reviews/permissões do GitHub será anexado pela entrega principal; nenhum review humano é presumido aqui.

## Mudanças de integridade reavaliadas

| Commit / fonte | Proteção observada | Limite / evidência exigida |
| --- | --- | --- |
| `87d38aa`, `artifacts/api-server/src/omnixReadGateway.ts` | `verifiedEvidence` compara conteúdo e hash da evidência com `audit_cases.metadata.artifactSha256`, além do ID do caso. Impede que a simples reescrita do conteúdo e do seu próprio digest valide a adulteração. | `auditOmnixDistribution.test.ts` passou a adulterar conteúdo, digest da evidência e digest dos achados, preservando a âncora do caso, e exige 409 nas leituras. Resultado executado deve corresponder ao SHA final. |
| `f605125`, `services/auditWorkflowService.ts` | A leitura canônica `detail` aplica a mesma âncora, cobrindo a superfície HTTP empresarial que não depende do gateway. | Revalidar leitura autorizada normal e adulteração pela API empresarial real. A comparação não substitui controle de privilégios nem assinatura externa. |
| `cbc4d37`, `services/auditWorkflowService.ts` | `exportReport` confronta título, `testData`, escopo, revisão e digest da evidência embutida com fatos do caso; conserva checagens do hash do relatório e do schema. | `auditPilotDatabase.test.ts` modifica título e hash do relatório, espera `REPORT_CANONICAL_MISMATCH`, restaura o fixture e confere nova exportação. A rodada principal PG17 passou, conforme a matriz local abaixo; o SHA final ainda deve ser vinculado ao recibo. |

A âncora é um valor separado gravado no intake. Sua imutabilidade depende do fluxo e dos privilégios do banco; ela não é uma prova criptográfica contra um administrador capaz de alterar simultaneamente todos os registros. Rever grants, credenciais técnicas e isolamento físico do processo dedicado.

**Achado de revisão — FIX IMPLEMENTED / LOCAL REGRESSION PASSED:** na base `cbc4d37`, o confronto não cobria todo `report.findings`. Após o apontamento, a integração GX-05.0 acrescentou `verifyCanonicalReport` compartilhado por exportação e detalhe, comparando projeções de achados, resultados, eventos e evidências, além do fingerprint da revisão. `auditOmnixDistribution.test.ts` recebeu cenários de rehash de achados/resultados/eventos do relatório e alteração combinada de achado/relatório. Essa suíte passou nas rodadas principais PGlite e PG17 descritas abaixo. A correção está no diff posterior ao SHA-base: validação local não é aceite humano nem prova do banco remoto. Este subtrabalho não editou os arquivos centrais.

## Resultados locais conhecidos

Endurecimento final GX050: o verificador compara achados/resultados/eventos e o fingerprint da revisão com registros canônicos, exige as limitações fixas e os campos previstos, e recusa campos extras inclusive nos objetos aninhados que o parser removeria. Casos adversariais reescrevem também o hash do próprio relatório. A data de geração é validada como ISO; não há prova criptográfica independente de horário nem defesa contra um administrador que reescreva todos os registros e âncoras. A origem empresarial deve ser a origem canônica inicial do runtime; client secret e tokens de outros papéis não podem ser reutilizados. Os logs finais e CI do SHA da entrega prevalecem sobre as rodadas anteriores abaixo.

Fonte agregada: `work/gx050-evidence/gx050-final2-checks.json`; logs em `work/gx019-independent-evidence/` e `work/gx050-evidence/gx050-pg1/`. As contagens dos mesmos testes em PGlite e PostgreSQL se sobrepõem; não somá-las como casos independentes.

| Check | Resultado observado | Evidência e limite |
| --- | --- | --- |
| Tipos do workspace e testes de auditoria | Exit 0 em ambos | `gx050-final2-types.log`, `gx050-final2-testTypes.log`. |
| Build de bibliotecas, API e dashboard | Exit 0 nos três | `gx050-final2-libs.log`, `gx050-final2-apiBuild.log`, `gx050-final2-dashboardBuild.log`. Dashboard mantém avisos de anotação de pureza do Zod e chunk grande; não foram ocultados nem tratados como falha de build. |
| Lint do escopo crítico | 84 arquivos, zero erros | `gx050-final3-lint.log`; o número descreve o escopo configurado, não todo código legado. |
| Suíte local PGlite/HTTP | **48 PASS, 0 FAIL, 0 SKIP** | `gx050-final2-tests.log`, exit 0. Inclui BFF com IdP simulado e dados sintéticos; não é autenticação aceita em provedor real. |
| Mesmos arquivos de API com PG17 dedicado | **49 PASS, 0 FAIL, 0 SKIP** | `gx050-pg1/all-thirteen-api-files.log`, exit 0; o teste condicional PG17 está ativo nessa rodada. `receipt.json` registra cluster novo, loopback, iniciado/encerrado, `credentialsPrinted:false`, `remoteResourcesTouched:false`. |
| Atestação de grants mínimos | **1 PASS, 0 FAIL, 0 SKIP** | `gx050-pg1/minimum-grants.log`, exit 0. Prova local de atestação/negação de privilégios excessivos; não confere permissões de um projeto externo. |
| Bootstrap offline de owner | Exit 0; um owner sintético; **duas tentativas recusadas** | `gx050-pg1/bootstrap-owner.json`: `duplicate_bootstrap` e `application_role_bootstrap`, ambas `refused:true`, `recordsUnchanged:true`. Provedor real e aprovação humana constam como false; nenhum owner real foi declarado provisionado. |
| Backup autenticado | **3 PASS, 0 FAIL, 0 SKIP** | `gx050-final2-backup.log`: roundtrip, adulteração/chaves/CBC recusados e limites/erros sem plaintext de falha. Não comprova restore remoto ou custódia operacional. |
| Guard de revisão/liberação | **2 PASS, 0 FAIL, 0 SKIP** | `gx050-final2-renderGuard.log`: fixtures GitHub sintéticos conferem estado/SHA/revisor; aprovação de ingress não libera o modelo distinto de banco externo. Não é review humano ocorrido. |
| Instalação após dependência OIDC | Concluída, lockfile sem nova resolução, duas dependências adicionadas | `gx050-oidc-install.log`, pnpm 10.28.1. A matriz final deve preservar o comando/exit do recibo principal. |

O novo ensaio nativo/browser GX-05.0 ainda não está anexado nesta atualização. Não reutilizar capturas GX-04.0 como prova de login empresarial real ou do novo SHA. O candidato final, o estado dos checks remotos e os artefatos exatos pertencem ao recibo principal da entrega.

## Inventário atual de dependências

Comando novo após OIDC: `pnpm audit --json`, pnpm 10.28.1, Node 24.19.0, exit **1**. Feed reportou **1 LOW, 0 MODERATE, 0 HIGH, 0 CRITICAL**, **1184 dependências**. Saída integral: `work/gx019-independent-evidence/gx050-after-oidc-audit.log`, SHA-256 `270045810fa0d10ecc89025a6f2e4f50050feae8b7d95c9afee380429b57a9d6`. O alerta é `deepmerge` 4.3.1 na cadeia Expo abaixo. Preservar também a consulta anterior de 1182 dependências em `gx050-security-audit.log` e a resolução efetiva em `work/gx050-evidence/dependency-review.json`. **Audit global continua reprovado pelo alerta LOW**; não confundir contador zero HIGH do feed com a avaliação manual de backports.

O inventário anterior registra manifestos/versões efetivamente resolvidos e hashes dos entrypoints. Após o build local, a fronteira `artifacts/api-server/dist/audit-pilot-boundary.json` passou a **326 inputs**, `forbiddenImports: []`, SHA-256 `d8989b61540ca5947c55b8e51114bd8c078c478920691c91ea4316d2f9387ed8` (releitura em 2026-10-29T01:21:56Z). Inclui `openid-client` **6.8.8**, `oauth4webapi` **3.8.8** e Zod **4.6.6**. Não inclui os quatro pacotes móveis da tabela; os externos são builtins Node e a referência opcional `pg-native`. É comparação estática do artefato de trabalho, não prova do próximo SHA, ativação de módulo nativo, scanner de Node/PostgreSQL/SO/imagem ou aceite remoto.

| Dependência / advisory oficial | Versão e consumidor instalado | Runtime dedicado / tratamento e risco residual |
| --- | --- | --- |
| [deepmerge / GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), LOW; upstream sem versão corrigida indicada | 4.3.1 via mobile → `@expo/cli` 54.0.23 → `@expo/config` 12.0.13. Advisory inclui 4.2.0–4.3.1. | Ausente dos inputs dedicados inspecionados. Patch local `patches/deepmerge@4.3.1.patch` define propriedades próprias em vez de acionar setter de protótipo, inclusive CJS/UMD/source. Alerta permanece no feed; mitigação local não é patch upstream nem aceite humano. Restringir entrada não confiável em configuração Expo e manter ferramenta fora do processo OMNIX. |
| [http-cache-semantics / GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp), HIGH no advisory; upstream sem versão corrigida indicada | 4.2.0 via mobile → `@expo/ngrok` 4.1.3 → `got` 11.8.6 → `cacheable-request` 7.0.4. Range oficial consultado ainda inclui <=4.2.0. | Ausente da fronteira dedicada. Patch local `patches/http-cache-semantics@4.2.0.patch` impede recuperação de conteúdo de frescor zero via max-stale/stale-if-error/stale-while-revalidate. Não apareceu no feed novo; ausência no feed não encerra o risco de backport. Não iniciar túnel/cache de clientes com base neste pacote. |
| [node-forge / GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv), HIGH histórico | 1.4.2 via mobile → `@expo/cli` 54.0.23; advisory consultado descreve <=1.4.0. [Tag upstream 1.4.2](https://github.com/digitalbazaar/forge/releases/tag/v1.4.2) existe. | Não retido no bundle dedicado inspecionado. Versão instalada está fora do range descrito; não usar essa conclusão como aprovação de certificados/assinaturas ou aceite amplo da missão móvel. Manter regressão do caso ASN.1 no consumidor Expo. |
| [decode-uri-component / GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), MODERATE histórico | 0.5.1 via mobile → `expo-router` 6.0.23 → `query-string` 7.1.3 com ponte local. Advisory indica patch 0.5.0; [release 0.5.1](https://github.com/SamVerschueren/decode-uri-component/releases/tag/v0.5.1) descreve decodificação em passagem única. | Não retido na fronteira dedicada; fora do range vulnerável <=0.4.2. Conservar teste de query malformada limitado por processo/tempo e compatibilidade CJS/Metro; limite HTTP continua necessário. |
| [Zod / GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), HIGH histórico | `lib/api-zod` e `lib/db` resolvem 4.6.6; o pacote 4.6.6 está na fronteira dedicada. Import direto de Zod a partir do workspace móvel não foi resolvido e não é alegado. | Advisory fixa 4.6.6 e descreve versões <4.6.6. [Release oficial](https://github.com/colinhacks/zod/releases/tag/v4.6.6) inclui limite de coleções antes dos elementos. Manter limites de bytes, coleções e concorrência antes de parse; versão corrigida não elimina DoS de toda a aplicação. |

`scripts/audit-staging/gx030-security.mjs` contém fixtures nos consumidores reais: ASN.1 hostil, cache privado de frescor zero, decoder malformado, prototype poisoning CJS/UMD e configuração Expo. Revisar a saída nova desse script e os hashes dos patches no pacote final; a leitura da fonte não foi registrada como execução desses testes neste subtrabalho.

Manutenção técnica dos patches: engenharia do repositório; **responsável nominal operacional ainda a designar**. Decisão sobre aceitação temporária/exclusão e prazo: proprietário autorizado da XPeX Systems AI (`xpex-systems-ai`) com revisor humano independente. Não presumir anuência pelo histórico da branch ou pela redução do contador do feed. Preferir patch upstream compatível quando existir, com instalação congelada, testes do consumidor e build; não remover alerta ou atualizar major silenciosamente.

## Checklist para revisão humana do candidato final

- [ ] Registrar revisor independente e permissões reais, SHA integral revisado, escopo e decisão explícita; conferir reviews via API e impedir autoaprovação.
- [ ] Inspecionar diff desde `27d688c`, migrações, grants e mudanças posteriores GX-05.0; resolver a triagem dos achados do relatório antes de declarar integridade completa.
- [ ] Reproduzir adulteração de conteúdo+digest da evidência e alteração de relatório+digest pelas superfícies canônica, empresarial e distribuição; verificar leitura íntegra positiva e rollback.
- [ ] Revalidar negação entre organizações/usuários, associação revogada, delegação expirada, sessão revogada, scopes insuficientes e auto-revisão pela mesma pessoa após mudança de papel.
- [ ] Revisar novo BFF/OIDC no diff final: issuer/audience/JWKS fixos, PKCE, state/nonce, cookies, origem, expiração, logout e ausência de token no browser. IdP real/MFA/recuperação ainda exigem prova operacional própria.
- [ ] Executar instalação congelada, lint, tipos, testes aplicáveis, build e inspeção do bundle/SBOM no SHA final. Preservar falhas e skips, sem convertê-los em sucesso.
- [ ] Confrontar feed novo com os dois backports e verificar entrypoints efetivos. Aceitar separadamente o risco residual do monorepo e a fronteira dedicada; não generalizar isolamento para toda a API geral/móvel.
- [ ] Confirmar TLS/hostname/CA/ACL do destino autorizado e restore remoto; ensaio local e `ignoreHTTPSErrors` de browser sintético não são prova externa.
- [ ] Aprovar retenção/exclusão de dados, backups/logs, destinatário comercial e suporte nominal. Manter dados reais bloqueados enquanto esses gates faltarem.
- [ ] Confirmar ausência de segredos e operações financeiras; manter PR em rascunho, sem merge, deploy de produção ou publicação MCP/plugin automática.

## Contrato de preparação de tarefas

`lib/api-zod/src/omnixTask.ts` define proposta sintética **PLANNED**, sem endpoint, fila, persistência, atribuição efetiva ou executor. Estado é rascunho ou revisão pendente; aprovação humana e resultado executado são recusados. Referências de organização/caso/achado/evidência devem ser consistentes entre si; o helper compara IDs/hash e scopes declarados com contexto fornecido pela integração.

O helper não autentica esse contexto nem consulta o banco. Somente uma futura integração de backend poderá formá-lo após leitura canônica autorizada e associação vigente. Strings como `CANONICAL_SERVER_READ` recebidas do cliente não são autoridade. O campo `relationshipVerification: DECLARED_REFERENCES_ONLY` permanece explícito; não alegar integridade referencial SQL ou execução validada por esse parser.

O teste puro `auditTaskContract.test.ts` cobre proposta válida, referências divergentes, organização alterada, scopes ausentes, aprovação/resultado forjados e tamanho limitado. Execução isolada: 2 testes PASS em `work/gx050-evidence/task-contract-test-1.log`; também integra as rodadas principais acima. Export central e inclusão do teste foram adicionados pelo integrador, sem endpoint ou ativação de tarefa autônoma. O SHA final continua a cargo do recibo principal.

Task Intelligence é preparação incremental; não é dependência funcional para o primeiro contrato do serviço atual. Não prometer esse mecanismo a interessados como capacidade disponível nem ampliar o escopo contratado além dos checks comprovados.
