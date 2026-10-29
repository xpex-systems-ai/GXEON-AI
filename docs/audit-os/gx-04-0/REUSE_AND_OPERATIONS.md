# GX-04.0 — Reutilização, evidências e operação

Este inventário descreve o código inspecionado no candidato GX-04.0. Existência de arquivo, catálogo ou teste não comprova disponibilidade remota, aprovação humana ou operação com clientes. O aceite permanece **BLOCKED** até o fechamento dos gates da entrega.

## Inventário de ativos e decisão

Os caminhos abaixo pertencem ao GXEON-AI, salvo os explicitamente identificados como checkout corporativo irmão.

| Ativo / fonte | Decisão GX-04.0 | Aplicação e limite observado |
| --- | --- | --- |
| `artifacts/api-server/src/services/auditWorkflowService.ts` | **REUTILIZAR** | Motor canônico: intake, execução delimitada, revisão distinta, finalização, leitura e exportação; preservar transações e verificação de propriedade. |
| `artifacts/api-server/src/services/auditWorkflowChecks.ts` e `lib/api-zod/src/auditWorkflow.ts` | **REUTILIZAR** | Duas regras estáticas existentes para configuração submetida; IDs e contratos compartilhados. Não representam observação de um deploy real. |
| `lib/db/src/schema/audit.ts` e `lib/db/drizzle/0002_audit_os_schema.sql` | **REUTILIZAR** | Tabelas e relações de ativos, casos, evidências, achados e relatórios; nenhuma segunda base de auditoria. |
| `artifacts/gxeon-dashboard/src/pages/OmnixPortalPage.tsx` e `omnix.css` | **REUTILIZAR** | Portal, login sintético, histórico, formulário, revisão e relatório existentes. A consulta de capacidades foi acrescentada no mesmo portal. |
| `artifacts/api-server/src/connectors/connectorRegistry.ts` | **ADAPTAR** | Inventário declarativo `MANUAL_FIRST`; metas de status, variáveis e permissões declaradas não comprovam uma conexão ativa. Não é fonte de autorização por organização. |
| `artifacts/api-server/src/connectors/github/githubReadonlyClient.ts` e normalizador irmão | **ADAPTAR** | Leitor GitHub existente com origem fixa e páginas limitadas. Exige ligação autenticada por organização/repositório, limites explícitos de tempo/bytes e testes antes de integrar ao OMNIX. |
| `artifacts/api-server/src/connectors/railway/railwayReadonlyClient.ts` e normalizador irmão | **ADAPTAR** | Consultas GraphQL de leitura e limites de inventário existentes. Configuração/credencial global não concede acesso a projetos de clientes; transporte e titularidade precisam de adaptação. |
| Checkout corporativo `xpex-systems-ai-gx019/site/api/mcp/enterprise.js`, `site/api/mcp/gx.js`, `site/api/agent-api.js` | **ADAPTAR** | Reutilizar convenções de descoberta, referências e respostas de ferramentas. São superfícies de informação pública; não fornecem autenticação privada de auditoria nem acesso ao banco OMNIX. Nenhuma conta externa foi reconfigurada. |
| `artifacts/api-server/src/enterpriseIdentity.ts`, `enterpriseIdentityStore.ts`, `enterpriseIdentityRouter.ts`; migração `0003_omnix_enterprise_identity.sql` | **IMPLEMENTAR** | Candidato adicionado nesta etapa: verificação OIDC, associação, convite, delegação e revogação por solicitação. Provedor real, jornada de login empresarial e aceite operacional dependem dos gates documentados em `IDENTITY.md`. |
| `lib/api-zod/src/omnixCapabilities.ts`, `artifacts/api-server/src/omnixCapabilities.ts`, `omnixReadGateway.ts`, `omnixDistributionRouter.ts` | **IMPLEMENTAR** | Registro tipado e adaptador de leitura adicionados ao motor existente. Seis especialistas declarados; Vercel com liberação bloqueada, demais planejados. Nenhum `AVAILABLE`. |
| `artifacts/gxeon-dashboard/src/pages/OmnixCapabilitiesPanel.tsx` | **IMPLEMENTAR** | Consulta autenticada de capacidades, último relatório e achados de um caso; sem LLM pago, texto livre com autoridade ou escrita por ferramenta. |
| `artifacts/api-server/src/omnixCommercial.ts`; migração `0004_omnix_commercial_intake.sql` | **IMPLEMENTAR** | Intake comercial sintético com consentimento, destinatário configurado, recibo e confirmação explícita. Registro/ACK automatizado de teste não é entrega a uma pessoa, lead real, contrato ou receita. |
| `deploy/self-hosted/encrypted-backup.mjs`, `encrypted-backup.test.mjs`, `verify.mjs` | **ADAPTAR** | Reutilizar o ensaio de restore existente, acrescentando módulo operacional novo de backup autenticado e testes específicos. Execução nativa atualizada e validação remota devem constar na matriz da entrega antes do aceite. |
| `artifacts/api-server/src/modules/academy/README.md` e `artifacts/gxeon-dashboard/src/modules/academy/README.md` | **NÃO COMPROVADO** | Ambos declaram placeholders. Preservados; não anunciados como curso, API ou módulo acadêmico operacional. |
| `artifacts/api-server/src/services/financial/`, `lib/db/drizzle/0000_financial_foundation.sql` e conectores financeiros do registro legado | **DESCARTAR COM JUSTIFICATIVA** | Descartar sua inclusão no fluxo GX-04.0: não são necessários à auditoria autorizada. Código legado preservado; sem ativar pagamentos, carteiras, fundos ou webhooks de produção. |
| Segundo motor, banco próprio de plugin, novo dashboard, graph database e fila distribuída para este fluxo | **DESCARTAR COM JUSTIFICATIVA** | Duplicariam responsabilidades já atendidas pelo motor, PostgreSQL e portal. Nenhuma necessidade comprovada pelo fluxo síncrono atual. |
| TLS/identidade do PostgreSQL externo, restauração remota, suporte humano e publicação MCP externa | **NÃO COMPROVADO** | Configuração candidata e ensaios locais não substituem prova do ambiente alvo nem revisão humana independente. |

