# GX-01.8 — minuta B 2 B Configuration Integrity Audit

Data-base: 25/10/2026. Candidato de código: `d71996bc73502f6c2352c0c687ef1cba90012ea4`. PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT. Preparação de engenharia; liberação global NO-GO.

**Minuta não enviada, não publicada, preço/prazo não aprovados. Serviço candidato após gates.** Nome: GXEON Audit OS—Configuration Integrity Audit. Público pretendido: empresa/responsável técnico que possa autorizar análise de uma configuração Vercel sanitizada. Núcleo local comprovado; homologação remota/parecer/contrato continuam bloqueados.

Objeto contratual proposto: receber exatamente **um vercel.json sanitizado** por caso, registrar escopo/autorização do titular, executar os dois checks implementados, guardar uma evidência e achados referenciados, permitir revisão apropriada, exportar relatório JSON com IDs/hash/limitações e registrar CLOSED. O cliente revisa referências e pode solicitar correção de erro factual dentro da janela a negociar.

| Checkreal | O que observa | Limite de interpretação |
| --- | --- | --- |
| vercel_api_routing | conflito específico de catch-all SPA incondicional antes de rewrite API reconhecido no arquivo | não mede backend/TLS/rota real; outras construções não são garantia de cobertura |
| vercel_security_headers | ausência de declarações globais não vazias Content-Security-Policy e X-Content-Type-Options no arquivo | não avalia qualidade da política nem headers entregues no deploy |

Entregáveis: recibo de escopo/dados sintéticos ou autorizados; evidência do texto sanitizado com SHA; achados ligados à evidência; relatório JSON e instrução de verificação; revisão humana identificada e registro de entrega/aceite. Não é auditoria universal, pentest, certificação, atestado de compliance, segurança total, integração ML operacional ou garantia de receita/SLA. Um resultado not_observed não prova ausência de vulnerabilidades.

Responsabilidades propostas: contratante comprova titularidade/consentimento, remove segredos/dados pessoais e valida escopo; prestador confere admissibilidade e recusa conteúdo sensível/fora do limite, executa apenas checks autorizados, registra limitações e protege acesso; revisor qualificado confirma achados e condições; proprietário decide release e contrato. Arquivo com credenciais é recusado e não deve ser reenviado sem sanitização. Sem obtenção automática de URLs/arquivosprivados.

Critérios de aceite do serviço: caso/escopo correspondem à autorização; evidência única/2 checks executados rastreáveis; revisão humana real diferente de fixture; relatórioabre ehash/ref conferem; entrega por canal aprovado; limitações e pendências compreensíveis. Aceite contratual não aceita vulnerabilidades em nome do cliente. Gate de primeiro piloto exige antes parecer independente+homologação + orçamento + decisão humana.

Condições comerciais a preencher: partes/contatos; ativo; autorização; ambiente; prazo de análise e entrega; preço/moeda/impostos/condições sem cobrança automática; janela de revisão e suporte; hipóteses de retrabalho/encerramento. Proposta não enviada, nenhum cliente/receita/assinatura/cobrança registrados. Não prometer prazo ou SLA sem capacidade contratada.

Confidencialidade/dados (minuta para jurídico): limitar acesso por papel e canal da entrega; não publicar configuração de cliente em Git/log; proibir dados de comprador e credenciais; finalidade restrita à análise autorizada; documentar papéis controlador/operador, suboperadores, localização e base legal aplicável; retenção proposta até 30 dias da análise e prazo negociado de evidência/backup, sujeitos a contrato/obrigações/preservação de incidente; exclusão futura somente por processo aprovado sem apagar evidência obrigatória; incidente tratado pelo responsável e obrigações legais aplicáveis. A [LGPD oficial](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) fundamenta perguntas para revisão jurídica, não uma certificação. Não há purge automatizado comprovado.

Suporte/encerramento: contato e janela comercial a negociar, sem plantão/SLA; registrar ticket/SHA/caseId sem segredos; suspender escopo em incidente/hash divergente/autorização revogada; preservar registros e acordar devolução/destino/retention com responsável; encerrar só após entrega e decisão. Sem alteração de produção ou configuração do cliente nesta oferta inicial.

| Campo humano | Preenchimento pelo responsável |
| --- | --- |
| Partes e responsável técnico autorizado | |
| Ativo/escopo/arquivo sanitizado permitido | |
| Autorização do titular | |
| Ambiente e dados permitidos | |
| Prazo/janela de entrega/revisão | |
| Preço/moeda/impostos aprovados | |
| Canal de entrega/confidencialidade/dados/retention | |
| Suporte/encerramento | |
| Parecer jurídico e técnico | |
| Condições de aceite | |
| Decisão contratual | |
| Data | |
| Assinatura ou referência verificável | |
