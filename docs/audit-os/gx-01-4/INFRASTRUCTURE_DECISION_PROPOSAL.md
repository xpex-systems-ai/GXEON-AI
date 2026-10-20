# GX-01.4 — proposta de infraestrutura oficial

**Proposta para xpex-systems-ai; nenhuma mudança externa autorizada.** Identidades em [matriz canônica](CANONICAL_INFRASTRUCTURE_MATRIX.md). Não foram criados recursos, migrados dados, alterados DNS ou configurados projetos.

| Critério | A — reutilização comprovada | B — ambiente dedicado GX-01 |
| --- | --- | --- |
| Desenho | Frontend existente e API existente somente após prova de isolamento, runtime e compatibilidade | Frontend específico, API Node GXEON-AI e PostgreSQL 17 separados logicamente, com credenciais próprias |
| Candidato | Vercel/gxeon/prj_owdXFSlvK1GBrWVuYCqeHpTlYjP4 como frontend; gxeo/gxeon-ai-a apenas candidatos backend por root, detalhes 403 | Projeto frontend específico em conta confirmada; API artifacts/api-server e PostgreSQL em novo projeto/ambiente Railway após autorização |
| Segurança | Risco de herdar grants, dados, segredos e autorunners; isolamento ainda não comprovado | Menor raio de impacto proposto; banco/credenciais próprios e acesso restrito, sem funções financeiras |
| Simplicidade | Menos provisionamento se compatibilidade existir; hoje não há API GX-01 reutilizável comprovada | Mais configuração inicial, uma identidade por componente; preserva Vite/Express/PostgreSQL |
| Manutenção | Acoplamento potencial a outros módulos/repositórios | SHA explícito, rollback de artefato, retenção e backup/restore a definir |
| Risco operacional | Alto até resolver duplicidade, 403 e output/runtime divergentes | Menor interferência com produção existente; ainda depende de implementação e homologação autorizadas |
| Escalabilidade | Limites/contas/conexões não verificados | Uma réplica inicialmente; limites de conexão/dados; expansão só após medir, sem SLA enterprise comprovado |
| Contas bloqueadas | 21 contextos bloqueados; cinco projetos junior-senas com 403 | Não depender desses escopos; confirmar contas acessíveis e seus planos antes de criar recursos |
| Credenciais | Avaliar escopo e rotação específica; não copiar produção | Novas credenciais de teste para operador/revisor/DB, privadas; nenhuma criada nesta fase |
| Piloto | Impedido pela ausência de backend compatível comprovado | Aprovar desenho/orçamento, implementar isolamento, homologar fluxo/download e obter revisão independente |

## Preço confirmado versus estimativa

Consulta pública em 2026-10-20, USD, antes de impostos/câmbio; não confirma plano/fatura da conta:
- [Vercel Pricing](https://vercel.com/pricing): Pro publicado a US$20/mês, developer seat US$20/mês, US$20 de crédito de uso incluído. Não somar crédito como desconto adicional. [Hobby](https://vercel.com/docs/plans/hobby) é para uso pessoal não comercial, portanto gratuidade não foi presumida para OMNIX AI.
- [Railway Pricing](https://railway.com/pricing): Pro com mínimo US$20 de uso/mês e US$20 de crédito incluído; excedente adicional. Hobby com mínimo US$5 e perfil individual, sem adequação enterprise presumida.

Cenário A: caso ambos os planos Pro precisem ser contratados, piso público combinado US$40/mês; estimativa de orçamento US$40–70/mês com um developer seat, uma réplica, frontend estático e baixo tráfego sintético. Se planos/créditos já existirem, incremento pode ser menor, mas não foi comprovado. Investigação e correções não foram precificadas.

Cenário B: mesmo piso condicional US$40/mês e estimativa US$40–70/mês, sem adicionar planos de conta se o workspace permitir projetos isolados. Premissas de orçamento, não medições: até 730h/mês, API até 0,25 GB RAM, PostgreSQL até 0,5 GB RAM, volume 1 GB e tráfego baixo. Backups, retenção, egress, builds, proteção de acesso e assentos adicionais podem elevar o total. Confirmar cotação e uso/limites antes de autorizar; não há teto garantido nem contratação realizada.

## Recomendação técnica

Recomendar **B, dedicado, condicionado à aprovação**. Nenhuma API GX-01 compatível foi demonstrada no inventário acessível. Railway existente pertence a outros repositórios e o banco atende outro fluxo. B reduz risco de interferência e investigação de configurações legadas; não há prova de que A tenha menor custo total. Reavaliar A somente com evidência de compatibilidade, isolamento e permissão. Preview estático verde não prova API.

## Especificação a aprovar

1. Confirmar conta/scope/projectId, plano, orçamento/limite, retenção, responsável e rollback. B não tem IDs criados.
2. Frontend: root monorepo; build PORT=3000 BASE_PATH=/ pnpm --filter @workspace/gxeon-dashboard run build; output artifacts/gxeon-dashboard/dist/public. VITE_* sem segredos. Definir proxy confiável da API na mesma origem ou CORS restrito e homologado; o proxy Vite de desenvolvimento não configura produção.
3. API: Node 24, build pnpm --filter @workspace/api-zod run build && pnpm --filter @workspace/api-server run build; start pnpm --filter @workspace/api-server run start; health /api/healthz. Comandos existem no repo; API completa importa outros módulos e precisa de análise da superfície antes de exposição. Não publicar servidor de testes.
4. PostgreSQL 17 exclusivo de teste, papel app mínimo sem superuser/CREATE/DELETE/UPDATE em evidências, migração existente revisada em banco novo e backup/restore provado. Não usar postgres-17 de outro módulo nem copiar dados.
5. Nomes: DATABASE_URL, NODE_ENV, PORT, GXEON_AUDIT_OPERATOR_TOKEN, GXEON_AUDIT_REVIEWER_TOKEN, GXEON_AUDIT_DB_PROVIDER, GXEON_AUDIT_WRITE_MODE, GXEON_AUDIT_ALLOW_DB_WRITES, GXEON_AUDIT_AUTO_RUN_MISSION_006, GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL, VITE_GXEON_API_BASE_URL. Autorunners desabilitados; escrita depende de aprovação específica no ambiente isolado.
6. Piloto exige download real, revisão independente, riscos altos tratados/aceitos formalmente e decisão sobre checks relevantes. Tokens distintos não identificam pessoas nem substituem SSO/tenancy.

| Decisão do proprietário | Preenchimento humano |
| --- | --- |
| Opção escolhida e justificativa | PENDENTE |
| Identidades e permissões confirmadas | PENDENTE |
| Orçamento, limites, retenção e responsáveis | PENDENTE |
| Ações externas específicas autorizadas / ambiente | PENDENTE |
| Referência, data e assinatura | PENDENTE |
