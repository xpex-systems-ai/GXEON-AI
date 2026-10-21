# GX-01.2 — exportação e conferência do arquivo

Gate E PENDENTE. A exportação HTTP retorna application/json e Content-Disposition attachment. O runner confirma formato, caseId, CLOSED, artefato, achados, referências, SHA-256 do conteúdo e do relatório e igualdade com o registro SQL antes/depois do reinício. evidence/api-report.json é resposta da API, não um arquivo baixado pelo navegador.

A etapa anterior teve timeout no evento de download e a política bloqueou edge://downloads. Não foi usado outro caminho para contornar essa política. Nesta sessão, o controle CUA falhou duas vezes ao iniciar, inclusive após reset: `failed to write kernel assets: O sistema não pode encontrar o caminho especificado. (os error 3)`. Não foi possível repetir a interação ou inspecionar automaticamente um arquivo baixado. Nenhum teste de navegador novo foi declarado aprovado.

## Conferência manual pelo revisor

1. Inicializar o staging conforme STAGING_VALIDATION.md. Abrir http://127.0.0.1:5174/audit-os em navegador autorizado.
2. Receber do responsável local as credenciais sintéticas de operador/revisor em canal privado. Não colar valores em issue, screenshot, relatório ou terminal compartilhado.
3. Criar um caso TEST DATA com UUID novo, autorização sintética e vercel.json sanitizado; executar os dois checks. Registrar caseId e evidência.
4. Revisar o conteúdo com a credencial distinta e referência nominal do revisor. Aprovar somente após conferir evidências/achados. Finalizar como operador e confirmar CLOSED.
5. Clicar Exportar. Conferir nome de arquivo JSON e registrar o caminho devolvido pelo próprio navegador. Não acessar locais bloqueados nem contornar proteção.
6. Se a política permitir leitura do arquivo, executar localmente:

```sh
node scripts/audit-staging/verify-report.mjs /caminho/permitido/arquivo.json
```

O verificador usa as credenciais privadas do staging, calcula os dois hashes, confere referências e compara todo o envelope com o relatório persistido consultado pela API da mesma origem do frontend. Deve retornar matchesPersistedRecord=true. No Windows, passar o caminho absoluto entre aspas.

7. Anexar apenas resumo sanitizado: commit testado, data, caseId/reportId, hash, navegador, nome do arquivo, resultado do verificador e assinatura/identidade do revisor. Reabrir o caso após restart e repetir a conferência.

Se o navegador impedir o download/inspeção, registrar a mensagem exata e manter E pendente. Um GET de API, botão visível ou o atributo attachment não substituem a comprovação do arquivo recebido pelo usuário.
