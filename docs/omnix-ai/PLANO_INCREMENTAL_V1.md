# OMNIX AI — arquitetura incremental e plano por PR

Data: 2026-10-19. Direção estratégica aprovada para planejamento pelo [handoff V1.0](HANDOFF_MESTRE_V1.md). A execução imediata permanece GX-01, na [PR #456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456). As etapas seguintes são propostas, sem execução, prazo ou compra autorizados por este plano.

## Arquitetura preservada

O frontend React/Vite (`artifacts/gxeon-dashboard`) consome contratos Zod em `lib/api-zod`. A API Express (`artifacts/api-server`) autentica o papel, valida a entrada e executa o serviço de auditoria. O GX-01 usa PostgreSQL e as tabelas `audit_*` existentes em `lib/db`, com transações, bloqueio do caso e evidência com SHA-256. Mobile Expo e mockup continuam aplicativos distintos. Nenhum pacote, endpoint, tabela ou serviço foi renomeado para OMNIX.

O ciclo atual aceita somente `vercel.json` submetido pelo operador e dois checks estáticos. Não consulta alvos externos. O relatório registra o arquivo recebido, resultados, referências, limitações e revisão por credencial distinta. Tokens de papel não demonstram identidade nominal ou isolamento de clientes.

A evolução proposta adiciona conectores atrás da API e conserva o mesmo ciclo de escopo, evidência, revisão e exportação. Cada conector deverá produzir evidências com origem, horário, versão e limites declarados. Interpretações de modelos deverão referenciar essas evidências e permanecer distinguíveis dos resultados determinísticos. Modelos não recebem acesso direto ao banco, credenciais de conectores ou poder de aprovar relatórios.

Antes de atender múltiplas organizações, identidade, vínculo organizacional e autorização deverão ser aplicados em todos os acessos e trabalhos assíncronos. Adicionar apenas um campo de organização ao frontend não fornece isolamento. Não há nova migração ou implementação multitenant nesta PR.

## Estado verificável

| Capacidade                                                         | Classificação  | Evidência e limite                                                                                                                                                                        |
| ------------------------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intake, escopo, dois checks, evidências, revisão e JSON até CLOSED | IMPLEMENTADO   | Código e suíte HTTP/SQL GX-01; dados de teste identificados. Veja [validação](../audit-os/gx-01/VALIDATION.md).                                                                           |
| Autorização operacional                                            | PARCIAL        | Gates de escrita e credenciais distintas testados; sem identidade nominal, SSO ou isolamento organizacional comprovado.                                                                   |
| Roteamento público                                                 | PARCIAL        | Fallback da SPA corrigido no código e transporte rejeita HTML; implantação deste backend ainda não homologada.                                                                            |
| Qualidade global                                                   | PARCIAL        | Erros legados corrigidos em `2d4d6cf`; resultados do commit devem ser consultados na validação/CI, sem reutilizar aprovação de commits anteriores.                                        |
| Staging GXEON-AI                                                   | BLOQUEADO      | Inventário Railway somente leitura mostrou serviços de outros repositórios no projeto chamado staging, cujo único ambiente é production. Não foi identificado alvo isolado deste backend. |
| Marca, domínio e disponibilidade de OMNIX AI                       | NÃO VERIFICADO | Texto estratégico não comprova disponibilidade jurídica, domínio ou lançamento.                                                                                                           |
| GitHub somente leitura, demais conectores e multimodelo            | PLANEJADO      | Módulos históricos existentes não constituem homologação da jornada OMNIX.                                                                                                                |
| Enterprise, API/MCP comercial e operação contínua                  | PLANEJADO      | Dependem de identidade, isolamento, política de dados, operação e custos comprovados.                                                                                                     |

## Sequência por PR

Os identificadores abaixo seguem o handoff oficial. As etapas F0–F7 do [roadmap anterior](ROADMAP_GX01.md) são gates internos: F1/F2 correspondem à conclusão GX-01; F3 ao GX-02; a decisão de marca ao GX-03; F4 ao GX-04; F5 ao GX-05; F7 ao GX-06; F6 ao GX-07.

| Fase / PR proposta                   | Entrega delimitada                                                                                  | Dependências e aceite                                                                                                                                      | Risco principal                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| GX-01 / #456                         | Ciclo mínimo, correção de contratos e checks globais, evidências reproduzíveis                      | CI do commit, UI local, alvo de homologação comprovado e revisão humana; sem merge automático                                                              | Confundir arquivo submetido com runtime publicado ou token de papel com identidade |
| GX-01 / homologação isolada          | Configuração revisável de API + frontend + banco de teste                                           | Identificar ambiente e permissões; aprovar eventual provisionamento/custo antes da execução; provar JSON, persistência após reinício e privilégios mínimos | Alterar ambiente produtivo por confiar apenas no nome do projeto                   |
| GX-02 / escopo do piloto             | Uma oferta específica, exclusões, entregáveis e critérios de aceite ligados ao relatório homologado | GX-01 homologado e decisão humana comercial; pagamento permanece gate próprio                                                                              | Prometer cobertura ou receita sem evidência                                        |
| GX-03 / decisão de marca             | Registrar validação e aprovações de marca, domínio e textos; depois propor UI comercial             | Pesquisa e decisão humana; mudanças de domínio/lançamento exigem autorização específica                                                                    | Conflito de marca e rebranding desnecessário de contratos técnicos                 |
| GX-04a / contrato do conector GitHub | Permissões de leitura, repositórios autorizados, limites, paginação e formato de evidências         | Escopo explícito, política de dados e fixtures; nenhuma escrita GitHub de runtime                                                                          | Coleta além do escopo e exposição de conteúdo privado                              |
| GX-04b / implementação GitHub        | Leitura limitada, timeout, rate limit, redigimento e testes negativos                               | Contrato GX-04a revisado; credenciais restritas em ambiente aprovado; exportação rastreável                                                                | Egress, abuso de quotas e persistência de segredos                                 |
| GX-05a / política multimodelo        | Definir dois provedores, tarefas, dados permitidos, limite de custo e avaliação                     | Evidências estáveis e política de tratamento/retenção; sem compra ou envio a provedores nesta fase documental                                              | Exposição de dados, respostas sem suporte e gasto sem limite                       |
| GX-05b / adaptadores e avaliação     | Dois adaptadores controlados, falhas explícitas, proveniência e avaliação reproduzível              | GX-05a aprovado, orçamento e credenciais em ambiente autorizado                                                                                            | Fallback silencioso pago ou concordância entre modelos tomada como prova           |
| GX-06 / API e MCP                    | Contratos versionados, escopos, revogação, limites e testes de cliente                              | Identidade adequada ao público, isolamento quando aplicável e política de publicação                                                                       | Expor rotas internas e ampliar acesso involuntariamente                            |
| GX-07a / identidade e isolamento     | Autorização organizacional em API, banco, evidências e tarefas                                      | Modelo de dados revisado, plano de migração reversível e testes de acesso cruzado                                                                          | Vazamento entre organizações                                                       |
| GX-07b / operação enterprise         | Retenção, exclusão, backup/restauração, monitoramento, incidentes e suporte                         | GX-07a, requisitos contratuais, custos e responsabilidades definidos; ensaio de recuperação                                                                | Alegar prontidão enterprise sem operação comprovada                                |

Nenhuma fase futura tem PR aberta por este plano. Quando o escopo de uma fase mudar, sua PR deverá atualizar contratos, limites e evidências em conjunto. Revisões de marca podem ocorrer em paralelo à engenharia, sem iniciar todos os módulos.

## Dependências e custos

Não foram consultadas tarifas comerciais ou medidos custos de operação nesta sessão. Não há estimativa financeira aprovada. O uso existente de infraestrutura não permite inferir custo marginal zero.

| Categoria                            | Informação necessária antes de habilitar                                    | Controle proposto                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| API, frontend e banco de homologação | Provedor, ambiente, recursos, retenção, backup e responsável                | Orçamento aprovado, teto por ambiente e desligamento de recursos temporários        |
| Evidências e relatórios              | Volume, tamanho, classificação dos dados e prazo de retenção                | Limites de entrada/exportação e política de retenção verificável                    |
| Conectores                           | Plano, quotas, egress e limites por organização                             | Leitura mínima, paginação limitada, rate limit e métricas de consumo                |
| Dois provedores de IA                | Modelo, tokens, localização, retenção e condições contratuais               | Teto por execução, autorização de dados, timeout e interrupção ao exceder orçamento |
| CI, observabilidade e suporte        | Minutos, armazenamento de artefatos, volume de logs e cobertura operacional | Retenção limitada, logs redigidos, alertas acionáveis e responsável definido        |
| Marca e comercial                    | Disponibilidade, termos, suporte e custos de lançamento                     | Decisão humana antes de domínio, anúncio, compra ou contratação                     |

## Próximo gate

Concluir a verificação da PR #456 e registrar o resultado por commit. Enquanto faltar homologação ou revisão independente, o estado de liberação continua BLOCKED. O executor não transforma testes de fixture em aprovação humana da entrega e não executa merge, deploy produtivo, cobrança, compra, publicação de plugin ou alterações de domínio por consequência deste handoff.
