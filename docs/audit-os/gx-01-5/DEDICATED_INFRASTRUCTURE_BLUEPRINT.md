# Ambiente dedicado — Opção B

GX-01.5 · 2026-10-21 · PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT · integração main · estado global **BLOCKED**. Implementação e testes não equivalem a aprovação humana ou autorização de deploy.

## Estado e fronteiras

**IMPLEMENTADO/TESTADO localmente:** entrypoint audit-pilot separado, factory HTTP com contratos existentes, atestação PG17/role/grants, autenticação por papel, fronteira de imports, recuperação isolada. **PROPOSTO, não implantado:** Vercel dedicado → HTTPS Railway Node24 dedicado → rede privada Railway → PG17 gx01_pilot. Nenhum projeto, domínio, serviço ou assinatura foi criado/reconfigurado.

~~~mermaid
flowchart LR
  A[Operador autorizado / dados sintéticos] --> F[Vercel: dashboard estático dedicado]
  F -->|HTTPS / Bearer / origem exata| B[Railway: audit-pilot.mjs]
  B -->|TLS validado / rede privada| D[PG17 gx01_pilot / gx01_pilot_app]
  D --> E[Evidências / achados / relatório JSON com hashes]
~~~

Os nomes e IDs finais precisam de autorização do titular. A matriz de projetos existentes não autoriza reaproveitá-los. O frontend contém outros módulos do dashboard: apenas /audit-os pertence ao escopo aprovado; a API dedicada responde 404 aos demais módulos. Não anunciar o dashboard inteiro como produto homologado.

## Exemplos reproduzíveis, sem aplicação automática

[Vercel](../../../deploy/audit-pilot/vercel.example.json), [Railway](../../../deploy/audit-pilot/railway.example.json), [backend](../../../deploy/audit-pilot/backend.env.example), [frontend](../../../deploy/audit-pilot/frontend.env.example), [grants](../../../deploy/audit-pilot/grants.example.sql) são modelos; caminhos a partir da raiz do repositório: deploy/audit-pilot/. Selecionar manualmente arquivo de configuração, raiz do repo e Node24/pnpm10.28.1 após autorização. Não copiar exemplos para configurações ativas durante esta missão.

Vercel: raiz do monorepo; build do dashboard existente; output artifacts/gxeon-dashboard/dist/public; BASE_PATH=/; fallback SPA exclui /api e /api/*, que não podem retornar index.html. VITE_GXEON_API_BASE_URL deve conter somente a origem HTTPS real da API. Não adicionar tokens, DATABASE_URL ou SUPABASE_SERVICE_ROLE_KEY a VITE_*. A UI mantém credencial de sessão em memória, envia Bearer com credentials:omit e trata loading, vazio, falhas HTTP e contrato inválido. Permanece pendente homologação visual remota e download.

Railway: start:audit-pilot, jamais start/index.mjs ou auditStagingServer.ts. O candidato exige NODE_ENV=production, habilitação explícita, provider postgres, tokens distintos de 43–128 caracteres, ambos autorunners false, par de flags de escrita consistente (default disabled/false), 1–5 origens HTTPS exatas e URI sem parâmetros. A API escuta PORT fornecido pela plataforma. Liveness público /api/healthz só existe após atestação; readiness /api/readyz exige papel válido e consulta SELECT 1. Falhas respondem JSON sanitizado. Não há acesso financeiro, integrações, egress de checks nem controle de staging no grafo retido.

PG17: banco NOVO gx01_pilot, owner/migrador separado da aplicação gx01_pilot_app. Aplicar somente a migração existente lib/db/drizzle/0002_audit_os_schema.sql depois de revisão e autorização. Aplicação recebe CONNECT/USAGE; SELECT/INSERT nas cinco tabelas e UPDATE somente audit_cases; sem CREATE/DELETE/TRUNCATE/TRIGGER, superuser, bypassRLS ou ownership. Sem endpoint TCP público. DATABASE_URL deve usar hostname *.railway.internal. TLS rejectUnauthorized=true e CA opcional; não há downgrade. **BLOCKED remoto:** cert/CA/SAN, TLS efetivo do PG, DNS privado, ausência de exposição pública e grants reais ainda não foram verificados. Se o serviço padrão não suportar esse contrato, preparar solução TLS revisada; não desativar validação.

## Operação e limites propostos

Uma réplica API, pool4, role limit8, statement_timeout5s, connectionTimeout5s, idle30s, JSON32KiB, request15s/header10s/keepalive5s, drain10s. API inicial 0.5GiB/1vCPU; PG 0.5GiB/1vCPU, volume1GiB, sem autoscale: alvos a configurar e medir, não limites aplicados ou capacidade comprovada. Falta homologar rate limiting e carga; manter acesso interno e volume manual reduzido. Cache-Control:no-store, nosniff, referrer no-referrer; CORS não substitui auth. Logs somente requestId gerado, categoria fixa, método permitido e status. Proibir logs de headers/body/query/URI/env. Monitorar liveness, readiness autorizado, 5xx, memória, conexão e disco; retenção proposta7dias sem conteúdo sensível. Nenhuma observabilidade paga ativada.

Rollback: congelar escritas, preservar backup e evidências, confirmar hashes, voltar artefato conhecido e suas variáveis de ambiente sem reverter schema destrutivamente; validar auth/readiness/export. Schema incompatível exige restore em banco novo e mudança de conexão autorizada. [Runbook](BACKUP_RESTORE_RUNBOOK.md). [Custos](PILOT_COST_AND_CAPACITY.md).

Evidências: [grafo retido](evidence/pilot-build-boundary.json), [validação local](evidence/local-validation.json), [CI do candidato](evidence/ci-validation.json). O entrypoint com transporte Railway não foi iniciado contra serviço remoto: configuração atestada por testes não prova implantação.

## Variáveis e versão do builder

O exemplo backend fixa RAILPACK_NODE_VERSION=24, pois o package.json raiz fixa pnpm mas não Node. [Resolução oficial do Railpack](https://railpack.com/languages/node/). O valor é configuração pública de build, sem alterar conta externa. Nomes necessários: NODE_ENV, PORT, RAILPACK_NODE_VERSION, DATABASE_URL, GXEON_AUDIT_PILOT_ENABLED, GXEON_AUDIT_DB_PROVIDER, GXEON_AUDIT_WRITE_MODE, GXEON_AUDIT_ALLOW_DB_WRITES, GXEON_AUDIT_OPERATOR_TOKEN, GXEON_AUDIT_REVIEWER_TOKEN, GXEON_AUDIT_ALLOWED_ORIGINS, GXEON_AUDIT_AUTO_RUN_MISSION_006, GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL; GXEON_AUDIT_DATABASE_TLS_CA quando requerido. Frontend público: VITE_GXEON_API_BASE_URL. Valores privados não são fornecidos neste pacote.
