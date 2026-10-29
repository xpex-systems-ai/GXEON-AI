# GX-05.0 — identidade web empresarial candidata

Estado: implementação de Authorization Code/PKCE com BFF sobre o motor e o store de identidade existentes. Sem provedor real configurado ou aceito, **não declarar SSO, recuperação ou MFA operacionais**. `customerDataAllowed=false`; organizações e casos continuam sujeitos ao gate sintético. Nenhuma senha de pessoa é recebida ou gerida pelo OMNIX.

## Implementação e contrato

`enterpriseBrowserConfig.ts` carrega configuração opt-in; ausência de `GXEON_OMNIX_BROWSER_ENABLED=true` mantém o fluxo desligado. `enterpriseBrowser.ts` utiliza `openid-client` **6.8.8**, publicado em2026-09-05, sem reduzir a idade mínima de dependências. O cliente aplica descoberta OIDC do issuer fixo, Authorization Code, PKCE S256, state, nonce, autenticação confidencial client_secret_basic e validação JWS explícita do ID token. Não há protocolo OAuth escrito manualmente nem grant de senha/implicit/refresh no OMNIX.

A descoberta deve retornar exatamente issuer, authorization endpoint, token endpoint e JWKS configurados. Endpoints precisam de HTTPS e mesma origem do issuer; apenas descoberta/token/JWKS fixos podem ser consultados. Transporte recusa redirects, limita cada operação a5segundos e cada resposta a64KB. Não usa host/issuer/JWKS vindos de prompt, callback, token ou usuário. RS256 é o algoritmo de ID token permitido. Além do ID token, o access token passa pelo verificador empresarial existente e deve ter issuer/sub compatíveis.

O contrato existente da API exige JWT de acesso RS256 `typ=at+jwt`, audiência única exata, `iss/sub/aud/iat/exp/jti`, vida máxima900segundos, `omnix:access`, scopes OMNIX e assurance configurada. Não aceitar ID token como access token nem relaxar esse contrato para acomodar defaults de um fornecedor. A autorização efetiva continua no PostgreSQL: usuário ativo, JTI não revogado, organização/associação/delegação e scopes por solicitação. Claims de papel/organização não concedem acesso.

## Sessões e CSRF

Transações de login duram no máximo5minutos, são limitadas em memória e consumidas uma única vez antes da troca do código. Cookie de binding `__Secure-omnix-login`: Secure, HttpOnly, host-only, Path=/api/, SameSite=Lax. State, nonce, verifier PKCE e convite opcional ficam apenas no servidor. Lax permite o retorno GET de navegação do IdP; não autoriza APIs.

Após sucesso, o servidor gera novo identificador aleatório opaco de256bits e mantém o access token em memória. Cookie `__Secure-omnix-session`: Secure, HttpOnly, host-only, Path=/api/, SameSite=Strict. Não há Domain, JWT no cookie, localStorage/sessionStorage, token em JSON ou refresh persistido. A sessão expira no menor prazo entre ID token, access token e15minutos. Até1024sessões e128transações pendentes por processo; reinício perde os handles locais e exige novo login. Não anunciar sessões compartilhadas entre instâncias, armazenamento distribuído, logout do IdP ou alta disponibilidade inexistentes.

O middleware converte somente seu cookie opaco em bearer interno para os routers existentes. Cada utilização verifica novamente o JWT e usuário/JTI/organizações SQL; as rotas canônicas revalidam o alvo e o papel antes de agir. Pedido com cookie e Authorization explícitos é recusado. APIs com cookie exigem Origin exato ou Sec-Fetch-Site=same-origin; POST exige também Origin exato e JSON sem compressão. Cookies Strict e o controle de origem protegem a escrita; não existe autoridade em query, Host ou ID de organização enviado pelo browser. O header da organização apenas seleciona um alvo já autorizado.

Rotas sob `/api/omnix-enterprise/browser`:

| Método/caminho | Contrato |
| --- | --- |
| GET `/status` | Configuração/modo, sem tokens nem afirmação de aceite do IdP. Sem configuração, a aplicação central deve expor estado desabilitado. |
| POST `/login` | JSON vazio ou `invitationToken` opaco. Retorna apenas `authorizationUrl` no issuer fixo; o portal navega para essa URL. Não aceita returnTo, issuer, papel ou organização. |
| GET `/callback` | Binding/state/nonce/PKCE, código e ID token assinados; destino final fixo `/omnix?identity=enterprise`. A query escolhe a interface, sem conceder acesso. |
| GET `/session` | userId, expiração, organizações obtidas no SQL; principal somente quando um header de organização autorizado for selecionado. Sem bearer ou tokens. |
| POST `/logout` | Revoga JTI no store existente e descarta sessão/cookie. `all:true` também aplica o cutoff SQL e remove handles locais desse usuário. Não encerra sessão global do IdP. |
| GET `/recovery` | Link fixo para recuperação gerida pelo IdP, somente se configurado/aprovado; ausência devolve503. OMNIX não cria senha/reset token. |

Respostas e logs usam códigos delimitados; tokens, códigos OAuth, verifier, nonce e client secret não devem ser registrados. O callback usa Referrer-Policy=no-referrer e redireciona para URL fixa sem parâmetros OAuth. Operador/reverse proxy deve desabilitar logs de query no callback antes de uso real; o módulo não comprova a configuração de logs do provedor.

## Convites, recuperação e primeiro administrador

O administrador já autorizado emite convite pelo store/rota existentes e entrega por canal humano autorizado. O usuário pode informá-lo no início do login; o servidor o mantém na transação, valida o IdP e chama `acceptInvitation`. O e-mail deve ser verificado e vinculado ao mesmo issuer/sub. Quando a claim existe apenas no ID token assinado, ela pode fornecer o hash exclusivamente para a checagem do convite; não fornece papéis ou escopos. Validade, uso único, revogação, grantor ainda ativo e papel limitado continuam no store canônico. Não há inscrição livre como admin nem convite privilegiado para owner/admin.

O primeiro owner precisa de bootstrap administrativo **offline e auditável**, feito por operador autorizado depois de verificar o issuer/sub pela administração do IdP. Não existe endpoint público de bootstrap nem regra “primeiro login vira administrador”. A ferramenta/procedimento de bootstrap, titularidade e operação precisam da revisão da entrega; presença desta documentação não prova que o bootstrap foi executado. Não inserir identidades sintéticas como se fossem pessoas reais.

O arquivo candidato `deploy/enterprise/bootstrap-owner.example.sql` prepara essa operação administrativa; **não foi executado remotamente**. Não é migração de produção nem startup hook. Exige conexão do próprio dono dedicado `gx01_pilot_owner` ao banco `gx01_pilot`, que também precisa possuir o banco; o papel da aplicação não passa esse guard e continua sem INSERT em organizações. A transação usa lock de organização e recusa organização/nome/membership preexistentes, inclusive replay, além de usuário desativado. Só insere uma organização sintética e sua primeira associação owner; não promove associação existente.

Parâmetros obrigatórios de psql: `verified_issuer`, `verified_subject`, `organization_id`, `organization_name`, `human_approval_reference`. Confirmar issuer/sub e permissão da pessoa em administração confiável do IdP antes da aplicação; não extraí-los de token não validado, prompt ou simples e-mail. O owner deve confirmar a referência humana fora do script: um argumento/variável não prova aprovação. Usar `psql --no-psqlrc --set=ON_ERROR_STOP=1 --file=deploy/enterprise/bootstrap-owner.example.sql` somente após fornecer os cinco parâmetros por mecanismo privado aprovado, sem eco de comandos e com autenticação de banco fora dos argumentos. Os nomes acima não são valores padrão ou credenciais. Não passar token, senha ou chave por argumento/variável do bootstrap nem executar esse arquivo pela aplicação ou CI pública.

O psql usa substituição quoted-literal `:'nome'`, sem SQL dinâmico para entradas. O recibo pós-COMMIT contém somente UUIDs, data, referência humana e limites; não imprime issuer/sub nem forja evento de login. Guardar esse recibo em evidência administrativa privada. O arquivo não cria tabela de produto, não reduz grants nem verifica consentimento humano automaticamente. Identidade/JTI ainda passam pelo verificador e SQL em cada login/pedido. Prova em banco isolado e revisão do operador são exigidas antes de tratar o procedimento como validado.

