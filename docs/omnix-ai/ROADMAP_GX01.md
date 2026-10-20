# OMNIX AI — roadmap de fundação vinculado ao GX-01

**Data:** 2026-10-19. **Estado:** planejamento proposto, sem compromisso de prazo, preço ou contratação. Este roadmap organiza a evolução do núcleo existente; não declara capacidades futuras como entregues.

## Ponto de partida comprovado

Referência técnica: [PR #456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456), commit de código `8c9f21aae23b6474d1efdc2d30f61a77b63140c6`.

| Item                                 | Evidência / limite                                                                                                                                                                                                                                                        |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ciclo mínimo estático                | Configuração enviada → autorização/escopo → persistência → checks → achados/evidências → revisão → JSON → CLOSED                                                                                                                                                          |
| Persistência e permissões do recorte | [Audit OS V1](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/39339247428): instalação completa, tipos do recorte, 9 testes PGlite e 9 testes PostgreSQL 17 aprovados                                                                                            |
| Qualidade global                     | [Typecheck](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/39339248915) e [build global](https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/39339247518) falharam; comparação local registrou 68 diagnósticos API e 10 dashboard também presentes na base |
| UI e staging                         | Validação visual e backend/persistência/permissões de staging não comprovados                                                                                                                                                                                             |
| Rotas públicas                       | A reprodução registrou HTML em quatro rotas Vercel. Backend Railway não confirmado; sem proxy para domínio presumido. Ver [issue #455](https://github.com/xpex-systems-ai/GXEON-AI/issues/455)                                                                            |
| Oferta comercial                     | Homologação, escopo comercial e aceite permanecem pendentes. A [issue #454](https://github.com/xpex-systems-ai/GXEON-AI/issues/454) não está concluída pelo GX-01                                                                                                         |

Testes de fixture não equivalem a aprovação humana real da entrega. Relatórios históricos e status de deploy isolados não substituem a evidência da jornada atual.

## Etapas e critérios de saída

As responsabilidades abaixo são papéis propostos, não pessoas ou equipes já designadas. Avançar uma etapa exige evidência específica; não se presume execução de todas as etapas nesta PR.

| Etapa                                   | Estado atual        | Entrega e dependências                                                                                              | Critério de saída verificável                                                                                                                                                                           | Papel proposto                                 |
| --------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| F0 — Registrar a direção                | PROPOSTA REGISTRADA | Manifesto preservado, arquitetura corporativa e mapa de gates nesta atualização                                     | Documentos versionados e revisão da proposta; disponibilidade e aprovação definitiva da marca continuam separadas                                                                                       | Direção de produto + revisor                   |
| F1 — Estabilizar o núcleo               | PARCIAL / BLOQUEADO | Preservar o ciclo GX-01 e tratar os bloqueios globais                                                               | Typecheck e build aplicáveis aprovados, suíte GX-01 aprovada no commit revisado e aprovação independente. Exceções residuais devem ter escopo e decisão de aceite explícitos                            | Engenharia + revisor                           |
| F2 — Homologar a jornada                | BLOQUEADO           | Depende de F1 e de ambiente de teste comprovado                                                                     | UI e exportação por clique validadas; API JSON no domínio correto; intake até CLOSED em staging; IDs e evidências redigidas; autorização, persistência, privilégios mínimos e RLS aplicável verificados | Engenharia + operador de staging + revisor     |
| F3 — Definir o piloto                   | PLANEJADO           | Depende de F1/F2; decisão definitiva de marca é necessária antes de apresentação comercial definitiva como OMNIX AI | Uma oferta com escopo, exclusões, entregáveis, limitações, prazo acordado e critérios de aceite; relatório revisado compatível com os checks homologados; decisão humana de abertura comercial          | Produto + responsável comercial + revisor      |
| F4 — Ampliar metodologias e conectores  | PLANEJADO           | Depende de núcleo homologado e autorização por domínio                                                              | Cada novo conector/metodologia tem contrato, permissões mínimas, limites, testes negativos, resultados reproduzíveis e evidência de ambiente autorizado antes de ser anunciado                          | Engenharia + especialista do domínio + revisor |
| F5 — Adicionar apoio multimodelo        | PLANEJADO           | Depende de política de dados, integrações autorizadas e conjunto de avaliação                                       | Fornecedores e papéis declarados; regras de dados, custos, falhas e retenção definidas; avaliação reproduzível; interpretações separadas das evidências técnicas                                        | Engenharia + governança + revisor              |
| F6 — Demonstrar propriedades enterprise | PLANEJADO           | Depende da jornada homologada e de requisitos organizacionais definidos                                             | Identidade e autorização por organização, testes de isolamento, trilha de auditoria, retenção, recuperação e operação comprovadas; revisão de requisitos contratuais aplicáveis                         | Engenharia + segurança/governança + revisor    |
| F7 — Distribuir APIs e MCP              | PLANEJADO           | Depende de contratos e modelo de autorização adequados ao público atendido                                          | Contratos versionados, escopos documentados, limites de uso, revogação, testes de clientes e evidência de operação; endpoints internos não contam como distribuição pública homologada                  | Engenharia + governança                        |

F4 e F5 podem ter investigações independentes após a fundação; nenhuma delas habilita automaticamente a outra. A verificação de marca pode ocorrer em paralelo a F1/F2. Não se exige interromper o núcleo GXEON para decidir o nome comercial.

## Primeiro piloto candidato

**Recomendação:** diagnóstico técnico de configuração, candidato a um recorte inicial de **OMNIX Systems**. O vínculo comercial e o nome final ainda precisam de decisão de produto.

- Entrada: `vercel.json` redigido, referência do ativo, autorização e checks selecionados.
- Método atual: análise estática do padrão específico de fallback SPA/API e das declarações globais selecionadas de headers.
- Saída: achados ligados à evidência recebida, hash, limitações, registro de revisão, relatório JSON e estado final.
- Limites: sem prova de runtime publicado, propriedade do ativo, auditoria completa de segurança, conectores comerciais ou análise multimodelo.
- Abertura do piloto: somente após os gates F1/F2 e a definição F3. Não há preço ou receita presumidos neste roadmap.

## Portfólio e dependências

| Linha proposta     | Situação comercial | Dependência principal                                                                  |
| ------------------ | ------------------ | -------------------------------------------------------------------------------------- |
| OMNIX Scan         | PLANEJADA          | F2/F4; verificações de ativos externos autorizados, com limites e metodologia próprios |
| OMNIX Commerce     | PLANEJADA          | F4; conectores e metodologia por plataforma comercial                                  |
| OMNIX Systems      | PLANEJADA          | F1/F2/F3 para o piloto estreito; F4 para ampliar além da configuração enviada          |
| OMNIX Agents       | PLANEJADA          | F4; cenários controlados, permissões de ferramentas e avaliação de comportamento       |
| OMNIX Intelligence | PLANEJADA          | F5; integrações e avaliação multimodelo comprovadas                                    |
| OMNIX Enterprise   | PLANEJADA          | F6; propriedades organizacionais e operacionais comprovadas                            |

## Próxima execução de engenharia

1. Tratar os diagnósticos de typecheck/build global com escopo revisável, preservando os testes GX-01.
2. Validar a interface e a exportação por clique em ambiente local controlado.
3. Confirmar o serviço `artifacts/api-server` e o ambiente de staging antes de configurar a origem do frontend ou testar persistência remota.
4. Atualizar evidências por commit e solicitar revisão independente. O executor não aprova a própria liberação.

Esta lista é a prioridade resultante do roadmap, não um registro de que essas ações foram executadas nesta atualização documental.

## Gates preservados

Sem merge automático, publicação de produção, migração destrutiva, pagamento, carteira, ativação Stripe, webhook produtivo ou execução irrestrita como consequência do manifesto. Uma linha planejada, um catálogo ou uma integração citada não comprova cliente, contratação ou receita.

O estado de liberação final permanece **BLOCKED**, até que os gates técnicos e humanos aplicáveis sejam satisfeitos. O [runbook GX-01](../audit-os/gx-01/RUNBOOK.md) descreve a reprodução do recorte e seus limites.
