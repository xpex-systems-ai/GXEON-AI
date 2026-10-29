# GX-05.0 — gates da primeira operação com cliente

**Estado: BLOCKED para cliente real, primeiro contrato e receita.** A engenharia preparou código e testes sintéticos; não configurou um IdP real, destinatário comercial aprovado, PostgreSQL remoto durável ou ambiente produtivo. Nenhum contrato, assinatura, pagamento, entrega humana ou faturamento foi comprovado nesta execução. Não houve outreach comercial.

Este documento registra pendências operacionais verificáveis. Não concede aprovação humana, compra, migração remota, merge ou deploy de produção. A PR #456 permanece em rascunho até a decisão autorizada. Identidades, convites e recibos dos testes não representam pessoas ou clientes reais.

## 1. Identidade e responsável institucional

O fundador indicou a conta GitHub `xpex-systems-ai` como responsável pelas decisões de projetos, sujeita à confirmação de titularidade e permissões. Isso não fornece automaticamente issuer/sub do IdP, acesso a billing, papel de owner em todos os recursos ou permissão de uso dos dados de um cliente.

Para selecionar e habilitar identidade, ainda faltam valores institucionais verificados para os parâmetros abaixo. Registrar somente nomes/referências em documentos públicos; segredos usam o mecanismo privado aprovado.

| Parâmetro | Confirmação exigida |
|---|---|
| `GXEON_OMNIX_ENTERPRISE_ENABLED` | Aprovação da identidade empresarial e configuração completa; ausente/desligado mantém o recurso fechado |
| `GXEON_OMNIX_OIDC_ISSUER` | Issuer HTTPS exato administrado pelo provedor aprovado |
| `GXEON_OMNIX_OIDC_AUDIENCE` | Identificador exato da API OMNIX, sem audiência substituta |
| `GXEON_OMNIX_OIDC_JWKS_URI` | JWKS HTTPS fixo na origem do issuer, com cadeia TLS válida |
| `GXEON_OMNIX_OIDC_REQUIRE_MFA` | Manter a exigência de MFA; testar matrícula e claim assinada efetiva |
| `GXEON_OMNIX_OIDC_REQUIRED_ACR` | ACR aprovado quando exigido pelo processo de assurance |
| `GXEON_OMNIX_BROWSER_ENABLED` | Opt-in somente após registro do cliente confidencial e revisão |
| `GXEON_OMNIX_BROWSER_ORIGIN` | Origem HTTPS pública exata e autorizada do portal/API |
| `GXEON_OMNIX_OIDC_CLIENT_ID` | Aplicação confidencial registrada no IdP e audiência correta |
| `GXEON_OMNIX_OIDC_CLIENT_SECRET_FILE` | Arquivo privado no servidor; nunca VITE, browser, log, argumento público ou documento |
| `GXEON_OMNIX_OIDC_AUTHORIZATION_ENDPOINT` | Endpoint de autorização HTTPS fixo, confirmado por descoberta OIDC |
| `GXEON_OMNIX_OIDC_TOKEN_ENDPOINT` | Endpoint de token HTTPS fixo, `client_secret_basic`, PKCE S256 |
| `GXEON_OMNIX_PROVIDER_RECOVERY_URL` | URL institucional específica na origem do issuer; teste real de recuperação ainda necessário |

Callback a registrar exatamente: `{GXEON_OMNIX_BROWSER_ORIGIN}/api/omnix-enterprise/browser/callback`. Retorno do produto: `{GXEON_OMNIX_BROWSER_ORIGIN}/omnix?identity=enterprise`. São formatos derivados de configuração aprovada, não URLs de ambiente já publicado.

O provedor deve emitir o contrato aceito pelo verificador existente: RS256, access token `typ=at+jwt`, audience exata, issuer/sub compatíveis, JTI, scopes autorizados e validade de no máximo 900s. Descoberta/authorize/token/JWKS precisam corresponder aos endpoints configurados; state, nonce e PKCE devem ser validados. [IDENTITY.md](IDENTITY.md) contém o contrato e os limites atuais. Compatibilidade planejada com um provedor não equivale a conta criada ou jornada real validada.

O primeiro owner depende de bootstrap administrativo offline após verificar issuer/sub e autoridade da pessoa no IdP. Parâmetros: `verified_issuer`, `verified_subject`, `organization_id`, `organization_name`, `human_approval_reference`. O script preparado em `deploy/enterprise/bootstrap-owner.example.sql` não deve receber valores inventados, tokens ou senhas, nem executar como aplicação/CI pública. Cada pedido continua sujeito ao JWT e aos vínculos SQL ativos. Testar login, convite, MFA, recuperação, logout, revogação, conta desabilitada e isolamento com o operador antes de liberar clientes.

