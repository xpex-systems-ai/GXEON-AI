# OMNIX / Render — candidato GX040

Estado: **BLOCKED para ativação**. Este diretório adapta o runtime existente; não provisiona recursos. Não há URL OMNIX Render confirmada. A PR #456 continua em rascunho. Não usar códigos de teste como identidade de clientes.

## O que foi implementado

- Dockerfile Node24 fixado por digest, build filtrado da API/dashboard existentes, usuário `node`, limite de heap de 256MB no runtime. Sem banco ou dados no filesystem efêmero.
- Modo `render` explícito; porta `PORT`, bind `0.0.0.0`, frontend compilado, HTTPS na borda do provedor. `trust proxy=false`; Host exato; cabeçalhos encaminhados não concedem autoridade.
- Cookies HttpOnly/Secure/SameSite=Strict, origem exata e POST JSON/CSRF preservados pelo portal existente. Sem novos endpoints administrativos, proxy aberto ou fallback HTML de API.
- `/api/healthz` consulta a mesma prontidão SQL, cache de 5s, um probe por vez; concorrentes falham temporariamente com 503. A exceção de Host nesse GET serve apenas ao health local/provedor e não devolve dados.
- Pré-flight somente leitura `release-guard.mjs`: consulta a revisão real da PR #456, exige commit exato, estado APPROVED, humano designado diferente do autor e associação ao repositório. Testes usam fixtures explicitamente sintéticas.

As variáveis de revisão no runtime são **configuração**, não prova independente de aprovação. O operador deve executar o pré-flight contra GitHub e guardar o recibo antes de ativar. Controlar o ambiente também permite alterar a configuração; este mecanismo não substitui proteção de branch, titularidade ou revisão humana.

## Banco: bloqueio determinante

O perfil padrão continua exigindo `gx01_pilot_app`, `gx01_pilot`, PG17, grants mínimos, DNS exclusivamente privado, CA explícita, `rejectUnauthorized=true`, SNI e verificação do hostname original. GX040 adiciona um perfil externo candidato, desligado por padrão, sujeito a revisão própria. Ele altera o isolamento de rede; não é aceitação de segurança nem prova de um endpoint real.

