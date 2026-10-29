# GX-01.3 — decisão de aceite

**BLOCKED**, conforme determinação expressa do usuário e evidências desta fase. PR #456 deve permanecer aberta em rascunho, sem merge ou produção. Esta decisão não simula aprovação humana nem certificação.

## Estado inicial conferido

HEAD inicial 52e9c69b9b12215265c7bbb90d6371531663ec6f, base main, sem commits posteriores no início da rodada. Quatro workflows desse HEAD passaram; nenhum review humano. Foram lidos os nove documentos GX-01.2 e revisados seus contratos/evidências; hashes em evidence/prior-documents-read.json. Seus resultados históricos não são aprovação de um HEAD futuro.

O primeiro commit desta implementação é 39fcb13936bbb4bfe0d95df0dac9f4c185ede433; o último com alteração de harness é e636ece15888777665cdd0260a503fb9dd6846f8. Nesse HEAD, os quatro workflows passaram. O checkout de integração foi 53d23ed9b9a1e22d7391af01ef6b66fefbdcefb3, sourceDirty=false; IDs distintos preservados em evidence/ci-validation.json. O commit de fechamento acrescenta somente documentação/evidências e será rechecado na entrega, sem usar esse resultado como aprovação automática de um HEAD posterior.

## Matriz de aceite

| Gate / requisito | Estado | Evidência / responsável |
| --- | --- | --- |
| A — ambiente isolado | PASS nativo e CI Compose | PostgreSQL 17.11, frontend/API existentes, somente loopback; evidence/ci-acceptance.json |
| B — ciclo persistente | PASS nativo e CI Compose | 14 grupos após nova correção, fechamento e reinício real; snapshot preserva sourceCommit/sourceDirty |
| C — segurança | Correção demonstrada; risco residual aberto | PostgreSQL red 201 → green 404, 12/12; papéis/headers/UUID/integridade; audit residual sob revisão independente |
| D — externos | BLOCKED | 43 linhas de projeto; conta, permissão, configuração e relevância separados; xpex-systems-ai decide após confirmar titularidade |
| E — download real | BLOCKED / não comprovado | runtimes de UI não inicializam; DOWNLOAD_ACCEPTANCE.md pronto para pessoa autorizada |
| F — regressão técnica | PASS na implementação; rechecagem documental na entrega | Typecheck, Build Linux, Audit OS, 12 PostgreSQL/11 PGlite, 14 grupos Compose, lint, exportação e autorização aprovados no e636ece |
| Revisão independente | BLOCKED / não designada | xpex-systems-ai deve designar pessoa autorizada diferente do implementador |

## O que mudou

Regressão de implementação, HEAD e636ece15888777665cdd0260a503fb9dd6846f8:

| Workflow | Resultado |
| --- | --- |
| [Typecheck completo](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/39487694893) | PASS |
| [Build Linux completo](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/39487694906) | PASS |
| [Audit OS](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/39487694886) | PASS: 11 PGlite, 12 PostgreSQL e 14 grupos Compose; tipos dos testes, lint, integridade, autorização e exportação |
| [Monorepo Health](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/39487695077) | PASS |

Fechado bypass de descoberta legada por ativo que dispensava body.caseId; preservado guard de UUID. Acrescentados negativos de query/forwarded identity e regressão nativa, plus conferência de descoberta no papel mínimo. Atualizados transitivos vulneráveis compatíveis e Orval, sem regenerar código. Ajustada espera do harness para inicialização fria. Nenhuma funcionalidade comercial, tenant, pagamento, carteira ou integração externa foi criada/ativada.

O audit inicial reportou 128 ocorrências (14 críticas); o final da rodada, 91 (0 críticas, 61 altas, 25 moderadas, 5 baixas), em 88 entradas. Continua exit 1. A análise de alcance/aceite dos remanescentes é uma pendência, não um check aprovado.

Prova nativa desta rodada: caso 813d28ef-fd99-4cc8-ae0c-cf9654f2485d, relatório 882a245a-cd13-4228-adf3-882aacfae710, CLOSED, uma evidência e dois achados. Hash canônico 9066235d0dce51f9d487562085666c233ceb5141e6500e3f71725b85146286c7; matchesPersistedRecord=true no artefato da API. O snapshot local registra sourceDirty=true porque incluiu correções do harness ainda não commitadas; não foi apresentado como prova de checkout limpo. O CI forneceu prova limpa vinculada ao HEAD/merge testado em evidence/ci-acceptance.json; o ZIP teve seu digest conferido e o JSON foi validado separadamente. Nenhuma dessas provas é download por navegador.

## Decisões necessárias

1. **xpex-systems-ai:** confirmar conta/projectId, escolher frontend/API canônicos, fornecer logs/acesso de leitura onde necessário e aprovar especificamente qualquer ajuste externo. Matriz e propostas em EXTERNAL_DEPLOY_TRIAGE.md. Nenhuma alteração externa está autorizada pela mera existência deste relatório.
2. **xpex-systems-ai:** designar pessoa revisora independente; não atribuir a função ao Codex. HUMAN_REVIEW_PACKAGE.md contém diff, ameaças, testes, evidências, reprodução e formulário sem assinatura.
3. **Pessoa revisora a designar:** conferir arquivo realmente baixado e matchesPersistedRecord=true conforme DOWNLOAD_ACCEPTANCE.md, avaliar risco residual de dependências e emitir review identificado.
4. **Executor técnico:** registrar resultados atuais de todos os workflows no HEAD final. Falhas locais de memória/Windows não se transformam em aprovação por resultados antigos.

Nenhum aceite formal de risco externo, download ou review humano foi recebido. READY FOR HUMAN REVIEW só pode descrever um pacote tecnicamente completo, sem substituir os gates pendentes; a decisão global exigida pelo usuário continua BLOCKED. READY FOR FINAL APPROVAL não se aplica nesta entrega.

## Governança e retenção

Nenhuma ação manual de exclusão, transferência, reconfiguração ou publicação de projeto Vercel/Netlify foi executada; nenhum check foi desabilitado. As integrações preexistentes do GitHub geram previews automaticamente ao atualizar a branch; nenhuma foi reconfigurada. Não houve merge, produção, operação financeira, migração destrutiva ou exclusão de evidências. Dados locais são sintéticos e serão preservados para revisão, com desligamento seguro do staging ao término. Exclusão futura depende de confirmar propriedade, retenção e autorização.
