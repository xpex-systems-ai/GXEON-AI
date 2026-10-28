# GX040 — identidade empresarial e autorização

Implementação opt-in em `enterpriseIdentity*.ts`, sem outro motor ou tabela de auditoria. Estado: código para validação; **não é identidade empresarial implantada nem CUSTOMER SAFE**. O portal sintético existente permanece separado. Não foi criado provedor, cliente OAuth, usuário real ou conta paga.

## Contrato implementado

- Token de acesso JWT verificado por `jose`6.2.13, biblioteca de padrões JOSE; nenhuma senha ou criptografia proprietária de login. Issuer e audience exatos, RS256, header `typ=at+jwt`, claims obrigatórios, exp/iat/jti e duração máxima15min. Tokens para outras audiences/issuers, ID tokens e headers de chaves controlados pelo cliente são recusados.
- JWKS configurado no servidor, HTTPS e mesma origem do issuer, timeout5s/cooldown30s/cache5min. O token não escolhe chave/endereço remoto. Não há opção de aceitar certificado desconhecido ou desabilitar TLS.
- MFA exige claim `amr` com `mfa` por padrão; ACR exato pode ser exigido. Isso valida declaração assinada do provedor, não prova de enrollment real. O provedor selecionado deve suportar esse perfil e ser validado antes da ativação.
- Usuário vinculado por issuer+sub, UUID interno, memberships por organização e papéis `owner/admin/operator/reviewer/reader`. Claims role/organization e conteúdo de prompt não concedem autoridade. Seleção `X-Omnix-Organization-Id` é validada no SQL em cada pedido.
- Owner/admin gerem convites/delegações, sem direito implícito de executar/revisar auditoria. Operator mantém restrição aos próprios casos; reviewer consulta a organização. Projeção reviewer para leitores/admin/delegações só é usada por operações de leitura; mutações verificam papel real e scopes.
- Convite de24h, token opaco aleatório armazenado só por hash, consumo único em transação e vínculo ao email verificado pelo provedor (somente hash no banco). Não envia email automaticamente nem cria owner/admin pela API. Autoridade ativa do remetente é revalidada ao aceitar. Conta desativada ou membership preexistente não é reativada silenciosamente.
- Delegação concedida pelo cliente a uma organização agency, somente scopes de leitura, validade7dias. Requer membership ativa da agência e delegação/organizações ativas a cada pedido; revogação bloqueia novas consultas. Não dá acesso a outros clientes.
- Registro de sessões JWT por hash de jti. Logout revoga a sessão; revogar todas atualiza corte de emissão. Membership/delegação/session não são armazenadas em cache entre pedidos. Pedidos já autorizados em andamento não são cancelados automaticamente.
- Eventos privados de autenticação/transição sem token, email, segredo ou corpo de arquivo. Limites de60pedidos/minuto e4concorrentes na rota, JSON16KB, origens exatas e erros fixos.

`customerDataAllowed=false` permanece; organizações da migração exigem `test_data=true`. Auditorias reutilizam `createAuditWorkflowService.forActor`, os checks reais e seu fluxo de revisão/export. Não há recuperação de senha local, browser SSO/PKCE, cadastro público ou afirmação de MFA operacional. Recuperação, enrollment, sessão de navegador e suporte dependem do provedor confiável e da integração ainda a configurar.

## Persistência e bootstrap

Migração aditiva `lib/db/drizzle/0003_omnix_enterprise_identity.sql`: organizações, usuários, memberships, convites, delegações, sessões e eventos. Nenhum `DROP`, alteração de tabelas existentes ou migrador automático em produção. Aplicar em banco isolado selecionado e testar antes de autorizar rollout. O primeiro owner e organização só podem ser vinculados administrativamente após verificar issuer/sub/titularidade; não existe bootstrap público ou primeiro usuário que se torna admin.

Necessidades de grants da aplicação: SELECT em organizations/users/memberships/invitations/delegations/sessions; INSERT em users/memberships/invitations/delegations/sessions/events; UPDATE somente users.revoked_before, memberships.revoked_at, invitations.accepted_at/revoked_at, delegations.revoked_at, sessions.revoked_at. Eventos precisam somente INSERT no runtime. Sem DELETE/TRUNCATE, criação de papéis ou privilégios de owner. Organizações e primeiro owner são do canal administrativo separado.

Os scopes comerciais `omnix:commercial:read` e `omnix:commercial:ack` só podem ser concedidos a owner/admin, nunca por delegação de agência. O módulo comercial ainda verifica destinatário/organização configurados no servidor; ter um scope de inbox não concede acesso ao inbox de qualquer cliente.

## Variáveis (somente nomes)

`GXEON_OMNIX_ENTERPRISE_ENABLED`, `GXEON_OMNIX_OIDC_ISSUER`, `GXEON_OMNIX_OIDC_JWKS_URI`, `GXEON_OMNIX_OIDC_AUDIENCE`, `GXEON_OMNIX_OIDC_REQUIRE_MFA`, `GXEON_OMNIX_OIDC_REQUIRED_ACR`. Sem configuração, não ativar o módulo. TLS do PostgreSQL continua sendo o contrato do runtime canônico, não é relaxado por esta integração.

## Distribuição e limites

`resolveEnterpriseRequest(authorization, organizationId, dependencies)` fornece principal derivado do token+SQL e serviço canônico escopado. Adaptadores MCP/conversacionais devem invocá-lo por pedido, nunca aceitar principal/org como autoridade do prompt. Relatório embute evidência: exige scopes de auditoria+evidência+relatório. Nunca expor um `forActor` sem o middleware que fixa os scopes/papel real.

Fontes primárias consultadas: [jose](https://github.com/panva/jose), [jwtVerify](https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md), [JWKS remoto](https://github.com/panva/jose/blob/main/docs/jwks/remote/functions/createRemoteJWKSet.md). Versão6.2.13 publicada no registry npm em2026-10-20, preservando a política de idade1440min.

Testes `auditEnterpriseIdentity.test.ts`: claims/assinatura JOSE, convites de email verificado, consumo único/expiração/revogação, mudanças de papéis sem autoaprovação, permissões entre organizações, agência delegada somente leitura, revogação de membership/delegação/sessão, fluxo sintético no motor canônico. Sem variável de integração usa PGlite; com `TEST_AUDIT_DATABASE_URL` da CI exige loopback/gx01_test e cria um banco novo e exclusivo para aplicar as migrações sem alterar o banco de origem ou executar DROP. Isto não é teste de IdP/infraestrutura remota.