[Render documenta](https://render.com/docs/postgresql-creating-connecting) que a conexão interna usa certificado autossinado e não oferece verify-ca/full. Não existe neste pacote uma CA/identidade Render verificada. Copiar o certificado apresentado e confiar nele sem comprovação não resolve a autenticação inicial.

Rotas para decisão:

| Rota | Resultado atual | Próxima prova necessária |
| --- | --- | --- |
| Interna padrão Render | Incompatível com o contrato atual | Cadeia e hostname autenticados por fonte confiável; ainda não disponíveis |
| A — Externa Render com TLS gerenciado | Perfil implementado e testes negativos locais; sem banco real/aceite | Revisão independente do modelo, certificado real, DNS/SNI, ACL restrita ao egress aprovado e grants PG17 |
| B — PostgreSQL gerenciado externo já autorizado | Nenhum destino compatível identificado | Host, titularidade, rede autorizada e CA confiável; não enviar segredo no chat |
| C — Infraestrutura própria com pacote self-hosted | Fluxo local e CI já demonstrados; backup cifrado ampliado no GX040 | Servidor remoto identificado, cópia de backup externa, revisão operacional e novo recibo do SHA final |
| D — Outro caminho seguro comprovado | NÃO COMPROVADO | Proposta concreta com custo, rede, confiança, isolamento e revisão; nenhum provedor substituto contratado |

GX-03.0 §6 exige revisão humana independente e aprovação explícita para mudar confiança/autenticação TLS. A criação Free é condicional à compatibilidade; por isso não foi iniciado o prazo de expiração de um banco sem integração segura. Não há recurso OMNIX criado nem alteração na Academy.

### Perfil externo candidato

`GXEON_AUDIT_DATABASE_NETWORK=render-external-public-ca` aceita somente modo Render e hostname público Oregon `dpg-…-a.oregon-postgres.render.com` explicitamente igual a `GXEON_AUDIT_DATABASE_HOST`, porta 5432. Rejeita CA substituta, query de conexão, redes privadas/reservadas/documentação/multicast e respostas DNS mistas. Pina o IP validado e conserva SNI/hostname originais. A cadeia usa exclusivamente as raízes públicas incluídas no Node; nenhum certificado apresentado é copiado como confiança. O perfil privado permanece padrão.

O pré-flight `node deploy/render/release-guard.mjs --database` exige revisão GitHub real, humana, independente, no SHA exato, com a linha `GX040_DATABASE_EXTERNAL_MODEL_ACCEPTED`. Nomes: `GXEON_AUDIT_DATABASE_REVIEW_COMMIT`, `GXEON_AUDIT_DATABASE_REVIEW_REFERENCE`, `GXEON_AUDIT_DATABASE_REVIEWER`. O recibo continua `databaseTlsAccepted=false` e `deploymentAuthorized=false`: aceitação do modelo não verifica um banco ainda inexistente. Não preencher IDs com fixtures.

Render documenta ACL externa inicialmente ampla. **Não usar 0.0.0.0/0 para ativar o candidato**: confirmar egress real, restringir CIDRs e testar negação da origem indevida antes de qualquer dado. Ainda faltam hostname/cadeia/ACL/latência/custo observados de uma instância concreta; nenhum desses gates foi convertido em aprovado por variável de ambiente.

## Conta e custo observados em 2026-10-28

Workspace `tea-d720q2qa214c73dkifo0` / My Workspace: Hobby, sem cartão; UI mostrava 0,25/750 horas, 4/25 serviços, 0MB/5GB de tráfego e 0/500 minutos de pipeline. Os quatro serviços Free Academy compartilham franquias. PostgreSQL disponível: versão 17 selecionável, Free 256MB/0,1CPU/1GB, total US$0, autoscaling/HA desligados. Nada submetido.

[Limites Free](https://render.com/docs/free): o banco expira em 30 dias, sem backup gerenciado; web dorme após 15 minutos e tem disco efêmero. Sem cartão, esgotamento das franquias resulta em suspensão, podendo afetar Academy. Não configurar keep-alive artificial nem auto-deploy contínuo. Não foi alterada cobrança ou limite financeiro.

Referência paga, **não autorizada/contratada**: [preços oficiais](https://render.com/pricing) indicam web a partir de US$7/mês e PG a partir de US$6/mês, mais armazenamento aplicável (US$0,30/GB). Reservar ao menos US$13,30/mês para uma hipótese com 1GB, antes de impostos/tráfego/build; confirmar a cobrança do primeiro GB no orçamento final. Pagar não resolve por si só o bloqueio TLS, revisão, identidade empresarial ou recuperação. Não é cotação de uma instalação já considerada segura.

## Pré-flight para o operador, depois da revisão

1. Designar revisor independente; revisar o diff, cookies/origens/Host, terminação TLS e a rota do banco. Registrar separadamente a aceitação da identidade do banco.
2. No commit final, o humano registra na PR #456 uma revisão APPROVED com linha `GX030_RENDER_INGRESS_ACCEPTED`, identificando o escopo aceito. A linha só se aplica ao ingress; não libera banco nem clientes reais.
3. Executar `node deploy/render/release-guard.mjs`. Sem revisor/referência real o comando falha fechado. Não copiar IDs das fixtures.
4. Revalidar plano/franquias e inventário antes de criar recursos exclusivamente Free. Nomes candidatos: `omnix-api` e `omnix-pg`; região Oregon é candidata por proximidade aos serviços existentes. Não adicionar à produção Academy. Auto-deploy: `no`.
5. Somente após resolver o banco, inicializar schema existente e papel mínimo por canal administrativo autorizado; usar segredos nativos, nunca o usuário owner na API. Não executar migração destrutiva.
6. Deploy manual do SHA revisado; health path `/api/healthz`; verificar URL alocada, TLS público, status, contratos, login sintético, isolamento, upload/checks, revisão distinta, export, reinício e restore remoto. Liveness/build isolados não são E2E.
7. Só adicionar link corporativo após essa comprovação; manter `customerDataAllowed=false` até fechamento dos gates de cliente.

Variáveis necessárias (nomes, sem credenciais): `NODE_ENV`, `PORT`, `DATABASE_URL`, `GXEON_AUDIT_PILOT_ENABLED`, `GXEON_AUDIT_DB_PROVIDER`, `GXEON_AUDIT_DEPLOYMENT_MODE`, `GXEON_AUDIT_DATABASE_HOST`, `GXEON_AUDIT_DATABASE_TLS_CA`, `GXEON_AUDIT_BIND_HOST`, `GXEON_AUDIT_FRONTEND_ROOT`, `GXEON_AUDIT_ALLOWED_ORIGINS`, `GXEON_AUDIT_OPERATOR_TOKEN`, `GXEON_AUDIT_REVIEWER_TOKEN`, `GXEON_AUDIT_WRITE_MODE`, `GXEON_AUDIT_ALLOW_DB_WRITES`, `GXEON_AUDIT_AUTO_RUN_MISSION_006`, `GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL`, `GXEON_OMNIX_PREVIEW_ENABLED`, `GXEON_OMNIX_PREVIEW_IDENTITIES`, `GXEON_AUDIT_RENDER_REVIEW_COMMIT`, `GXEON_AUDIT_RENDER_REVIEW_REFERENCE`. Pré-flight: `GXEON_AUDIT_RENDER_REVIEWER`, opcional `GITHUB_TOKEN` somente leitura. Render fornece `RENDER`, `RENDER_SERVICE_ID`, `RENDER_EXTERNAL_URL`, `RENDER_EXTERNAL_HOSTNAME`, `RENDER_GIT_COMMIT`. Arquivos secretos já suportados no self-hosted continuam disponíveis.

Nenhum comando deste guia autoriza plano pago, abertura de cliente, merge ou produção corporativa.
