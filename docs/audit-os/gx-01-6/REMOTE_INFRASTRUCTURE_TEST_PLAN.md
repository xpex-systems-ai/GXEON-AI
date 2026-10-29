# GX-01.6 — homologação remota proposta

**BLOCKED — AUTHORIZATION REQUIRED.** Opção B preservada: frontend Vercel dedicado, API Railway dedicada, PostgreSQL17 privado dedicado. Nenhuma provisão, DNS, link de source, mudança de env ou deploy foi executado. Revisão read-only do inventário não autoriza alterações. Railway requer reautenticação do conector nesta consulta; não foram solicitadas credenciais.

Plano revisável, a executar somente após autorização humana de projeto/scope/região/plano/limite/duração:

| Passo | Operação proposta | Critério e evidência | Risco/reversão |
|---|---|---|---|
| Identificar | Confirmar conta titular, scope+projectId e acesso mínimo em cada provider; escolher recursos novos dedicados | Decisão nominal do proprietário, IDs e ambiente de homologação | Homônimos não autorizam reutilizar projetos antigos |
| Provisionar | Uma réplica API, um PG17 persistente privado, frontend separado, sem pagamento/conectores adicionais | PG version, IDs, configuração e custo aprovado | Provisionamento gera custo. Sem aprovação não executar |
| Credenciais | Segregar dono de migração de gx01_pilot_app e operator/reviewer; fornecer apenas nomes em documentação | Secret store, rotação/revogação, nomes auditados; sem valores | Interromper se segredo aparecer; revogar por procedimento humano |
| Banco | Aplicar schema dedicado não destrutivo, grants mínimos e sem memberships/ownership de app | SELECT de versão/current_user/ACL; prova de negação UPDATE/DELETE/elevated roles | Sem migração destrutiva; backup prévio; divergência para o teste |
| TLS/rede | Private hostname Railway, TLS com CA confiável/hostname verificado; sem TCP público | Handshake real, CA chain/hostname/negativos e config sem bypass | Se PG privado não fornecer certificado válido, BLOCKED; nunca rejectUnauthorized=false |
| API | Build SHA revisado, start dedicado, env habilitação explícita, origin exata; writes inicialmente disabled | Boundary, health/ready, JSON404 proibidos, wrong auth, payload/CORS/limits | Sem start legado; readiness falha fecha tráfego; owner decide rollback |
| Frontend | Homologação estática apontando somente backend aprovado via VITE_API_BASE_URL ou rewrite aprovado | UI→API→PG→download real, sem fallback HTML em /api | Destino/saída revisados antes de alterar projeto; nenhum preview prova API |
| Falhas | Parar SOMENTE API/PG de homologação, restaurar dump em banco novo | Relatório CLOSED/id/hash igual após volta; RPO/RTO medidos | Janela/custo aprovados; nunca parar instâncias compartilhadas |
| Encerrar | Desabilitar escritas e preservar evidências; rollback do release de homologação conforme autorização | Registro nominal e custo real no fim | Exclusão/revogação/transferência são decisões específicas, não automáticas |

Variáveis somente pelos nomes: NODE_ENV, PORT, DATABASE_URL, GXEON_AUDIT_PILOT_ENABLED, GXEON_AUDIT_DB_PROVIDER, GXEON_AUDIT_ALLOWED_ORIGINS, GXEON_AUDIT_DATABASE_TLS_CA, GXEON_AUDIT_OPERATOR_TOKEN, GXEON_AUDIT_REVIEWER_TOKEN, GXEON_AUDIT_WRITE_MODE, GXEON_AUDIT_ALLOW_DB_WRITES, GXEON_AUDIT_AUTO_RUN_MISSION_006, GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL, VITE_API_BASE_URL. Estágio local usa também GXEON_AUDIT_STAGING, GXEON_STAGING_CONTROL_TOKEN, GXEON_STAGING_INSTANCE e GXEON_STAGING_PG_BIN, que não pertencem à configuração remota proposta.

Fontes de desenho: [rede privada Railway](https://docs.railway.com/networking/private-networking), [blueprint anterior](../gx-01-5/DEDICATED_INFRASTRUCTURE_BLUEPRINT.md). Documentação de provider é requisito de desenho, não evidência de ambiente homologado.
