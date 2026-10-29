# GX-01.8 — pedido de decisão de risco

Data-base: 25/10/2026. Candidato de código: `d71996bc73502f6c2352c0c687ef1cba90012ea4`. PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT. Preparação de engenharia; liberação global NO-GO.

**BLOCKED — INDEPENDENT REVIEW REQUIRED. Nenhum risco aceito.** As quatro linhas da [matriz](SECURITY_RESIDUAL_FINAL_MATRIX.md) e os limites do [SBOM](DEPLOYABLE_RUNTIME_SBOM.md) precisam de decisão do proprietário com parecer independente. O Codex é implementador e não pode assinar nenhum desses papéis.

Alternativas para análise: solicitar correções adicionais; excluir formalmente módulos móveis/API geral do escopo com prazo de migração; ou rejeitar o candidato. Isolamento exige processo/artefato/variáveis/rede reais, não só um diagrama. A elegibilidade do candidato dedicado não transfere aceite ao monorepo inteiro. Qualquer aceitação condicionada deve identificar SHA, ambiente, prazo, controle verificável, responsável e gatilho de revisão.

Registrar um formulário separado por advisory (node-forge, http-cache-semantics, decode-uri-component, Zod legado), sem valores pré-assinados:

| Campo humano | Preenchimento pelo responsável |
| --- | --- |
| Advisory e versão examinados | |
| SHA e ambiente examinados | |
| Escopo e exposição considerados | |
| Mitigação verificada e evidência | |
| Probabilidade/impacto e risco residual | |
| Responsável pela mitigação | |
| Prazo de correção/expiração da exceção | |
| Revisor independente e referência do parecer | |
| Data de revisão / gatilho de reavaliação | |
| Decisão humana | |
| Condições | |
| Assinatura ou referência verificável | |

Opções de decisão, para escolha humana: REMEDIATE / EXCLUDE WITH CONDITIONS / ACCEPT TIME-BOUND RISK / REJECT. Nenhuma opção selecionada. Também avaliar Node/SO/imagem, TLS remoto ainda não testado e credenciais compartilhadas por papel (piloto single-tenant), que não aparecem no audit npm.

Proposta de gatilhos: novo advisory, alteração de SDK/Zod, instalação de pg-native, mudança de artefato/role/CA, nova organização ou novo tipo de dado encerra a validade da análise. Sem parecer e decisão rastreável, manter NO-GO; prosseguir somente preparação independente segura.
