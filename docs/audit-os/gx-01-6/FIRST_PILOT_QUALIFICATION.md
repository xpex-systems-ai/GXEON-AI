# GX-01.6 — primeiro serviço proposto

**GXEON Audit OS — Configuration Integrity Audit**. Estado BLOCKED até gates; proposta para avaliação humana, sem oferta publicada ou cobrança.

Perfil: equipe proprietária de configuração Vercel que pode autorizar análise estática de um vercel.json sanitizado. Problema: identificar dois padrões específicos de configuração e organizar evidência reproduzível para revisão. Um arquivo por caso e no máximo os dois checks implementados; assetReference é rótulo, nunca URL buscada.

Checks reais: vercel_api_routing reconhece catch-all SPA incondicional antes de rewrite API reconhecido; ausência desse padrão não comprova backend acessível. vercel_security_headers verifica declarações globais não vazias de Content-Security-Policy e X-Content-Type-Options; não mede headers em runtime nem qualidade da política. Código auditWorkflowChecks.ts é a fonte do escopo. Achados são observações da entrada, não prova universal de vulnerabilidade.

| Item | Proposta controlada |
|---|---|
| Entradas | JSON vercel.json sanitizado<=16000 caracteres dentro de payload32KiB; nome/ID/escopo/referência de autorização; titular habilitado; inicialmente testData=true |
| Autorização | Proprietário registra consentimento do ativo/arquivo e limites; operator intake/run; pessoa com papel reviewer distinto examina evidências e registra decisão/referência; operator finaliza só após approve |
| Entregáveis | Caso com estado final, evidência do arquivo submetido/hash, até dois resultados determinísticos, achados com evidenceIds, limitações e JSON exportável validado; revisão explicada pelo humano |
| Limitações | Sem fetch de URL, pentest, exploração, certificação, compliance integral, varredura universal ou monitoramento contínuo. Nenhuma auditoria de rede privada sem integração autorizada. Sem SLA ou identidade humana provada por token |
| Dados | Proibir segredos/dados pessoais de clientes; detector heurístico ajuda, não garante remoção. Se detectar material sensível, interromper intake e seguir resposta humana sem copiar para tickets/logs |
| Retenção proposta | 30dias para inputs/evidências/relatórios de homologação; backup até30dias após coleta e registro mínimo de decisão sem conteúdo conforme política aprovada. Automação de expurgo NÃO implementada. Nenhuma exclusão autorizada; owner aprova política/processo antes de dados reais |
| Sucesso | Contratos JSON corretos, um caso autorizado CLOSED com revisão distinta, hashes/referências verificáveis e arquivo recebido pela UI antes/depois de restart; ausência de mutação indevida; riscos formalmente tratados |
| Interrupção | Segredo, ativo sem autorização, identidade/reviewer não confirmado, divergência de hash, 5xx persistente, custo no limiar aprovado, risco não aceito ou pedido do titular. Fechar admissão de novos casos; preservar prova; decisão humana sobre rollback/retenção |
| Suporte proposto | Responsável técnico nominal do proprietário em horário comercial; alvo inicial de resposta1dia útil, sem garantia contratual. Incidente: registrar ID/horário/erro sanitizado, conter escritas sob decisão autorizada, comunicar titular por canal previamente aprovado. Não houve mensagem a cliente |
| Encerramento | Entregar relatório verificado e limites, registrar aceite/recusa e estado; revogar acesso/retirar serviço/dados somente com autorização específica e retenção aprovada |
| Precificação para análise | Fórmula proposta: 2–4h de operador/revisor×taxa horária aprovada + custo incremental de infra + reserva de suporte. Exemplo hipotético 3h×US$40 +US$10 +US$20 =US$150 por arquivo/ciclo; não é preço público, pedido de pagamento ou receita. Definir moeda/impostos/escopo de retrabalho antes de oferta |

Primeiro piloto recomendado: um único arquivo sintético de equipe interna, ambiente dedicado, até uma réplica e uma revisão humana independente. Nenhum cliente real, aprovação ou resultado comercial foi inventado. A denominação OMNIX AI é proposta de produto/roadmap; capacidade demonstrada continua limitada ao Audit OS descrito.
