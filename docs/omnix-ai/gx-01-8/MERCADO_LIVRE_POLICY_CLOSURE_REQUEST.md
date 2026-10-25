# GX-01.8 — fechamento de políticas Mercado Livre pendente

Data-base: 25/10/2026. Candidato de código: `d71996bc73502f6c2352c0c687ef1cba90012ea4`. PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT. Preparação de engenharia; liberação global NO-GO.

**BLOCKED — POLICY OR EVIDENCE GAP.** Em 25/10/2026 as fontes oficiais integrais [termos](https://developers.mercadolivre.com.br/pt_br/termos-e-condicoes) e [autenticação/autorização](https://developers.mercadolivre.com.br/autenticacao-e-autorizacao) retornaram 403. Não houve bypass, scraping restrito, app OAuth, loja ou dados pessoais. [Ledger GX 017](../gx-01-7/MERCADO_LIVRE_OFFICIAL_API_AND_POLICY_AUDIT.md) permanece histórico de acesso parcial; snippets e índices não substituem os termos completos.

| Finalidade futura | Dados mínimos pretendidos | Permissão/retention/terceiros a verificar | Decisão atual |
| --- | --- | --- | --- |
| Operação interna autorizada | IDs/título/categoria/status/atributos de até 50 itens do vendedor autenticado; evitar compradores/pedidos | termos API, scopes mínimos exatos e método de prova do titular; política de retenção/revogação | bloqueada; read-only não isenta contrato |
| Diagnóstico ao próprio vendedor | evidência mínima dos campos e recomendações; dados derivados/runs | direito de gerar estatística/derivados, armazenar e entregar ao titular; correção/exclusão e validade | bloqueada até cláusulas integrais e parecer |
| IA externa | proposta inicial desligada; nenhum token/dado ML enviado a LLM | se processamento por terceiros é permitido, suboperadores/localização/treinamento/transferência internacional/consentimento | bloqueada; consentimento do usuário não sobrepõe restrição do provedor |
| Redistribuição/benchmark público | nenhuma no MVP proposto | licença de redistribuição, dados agregados, marcas e materiaisderivados | excluída até autorização contratual demonstrada |

Solicitação preparada ao fundador/jurídico, sem envio externo automático: obter por via autorizada a versão integral vigente e anexar URL/data/versão/hash, incluindo anexos de API/IA/dados/testes/publicação/marca; se acesso autenticado for exigido, responsável humano utiliza o canal permitido e avalia os termos antes de aceitar. Não pedir tokens ou credenciais em conversa. Texto recebido deve manter origem e cadeia de evidência; registrar cláusula exata, finalidade, limite e responsável pelo parecer.

Questões a resolver: (1) quais scopes exatos permitem ler anúncios próprios e catálogo sem pedidos/compradores? (2) quais limites/quotas/paginação/retries/usuários de teste? (3) pode guardar conteúdo e derivados/recomendações, por quanto tempo e após revoke? (4) IA externa e suboperadores são permitidos, em quais condições/países? (5) treinamento/benchmark/agregação/redistribuição são permitidos? (6) como atender exclusão/revogação e desconectar credenciais com runs em andamento? (7) revisão/publicação/certificação são obrigatórias para app/ChatGPT? (8) pode mencionar Mercado Livre/usar marca e com quais frases? (9) quais logs/backups/cópias podem sobreviver e prazos? (10) quais obrigações de segurança/incidente e suspensão existem? Nenhuma resposta foi presumida.

Próximas evidências exigidas: textos integrais e anexos; matriz cláusula×finalidade; scopes oficiais mínimos; política de dados/retention/revoke; desenho de segregação; aprovação jurídica; autorização expressa para futura implementação+testes controlados. A [LGPD oficial](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) foi consultada como fonte normativa geral de proteção/segurança; não comprova permissão API nem compliance do produto. Este pacote é pedido para parecer jurídico, não parecer jurídico concluído.

| Campo humano | Preenchimento pelo responsável |
| --- | --- |
| Responsável por obter fontes oficiais | |
| Referências/versões/datas/hashes examinados | |
| Jurídico/provedor consultado e canal autorizado | |
| Finalidades e scopes autorizados | |
| Condições sobre dados derivados/IA externa/terceiros | |
| Retenção/revogação/testes/publicação/marca | |
| Lacunas remanescentes | |
| Decisão de prosseguir ou manter bloqueio | |
| Data | |
| Assinatura ou referência verificável | |
