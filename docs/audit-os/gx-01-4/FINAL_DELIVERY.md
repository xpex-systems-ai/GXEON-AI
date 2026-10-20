# GX-01.4 — entrega para decisão

**BLOCKED. [PR #456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) mantida DRAFT, sem merge ou produção.**

SHA de implementação validado: **d20e38db9dd8812d3aa7657846b738137bbfe48d**. Base: dbc29fff9a2c55487f85a83db597f41c493af7a8. Checkout CI de integração: b9b5febdfcf6cb9c93625741f459112ee137d4ed, sourceDirty=false. O commit de fechamento altera somente documentação/evidências e terá seus próprios workflows consultados na entrega da PR; o SHA final completo consta na descrição da PR e resposta final. Não interpretar PASS do candidato como aprovação automática de commits posteriores.

## Mudanças e evidências

Nove atualizações compatíveis: Vite, PostCSS, Babel core, browserslist, baseline-browser-mapping, nanoid, source-map-js, fast-copy e ws 8. Preservados minimumReleaseAge e majors. Sem mudanças de rotas, schema, flags produtivas, autenticação ou novos módulos. O fluxo permanece análise estática autorizada de vercel.json, sem auditoria universal ou homologação comercial.

[Snapshot inicial](INITIAL_SNAPSHOT.md), [49 linhas canônicas](CANONICAL_INFRASTRUCTURE_MATRIX.md), [proposta A/B](INFRASTRUCTURE_DECISION_PROPOSAL.md), [riscos](DEPENDENCY_RISK_REGISTER.md), [42 checks externos](EXTERNAL_CHECKS_FINAL_MATRIX.md), [download](DOWNLOAD_FINAL_VERIFICATION.md), [handoff independente](INDEPENDENT_REVIEW_HANDOFF.md), [decisão](ACCEPTANCE_DECISION.md).

## Regressão do candidato

| Comando / check | Resultado no d20e38d |
| --- | --- |
| pnpm install --frozen-lockfile / pnpm 10.28.1 | PASS Windows e CI |
| [Typecheck global](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/39494661263) | PASS |
| [Build completo Linux](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/39494661161) | PASS, incluindo mobile Linux |
| [Audit OS V1](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/39494661242) | PASS; lint 19 arquivos/0 erros, tipos dos testes, PGlite 11/11, PostgreSQL 12/12 |
| Staging isolado Compose no mesmo workflow | 14 grupos PASS; auth, papéis, legado, rollback, integridade, export API, reinício API+banco |
| [Monorepo Health](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/39494661182) | PASS |
| pnpm 10.28.1 audit --json | exit 1: **74 ocorrências em 73 advisories**, 51 altas, 19 moderadas, 4 baixas, 0 críticas |
| Verificação de segredos | 11 arquivos locais sem credenciais sintéticas conhecidas; diff integral textual sem padrões de token/chave selecionados; harness confere bundle/logs. Não é DLP histórico |
| Download real / revisão humana | BLOCKED / NÃO DESIGNADA |

Comparativo pnpm11 nesta fase: 89→73 ocorrências. A versão exigida, pnpm10, conta o mesmo conjunto final como 74; ambos snapshots estão preservados, sem reduzir risco por mudança de CLI/feed. GX-01.3 registrava 91 antes da mudança de feed.

Caso sintético: b4229963-c74e-414a-9ff7-1a84812dc6a3; relatório fd63bcae-cb85-4d9d-b3bf-f9ef69f50e2d; CLOSED, uma evidência/dois achados; SHA-256 **9705d2621daf04394700231f8e59be5871af17f46c07506d423efc85a7b64b10**. [Relatório JSON](evidence/ci-api-report.json), [aceite técnico](evidence/ci-acceptance.json), [vínculo CI](evidence/ci-validation.json). O harness provou igualdade/persistência após reinício. O verificador offline confirmou hash canônico, hash da evidência, referências e IDs. ZIP GitHub 12297211464, digest sha256:eb307b4830715a5018a52319d89fa33099856ce11e058711ad9813144ec210d1, conferido antes de extrair em memória somente os dois JSON permitidos. Isso é evidência de API/CI, não download UI.

[Diff integral textual do candidato](evidence/full-pr-d20e38d.diff.gz): 1587630 bytes descompactados, SHA-256 0ee5de4a2b0c1d6b0910632ebce1d2ec1bdb91655791fdc433e5c7aa7826d7f7. Binários indicados pelo formato GitHub estão disponíveis individualmente; git diff --binary base SHA produz payloads binários. Conferir o diff documental posterior e SHA final antes de assinar.

## Infraestrutura, externos e governança

Inventário: 16 projetos Vercel, sete contextos Netlify e 21 contextos de conta bloqueada sem ID, mais cinco serviços Railway = 49 linhas. Contextos sem identidade física podem representar duplicidade; não são 49 recursos canônicos confirmados.

Frontend candidato de reutilização: Vercel/gxeon/prj_owdXFSlvK1GBrWVuYCqeHpTlYjP4, READY do provedor; não é API homologada. Backend canônico externo não comprovado. Railway inspecionado aponta a xpex-systems-command/XPeX-Plugin-Factory- e usa ambiente production; não reutilizar banco de outro módulo por inferência.

Recomendação **B dedicado**, condicionada a orçamento/permissões e autorização específica. Custos e premissas na proposta, sem contratação. Snapshot inicial: 42 statuses, 29 falhas/13 sucessos. Snapshot do candidato ainda registrava 29 falhas/9 sucessos/4 pendentes; detalhes atuais preservados, sem carregar causa de deployment antigo para um novo em fila. O HEAD final deve ser consultado novamente. Checks não foram desativados, removidos ou ignorados como autorização de merge.

Download real: navegador não inicializa por kernel assets; nenhum arquivo UI recebido homologado. Roteiro manual com credenciais distintas, caso novo, revisão documentada, CLOSED e matchesPersistedRecord=true antes/depois do restart disponível. Pessoa independente NÃO DESIGNADA; nenhum usuário inventado ou aprovação simulada.

## Windows, retenção e próxima ação

Instalação frozen pnpm10 passou, lint direto passou. pnpm global11 tentou sincronizar módulos e abortou no-TTY; não foi autorizada purga. Depois, disco local 0 bytes bloqueou gravações, build/staging e sincronização Git. Não foram repetidos builds locais inviáveis; histórico de heap/typecheck e fetch Metro/mobile Windows da GX-01.3 permanece registrado. Build mobile Linux atual passou, sem alegar homologação mobile Windows.

A revisão automática rejeitou a remoção do cache pnpm recém-criado; motivo adicional não foi informado. Cache não removido e exclusão não repetida por outra ferramenta. Somente resumos duplicados desta fase foram reduzidos e os JSON de audit comprimidos, com parse/metadata conferidos. Código, banco e evidências anteriores preservados. Entrega registrada pela API GitHub na mesma branch; checkout local permanece no SHA inicial com alterações preservadas, sem reset. Recuperar espaço antes de sincronizar; não sobrescrever o checkout com pull/reset automático.

Próxima ação humana: xpex-systems-ai designar pessoa independente; confirmar propriedade/permissões, avaliar a matriz/proposta B e autorizar somente mudanças externas específicas; avaliar riscos e plano/aceites individuais; executar download autorizado. Sem essas decisões, **BLOCKED**.

Nenhum merge, deploy de produção, recurso pago, movimentação financeira, carteira, Stripe, DNS, exclusão/transferência de projeto, migração destrutiva ou desativação de checks. Previews automáticos são integrações preexistentes, sem reconfiguração nesta fase.