## 2. Revisão independente e aceite de segurança

**Revisor técnico humano independente: ainda não designado.** Codex não assume essa função. Um principal de teste distinto não é aprovação humana independente.

O responsável precisa indicar pessoa autorizada, escopo, conta GitHub e decisão no SHA final. Revisar diff, BFF/OIDC, cookies/origens, autorizações, grants, privacidade, evidências, patches de dependências e modelo de conexão do banco. O pacote [SECURITY_REVIEW_PACKAGE.md](SECURITY_REVIEW_PACKAGE.md) registra os pontos para essa análise. Falhas globais de dependências e limitações não podem ser removidas do resultado para produzir um aceite fictício.

O release guard consulta a revisão real e não converte variável de ambiente em aprovação. Ingress e identidade/rede do PostgreSQL são decisões separadas. O perfil externo candidato exige revisão humana própria e prova do endpoint concreto. Não reduzir TLS, aceitar cadeia desconhecida, copiar certificado apresentado como confiança inicial, desabilitar hostname/SNI ou substituir `verify-full` por `require` para fazer o teste passar. A [documentação Render de conexão](https://render.com/docs/postgresql-creating-connecting) descreve limitações de TLS interno; ela não fornece uma exceção ao contrato de segurança do produto.

## 3. Destinatário, privacidade e entrada de leads

Nenhum canal real é semeado pela migration0005. O destinatário deve existir no banco canônico como usuário ativo e owner/admin da organização correta; o runtime verifica o vínculo atual. O papel da aplicação somente lê a configuração de canal e não pode aprovar a si próprio.

Antes da abertura, aprovar e preservar referências efetivas do fundador, destinatário, privacidade, banco durável e proteção institucional contra abuso, com modo e validade explícitos. O aviso específico deve identificar controlador efetivo, finalidade/base legal avaliada, contato para direitos, retenção, descarte e processo de incidentes. Código, checkbox e consentimento não certificam conformidade.

Configuração backend separada: `GXEON_OMNIX_LEAD_ENABLED`, `GXEON_OMNIX_LEAD_MODE`, `GXEON_OMNIX_LEAD_CHANNEL_ID`, `GXEON_OMNIX_LEAD_TOKEN_FILE`. Proxy: `OMNIX_LEAD_ENABLED`, `OMNIX_LEAD_MODE`, `OMNIX_LEAD_BACKEND_ORIGIN`, `OMNIX_LEAD_PUBLIC_ORIGIN`, `OMNIX_LEAD_PROXY_TOKEN`. Token exclusivo de servidor não abre inbox nem concede autoridade de usuário. Origem/URL são fixadas no servidor; Host, headers encaminhados e payload não escolhem destino.

O proxy confirma prontidão antes de ler o corpo de contato. O backend repete os gates nas mutações e só emite recibo depois de COMMIT. QUEUED significa persistência aguardando confirmação do responsável; ACK é um registro por identidade autorizada e não prova leitura humana. Sem aprovação, formulário desabilitado e HTTP503. Entrada comercial aceita somente contato/necessidade geral, sem arquivos, credenciais, configuração ou dados financeiros. **Lead real não libera auditoria real:** `auditCustomerDataAllowed=false` continua explícito e a admissão de dados técnicos de clientes permanece bloqueada.

Retenção proposta no código: leads expiram em 30 dias; purge autenticado verifica zero expirados e persiste recibo SQL sem nomes/e-mails/IDs de leads excluídos. Não há scheduler. Antes de ativar modo real, definir responsável/frequência do purge e cobertura de backups/logs. Documentos contratuais e comprovantes exigem arquivo institucional aprovado, com política própria; esse arquivo ainda não está demonstrado.

## 4. Banco durável, rede e recuperação

Ainda falta selecionar e validar um destino real segregado do restante do ecossistema: host/região, titularidade, PostgreSQL17, CA/hostname/SNI, ACL, origem autorizada, papel mínimo e capacidade. Não reutilizar banco de outro produto nem credencial financeira. Aplicar migrations aditivas e grants somente no banco autorizado, com backup e revisão; não executar migração destrutiva.

O caminho próprio/self-hosted continua disponível como candidato, mas servidor remoto, endereço, sistema operacional, domínio e forma de acesso autorizada ainda precisam ser identificados e testados. Existência de pacote portátil ou confirmação genérica de acesso não demonstra um host operando.

Para Render, o perfil de banco externo público é somente candidato; requer cadeia pública válida, hostname aprovado, ACL restrita ao egress efetivo e prova negativa de acesso indevido. O perfil privado conserva sua própria confiança/DNS. Não abrir `0.0.0.0/0`, trocar perfil automaticamente ou usar confiança TLS relaxada para contornar incompatibilidade.

[Render Free Postgres expira em 30 dias e não oferece backups gerenciados](https://render.com/docs/free#free-postgres). Não atende o gate de persistência durável de cliente. Não iniciar sua expiração enquanto não houver um caminho operacional seguro. Instância paga também exige validação de rede, identidade, acesso e recuperação; pagamento por infraestrutura não é aceite de segurança.

Antes do primeiro dado de cliente, executar no destino autorizado: schema/grants mínimos, escrita/transação, leitura isolada por usuário/organização, negações de autorização, backup CMS autenticado, chave sob custódia separada, restauração em banco **novo**, comparação de hashes e reinício com persistência. Definir retenção, cópia fora do host, RPO/RTO, suporte e incidente. Prova local com CA de teste não é restore remoto ou recuperação após perda do servidor.

## 5. Render: observação desta rodada e custo ainda não aprovado

Observação do executor principal em **2026-10-29 UTC (2026-10-28 em São Paulo)**: consultas read-only do conector retornaram **quatro serviços Academy classificados Free e nenhum PostgreSQL** no escopo consultado. As datas de atualização dos quatro serviços permaneciam em 2026-09-08. Nenhum projeto Academy foi alterado, reaproveitado, transferido ou republicado por esta entrega. Esse inventário não comprova a franquia disponível, cobrança, teto de gasto ou todos os recursos fora do escopo visível.

Falhas observadas de ferramentas de interface impediram a leitura de billing: acesso à aba IAB indisponível (`browser.user unavailable`); tentativa de aba Edge com timeout de navegação, depois timeout de leitura e reset do kernel. Isso comprova limitação da ferramenta; **não comprova sessão expirada, falta de login, situação financeira ou configuração da conta**. Não houve escrita de recursos para tentar resolver o erro.

Os números de plano, consumo, cartão e franquias registrados em GX030/GX040 são **históricos**. Não tratá-los como saldo, limites ou autorização vigente. A consulta pública de preços também não autentica o billing da conta.

Referência indicativa de compute consultada nesta rodada nos [preços oficiais Render](https://render.com/pricing): web 512MB/0,5CPU a US$7/mês e PostgreSQL 256MB/0,1CPU a US$6/mês, total base de **US$13/mês**. A página indica 1GB incluído; confirmar sua aplicação ao plano/conta e eventual expansão. Se houver cobrança adicional de 1GB a US$0,30, um envelope conservador de referência seria **US$13,30/mês**. Não é uma cotação aceita, compra executada ou teto rígido. Valores excluem impostos, tráfego, build, backup externo, IdP, suporte e recursos adicionais. Confirmar todos os componentes no orçamento final antes de contratar.

Para decidir infraestrutura, ainda é necessário: plano e titularidade reais, franquias compartilhadas com Academy, preço/armazenamento aplicáveis, período do ambiente, recursos separados, responsável por faturamento, teto autorizado e mecanismo efetivo de controle/alerta/interrupção. O conector consultado não expôs esses dados de billing; a interface não pôde validá-los. Não assumir que alerta, orçamento nominal ou autorização anterior de outro provedor corresponde a hard cap Render.

## 6. Primeiro contrato, entrega e pagamento

O pacote comercial em `xpex-systems-ai/docs/omnix-ai/gx-05-0/CONTRACT_PACK.md` é uma minuta para aprovação do fundador. R$490 permanece hipótese interna; prazo, escopo, suporte, impostos e condições precisam de decisão efetiva. Nenhuma proposta foi enviada, contrato obtido ou receita gerada por esta execução.

Estados preparados: `leadReceived`, `proposalPrepared`, `contractSigned`, `accessAuthorized`, `auditInReview`, `reportDelivered`, `clientAccepted`, `paymentConfirmed`. Somente o registro persistido de um contato pode iniciar `leadReceived`, depois dos gates. Os demais exigem evidências escopadas e revisão humana autorizada. O runtime desta entrega não configura resolver real de evidências comerciais: avanços posteriores permanecem HTTP503. Um boolean de assinatura/pagamento ou fixture de testes não preenche o gate.

Não ativar Stripe, movimentar fundos, enviar outreach, contatar parceiros ou publicar promessa de primeiro contrato/receita. A recomendação permanece **BLOCKED PARA OPERAÇÃO REAL** até IdP/recuperação, revisor independente, destinatário/privacidade, banco/restore e orçamento/controle efetivo serem comprovados e aprovados no SHA final.
