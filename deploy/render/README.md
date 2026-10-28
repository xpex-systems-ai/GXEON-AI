# OMNIX / Render — candidato GX030

Estado: **BLOCKED para ativação**. Este diretório adapta o runtime existente; não provisiona recursos. Não há URL OMNIX Render confirmada. A PR #456 continua em rascunho. Não usar códigos de teste como identidade de clientes.

## O que foi implementado

- Dockerfile Node24 fixado por digest, build filtrado da API/dashboard existentes, usuário `node`, limite de heap de 256MB no runtime. Sem banco ou dados no filesystem efêmero.
- Modo `render` explícito; porta `PORT`, bind `0.0.0.0`, frontend compilado, HTTPS na borda do provedor. `trust proxy=false`; Host exato; cabeçalhos encaminhados não concedem autoridade.
- Cookies HttpOnly/Secure/SameSite=Strict, origem exata e POST JSON/CSRF preservados pelo portal existente. Sem novos endpoints administrativos, proxy aberto ou fallback HTML de API.
- `/api/healthz` consulta a mesma prontidão SQL, cache de 5s, um probe por vez; concorrentes falham temporariamente com 503. A exceção de Host nesse GET serve apenas ao health local/provedor e não devolve dados.
- Pré-flight somente leitura `release-guard.mjs`: consulta a revisão real da PR #456, exige commit exato, estado APPROVED, humano designado diferente do autor e associação ao repositório. Testes usam fixtures explicitamente sintéticas.

As variáveis de revisão no runtime são **configuração**, não prova independente de aprovação. O operador deve executar o pré-flight contra GitHub e guardar o recibo antes de ativar. Controlar o ambiente também permite alterar a configuração; este mecanismo não substitui proteção de branch, titularidade ou revisão humana.

## Banco: bloqueio determinante

O contrato atual continua exigindo `gx01_pilot_app`, `gx01_pilot`, PG17, grants mínimos, DNS exclusivamente privado, CA explícita, `rejectUnauthorized=true`, SNI e verificação do hostname original. Nenhuma dessas garantias foi removida.

[Render documenta](https://render.com/docs/postgresql-creating-connecting) que a conexão interna usa certificado autossinado e não oferece verify-ca/full. Não existe neste pacote uma CA/identidade Render verificada. Copiar o certificado apresentado e confiar nele sem comprovação não resolve a autenticação inicial.

Rotas para decisão:

| Rota | Resultado atual | Próxima prova necessária |
| --- | --- | --- |
| Interna padrão Render | Incompatível com o contrato atual | Cadeia e hostname autenticados por fonte confiável; ainda não disponíveis |
| Externa Render com TLS gerenciado | Candidata, não implementada/aceita | Revisar mudança de isolamento e DNS, identidade/SNI, ACL de origem e teste negativo de CA/hostname |
| PostgreSQL já autorizado com CA/host privados | Nenhum destino compatível identificado | Host, titularidade, rede autorizada e CA confiável; não enviar segredo no chat |
| Infraestrutura própria com pacote self-hosted | Testada localmente e em CI | Servidor remoto identificado, backup externo e revisão operacional |

GX-03.0 §6 exige revisão humana independente e aprovação explícita para mudar confiança/autenticação TLS. A criação Free é condicional à compatibilidade; por isso não foi iniciado o prazo de expiração de um banco sem integração segura. Não há recurso OMNIX criado nem alteração na Academy.

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