## Mapa de referências de evidência

Fonte persistida: `lib/db/src/schema/audit.ts`. Escrita e verificação do fluxo: `auditWorkflowService.ts`. Projeção somente leitura: `omnixReadGateway.ts`.

| Relação | Representação existente | Limite de interpretação |
| --- | --- | --- |
| Organização/usuário → caso | `audit_cases.metadata.portal.organizationId/userId`, comparados com o ator validado pelo servidor | IDs fornecidos por prompt não concedem autorização. Associações/delegações empresariais são consultadas no store de identidade. |
| Ativo → auditoria | `audit_cases.asset_id` → `audit_assets.id` | Ativo é uma configuração submetida; isso não comprova controle de um projeto externo. |
| Auditoria → evidência | `audit_evidences.case_id` → `audit_cases.id` | Texto sanitizado submetido, captura e SHA-256; conteúdo permanece dado não confiável. |
| Auditoria → achado | `audit_findings.case_id`; `metadata.checkId` | Resultado das regras selecionadas, sem certificação universal. |
| Achado → evidência | `audit_findings.metadata.evidenceIds` e `metadata.sha256` | Serviço valida IDs, mesmo caso e hash. O campo legado `audit_evidences.finding_id` não é a única autoridade dessa relação. |
| Relatório → auditoria/evidências/achados | `audit_reports.case_id`, `content` com IDs/referências; `metadata.contentSha256` | Exportação canônica verifica integridade e conserva referências. |
| Execução/revisão → estado | Eventos, resultados e revisão nos metadados do caso | Registros do workflow; não são telemetria completa de agentes externos nem aprovação independente da release. |

O gateway projeta nós Audit/Evidence/Finding/Report e relações `HAS_EVIDENCE`, `HAS_FINDING`, `SUPPORTED_BY`, `REPORTS_ON`. São referências, **não causalidade**. Não cria graph database, memória autônoma ou inferência de causa raiz. Relações adicionais de projeto, alvo e execução externa exigem origem autorizada e contrato antes de serem declaradas.

## Persistência, idempotência e execução

Cada transição usa `BEGIN/COMMIT/ROLLBACK`, SQL parametrizado, `statement_timeout` e `lock_timeout`. O intake adquire `pg_advisory_xact_lock` pelo `requestId` e compara hash canônico do corpo/ator; repetição compatível reutiliza o caso e conflito de conteúdo é recusado. O caso é bloqueado durante transições e leituras sensíveis.

As duas verificações atuais operam sobre um único arquivo limitado, sem busca de URL ou execução de código. A transação e a máquina de estados cobrem o fluxo síncrono; não existe obrigação técnica demonstrada de introduzir uma fila. Caso surjam tarefas externas demoradas, avaliar job/outbox, cancelamento, retry idempotente e autorização antes de executar; isso permanece planejamento.

## Logs e observabilidade

`artifacts/api-server/src/auditTelemetry.ts` emite eventos enumerados, resultado, faixas de duração e contadores sintéticos. Não inclui corpos, cookies, tokens, URLs, IPs ou identificadores de pessoa/caso. Contadores em memória e alerta local de falhas não comprovam disponibilidade histórica, SLA ou entrega de alerta a um responsável.

