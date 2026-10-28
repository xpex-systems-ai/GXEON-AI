# GX040 — catálogo e distribuição somente leitura

Estado: candidato de código. **Não é publicação de plugin/MCP público, prova de OAuth remoto ou aceite de dados de clientes.** Não há novo motor ou banco para o adaptador.

## Patrimônio examinado e decisão

| Componente existente | Classificação | Ligação canônica / limite observado no código |
| --- | --- | --- |
| `auditWorkflowService.ts` | REUTILIZAR | Fonte de casos, transações, idempotência, owner/org, achados, evidência e exportação. O gateway chama `forActor` e somente `list/detail/exportReport`. |
| `lib/api-zod/src/auditWorkflow.ts` | REUTILIZAR | Os dois `auditCheckIds` são importados, sem outro catálogo de regras ou nova implementação de checks. |
| `connectorRegistry.ts` | ADAPTAR | Declara capacidades/readiness para múltiplos provedores, inclusive financeiros. Isso não comprova disponibilidade OMNIX; o módulo não é importado pelo gateway. |
| `githubReadonlyClient.ts` | ADAPTAR | GET para repo/branches/PRs/issues/commits; seleciona token/repo global ou opções do servidor e limita páginas a20. Precisa conexão por organização, escopo do repo, timeout e limite de resposta antes de reutilização empresarial. Nenhuma chamada é ativada aqui. |
| `railwayReadonlyClient.ts` | ADAPTAR | GraphQL de leitura e limites de inventário, com sanitização de erros. Configuração/credencial global e transporte sem timeout explícito não equivalem a conexão multiempresa. Não é importado ou ativado. |
| Site `api/mcp/enterprise.js`, `api/mcp/gx.js` | REUTILIZAR convenções / ADAPTAR para privado | Expõem descoberta pública, não auditorias privadas. Convenções JSON-RPC/text content/annotations são reaproveitáveis; CORS público e ausência de autorização por recurso não foram copiados. |
| Site `api/agent-api.js` | REUTILIZAR para descoberta pública | Matching/pilot blueprint não é execução de auditoria nem acesso de cliente. O novo gateway não usa esse endpoint como autoridade. |
| Tabelas `audit_cases/assets/findings/evidences/reports` | REUTILIZAR | Relacionamentos existentes compõem a projeção de grafo de referências. Sem novo graph DB ou duplicação de dados. |

Nenhum conector legado foi descartado. Código financeiro ou permissões de contas ChatGPT/GitHub/Render do operador não são transferidos ao produto.

## Catálogo único

`omnixCapabilities.ts` fornece seis especialistas: Vercel, GitHub, Railway, Agent Economy, Web & API e Commerce. Vercel declara os dois checks existentes; os outros cinco estão `PLANNED`. As capacidades atuais ficam `RELEASE_BLOCKED` e não há `AVAILABLE` por configuração de ambiente. As declarações incluem método, versão, provedor, ativos, permissões, entradas, dependências, referências de teste, revisão, limites e estado por ambiente. Retornar uma cópia impede promoção do catálogo compartilhado por consumidores em memória.

`approvalRequired` refere-se ao gate de release e, nos checks, à revisão distinta antes do relatório; não cria um pedido de aprovação humana para cada leitura já autorizada. Fonte de teste não é aprovação humana. Os estados `IMPLEMENTED/TESTED/RELEASE_BLOCKED` distinguem engenharia de disponibilidade; esta versão exige mudança de release revisada para aceitar qualquer `AVAILABLE`.

Não foi criada fila distribuída. Os estados canônicos `DRAFT/IN_REVIEW/READY_FOR_REPORT/CLOSED` e a idempotência/transação do motor continuam em uso. O adaptador lê `IN_REVIEW` como revisão pendente e não executa transições/cancelamentos.

## Integração privada do backend

```ts
const gateway = createOmnixReadGateway(
  async () => {
    // Verificar JWT (issuer/audience/expiry), sessão/membership/delegation atuais.
    // A organização pedida só pode ser resolvida pelo store de autorização.
    return principal; // userId, organizationId, scopes, workflowActor
  },
  canonicalWorkflowService,
);
await gateway.callTool(name, args);        // API: resultado tipado ou OmnixReadError sanitizado
await gateway.converse(structuredIntent); // Sem LLM pago; apenas intenções fechadas de leitura
await gateway.handleRpc(body);           // {status, body?}; notifications/initialized pode retornar204
```

