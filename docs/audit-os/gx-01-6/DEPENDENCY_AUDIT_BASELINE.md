# Baseline de dependências GX-01.6

24/10/2026, Node 24.19.0, pnpm 10.28.1. Comando pnpm audit --json, exit 1. No HEAD 5b58ead: 64 ocorrências (40 high, 18 moderate, 6 low, 0 critical), 63 entradas de advisory (53 IDs GHSA distintos). Referência GX015 58/38 é histórica; o feed mudou, não o código de entrada. [JSON íntegro comprimido](evidence/baseline-audit.json.gz). minimumReleaseAge=1440 permanece ativo.

Novo body-parser GHSA-27r3-jxmh-p828 é alcançável no parser dedicado com credencial válida e no parser geral; prioridade P0 para correção compatível 2.3.0→2.4.0 e recusa de compressão desnecessária. Autenticação antes do parser dedicado reduz exposição, mas não corrige a biblioteca. [Advisory oficial](https://github.com/advisories/GHSA-27r3-jxmh-p828).

Zod GHSA-mrhx-c7xc-m3w5 afeta 3.25.76. O feed mostra caminho dashboard, mas lib/api-zod também o declara e a API o importa: não confiar no único path como prova de ausência. Prioridade P1 runtime com payload delimitado; migrar 4.x indiscriminadamente quebraria contratos. Revisar fail-fast antes de validação de coleções e manter advisory residual aberto até correção/aceite formal. [Advisory oficial](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

Patches selecionáveis do pipeline ficam nas mesmas linhas: Undici6, ws6/7, js-yaml3, brace-expansion2, tar7, xmldom0.8/0.9, compression1 e fast-uri3. Cada caminho/advisory será mantido na matriz, com vetor, exposição e teste exigido. XML usa backports por linha0.x, sem forçar0.8→0.9. Image-size1→2, uuid antigo→11+, esbuild0.27→0.28 e seletorCSS6→7 exigem compatibilidade própria; node-forge/http-cache-semantics sem patch reconhecido no feed continuam riscos. [Metadados oficiais de versões/datas](evidence/package-release-candidates.json).

P0/P1/P2 são prioridade contextual, não reclassificação de severidade e não aceite. Nenhum risco foi aceito por Codex. O revisor independente continua NÃO DESIGNADO.
