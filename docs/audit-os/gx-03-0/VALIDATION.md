# GX030 — registro de validação

Observações de 2026-10-28. As evidências `sourceDirty=true` foram capturadas no worktree em desenvolvimento sobre `23b981d3fd30`; não são testes daquele commit isolado. O SHA256 do bundle identifica o artefato local. A CI da [PR #456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) deve confirmar o commit final; não converter PASS local em E2E Render.

| Comando/escopo local | Resultado |
| --- | --- |
| `pnpm install --frozen-lockfile` (10.28.1 / Node24.19) | PASS após atualização do lock; política de idade1440min preservada |
| `pnpm lint:audit` | PASS, 56 arquivos do escopo declarado; não é lint universal do legado |
| `pnpm typecheck` | PASS, bibliotecas e 5 projetos do workspace |
| `pnpm --filter @workspace/api-server typecheck:audit-tests` | PASS |
| Testes auditWorkflow/Pilot/OmnixPreview/Portable/Render | PASS, 28 testes com persistência SQL PGlite; testes PG17 reais são separados |
| `node --test deploy/render/release-guard.test.mjs` | PASS, 1 teste de fixtures; não houve aprovação humana real |
| `node deploy/render/release-guard.mjs` sem revisão configurada | Recusa esperada `RENDER_HUMAN_REVIEW_REQUIRED`, exit1 |
| `node scripts/audit-staging/gx030-security.mjs` | PASS: RSA/CSR, cache adversarial, decodificador limitado, CJS/UMD e consumidor Expo |
| dependency-smoke / security-compatibility / codegen-smoke | PASS, sem túnel, specs externas ou emissão de certificado remoto |
| Build API e dashboard | PASS local; warning pré-existente de chunk JS >500KB; não comprova capacidade de build Render |
| `node deploy/self-hosted/native-proof.mjs native9` | PASS em PG17.11/HTTPS com CA/hostname; restore novo e reinício com relatório intacto/sessão revogada |
| `pnpm audit --json` global | **FAIL**, exit1: 1 HIGH + 1 LOW; antes3HIGH+1MODERATE+1LOW |
| Docker Render e Compose | Sem Docker local; build/prova Linux configurados na CI, resultados no commit final da PR |
| E2E Render pela internet/upload/download/browser | **NÃO EXECUTADO**: recurso não criado por incompatibilidade TLS e revisão pendente |
| Controles de clientes reais | **BLOCKED**: matriz em OPERATIONS.md; login sintético não é identidade empresarial |

Os alertas restantes são `http-cache-semantics` e `deepmerge` nas cadeias móveis. Backports locais têm regressões; o scanner continua reportando as versões upstream. Nenhum input desses pacotes foi retido no bundle dedicado conforme o metafile. Isso não constitui análise de toda imagem/OS nem aceite humano do risco. Zod4.6.6 retido é distinto da versão vulnerável antiga; o catálogo e os schemas drizzle foram alinhados e testados sem ação financeira ou conexão a contas.

Tentativas de desenvolvimento mantidas nos registros locais: o teste inicial de Host falhou porque fetch normaliza Host para a URL local; foi corrigido para HTTP real e reexecutado. A primeira execução de patch-commit falhou no preinstall Windows por ausência de `sh`; a execução com Git Bash e a instalação frozen posterior passaram. Nenhum desses erros foi tratado como evidência positiva.

Fontes de prova versionadas: [inventário Render](evidence/render-inventory.json), [auditoria e alcance](evidence/security-local.json), [JSON bruto comprimido](evidence/dependency-audit.json.gz), [regressões de segurança](evidence/security-regressions.json), [aceitação local sintética](evidence/portable-local.json). Logs completos locais permanecem fora do Git; não publicar segredos/volumes/dumps. Os artifacts de CI contêm apenas recibos sanitizados de teste.
