# GX-01.7 — governança dos provedores

Somente consultas de leitura autorizadas. Não excluir, transferir, reconfigurar, vincular, publicar ou alterar billing/domínios/variáveis de projetos Vercel/Netlify/Railway. Não há produção aprovada. Identidade da conta GitHub não prova titularidade de cada projeto externo.

Baseline c4ee457: API de status completo42 entradas=30failure/12success; página padrão30=24failure/6success. Check-runs29 constituem fonte separada. Esses números são do HEAD inicial, não do commit final. O recibo final da PR reconsulta cada fonte no SHA final e conserva páginas separadas. Status duplicado por integração/projeto não é um único workflow CI.

| Grupo observado na investigação GX016 do mesmo c4ee | Causa / certeza | Decisão |
|---|---|---|
|22falhas Vercel |resposta pública genérica de conta/deployment bloqueado, projeto não resolvido nesse escopo; NÃO inferir dono/root cause detalhada |owner confirma conta/projeto antes de ação |
|6falhas Vercel |STATIC_BUILD_NO_OUT_DIR confirmado por metadata de deployment no escopo disponível |build/rootdir/output requer revisão por projeto; não corrigir projeto externo nesta missão |
|2falhas Netlify |causa/projeto NOT VERIFIED neste acesso |owner fornece identificação sem credenciais |
|Railway |autenticação/reautorização necessária na fase anterior; estado de projeto NOT VERIFIED |nenhuma provisão ou tentativa de contorno |

Esta matriz reutiliza prova histórica explicitamente datada de GX016; não declara acesso atual a todos os projetos. [Referência detalhada](../gx-01-6/EXTERNAL_STATUS_RECONCILIATION.md). Para cada projeto, preencher ID/URL pública, conta/time, titular confirmado, repo/branch/root/output, ambiente, últimoSHA/deployment, custo, sensibilidade, ação proposta e autorização específica. Campos desconhecidos permanecem vazios/NOT VERIFIED.

Decisões reservadas ao proprietário: conservar/desativar integração, corrigir root/output, migrar para projeto dedicado, manter histórico. Um status verde de GitHub não autoriza modificar serviços externos. Snapshot/recibo final distingue falhas CI internas de falhas de integrações externas e não as oculta.
