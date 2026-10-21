# GX-01 — validação executada

**Snapshot histórico da primeira implementação.** Para o estado atualizado após estabilização dos 68 + 10 diagnósticos, CI completo e demonstração visual, consultar a [validação do handoff mestre V1.0](VALIDACAO_MASTER_V1.md). As falhas registradas abaixo pertencem à execução inicial e foram preservadas para rastreabilidade.

Data: 2026-10-19. Base comparada: dbc29fff9a2c55487f85a83db597f41c493af7a8 (main). Resultado de liberação: BLOCKED. A PR é uma entrega técnica em rascunho para revisão, não aprovação de produção ou fechamento comercial.

| Check / comando | Resultado observado |
| --- | --- |
| `corepack pnpm install --lockfile-only --ignore-scripts --prefer-offline` | PASS; resolução com pnpm 10.28.1, lockfile atualizado somente para dependências de teste/contrato e metadados de depreciação. |
| `corepack pnpm --filter workspace --filter '@workspace/api-server...' --filter '@workspace/gxeon-dashboard...' --filter @workspace/scripts install --frozen-lockfile` | PASS; 375 pacotes do recorte, hooks executados. Tentativa inicial de instalar todo monorepo foi interrompida durante download. Mobile/mockup não foram instalados localmente. |
| `pnpm run typecheck:libs` | PASS. |
| `pnpm --filter @workspace/api-server exec tsc -p tsconfig.audit-v1.json --noEmit` | PASS, incluindo demonstração local. |
| `pnpm --filter @workspace/gxeon-dashboard exec tsc -p tsconfig.audit-v1.json --noEmit` | PASS. |
| `pnpm --filter @workspace/api-server run typecheck` | FAIL: 68 diagnósticos; arquivo base arquivado e compilado também produz 68. Nenhum novo par arquivo/código de diagnóstico. Uma mensagem difere apenas na ordem da união de propriedades. |
| `pnpm --filter @workspace/gxeon-dashboard run typecheck` | FAIL: 10 diagnósticos, idênticos à base. |
| `pnpm --filter @workspace/api-server run test:audit` | PASS: 9 testes, 0 falhas. Node test runner, HTTP real em loopback e PostgreSQL WASM/PGlite com diretório persistente reaberto. |
| PostgreSQL 17 nativo | Previsto no workflow audit-os-v1.yml; resultado remoto deve ser consultado no commit da PR. A evidência PGlite não comprova serviço remoto, RLS ou concorrência multiusuário PostgreSQL nativo. |
| `pnpm --filter @workspace/api-server run build` | PASS, esbuild. |
| `pnpm --filter @workspace/gxeon-dashboard run build` | PASS, Vite; warnings de sourcemap em componentes existentes e bundle >500 kB. |
| `pnpm run build` | FAIL na etapa de typecheck global; também relata node_modules ausente para mobile, fora da instalação local filtrada. Não é build global aprovado. |
| Lint | Monorepo não define script lint nem configuração de linter. Checagem Prettier dos arquivos novos executada separadamente; não substitui lint semântico. |
| Rotas/contratos/auth | PASS nos testes HTTP para o fluxo GX-01 e health/catalog: JSON, 401/403, UUID, validação de consentimento, flags, revisão, idempotência, referências e hashes. |
| Interface no navegador | BLOQUEADO: ferramenta de navegador não conseguiu anexar webview local. Vite iniciou; interação visual e download por clique não comprovados. Transporte HTML/erro é coberto por teste. |
| API pública atual | Quatro URLs Vercel retornaram HTTP 200 text/html e o mesmo hash. Health Vercel e URLs Railway tiveram falhas de rede nesta sessão. Não há prova de backend Audit OS público funcional. |
| Staging/produção | NÃO VERIFICADO; sem banco, RLS ou deploy remoto alterados. O conector Railway list-projects ficou indisponível nesta sessão. |

## Evidência reproduzível

- [Relatório exportado de teste](evidence/test-report.json): marcado testData=true, com UUID real do banco de teste, revisão de fixture, checks, conteúdo enviado, hashes, achados e referências.
- [Chamadas HTTP](evidence/http-calls.json): métodos, caminhos, status e Content-Type, sem tokens.
- [Leituras públicas](evidence/public-routes.json): URLs públicas, status, Content-Type e hashes; timeout permanece NÃO VERIFICADO.
- [Comparação de typecheck](evidence/typecheck-comparison.json): diagnósticos antes/depois, sem ocultar os bloqueios da base.

## Ambiente local e limites

Windows, Node 24.19.0, pnpm 10.28.1. O workspace exclui binários Windows; para executar build/testes sem alterar a política Linux do repositório, foram instalados **somente em work/native-tools**, fora do checkout, os equivalentes Windows das versões já fixadas (esbuild 0.27.3, oxide 4.3.0, lightningcss 1.32.0 e rollup 4.60.3). ESBUILD_BINARY_PATH e NODE_PATH apontaram para esses binários locais. O hook shell da instalação foi executado com Git Bash. Nenhum desses ajustes locais é configuração de produção.

A primeira integração encontrou erro de inferência de enum no UPDATE de estado; corrigido com cast PostgreSQL explícito. A suíte final foi repetida e passou. Hash de revisão/export usa serialização canônica para sobreviver à normalização JSONB. Falhas SQL são redigidas nas respostas.

## Checklist de aceitação

- [x] Fluxo delimitado demonstrável por HTTP com dados de teste identificados.
- [x] Escopo/consentimento, evidência com hash, achados referenciados e estado final persistidos.
- [x] Rollback, reabertura, repetição idempotente e integridade verificados localmente.
- [x] Operador e revisor distintos, permissões negativas e flags validados em teste.
- [x] Relatório JSON exportável e rastreável.
- [x] Builds dos dois aplicativos envolvidos e tipos do recorte aprovados.
- [ ] Typecheck/build globais aprovados (68 + 10 erros legados; mobile sem instalação local).
- [ ] CI PostgreSQL nativo confirmado no commit final.
- [ ] Interface validada visualmente.
- [ ] Backend/domínio e persistência de staging comprovados, incluindo acesso mínimo/RLS aplicável.
- [ ] Revisão independente da PR e aprovação humana de release.

Nenhum deploy, merge, migração remota, cobrança, carteira, webhook ou conector financeiro foi executado. Ações sensíveis e produção permanecem sob revisão humana. Issue #454 continua fora do aceite comercial desta entrega; #455 exige homologação remota depois da correção versionada.

Checagens finais: Prettier nos 13 arquivos novos selecionados passou; `git diff --check` passou. Varredura dos 34 arquivos alterados por padrões de chave privada, token LIVE, token GitHub e URL PostgreSQL remota não encontrou correspondências. A varredura é heurística e não substitui revisão independente. O único ajuste local de índice foi ocultar a colisão de caixa entre os templates de PR já presentes na base Windows; esses templates não integram o commit.
