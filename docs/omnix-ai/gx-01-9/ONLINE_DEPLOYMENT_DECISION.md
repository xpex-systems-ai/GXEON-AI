# GX019 — decisão de implantação online

**BLOCKED para API/PG remotos e dados reais.** Frontend implementado e prévias Git existentes utilizadas dentro da autorização GX019. Nenhum deploy manual, merge, domínio novo, mudança de proteção, variável sensível, serviço pago ou banco remoto foi executado.

| Superfície | Observado em 26/10/2026 | Decisão atual |
|---|---|---|
| Site XPeX, projeto `prj_9TzNOpz6Uzz34uHfLrlYAXzXcfgw`, scope xpex-neural | main inicial `1ab659b...`; preview Git `dpl_8g4pwHUsppMCGkY92LHJGk93pKq3`, C `e965a85...`, READY; página aberta no navegador | manter produção; PR45 DRAFT |
| Audit OS, projeto `prj_owdXFSlvK1GBrWVuYCqeHpTlYjP4`, scope GXEON | preview `dpl_81GryLfaSP6i2be8FU2HdRdFChSZ`, E `7432472...`, READY, target null, iad1; SSO de deployment ativo | preservar proteção; conteúdo remoto após SSO pendente |
| Railway `691c6b11-c1ad-4814-9080-46d4e892aad3`, compassionate-illumination | somente production; GXEON-AI em main, RAILPACK, us-west2; latest FAILED | não reaproveitar/configurar; decisão do titular |
| Railway `81f9f7c0-8674-4d2c-be9e-b6a3821410ca`, GXEON-AI | somente production; serviço gxeon i.a, Dockerfile legado, latest REMOVED, anterior FAILED | não reaproveitar/configurar; não é API dedicada validada |
| Outros Vercel/Netlify vinculados à PR456 | falhas/neutral em statuses completos; não são o destino escolhido | nenhuma exclusão, transferência ou correção de configuração autorizada |

Metadados filtrados em `evidence/*preview.json` e `evidence/railway-readonly.json`; sem valores de variáveis. `live:false` retornado pelo conector não foi interpretado como indisponibilidade. Root/output não fornecidos pelo conector: o `vercel.json` versionado compila `artifacts/gxeon-dashboard` e exclui `/api` do fallback SPA. A prévia estática não contém API/PG. A raiz das respostas HTML anteriores está no fallback SPA incondicional e/ou ausência de backend no destino; não se deve mascarar isso com HTML de sucesso ou rewrite para domínio não verificado. O transporte tipado rejeita resposta HTML como falha de contrato. A exclusão de `/api` já veio das fases anteriores e foi preservada.

