# Primeiro piloto controlado — planejado, não executado

GX-01.5 · 2026-10-21 · PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT · integração main · estado global **BLOCKED**. Implementação e testes não equivalem a aprovação humana ou autorização de deploy.

Produto limitado: auditoria estática AUTORIZADA de um vercel.json sanitizado; público inicial operador interno ou técnico explicitamente autorizado; escopo único, sem clientes/dados privados/multiempresa. Marca OMNIX AI permanece proposta; disponibilidade jurídica/domínio será etapa própria. Não há auditoria universal, avaliação de rede, execução arbitrária, LLM, cobrança ou ativação financeira neste fluxo.

Pré-condições: revisor independente nominal;38altas corrigidas ou aceitas formalmente por responsável; download real com matchesPersistedRecord antes/depois restart; blueprint revisado e autorização específica de projetosIDs/custo; PGprivado/TLS/grants e restauração verificados; CI do HEAD aprovado; controles operacionais aplicados e decisão de status externos registrada. Enquanto qualquer impeditivo permanecer, **não iniciar piloto**.

Janela proposta:30min de preparação, até5casos sintéticos em60min,30min conferência. Operador registra autorização/escopo/requestId; submete arquivo sanitizado; executa2checks; confere1evidência/hash e achados aplicáveis; revisor humano confere e decide com credencial distinta; operador fecha/exporta; pessoa confere arquivo recebido/verificador; reinício e leitura consistente; backup/restore isolado supervisionado. Depois registrar métricas observadas reais (sem inventar taxa de sucesso/custos/latência), incidentes e decisão de continuação.

Sucesso exige100%dos casos de teste delimitados com autorização, contratoJSON, hashes/referências válidos, nenhum segredo/mutação não autorizada, download+persistência e revisão humana rastreáveis; se falha, registrar cada caso e não apresentar execução parcial como sucesso. Número de casos é meta, não resultado executado. Carga/custos devem ser medidos antes de ampliar volume.

Abortar se403inesperado/perdaauth, evidência divergente, dado real/segredo, gravação fora do escopo, retornoHTMLnaAPI, conexão públicaDB, TLS inválido, indisponibilidade persistente ou custo acima aprovado. Congelar novas escritas disabled/false, preservar dados/logs/hashes, seguir [rollback](BACKUP_RESTORE_RUNBOOK.md), comunicar titular pelo canal humano definido. Não restaurar por cima de banco existente.

Owner operacional e suplente: a designar por xpex-systems-ai. Revisor: a designar. Aprovador de orçamento/infra: proprietário xpex-systems-ai após comprovar titularidade/permissões. Nenhum convite/contato externo enviado nesta missão. Próxima autorização deve citar provider/scope/projectId, ambiente, mudança, orçamento e janela; não é autorização implícita desta proposta.
