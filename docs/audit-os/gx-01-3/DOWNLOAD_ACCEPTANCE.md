# GX-01.3 — aceite de download

**PENDENTE / BLOCKED. Nenhum PASS de navegador declarado.**

Foi seguido docs/audit-os/gx-01-2/DOWNLOAD_VALIDATION.md. O primeiro ponto da conferência automatizada falhou antes de abrir uma página: tanto cua.getState quanto a inicialização documentada de @oai/sky retornaram `failed to write kernel assets: O sistema não pode encontrar o caminho especificado. (os error 3)`. Nenhum clique, criação de caso por UI, evento de download ou leitura de arquivo recebido foi comprovado nesta rodada. A restrição anterior sobre edge://downloads continua respeitada. Não foi usado outro acesso ao gerenciador, CDP ou filesystem para contornar essa restrição.

O staging nativo foi preparado com dados sintéticos. Os testes HTTP exercitam uma nova auditoria e exportam JSON da API, mas esse arquivo é identificado como **API TEST ARTIFACT**, nunca como download pela interface. As provas completas da regressão Linux serão vinculadas ao novo HEAD na entrega. Falhas locais de memória e de inicialização estão registradas separadamente.

## Pacote para a pessoa revisora

Responsável por designar/distribuir acesso: **xpex-systems-ai**. Pessoa revisora independente: **NÃO DESIGNADA**, conforme resposta expressa do usuário. Codex não preenche nem assina aprovação humana.

1. Conferir o HEAD da PR #456 e registrar o SHA completo. Seguir STAGING_VALIDATION.md da GX-01.2 para iniciar o banco e apps isolados. Não usar banco ou credencial produtiva.
2. Abrir http://127.0.0.1:5174/audit-os em navegador permitido. Receber as credenciais sintéticas de operador/revisor em canal privado; não anexar .gx012/config.json nem valores de credenciais.
3. Criar um caso **novo** TEST DATA na UI, com UUID novo, autorização sintética e os dois checks. Usar referência test-fixture/vercel.json e conteúdo `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`.
4. Executar, conferir evidência e achados, revisar com credencial distinta e referência nominal da pessoa revisora. Finalizar como operador; registrar CLOSED, caseId e reportId.
5. Clicar Exportar e registrar o nome/caminho que o próprio navegador disponibilizar. Se houver bloqueio de política, parar e registrar a mensagem, mantendo o gate pendente.
6. Somente se a leitura do arquivo for permitida, executar:

```sh
node scripts/audit-staging/verify-report.mjs "CAMINHO_ABSOLUTO_AUTORIZADO_DO_JSON"
```

Exigir matchesPersistedRecord=true. O verificador confere formato, caso, CLOSED, revisão, evidência única, achados, referências, hash de evidência, hash canônico e igualdade de todo o envelope com a API persistida. Reiniciar API+banco com stage:audit restart, repetir a verificação e registrar o mesmo resultado.

7. Preencher o formulário abaixo e o HUMAN_REVIEW_PACKAGE.md. Publicar somente o resumo sanitizado, nunca credenciais, configuração real de cliente ou caminho pessoal desnecessário.

| Campo | Preenchimento pela pessoa revisora |
| --- | --- |
| Nome/usuário GitHub autorizado | PENDENTE |
| Independência do implementador confirmada | PENDENTE |
| SHA completo, data e navegador | PENDENTE |
| caseId / reportId / nome do arquivo | PENDENTE |
| Arquivo efetivamente recebido | PENDENTE |
| matchesPersistedRecord antes/depois do restart | PENDENTE |
| SHA-256 do relatório | PENDENTE |
| Evidência/achados/referências conferidos | PENDENTE |
| Decisão e assinatura/referência do review | PENDENTE |

Um attachment HTTP, JSON validado por API, artefato do CI ou botão visível não substitui a prova do arquivo recebido no navegador. Nenhum campo deste formulário constitui aprovação automática.
