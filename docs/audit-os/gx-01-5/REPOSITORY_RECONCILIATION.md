# GX-01.5 — reconciliação do repositório

Referência confirmada na API GitHub e clone novo: 4016b8d32ff1e959e975bc1612a9821d85bfe2af; branch codex/gxeon-audit-os-v1-gx01; base main dbc29fff9a2c55487f85a83db597f41c493af7a8. PR #456 DRAFT/OPEN, sem merge; quatro workflows success neste SHA, nenhum commit posterior observado no início.

O diretório anterior GXEON-AI está em 7687bf248cfc6034af198926a2b07d045ca9b715 e contém três arquivos modificados e docs GX-01.4 não rastreados. Ele não foi sincronizado nem sobrescrito. Nenhum cache/evidência/banco foi excluído. A instrução GX-01.5 proíbe limpeza automática; foi respeitada.

O espaço disponível foi consultado em leitura: aproximadamente 20 GB em C:. Novo clone independente em GXEON-AI-gx015, obtido de GitHub, mesma branch. Instalação frozen usa pnpm 10.28.1, não o pnpm global 11. O clone Windows apresenta colisão preexistente entre .github/PULL_REQUEST_TEMPLATE.md e .github/pull_request_template.md; um aparece modificado por limitação do filesystem. Sem correção ou staging desse arquivo não relacionado. Qualquer snapshot local deve registrar sourceDirty de forma honesta; integração final em checkout Linux limpo.

Comandos: git status --short --branch e git rev-parse HEAD no diretório antigo (leitura); Get-PSDrive (leitura); git clone --single-branch --branch codex/gxeon-audit-os-v1-gx01 no novo diretório; git diff --stat 7687bf2..4016b8d; inspeção dos nove docs GX-01.4, scripts e contratos. Não foram encontrados AGENTS.md no clone.

O commit de implementação e o HEAD de entrega serão registrados com seus próprios testes, distinguindo branch SHA do merge de checkout do CI. O diretório antigo deve continuar preservado; uma futura reconciliação manual deve comparar conteúdos antes de incorporar/arquivar qualquer alteração, sem reset/clean/prune.
