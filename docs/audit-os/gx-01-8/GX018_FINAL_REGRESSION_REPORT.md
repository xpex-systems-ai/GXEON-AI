# GX-01.8 — regressão local e fechamento de CI

Data-base: 25/10/2026. Candidato de código: `d71996bc73502f6c2352c0c687ef1cba90012ea4`. PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT. Preparação de engenharia; liberação global NO-GO.

Matriz de comandos executados: [local-command-matrix.json](evidence/local-command-matrix.json), logs ao lado. Node 24.19.0, pnpm 10.28.1, lockfile congelado, minimum Release Age 1440 preservado. Helpers locais usam binário oficial esbuild Windows 0.28.1 já disponível; nenhum pacote/lock alterado. PG 17.11 em cluster GX 018 próprio, sem tocar clusters anteriores.

| Verificação | Resultado observado |
| --- | --- |
| pnpm install --frozen-lockfile | PASS, resolução congelada |
| lint:audit / typecheck / typecheck:audit-tests | PASS; lint 32 arquivos 0 erros |
| build:libs / build API / build dashboard | PASS; dashboard avisa chunk>500 k, sem falha |
| PGlite herdado antes do delta | 16/16 PASS |
| PGlite com novo negativo de assurance | 17/17 PASS |
| PostgreSQL nativo integração | 18/18 PASS |
| Grants/preflight dedicado | 1/1 PASS |
| Codegen isolado Zod 4 | PASS, geração/typecheck/validação real |
| Compatibilidade | 8 grupos PASS, inclusive caminho real Buffer/getAssetDataMetro, Router PNG/Babel; sem túnel |
| Staging | 14 grupos PASS: auth/roles/consent/JSON/locks/idempotência/rollback/imutabilidade/ref/report/restart |
| Recovery / backup-restore | PASS local, destino novo preservado |
| Download do browser e mesmo arquivo pós restart/pós restore | PASS; 4.185 bytes; recibos separados do HTTP de CI |
| Healthreport | comando PASS; arquivos gerados não são declaração de release |
| Audit global | **FAIL exit 1**,4 ocorrências 3 HIGH 1 MODERATE; não suprimido |
| Build monorepo Linux | workflow existente do HEAD final deve ser consultado após commit documental; não transcrever resultado inicial como final |
| Testes remotos / TLS real / identidade entre empresas | NOT TESTED / autorização e trabalho futuro requeridos |

O HEAD final inclui documentação posterior ao candidato. O recibo final no corpo da PR registra o SHA final, consultas de CI e links dos jobs depois desse commit. Não gravamos o próprio hash dentro do commit que o contém: isso criaria referência circular. Os testes locais pré-commit têm `sourceDirty=true`; [candidate-binding.json](evidence/candidate-binding.json) preserva hashes reais e normalizados LF iguais aos blobs do candidato. O CI de checkout limpo constitui prova separada.

Build integral local não foi executado porque script móvel remove caches. CI Linux em runner descartável executa a verificação integral existente. Compatibilidade cobre integração real do caminho Metro testado, não teste APK/device ou publicação mobile. O teste de conteúdo inerte inclui servidor canary loopback e assert de zero chamadas; rejeita file: como JSON; nenhuma busca de recursos privados é feita pelo check.

Falhas intermediárias de preparação preservadas no recibo: diffmediaGitHub406 foi substituído por diff de objetos Git autenticados; enumeraçãoinicial SBOM encontrou manifesto anônimo zod/v4 e foi corrigida subindo ao manifesto nomeado; schema opcional inválido de conector Vercel foi corrigido sem mutação; empacotamento interrompeu em arquivojáexistente/diferença CRLF e passou somente após comparação explícita. Não são testes de produto convertidos em PASS. Audit exit 1 permanece FAIL. Nenhuma falha substantiva da suíte foi ocultada.

Fechamento: PRcontinua DRAFT; consultar novamente os quatro workflows/seisjobs no **HEAD final depois da documentação**, reviews, check-runs e statuses paginados. Guardar recibo na PR/local com SHA final para evitar autorreferência Git. Se não concluídos, relatar estado real e manter gate E 15 aberto; não usar CI do candidato como substituição.

CI do candidato (ainda não substitui CI do HEAD documental final): [quatro workflows SUCCESS](evidence/candidate-complete-ci.json), [checkout limpo e pais do merge sintético](evidence/candidate-complete-checkout-proof.json), seis logs de jobs preservados e artefatos em evidence/ci-candidate/. Não houve merge real da PR. O selo final deve repetir essa consulta após documentação.
