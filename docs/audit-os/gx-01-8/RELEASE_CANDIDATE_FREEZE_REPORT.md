# GX-01.8 — candidato e proposta de CODE FREEZE

Data-base: 25/10/2026. Candidato de código: `d71996bc73502f6c2352c0c687ef1cba90012ea4`. PR [#456](https://github.com/xpex-systems-ai/GXEON-AI/pull/456) DRAFT. Preparação de engenharia; liberação global NO-GO.

O candidato revisável é **d71996bc73502f6c2352c0c687ef1cba90012ea4**. Proposta: manter CODE FREEZE durante a revisão independente, permitindo somente correção de defeito demonstrado, regressão correspondente e documentação de evidência. A proposta não é aceite humano.

| Delta desde GX-01.7 | Resultado |
| --- | --- |
| Entrada inicial | 1dc8e920a7d47d315c9482002ff9434667b596bf; nenhum commit posterior encontrado na reconciliação |
| Teste de assurance | audit Pilot.test.ts: URL e instruções em JSON permanecem dados; canary HTTP próprio recebeu zero chamadas; localizador file: inválido retorna 400 |
| Metadado do build | build.mjs passa a registrar imports externos reais do metafile; revela também o opcional pg-native |
| Contratos, dependências e lógica do produto | Nenhuma alteração; lockfile e contratos sem diff |
| Bundle dedicado | 2.153.148 bytes; SHA256 48819cdcea62dde340e2ff0071c0c11bbdfbd1e671842c383ccb67c4f896ff1f; idêntico antes/depois do metadado |

Arquivos de código: [build.mjs](https://github.com/xpex-systems-ai/GXEON-AI/blob/d71996bc73502f6c2352c0c687ef1cba90012ea4/artifacts/api-server/build.mjs) e [audit Pilot.test.ts](https://github.com/xpex-systems-ai/GXEON-AI/blob/d71996bc73502f6c2352c0c687ef1cba90012ea4/artifacts/api-server/src/tests/auditPilot.test.ts). O segundo fecha uma lacuna de prova de segurança; o primeiro fecha a omissão dos externos no inventário. Não foi necessário alterar a lógica do serviço ou repetir upgrade major.

O HEAD final inclui documentação posterior ao candidato. O recibo final no corpo da PR registra o SHA final, consultas de CI e links dos jobs depois desse commit. Não gravamos o próprio hash dentro do commit que o contém: isso criaria referência circular. Os testes locais pré-commit têm `sourceDirty=true`; [candidate-binding.json](evidence/candidate-binding.json) preserva hashes reais e normalizados LF iguais aos blobs do candidato. O CI de checkout limpo constitui prova separada.

Preservados: checkouts GX016/GX017, evidências anteriores, bancos, dumps e caches compartilhados. No Windows existe colisão de caixa dos templates da PR; cinco relatórios raiz foram regenerados pelo health. Esses arquivos locais ficam fora dos commits GX018. Nenhum reset, clean, prune ou exclusão foi utilizado. O build monorepo integral será executado pelo workflow Linux existente em runner descartável, pois o script móvel local limpa caches.

Evidências: [code-freeze.json](evidence/code-freeze.json), [candidate-binding.json](evidence/candidate-binding.json), [local-command-matrix.json](evidence/local-command-matrix.json). Critério para reabrir o freeze: achado independente ou falhareproduzível; novo SHA invalida aceite anterior e exige reconsulta de CI. Revisor e proprietário ainda precisam confirmar o candidato e as condições de revisão.
