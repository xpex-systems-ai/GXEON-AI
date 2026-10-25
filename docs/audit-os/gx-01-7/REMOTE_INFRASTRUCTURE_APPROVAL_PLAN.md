# GX-01.7 — proposta de homologação remota

PLANEJADO/BLOCKED; nenhum recurso criado. Projeto isolado, novo ambiente de homologação sem clientes/finanças. Owner xpex-systems-ai é responsável proposto, sujeito à confirmação de titularidade/permissões. Reviewer nominal ainda não designado. Não selecionar automaticamente um dos projetos externos existentes.

Sequência após aprovação específica: confirmar titular e projeto/conta/região/limites; aprovar orçamentoA; aprovar secret delivery por canal seguro e permissões; build imutável do SHA aprovado; provisionar API dedicada audit-pilot.mjs, frontend e PG separado; migração aditiva revisada; TLS HTTP e PG com CA/rejectUnauthorized, rede restrita, origens exatas; health/readiness; testes negativos de token/origem/payload/role; fluxo testData até CLOSED e download real; restore em destino separado; logs redigidos; rollback documentado; revisão humana.

| Item de aprovação | Proposta | Estado |
|---|---|---|
| Frontend |Vercel dedicado, sem religar domínio existente |PENDENTE |
| API/PG |Railway dedicado, rede privada quando suportada |PENDENTE; acesso conta não comprovado |
| Orçamento |USD40–70/30dias para homologação limitada; cap alvo70 com alertas/stop operacional |PENDENTE; não hard cap contratado |
| Retenção |somente fixtures; logs redigidos, backup/restauração medidos |PENDENTE |
| Saída |sem clientes externos até parecer e autorização de piloto |OBRIGATÓRIO |

Rollback após aprovação: retirar rota/feature do projeto novo e revogar credenciais próprias; restaurar artefato conhecido, banco em destino separado. Não excluir projetos/volumes/dumps e não executar rollback destrutivo. Definir dono e janela antes de deploy. Custos e impostos reais NOT VERIFIED. [Modelo A/B](../../omnix-ai/gx-01-7/INFRASTRUCTURE_AND_COMMERCIAL_COST_MODEL.md). Plano não concede autorização operacional.
