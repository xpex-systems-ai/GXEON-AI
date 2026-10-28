# GX-01.9 — aceite do produto

## Reconsulta de 27/10/2026

Novo handoff reconciliado com a execução existente. PR456 e PR45 permanecem DRAFT, sem merge. Runtime corrigido E=`30e0b00a219eb4c45d4fd57064b92f1165b1c739`; interface/browser U=`670449a2d384164cedc8e0449343219fa6b3a4ba` (mesmo frontend em E); site C=`b4ab3bcba57f93410e372dfb59888131fd287236`. HEAD documental posterior e seus checks são informados na PR. [Evidências atuais](evidence/recheck-2026-10-27/manifest.json).

Status: **OMNIX FRONTEND PREVIEW READY — BACKEND INTEGRATION BLOCKED**. [Prévia corporativa](https://xpex-systems-aggjdj7jx-xpex-neural.vercel.app/?view=omnix) aberta no browser: exemplo congelado rotulado e download JSON comprovado, sem exigir GitHub no caminho principal. Não é E2E remoto com API/PG nem CUSTOMER PILOT APPROVED. A diretriz de independência continua: nenhum serviço contratado; host/IP/domínio/SO/acesso próprios ainda não informados.

| Gate | Estado atual | Evidência / commit | URL | Responsável | Bloqueio / próxima ação |
|---|---|---|---|---|---|
| G01 Site | PASS | C, preview Git conferido | prévia acima | Codex | produção main preservada |
| G02 Motor | PASS | E, mesmo serviço/checks/contratos | PR456 | Codex | nenhum segundo motor criado |
| G03 Reuso | PASS | U/E, React no dashboard existente | /omnix local | Codex | manter escopo atual |
| G04 Página | PASS PREVIEW | C, screenshot e download do exemplo | prévia acima | Codex | exemplo não substitui resultados de sessão |
| G05 Portal | PASS LOCAL | U, browser → API → PG; recibos | 127.0.0.1:5174/omnix | Codex | remoto ainda bloqueado |
| G06 Login | PASS SINTÉTICO | U/E, papéis distintos, sessões e isolamento nos testes | local / CI | Codex | não é IdP/recuperação empresarial |
| G07 Formulário | PASS LOCAL | U, seletor real, nome/JSON inválidos, consentimento invalidado | local | Codex | apenas vercel.json sintético limitado |
| G08 API | PASS LOCAL/CI | E, contratos e respostas reais | local / CI | Codex | API remota dedicada não comprovada |
| G09 Persistência | PASS LOCAL/CI | E, PG17 TLS, restore novo e reinício | local / CI | Codex | operação externa requer destino |
| G10 Dashboard | PASS LOCAL | U, números SQL incluindo caso diagnóstico identificado TEST DATA | local | Codex | nenhuma métrica comercial inferida |
| G11 JSON | PASS LOCAL | U, download real4339 bytes e igualdade SQL | local | Codex | exportação da API remota pendente |
| G12 Integridade | PASS LOCAL/CI | U/E, refresh e hashes; runtime privado restart/restore | local / CI | Codex | não é assinatura/certificação independente |
| G13 Online | PARCIAL | C: página/exemplo disponíveis; portal Vercel protegido | prévia acima | Codex / titular | acesso ao backend integrado continua pendente |
| G14 E2E online | BLOCKED | não há recibo remoto API+PG | nenhuma URL inventada | titular / Codex | informar host/IP, domínio, SO e método de acesso |
| G15 Clientes | BLOCKED | audit global3HIGH/1MOD/1LOW; IAM/privacidade/operação não aceitos | feed e SBOM anexos | fundador / técnicos | fechar gates antes de dados reais |
| G16 Comercial | PARCIAL | C, oferta candidata e rascunho local sem envio | página OMNIX | fundador | preço/termos/contrato/pagamento dependem de aprovação e comprovação |
| G17 Operação/custos | BLOCKED | nenhum recurso novo contratado; consumo marginal não medido | decisão de deploy | titular | identificar servidor, quotas, TLS, monitoramento, backup e rollback |
| G18 Abertura | BLOCKED | nenhuma aprovação humana independente alegada | PRs DRAFT | fundador / revisor a designar | decisão explícita após gates |

Prova U: caso `d513da2e-6d48-4665-b394-0f9ed69b56aa`, relatório `15cf371e-dc3c-4354-aaeb-3c8a6cb1e664`, 1 evidência/2 achados, CLOSED; download do browser4339 bytes, SHA256 `37bd24e36e55a22f7b3cd36be054d8efa47979d2b60d2ce2d76e00be1bbcbc12`. Evidência persistida igual ao arquivo escolhido; apenas um caso com o requestId após nova tentativa. [Antes](evidence/recheck-2026-10-27/browser-before-refresh.json) / [após refresh](evidence/recheck-2026-10-27/browser-after-refresh.json). Revisão sintética distinta, não humana independente.

Falha preservada: primeira submissão503, causa exata não confirmada; health/ready e banco200, verificação direta de armazenamento bem-sucedida e nova tentativa idempotente201. Nenhum timeout/TLS/controle foi relaxado. Caso diagnóstico `2935f868-afb8-44c1-8322-2ccd652b5a61` mantido e identificado TEST DATA; não é cliente. Registra-se a falha sem atribuir causa especulativa.

O download estático inicial do site não iniciou no navegador apesar do endpoint retornar JSON correto. A preparação explícita e bounded do arquivo em C corrigiu o caminho observado; browser recebeu4185 bytes idênticos ao exemplo do motor. [Recibo](evidence/recheck-2026-10-27/corporate-prepared-download.json). É exemplo congelado, não E2E remoto.

Layout local em viewport390px: largura DOM390px, sem overflow da página nesse estado. Captura visual móvel foi inconclusiva (compositor/timeout); emulação restaurada. Não declarar validação em dispositivo físico ou auditoria completa de acessibilidade. Desktop e controles inspecionados no browser.

Instalação congelada, tipos globais, lint49/zero erros, builds e cinco suites corporativas PASS. Regressão qs em Express: serialização comma com toString não chamável e parsing normal PASS; patch sem mudança de major, política de1440 minutos intacta. CI do candidato E executa24/24 PGlite,25/25 PostgreSQL,grants1/1 e os quatro workflows/sete jobs; resultados finais e checkout são vinculados na PR e nos recibos baixados, sem antecipar checks pendentes.

Feed atualizado encontrou qs MODERATE e deepmerge LOW além dos avisos anteriores. qs foi corrigido para6.16.1; audit pós-patch **FAIL3HIGH/1MODERATE/1LOW**. Deepmerge está na cadeia Expo/CLI, sem patch publicado no advisory. SBOM dedicado atual84 componentes/294 inputs, zero correspondências conhecidas ao feed pós-patch; não cobre Node/OS/imagem. [Resumo pós-patch](evidence/recheck-2026-10-27/post-security/audit-summary.json) / [SBOM](evidence/recheck-2026-10-27/post-security/runtime/dedicated-runtime.cdx.json). Fontes: [qs](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw), [deepmerge](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).


## Registro anterior preservado

26/10/2026. **OMNIX FRONTEND PREVIEW READY — BACKEND INTEGRATION BLOCKED**.
Não é OMNIX DEMO ONLINE VERIFIED nem CUSTOMER PILOT APPROVED. Desenvolvimento e teste sintético foram executados sem depender de contratação de auditor externo.

Fonte E: `743247221ace7600b74f8e73fb80c1c73dfd37a2` (motor). Fonte C: `e965a85880ab8dc83a2459b37b987b434f0bc9ff` (site). O HEAD final de documentação/evidências e seus checks são informados na PR #456; estes identificadores fixam o código efetivamente testado abaixo. Evidências: [manifesto SHA256](evidence/manifest.json).

URLs observadas:

- C: [página corporativa online](https://xpex-systems-nr6sfgrax-xpex-neural.vercel.app/?view=omnix), READY, Git preview, navegação real confirmada no navegador.
- E: [portal em prévia protegida](https://gxeon-audit-cueu5zd4t-gxeon.vercel.app/omnix), READY, Git preview, SHA E confirmado pelo provedor; navegador chegou ao login Vercel. Conteúdo após SSO **NÃO VERIFICADO**. Nenhum bypass/share link criado.
- L: `http://127.0.0.1:5174/omnix`, frontend compilado → API Express em `127.0.0.1:3479` → PG17.11 exclusivo deste checkout em `127.0.0.1:55432`. Fluxo completo **LOCAL**, sem cliente real.

| Gate | Estado e evidência | Commit / URL | Responsável | Bloqueio e próxima ação |
|---|---|---|---|---|
| G01 Site identificado | PASS: main inicial 1ab659b, clone e projeto conferidos | C; reconciliação e metadados do preview | Codex | produção preservada; fundador avalia PR45 |
| G02 Motor identificado | PASS: PR456 e serviço existente inspecionados | E; PR456 | Codex | manter DRAFT, sem merge |
| G03 Interface reutilizada | PASS: mesmo React/Vite, transporte e motor; rota /omnix | E / L | Codex | sem segundo engine |
| G04 Página OMNIX | PASS: menu, home, página, limites e CTA; screenshot online | C / C | Codex | publicação em main exige decisão separada |
| G05 Portal navegável | PASS LOCAL: login, dashboard, formulário, caso, revisão, JSON | E / L; screenshots | Codex | visual remoto após SSO pendente |
| G06 Login de teste | PASS LOCAL: cookies, origem, expiração, revogação, papel e escopo | E / L; testes 20/21 e browser-other-organization | Codex | identidades sintéticas; IdP/recuperação reais não implementados |
| G07 Formulário | PARCIAL: editor visível submeteu vercel.json sintético e escopo; validação de arquivo implementada | E / L; browser-before-restart | Codex | seletor nativo de arquivo não verificado pelo navegador; validar manualmente |
| G08 API | PASS LOCAL: contratos Zod4 e chamadas reais; erros controlados | E / L; testes e CI | Codex | API remota dedicada ainda não autorizada |
| G09 Persistência | PASS LOCAL: PG17.11, papel restrito, transações, restauração e reinício | E / L; ci-product, logs e browser-after-restart | Codex | DB remoto não criado; validar TLS/CA no ambiente autorizado |
| G10 Dashboard | PASS LOCAL: 1 caso, 0 abertos, 1 fechado, 2 MEDIUM; outra organização tem 0 | E / L; portal-dashboard.png | Codex | métricas vêm do banco; nenhuma métrica simulada |
| G11 JSON exportável | PASS LOCAL: download real 4342 bytes | E / L; browser-received-report.json | Codex | exportação remota pendente |
| G12 Integridade/histórico | PASS LOCAL: hashes iguais antes/depois de refresh/restart; caso CLOSED | E / L; três checkpoints browser | Codex | verificação não é assinatura independente |
| G13 Prévia online | PARCIAL: página corporativa acessível; portal READY protegido | C, E / C, E | Codex / fundador | abrir portal com sessão Vercel já autorizada; não reduzir proteção |
| G14 E2E online | BLOCKED: só fluxo completo local comprovado | E / E | Fundador para autorização; Codex executa depois | aprovar API+PG segregados e proxy de prévia; repetir história completa remotamente |
| G15 Dados reais | BLOCKED: identidade/recuperação de clientes, retenção, revogação, monitoramento, TLS remoto e imagem não aceitos | E / nenhuma URL de cliente | Fundador + responsáveis técnicos | fechar segurança e privacidade; risco de dependências continua aberto |
| G16 Comercial | PARCIAL: oferta, rascunho e etapas delimitados, sem envio/contrato/pagamento | C / C; FIRST_REVENUE_READINESS | Fundador | aprovar preço, termos, suporte e canal; comprovar cada etapa real |
| G17 Custos/operação | BLOCKED: nenhum recurso pago criado; consumo das prévias não medido | C/E; ONLINE_DEPLOYMENT_DECISION | Fundador/titular dos provedores | confirmar plano, região, orçamento, limites, retenção e operação |
| G18 Abertura pública | BLOCKED: nenhuma aprovação humana inventada | PR45 / PR456 | Fundador | decisão explícita após gates de cliente; revisão humana permanece pendente |

## Implementação e limites

`/api/omnix` usa o mesmo `createAuditWorkflowService`; `metadata.portal` recebe identidade e organização do servidor, nunca do intake. Operador vê seus casos; revisor de teste vê casos da mesma organização para revisão. Outra organização, outro operador e requestId de outro dono recebem 404 sem ID/dados de caso. Eventos registram ator de sessão. Papéis técnicos anteriores continuam separados do portal; seus tokens nunca entram no browser.

Acesso opt-in, 2–10 identidades `test-*`, código individual aleatório, hash SHA256 no servidor, sessão opaca de 256 bits, HttpOnly/SameSite Strict, Secure remoto, TTL absoluto de 30 minutos e uma sessão por identidade. POST exige origem exata e JSON sem compressão, 32KB; 10 tentativas globais de login/minuto, 60 requisições/sessão/minuto, quatro requisições autenticadas concorrentes. Mapas são locais ao processo e limitados: adequado somente à prévia sintética de uma réplica. Reinício invalida sessões, preserva casos no PG e permite novo login. Não é IdP empresarial, senha humana, recuperação segura de clientes, sessão distribuída ou RLS multi-tenant validado.

Dashboard consulta agregados em todo o escopo autorizado e lista até 50 casos recentes com indicação de limite. Exemplo JSON congelado vem de teste anterior rotulado e tem tela própria. API indisponível não vira exemplo nem contagem fictícia. UI possui loading, vazio, erro, expiração/logout e descarte de respostas tardias; Blob da exportação é revogado ao trocar de contexto. Dois checks estáticos: `vercel_api_routing` e `vercel_security_headers`. Não há fetch de alvos, shell, scanner, pentest ou auditoria de redes sociais/ML/MCP.

## Comandos e resultados

Node local 24.19.0, pnpm 10.28.1; lockfile, mínimo de idade 1440 minutos e dependências preservados. Paths abaixo relativos ao repo apropriado. Logs completos em `evidence/logs/`; falhas intermediárias dos novos testes preservadas.

| Comando / ambiente | Resultado | Limitação |
|---|---|---|
| `pnpm install --frozen-lockfile` — motor | PASS | sem novo pacote/override; install original executa seu preinstall |
| `pnpm run typecheck` | PASS global | lint tem escopo crítico declarado, não todo monorepo |
| `pnpm --filter @workspace/api-server run typecheck:audit-tests` | PASS | tipos dos testes dedicados |
| `node scripts/audit-staging/lint.mjs` | PASS, 38 arquivos, 0 erros | regras existentes preservadas |
| `pnpm --filter @workspace/api-server run test:audit` | PASS 20/20 PGlite e 21/21 PG nativo | novo teste cobre sessão, CSRF, rate limit, isolamento e ciclo persistido |
| `pnpm --filter @workspace/api-server exec tsx --test src/tests/auditPilotDatabase.test.ts` com DB de teste isolado | PASS 1/1 | privilégio/TLS guard; DB remoto não testado |
| `pnpm --filter @workspace/api-server run build` | PASS, fronteira dedicada validada | não certifica imagem/Node/OS remoto |
| `pnpm --filter @workspace/gxeon-dashboard run build` | PASS | aviso de chunk acima de 500KB |
| `node scripts/audit-staging/codegen-smoke.mjs` | PASS | contrato de smoke local, Zod4.6.6 |
| `node scripts/audit-staging/security-compatibility.mjs` | PASS, 8 grupos | Metro/Babel/Router/assets reais; não foi aberto túnel |
| harness `verify`, `failures`, `restore` | PASS, 14 grupos + recuperação + restauração | cluster próprio; restore cria novo banco e não sobrescreve o original |
| navegador local | PASS editor → checks → revisor de teste distinto → CLOSED → download → refresh/restart → histórico | seletor nativo de arquivo e visual mobile NÃO VERIFICADOS |
| `npm ci --ignore-scripts` — site | PASS | audit npm do pequeno site informou 0; não confundir com motor |
| `npm run build`, `test:ecosystem`, `test:gx`, `test:gx-mcp`, `test:launch`, `test:enterprise-agent-api` — site | PASS | nenhuma dependência nova |
| navegador corporativo | PASS local e página online | rascunho local sem envio; portal remoto protegido |
| `pnpm audit --json` — monorepo | **FAIL**, 3 high + 1 moderate | quatro advisories continuam; sem exceção implícita para clientes |

CI de E: quatro workflows / seis jobs **PASS**. [Typecheck](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/40402301278), [Build completo Linux](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/40402301000), [Health](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/40402301057), [Audit OS V1](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/40402301084). O build global foi executado no CI; evitou-se localmente o script mobile que limpa caches compartilhados. Checkout de teste `6201b2c227eb5ab6825d3ee6c02ae0a4a2c68d95` limpo, merge sintético de main `dbc29fff...` e E, sem merge real. Artefatos e logs foram baixados do GitHub; `browserDownloadVerified:false` do harness HTTP é preservado, e a prova de download real está nos checkpoints browser separados.

Consulta completa em E: 42/42 commit statuses (13 success, 29 failure) e 29/29 check-runs. Há falhas de integrações legadas Vercel/Netlify e seis checks Netlify de páginas/headers/redirects. `gxeon-audit-os` está success/READY; não significa que todos os provedores estejam verdes. Não foram excluídos ou reconfigurados. Site C: sete check-runs success e status Vercel success. Consultar o HEAD final na PR; evidências deste pacote fixam E/C e não são resultados de um SHA futuro.

Falhas intermediárias: teste novo esperava 409 ao reexecutar CLOSED, mas o contrato existente retorna 200 `reused:true`; a expectativa foi corrigida para conferir idempotência e relatório inalterado. Lint detectou comentário de regra ausente; comentário desnecessário removido, sem enfraquecer regras. Correção transitória de `catch` foi concluída antes de tipos/build finais. Sem esconder falhas do produto ou inventar execução de outras IAs.

## Prova do caso no navegador

Caso `40156c4e-6b42-49af-97e6-a1c31bcde5ba`; relatório `fc827b0b-b1c0-49f6-8138-5e01cc648fa8`; evidência `6f460d8e-bf86-4c0e-a95a-4282788a788e`. Arquivo recebido: `audit-40156c4e-6b42-49af-97e6-a1c31bcde5ba.json`, 4342 bytes.

- SHA256 dos bytes: `0a635c5d073baeacb4a4f0df8d07fcbbb0bb4458889f11a8f5b8102a1d54edb4`.
- SHA256 canônico do relatório: `6a8822404e41f873977cba89816e8692a3f628714facc467ccc1dd87ae307f1c`.
- SHA256 da evidência: `56a4560234af662f2dfd68291feab1945ace054c878ffa7fb0acb5668b6d5ac9`.

Mesmo conteúdo confirmado via serviço e SQL antes/depois de refresh e restart. Transições: test-submitter-a DRAFT/IN_REVIEW, test-reviewer-a READY_FOR_REPORT, test-submitter-a CLOSED, todos em test-company-a. Revisão realizada por automação usando identidade sintética distinta: **não é revisão humana independente**. Não houve transmissão de arquivo de cliente. Revisão auxiliar Grok/Claude/DeepSeek: **NÃO EXECUTADA**, sem acesso autorizado disponível.

Reprodução limpa: instalar dependências, compilar API/dashboard; usar Docker PG17 do harness ou definir `GXEON_STAGING_PG_BIN` para PG17 oficial; executar `node scripts/audit-staging/omnix-stage.mjs init` uma única vez e `... up`. Ler os códigos somente no arquivo local ignorado `.gx019/access.json`, sem copiar para issues/commits/logs. Usar as identidades acima no portal, submeter fixture sintética, revisar com a segunda identidade, voltar à primeira, fechar e baixar. `... restart` preserva volume e invalida sessão; `... stop` encerra apenas o ambiente próprio. Não executar init em DB compartilhado ou converter esse harness loopback em produção. Verificador existente: `verifyReport` em `scripts/audit-staging/verify-report.mjs`.
