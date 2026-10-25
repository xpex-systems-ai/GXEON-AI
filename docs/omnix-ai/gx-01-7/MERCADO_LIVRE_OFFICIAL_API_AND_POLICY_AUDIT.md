# GX-01.7 — auditoria oficial API e políticas Mercado Livre

**BLOCKED — POLICY OR EVIDENCE GAP.** Consulta24/10/2026 local (25/10UTC). Pesquisa oficial indexada retornou trechos; abertura integral das páginas abaixo retornouHTTP403. Isso permite registrar documentação candidata, **não verificar termos integrais nem autorizar tratamento/redistribuição/IA/comercialização**. Não contornamos403, não autenticamos vendedor e não criamos app/conta. Nenhum endpoint de comércio foi chamado. Ausência de cláusula no trecho não implica permissão.

| Tema | Fonte oficial / condição de acesso | Conclusão e próximo gate |
|---|---|---|
| Termos de uso/desenvolvedor |[Termos](https://developers.mercadolivre.com.br/pt_br/termos-e-condicoes), integral403; trecho indexado |NOT VERIFIED integral; validar versão, obrigações, uso/retenção/dados derivados/terceiros/IA com jurídico |
| App/credenciais |[Criar aplicação](https://developers.mercadolivre.com.br/pt_br/realizacao-de-testes/crie-uma-aplicacao-no-mercado-livre), indexado somente |DOCUMENTADO parcial; conta/titular/elegibilidade/config e ambiente de teste NOT VERIFIED |
| OAuth/consentimento |[Autenticação](https://developers.mercadolivre.com.br/autenticacao-e-autorizacao), integral403 |trecho indica AuthorizationCode/PKCE/redirect exato/refresh; validar fluxo completo, usar expires_in, tratar rotação/revogação sem assumirTTL |
| Escopos/funcionalidades |[In-house](https://developers.mercadolivre.com.br/desenvolvimento-in-house) e [permissões](https://developers.mercadolivre.com.br/pt_br/permissoes-funcionais/), integral403 |grupos Read/Write/Offline indexados; escolher apenas leitura necessária após validar por app, sem finance/orders/messages noMVP |
| Listagens/atributos |[Publicação](https://developers.mercadolivre.com.br/pt_br/pt_br/publicacao-de-produtos), indexado |campos e limites dependem de categoria/site; endpoints/contratos concretos NOT VERIFIED em app |
| Catálogo |[Catálogo](https://developers.mercadolivre.com.br/pt_br/publicacao-no-catalogo), integral403 |não confundir anúncio do vendedor, item e produto de catálogo; regras UserProducts/site precisam validação |
| Estoque/variações |publicação/catálogo acima |somente leitura candidata de campos; consistência/semântica e permissões NOT VERIFIED; nenhuma escrita |
| Métricas |[Experiência de compra](https://developers.mercadolivre.com.br/pt_br/experiencia-de-compra), indexado |IA do próprio Meli/recomendações do provedor não autorizam IA externa; métricas comerciais fora do MVP |
| Rate limits/erros |[Boas práticas](https://developers.mercadolivre.com.br/produto-receba-notificacoes/boas-praticas-para-usar-a-plataforma), indexado |usarAPI,429/backoff; nenhum limite universal inventado; quotas por endpoint/app NOT VERIFIED |
| Webhooks |[Notificações](https://developers.mercadolivre.com.br/pt_br/descricao-de-produtos/produto-receba-notificacoes), indexado |documenta evento+GET e retries; assinatura/validação atual NOT VERIFIED. MVP manual sem webhooks |
| Revogação/refresh |autenticação acima |tratar invalid_grant/403 e parar; método de revogação/eliminação conforme docs integrais ainda NOT VERIFIED |
| Derivados/agregados |Termos integrais403 |NOT VERIFIED direitos sobre estatísticas, persistência, redistribuição, benchmarking ou treino; bloqueado para oferta |
| Terceiros/modelos IA |Termos integrais403 |NOT VERIFIED transferência/processamento em fornecedor/modelo; **IA externa off**; consentimento isolado não supera termos |
| Dados pessoais/privacidade |Termos403; [LGPD oficial](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) aberta |documentar papéis, base legal, minimização, direitos, transferências e contratos; não declarar conformidade jurídica automática |
| Publicação/certificação/partners |[Developer Partner Program](https://developers.mercadolivre.com.br/pt_br/developer-partner-program), integral403 |NOT VERIFIED elegibilidade/processo/requisitos; não afirmar certificado/parceiro |
| Marketing/badges/marca |[Manual de medalhas](https://developers.mercadolivre.com.br/pt_br/manual-de-uso-de-medalhas), integral403 |uso de marca/medalha/endorsement bloqueado até regra/aprovação comprovadas |
| Testes/test users |criar aplicação acima, índice parcial |NOT VERIFIED regras atuais e limites; nenhum usuário/test account criado |
| MCP do provedor |[Server MCP](https://developers.mercadolivre.com.br/pt_br/server-mcp), integral403 |existência documental parcial; não conectado/testado, não transfere autorização do vendedor |

Registro de acesso e lacunas: [source-ledger.json](evidence/source-ledger.json). Fonte indexada é primária parcial, sem reprodução extensa de trechos. Nenhuma cláusula numérica foi inventada. A proposta pode restringir coleta ao mínimo, mas essa restrição não resolve autorização jurídica ausente.

Para fechar: owner/jurídico obterem versão integral oficial com data/URL, preservar hash e parecer por finalidade; confirmar app/escopos, métodos e termos para processamento terceirizado/LLM/derivados/retenção/marketing; testar em ambiente oficialmente permitido com autorização específica; registrar resultados sem segredos/PII. Se proibir uso proposto, reduzir escopo ou bloquear; não operar por scraping. Até lá não há integração, comercialização desse agente ou compartilhamento de dados comIA.
