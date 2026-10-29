# GX-01.7 — decisões de risco residual

**Nenhum risco foi aceito pelo Codex.** Os quatro advisories retidos mantêm pnpm audit exit1. Severidade do feed não foi rebaixada por estar fora do processo dedicado.

| Risco / advisory | Caminho observado | Contenção proposta / próximo passo | Dono / decisão |
|---|---|---|---|
| node-forge HIGH GHSA-86w9-cpqp-85rv | mobile→@expo/cli→forge1.4.0 | não expor CLI; aguardar patch reconhecido, revisar fluxo de assinatura | security owner a designar / PENDENTE |
| http-cache-semantics HIGH GHSA-ch52-4w7c-c8xp | mobile→ngrok→got→cacheable-request4.2.0 | nenhum túnel/uso real; não assumir4.3 corrigido sem evidência | security owner / PENDENTE |
| Zod HIGH GHSA-mrhx-c7xc-m3w5 | mobile3.25.76 no feed; lib/db também usa3 | runtime dedicado4.6.6 e preflight; migração legacy separada com regressão | maintainer / PENDENTE |
| decode-uri-component MODERATE GHSA-vcc3-ghjq-m6fr | ExpoRouter→query-string→0.2.2 | upgrade do parent compatível em missão posterior;0.5.0 diretamente é incompatível | mobile maintainer / PENDENTE |
| Tokens de papel compartilhados | Audit OS single-instance | separar operador/revisor; rotação/revogação no futuro IdP; nunca vender como identidade nominal/tenant | owner / PENDENTE |
| TLS/banco remoto/backups offsite | não provisionados | homologação em ambiente dedicado após aprovação específica | owner / BLOCKED |

Formulário para cada risco: pessoa nominal e independência; advisory/SHA; justificativa de alcance; probabilidade/impacto; controles e teste; prazo de expiração/revisão; condição de rollback; decisão APPROVED / APPROVED WITH CONDITIONS / CHANGES REQUESTED / REJECTED; data/assinatura/evidence ID. Campos permanecem vazios. Ausência de resposta não é aceite. Não publicar entrada de cliente nem segredo como evidência.

O feed mostra patched_versions<0.0.0 para forge/cache; isso significa ausência de patch reconhecido nessa consulta, não uma versão instalável. Novas versões/patches exigem reconsulta e teste. Não eliminar módulos apenas para obter contagem verde. [Auditoria](DEPENDENCY_SECURITY_CLOSURE.md).