Recuperação, matrícula MFA e provas de acesso perdido pertencem ao IdP e à operação responsável. `GXEON_OMNIX_PROVIDER_RECOVERY_URL` precisa ser um link HTTPS específico e previamente validado na origem do issuer. Link configurado não prova jornada funcional; executar perda/recuperação/MFA com responsável antes de aceitar clientes. `GXEON_OMNIX_OIDC_REQUIRE_MFA` e ACR existentes continuam verificados no token de acesso; não converter a presença de um botão em prova de MFA.

## Configuração — somente nomes

`GXEON_OMNIX_BROWSER_ENABLED`, `GXEON_OMNIX_BROWSER_ORIGIN`, `GXEON_OMNIX_OIDC_CLIENT_ID`, `GXEON_OMNIX_OIDC_CLIENT_SECRET`, `GXEON_OMNIX_OIDC_AUTHORIZATION_ENDPOINT`, `GXEON_OMNIX_OIDC_TOKEN_ENDPOINT`, opcional `GXEON_OMNIX_PROVIDER_RECOVERY_URL`. Os nomes `GXEON_OMNIX_ENTERPRISE_ENABLED`, `GXEON_OMNIX_OIDC_ISSUER`, `GXEON_OMNIX_OIDC_JWKS_URI`, `GXEON_OMNIX_OIDC_AUDIENCE`, `GXEON_OMNIX_OIDC_REQUIRE_MFA` e `GXEON_OMNIX_OIDC_REQUIRED_ACR` pertencem ao verificador reutilizado. Client secret é somente servidor/secret file conforme carregador central, nunca variável pública ou bundle frontend.

Redirect registrado no IdP deve ser exatamente a origem HTTPS aprovada mais `/api/omnix-enterprise/browser/callback`. Wildcards, HTTP, IP literal, localhost, credenciais na URL, query/hash de callback e redirects livres são recusados. URL de retorno é derivada da mesma origem.

O runtime exige que essa origem seja a primeira de `GXEON_AUDIT_ALLOWED_ORIGINS`, usada também pelas mutações de inbox. Origens adicionais não podem substituir a origem canônica da sessão. O client secret não pode ser reutilizado como token de operador, revisor ou proxy comercial/lead.

Keycloak e Auth0 são **candidatos a compatibilidade OIDC**, sem conta/provedor contratado, alterado ou validado nesta implementação. Keycloak documenta Authorization Code e PKCE S256; Auth0 documenta perfil RFC9068. Isso não garante que suas configurações padrão emitam o contrato de acesso OMNIX, audiência, scopes ou MFA necessários. Conferir token profile/claim mapping, audiência padrão da API, período900s, endpoints, client_secret_basic, assurance e e-mail verificado antes de selecionar um provedor. Se o IdP não satisfizer o contrato, permanecer bloqueado e revisar uma adaptação explícita; não contornar o verificador. Nenhum plano pago está autorizado por esta documentação.

## Verificação

`auditEnterpriseBrowser.test.ts` usa servidor HTTP OIDC real em loopback para descoberta, autorização, token e JWKS; assina ID/access JWTs de teste e exige a prova PKCE no endpoint. Só o transporte injetado no teste mapeia URLs HTTPS fixas de fixture para esse servidor. Produção não permite HTTP, allowInsecureRequests ou bypass TLS. SQL usa PGlite local ou banco PG17 novo sob guard de loopback; não migra nem apaga banco remoto/compartilhado.

Cobertura: state antes do token exchange, binding/replay, nonce, assinatura, audiência/expiração dos dois tokens, MFA, PKCE, endpoint hostil, origem errada, cookie+bearer ambíguos, organização incorreta, revogação SQL de membership/JTI, convite, logout e expiração. Resultado real deve constar no recibo da execução; teste de protocolo local não é login de pessoa, aceite de IdP remoto, recuperação/MFA reais ou liberação de dados.

Fontes primárias consultadas: [openid-client](https://github.com/panva/openid-client), [Authorization Code OIDC](https://github.com/panva/openid-client/blob/main/examples/oidc.ts), [JWS explícito](https://github.com/panva/openid-client/blob/main/docs/functions/enableNonRepudiationChecks.md), [RFC9068](https://www.rfc-editor.org/rfc/rfc9068.html), [Keycloak OIDC](https://www.keycloak.org/securing-apps/oidc-layers), [Auth0 perfil de acesso](https://support.auth0.com/center/s/article/receive-the-client-id-claim-instead-of-the-azp-claim-in-an-auth0-access-token).
