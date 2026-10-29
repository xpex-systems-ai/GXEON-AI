# GX-01.7 — jornada e dashboard propostos

DOCUMENTADO/PLANEJADO; nenhuma tela Commerce foi implementada. Visual preto/dourado, contraste legível, foco visível, uso por teclado, labels explícitos, mobile responsivo e tabelas com alternativa compacta. Marca deve preservar legibilidade/estado, sem simular métricas reais.

| Etapa | Conteúdo e decisão do usuário | Estado/limite obrigatório |
|---|---|---|
| Site corporativo→OMNIX |descrição concreta da capacidade e prova |sem certificado/parceria/resultado financeiro não comprovado |
| Acesso nominal |selecionar organização autorizada |erro/autenticação/membership removida explícitos |
| Conectar conta |escopos read-only e finalidade/retention claros, depois consentimento oficial aprovado |agora indisponível: policy gate; não mostrar botão funcional fictício |
| Diagnóstico |seleção de itens, quantidade/escopo e autorização; execução manual |loading por fase,cancelamento,empty,403/429/timeout,partial com cobertura real |
| Dashboard |conta/últimaobservação/runstatus, itens inspecionados, achados e evidências |sem gráficos faturamento/ROI gerados; desconhecido exibido como tal |
| Recomendações |poritem/regra,evidenceIds,limitação e ação sugerida |nenhum botão de aplicar alteração; revisão humana |
| Agentes adicionais |cartão função/status/pré-requisitos |Planejado/Em desenvolvimento não vira upgrade vendável |
| Serviço opcional |escopo consultivo e critérios de entrega |proposta/contrato humano separado; nenhum pagamento/cobrança nesta fase |

Status padronizados: **Disponível** somente após implementação+teste+homologação; **Em homologação** com acesso restrito e limites; **Em desenvolvimento** para código incompleto; **Planejado** para documento. Hoje AuditOS tem fluxo local testado e aceiteBLOCKED; Catalog e demais agentes sãoPlanejados. Não usar preço/lock/desbloquear como se produtos planejados estivessem prontos.

Painéis propostos: visão geral com frescor/coverage; catálogo com erros por item e filtros; evidências com hash/source/time; histórico/exports segregados; conexão com escopos/revogar; membros/permissões; decisões/revisões. Caso vazio explica como iniciar; falha não substitui dados por demonstração. Modo demo separado, bannerTESTDATA e fontes sintéticas em todo export. Tela de revogação explica suspensão de coleta/retention aprovada sem prometer eliminação imediata universal.
