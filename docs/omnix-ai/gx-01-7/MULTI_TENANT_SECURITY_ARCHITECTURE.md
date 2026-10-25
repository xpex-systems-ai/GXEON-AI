# GX-01.7 — segurança multiempresa alvo

**PLANEJADO. Não implementado/homologado pelo Audit OS atual.** Tokens globais operator/reviewer não identificam usuário, empresa ou vendedor e não devem servir ao produto multi-tenant. Reutilizar apenas padrões de evidência e contratos após revisão.

Modelo futuro: Users nominais; Organizations; Memberships(role,status,version); ProviderConnections(org,subject,providerAccount,scope,consent,revocation); AgentRuns; Evidence; Reports; AuditEvents. OrganizationId vem da sessão+membership validada no servidor, nunca apenas de argumento do modelo/querystring. Ator deve ter papel e permissão por recurso/conta/finalidade em toda leitura/exportação/tarefa. Owner é admin da própriaorg, não de outros tenants; reviewer tem ação de review, não privilégio universal.

| Controle proposto | Implementação alvo / teste de aceite futuro |
|---|---|
| Identidade e sessão |IdP/OIDC, MFA para admins, expiração, revogação, sessão protegida; validariss/aud/exp; testar membership removida e tokenantigo |
| Consentimento |associar fornecedor/conta/escopos/finalidade/data/versão, provar titularidade da conta; remoção bloqueia jobs e novas coletas |
| Vault |access/refresh criptografados no servidor, chave fora doDB, acesso mínimo por serviço; rotação atômica/lock e replay rejeitado; nunca retornar segredos ao frontend/modelo |
| Banco/objetos/cache |tenant keys em toda entidade e FK composta; RLS defense-in-depth se escolhido; transação seta contexto seguro; chavescache/paths/links segregados; testes cruzadosA/B em todos os recursos |
| Jobs/exports |org imutável nojob, revalidar consentimento ao executar e exportar; assinatura/duração curta se storage URL; revoke cancela pendentes; sem IDOR |
| Logs/audit |actor/org/ação/recurso/policyversion/trace/outcome sem token/payloadPII; append-only restrito; acesso/retention separados por finalidade |
| Quotas |limites por tenant/conta/endpoint; retrybudget com backoff; sem starvation;429 não vira sucesso |
| Incidentes |revogar conexão/credenciais, preservar evidência com acesso restrito, acionar humano e processo de direitos/notificação conforme parecer |
| Retenção/direitos |TTL por classe acordado, deleção operacional e backups conforme política jurídica, exportação do titular validada; não prometer eliminação imediata de toda cópia semmedição |

Threat model futuro: atorA referencia objetoB; membership revogada comjob ativo; refreshconcurrent; OAuthstate reutilizado; prompt injection em título de anúncio pede exfiltração; MCPscope amplo; export URL vaza; cache misturaorg; falha de logging expõe token. Tratar conteúdo do provedor como dado não confiável, ferramentas allowlisted, sem shell/URL livre. Bloquear por padrão e registrar negação semvazar existência de outrotenant.

Dados pessoais, contratos de operador/controlador, localização/subprocessadores, base legal e transferência internacional exigem jurídico. Não afirmarLGPDcompliant, SOC2, isolamento/RLS implementado ou autorização ML. Gates e testes deste documento pertencem à próxima implementação aprovada.