O gateway valida que os IDs do ator coincidem com os do principal e chama `canonicalService.forActor` por conta própria. O resolver roda novamente em cada chamada, permitindo ao backend negar revogação/delegação alterada antes de entrar no SQL. Não aceitar `principal`, token, role, userId ou organizationId do corpo de ferramenta/prompt. `forActor` com role reviewer é projeção de leitura em algumas delegações; este gateway não possui ferramentas de escrita. A camada enterprise deve conferir papel real/escopos antes de qualquer escrita fora dele.

O mount HTTP pertence ao runtime autenticado: origem exata, método/body JSON delimitados, rate/concurrency e verificador OIDC. Um token com audience/issuer inválidos não chega ao gateway. O adaptador não cria provedor OAuth, recupera senha, transfere conexão da conta do operador ou publica app.

## Ferramentas e escopos

| Ferramenta | Escopos mínimos | Dados |
| --- | --- | --- |
| `omnix_get_capabilities` | capabilities:read | Declarações e gates, nunca prova de disponibilidade |
| `omnix_list_audits` | audits:read | Lista/contagens canônicas autorizadas, máximo50 |
| `omnix_get_audit` | audits:read | Estado/results e IDs do grafo; sem bytes de evidência ou corpo de relatório |
| `omnix_get_findings` | audits:read | Achados existentes com referências verificadas |
| `omnix_get_evidence` | audits:read + evidence:read | Artefato existente, case/evidenceId e SHA verificados |
| `omnix_get_report` | audits:read + evidence:read + reports:read | Export canônico; requer evidence:read porque inclui artefato |
| `omnix_get_pending_approvals` | audits:read + approvals:read | Casos IN_REVIEW; nunca concede/realiza aprovação |

Todos os escopos têm prefixo `omnix:`. Um `organizationId` extra nos argumentos é erro, não seletor autorizado. Ler outro UUID retorna o mesmo erro de recurso não encontrado. Listagem e busca de último relatório usam a janela existente de50casos e informam truncamento; ausência nessa janela não é prova de ausência em todo o histórico.

`converse` aceita somente `capabilities`, `latest_report`, `findings` e `capability_status`. Informa quando não existe relatório disponível, apresenta a referência do relatório canônico e mantém hipóteses vazias em vez de inventar correlações. Especialista planejado retorna `CAPABILITY_NOT_IMPLEMENTED` e `executionAllowed=false`. Isso é orquestração de intenções estruturadas, não interpretação universal de linguagem natural ou autonomia de agente.

Entradas limitadas a16KiB e resultados a128KiB; sem parâmetros URL/comandos, downloads arbitrários ou batch. Erros de infraestrutura usam mensagem fixa sem exceções brutas. Erros de execução de ferramenta usam `isError=true`; erros de autenticação/escopo permanecem401/403. A convenção existente de protocolo2025-03-26 foi conferida na especificação de [tools](https://modelcontextprotocol.io/specification/2025-03-26/server/tools) e [lifecycle](https://modelcontextprotocol.io/specification/2025-03-26/basic/lifecycle). Inicialização exige versão/capacidades/clientInfo. Compatibilidade de cliente MCP remoto, lifecycle HTTP completo e publicação dependem de validação adicional; não declarar MCP READY a partir desses testes.

## Integridade e prova

Projeção usa IDs de Audit/Finding/Evidence/Report já persistidos e relações `HAS_EVIDENCE/HAS_FINDING/SUPPORTED_BY/REPORTS_ON`; são referências, não causalidade. O SHA do artefato é conferido com o `digest` existente antes de leitura de evidência/achados. Export usa o verificador canônico. Conteúdo de arquivo fica explicitamente classificado como dado não confiável; não altera ferramenta, escopo ou identidade.

`auditOmnixDistribution.test.ts` cobre registro sem AVAILABLE, conjunto de ferramentas/escopos, SQL canônico, UUIDs entre organizações, escopos que não podem vazar relatório/evidência, revogação antes do SQL, ausência de relatório, capacidade não implementada, instrução em arquivo como texto, parâmetros extras, excesso de tamanho, erros sanitizados e evidência alterada. Usa PGlite ou, quando configurado pela CI, banco de teste PG17 dedicado em loopback; não prova operação pela internet nem revisão humana.