O entrypoint `artifacts/api-server/src/audit-pilot.ts` emite códigos fixos em falhas de banco/listener/inicialização. O gateway devolve erros delimitados sem stack ou mensagens arbitrárias do banco. Essa avaliação cobre a fronteira dedicada; não certifica todos os logs de módulos legados ou do provedor. Retenção e acesso ao destino de logs precisam de decisão operacional antes de dados reais.

## Retenção, revogação e exclusão

| Dado | Comportamento comprovável pelo código | Pendência operacional |
| --- | --- | --- |
| Intake comercial sintético | `0004_omnix_commercial_intake.sql` define expiração em **14 dias**. Inbox/ACK ignoram expirados. `purgeExpired` remove somente registros sintéticos expirados do destinatário autorizado. | Purge é manual e autenticado; não há scheduler automático. Expirar não equivale a apagar linhas ou backups. |
| Sessão de prévia | `omnixPreview.ts`: 30 minutos, uma sessão ativa por identidade de teste, remoção no logout/expiração consultada. | Sessões em memória; reinício encerra o acesso. Não é SSO de cliente. |
| Identidade empresarial | `enterpriseIdentity.ts`: token de no máximo 900 segundos; store revalida sessão, usuário, associação e delegação. Convite dura 1 dia; delegação, 7 dias; há revogação de sessão individual/todas, associação, convite e delegação. | Expiração/revogação bloqueiam acesso subsequente; registros SQL de identidade/eventos não têm purge ou retenção automática implementados. |
| Caso, evidência, achado e relatório | Retidos sem prazo de exclusão automática no fluxo atual. Grants do piloto restringem exclusão; hashes protegem detecção de alteração, não substituem política de retenção. | **STOP para dados de clientes** até aprovação de prazo, base de tratamento, solicitação de exclusão, permissões de execução e cobertura de backups/logs. |
| Dumps, arquivos de teste e backups | Ferramentas mantêm artefatos privados para inspeção; exclusão automática não é declarada. | Nomear responsável e janela de guarda/descarte, incluindo cópias restauradas e chaves. |

O prazo de 7 dias de uma delegação ou de um ensaio não é uma política geral de retenção. Não alterar silenciosamente o prazo comercial de 14 dias nem anunciar eliminação automática inexistente.

## Backup e recuperação

`deploy/self-hosted/encrypted-backup.mjs` usa OpenSSL CMS AuthEnvelopedData/AES-256-GCM, destinatário próprio do backup, limites de arquivo e escrita exclusiva. A chave de teste é separada das chaves TLS e não é montada na API. Falha de autenticação não grava plaintext no destino solicitado; erros são códigos delimitados.

`encrypted-backup.test.mjs` cobre roundtrip, adulteração, substituição CBC, destinatário/chave incorretos, limites e falhas. `deploy/self-hosted/verify.mjs` liga o dump à restauração em outro banco e compara tabelas, hashes e relatório preservando a origem. A matriz de execução é a autoridade para resultados/commit; presença dos testes não comprova ensaio concluído. O ensaio nativo atualizado está pendente nesta consolidação, assim como recuperação do banco remoto alvo.

O harness sintético mantém também dump/plaintext autenticado e chave local para inspeção. Criptografia do módulo não comprova guarda externa, rotação, custódia independente, backup agendado, descarte seguro, RPO ou RTO. Esses itens exigem responsáveis, procedimento e evidência próprios antes de clientes.

## Responsabilidades e gates

| Função | Situação atual |
| --- | --- |
| Decisão empresarial/infraestrutura | Proprietário da XPeX Systems AI, conta GitHub `xpex-systems-ai`, sujeito à confirmação de titularidade e permissões por projeto. Isso não o designa automaticamente como atendente de suporte ou operador de plantão. |
| Engenharia e preparação de evidências | Codex prepara código, testes sintéticos e documentação na branch; não concede aprovação humana a seu próprio trabalho. |
| Revisor técnico independente | **NÃO DESIGNADO**. Aceite de segurança/release permanece bloqueado até identificação, revisão do commit e manifestação humana válida. |
| Operação do banco, custódia/recuperação de chaves e execução de retenção | Responsáveis operacionais ainda precisam ser nomeados e demonstrar acesso apropriado. |
| Recebimento comercial/suporte | Destinatário técnico configurável no backend não prova pessoa disponível ou entrega humana. Nomear responsável e testar recebimento sem dados reais. |

Antes da abertura a clientes: consolidar checks e evidências do commit, validar identidade/TLS e restore no alvo, designar revisão independente, aprovar retenção/exclusão e suporte, confirmar escopos/titularidade dos provedores e autorizar a ativação específica. Não fazer merge, deploy de produção ou publicar plugin/MCP automaticamente.