URLs reais: [site preview](https://xpex-systems-nr6sfgrax-xpex-neural.vercel.app/?view=omnix); [portal preview protegido](https://gxeon-audit-cueu5zd4t-gxeon.vercel.app/omnix). A página corporativa abre publicamente nesta observação; o portal requer a sessão Vercel existente do responsável. Não foi iniciado login interativo, criado share link ou desativada proteção para obter PASS. Ferramenta de fetch do conector cria/reutiliza share link temporário; não foi usada porque alteraria acesso. Sem CLI Vercel autenticada disponível nesta execução. SSO é uma pendência de verificação, não uma licença para reduzir proteção.

## Atualização após autorização — 26/10/2026

O fundador **autorizou a prévia segregada proposta**, com 1 API Node24 e 1 PG17 privado por sete dias, envelope de US$30/mês antes de impostos e sem produção/merge/dados reais, sujeito à confirmação prévia do plano e do controle de gasto. Não é necessário repetir essa aprovação. Conta conectada `xpex-systems-ai`, único workspace disponível **GXEON AI** (`39b76b7c-7d01-480f-83b5-ff6e6eb41ea2`). Nenhum projeto/serviço/banco/volume/domínio remoto foi criado nesta verificação.

A autorização não substitui a validação técnica de cobrança: o conector permite inventário mas não consulta plano/limites. CLI oficial 5.71.0 instalada isoladamente, fora das dependências do produto; login salvo recusado por invalid grant. Renovação iniciada no navegador padrão, e a aba de uso abriu o login GitHub/Railway. Aguardando autenticação do titular, sem pedir senha/2FA/token no chat. O hard limit documentado pela Railway é de **workspace** e derruba todos os workloads ao atingir o teto; não foi alterado, pois o workspace contém dois projetos legados. Plano, consumo atual e limite efetivo continuam NÃO VERIFICADOS.

O template PostgreSQL atual aponta para PG18 e foi recusado para esta missão. Imagem PG17 inspecionada no registro público, sem executá-la: `ghcr.io/railwayapp-templates/postgres-ssl@sha256:5e806d28c18198f933d25e79989470a47a938f465bf0634e030b416961b3463e`; revisão 09ff77dca25f9af407827b9f27c7de9c5c660790. O código TLS dessa revisão inclui o hostname privado no SAN; isso não comprova ainda um handshake remoto. Região Virginia confirmada como `us-east4-eqdc4a`. [Recibo de preflight](evidence/activation-preflight.json).

Estado atual: **AUTHORIZED — BLOCKED ON BILLING ACCESS AND BUDGET VALIDATION**. Próxima ação é concluir o login da conta existente e ler plano/uso/limites. Não provisionar com base somente no inventário ou na estimativa. O restante deste documento preserva a proposta e a observação anteriores à autorização.

## Plano concreto a submeter ao fundador

Proposta somente, **não executada nem aprovada**:

1. Confirmar conta titular/permissões Railway e Vercel, plano aplicável ao uso empresarial, faturamento, orçamento e operador de incidente. A conta GitHub xpex-systems-ai não comprova titularidade de cada projeto do provedor.
2. Criar **um projeto Railway novo e segregado**, nome proposto `omnix-gx019-preview`, ambiente `preview-synthetic`, região candidata US East/Virginia disponível no painel; confirmar código da região antes de criar. Não reutilizar os dois serviços production. Um Node24 API dedicado e um PG17 com volume próprio, rede privada, uma réplica, sem recursos financeiros/cliente.
3. Construir a imagem dedicada versionada, nunca app.ts/rotas financeiras/autorunners; registrar digest. Configurar DB `gx01_pilot` e papel `gx01_pilot_app` com grants mínimos do provisionamento revisado. Aplicar SQL inicial apenas em DB novo vazio; schema já existe no repo. Não migrar DB legado. Validar CA/SAN e `rejectUnauthorized:true` na conexão privada. Se o provedor não satisfizer o contrato TLS, manter BLOCKED e aprovar alternativa; não ignorar certificado.
4. Gerar códigos sintéticos individuais por canal seguro e armazenar somente hashes no servidor. Configurar origem exata da prévia, tokens técnicos distintos exclusivamente no backend, opt-in sintético. Sessões são de processo único e re-login após reinício é esperado.
5. Preparar em branch de prévia proxy **same-origin** `/api/omnix/*` para a API HTTPS verificada, antes do fallback. Não abrir CORS amplo, não usar URL de produção e não enviar cookie por domínio arbitrário. A alteração do proxy/variáveis do provedor será uma ação específica a aprovar; a existência do frontend não autoriza backend novo.
6. Validar readiness, contratos JSON, negações 401/403/404, dois checks, métricas, revisão sintética, download recebido/hash, refresh, reinício e restauração em DB de teste novo. Confirmar logs sem segredos e scan da imagem Node/OS, além do SBOM JS. Repetir G07 com seletor de arquivo e visual mobile.
7. Regras candidatas para prévia: somente dados sintéticos por sete dias; retenção e descarte reversível sob decisão do titular; backup criptografado diário com teste de restore, limite de logs sete dias, revisão de utilização diária. Esses controles ainda não estão configurados. Não inventar backup remoto/monitoramento.
8. Rollback proposto: desativar ingresso/portal opt-in da nova prévia, revogar suas sessões/códigos, preservar DB/backup para investigação; voltar ao preview estático anterior. Não excluir recursos ou promover produção automaticamente. Janela e responsável precisam constar da aprovação.

## Custo e limites

Consulta pública em 26/10/2026: [Railway pricing](https://railway.com/pricing) informa Pro mínimo de US$20/mês com US$20 de créditos de uso, RAM US$0.00000386/GB/s, CPU US$0.00000772/vCPU/s, volume US$0.00000006/GB/s e saída US$0.05/GB. [Vercel pricing](https://vercel.com/pricing) informa Pro US$20/mês com US$20 de uso incluído, taxas adicionais aplicáveis. Isso é tabela pública, não plano confirmado da conta nem cotação final. Não assumir elegibilidade Hobby/free para operação comercial.

Modelo **estimado**, não gasto observado: API com teto pretendido de 0.5GB, PG 1GB, CPU combinada 0.5vCPU continuamente e volume 1GB por 30 dias custariam aproximadamente US$25.17 antes de saída, backups, impostos e eventuais itens não incluídos. Fórmula: `(1.5 × 0.00000386 + 0.5 × 0.00000772 + 1 × 0.00000006) × 2592000`. O mínimo Pro não se soma novamente ao uso já coberto por créditos. Limites de CPU/memória e suspensão pelo provedor precisam ser confirmados no plano; essa conta não garante fatura fixa.

Envelope candidato: US$30/mês Railway, alertas pretendidos em US$20/25 e interrupção antes de ultrapassar o teto **somente se o controle real do provedor for validado**; fundador aprova impostos e eventual Pro Vercel separadamente. Nenhum limite ou alerta foi alterado. Sem aprovação de plano, valor máximo, região, duração e responsável, **não provisionar**. O custo incremental efetivo das prévias Git existentes não foi medido; não afirmar US$0 de operação.

## Variáveis necessárias — nomes apenas

Backend dedicado: `NODE_ENV`, `PORT`, `DATABASE_URL`, `GXEON_AUDIT_DATABASE_TLS_CA`, `GXEON_AUDIT_DB_PROVIDER`, `GXEON_AUDIT_PILOT_ENABLED`, `GXEON_AUDIT_ALLOWED_ORIGINS`, `GXEON_AUDIT_OPERATOR_TOKEN`, `GXEON_AUDIT_REVIEWER_TOKEN`, `GXEON_AUDIT_ALLOW_DB_WRITES`, `GXEON_AUDIT_WRITE_MODE`, `GXEON_AUDIT_AUTO_RUN_MISSION_006`, `GXEON_AUDIT_AUTO_CREATE_FIRST_PROPOSAL`, `GXEON_OMNIX_PREVIEW_ENABLED`, `GXEON_OMNIX_PREVIEW_IDENTITIES`. São nomes, não instrução para ativar autorunners: os dois controles AUTO devem permanecer desativados e o runtime dedicado continua sem importá-los. Validar o contrato de `auditPilotConfig.ts` antes de iniciar. Não instalar/ativar `NODE_PG_FORCE_NATIVE` sem novo inventário. Nenhum segredo em variável VITE ou bundle cliente.

Local somente: `GXEON_STAGING_PG_BIN`, `ESBUILD_BINARY_PATH` e fixture privada ignorada `.gx019/access.json`; não enviar ao provedor ou à PR. Aprovação futura deve nomear projeto/ambiente/recursos, valor máximo, janela, região, isolamento/TLS, operadores e rollback. Não envolve merge, produção, fundos ou cadastro real.
