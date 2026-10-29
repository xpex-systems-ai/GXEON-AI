# GX019 — independência operacional do Audit OS

Diretriz do fundador em 26/10/2026: seguir sem depender da Railway, usando infraestrutura controlada pela XPeX. Aprovação de orçamento anterior não é mais um gate para compilar ou executar o runtime privado. Não foram feitas novas tentativas de assinatura nem alterados os projetos legados.

Implementado: modo privado Node24/PG17, host de DB explícito, resolução limitada a rede privada com IP fixado por conexão e verificação TLS do hostname original, segredos em arquivos, HTTPS próprio e frontend/API no mesmo processo. A origem `/omnix` serve a aplicação; `/api` inexistente retorna JSON, sem fallback HTML. Raiz redireciona ao portal e rotas financeiras não são expostas. O modo Railway anterior é um adaptador compatível, não requisito do modo privado.

Entrega executável: [instruções e Compose](../../../../deploy/self-hosted/README.md), Dockerfiles com imagens oficiais por digest, inicializador sintético, verificação HTTPS, restauração em DB novo, teste de reinício e exportador de pacote standalone com manifesto SHA256. O runtime não contém credenciais de provedor, cliente financeiro, autorização de deploy remoto ou ativação automática de produção.

| Superfície | Estado |
|---|---|
| Núcleo Audit OS | Node/PG privados; nenhuma conta cloud requerida |
| Portal | compilado e servido com a API, cookies Secure e revisão sintética distinta |
| Persistência | PG17 com papel mínimo; DB não publicado, TLS obrigatório |
| Dependências abertas | Node, PG e bibliotecas npm continuam necessárias; builds congelados e imagens fixadas |
| Conta Railway | deixou de ser dependência de execução; histórico de bloqueio preservado |
| Site corporativo | Vite estático exportável; hospedagem atual é referência opcional; APIs institucionais exigem adaptador próprio quando migradas |
| Outros módulos/provedores do monorepo | não foram reescritos nem declarados independentes nesta entrega |
| Operação global pública | requer host/IP, domínio, acesso e TLS confiável da infraestrutura própria; não há URL nova inventada |
| Dados reais | permanecem bloqueados por IAM/recuperação, privacidade e aceite operacional |

Validações do candidato `30bdd5cd3b52697f10c0181ab019b79d8282b579`:

| Comando/check | Resultado |
|---|---|
| `pnpm install --frozen-lockfile`, pnpm10.28.1 | PASS nos jobs Linux e Docker; lock e release-age preservados |
| `pnpm run typecheck`; `typecheck:audit-tests` | PASS global e testes |
| `pnpm run lint:audit` | PASS49 arquivos/zero erros |
| `test:audit` | 24/24 PGlite;25/25 PostgreSQL |
| `test:audit-pilot-db` | 1/1 papel/grants |
| `pnpm run build` | PASS monorepo Linux; API/dashboard locais PASS; aviso de chunk >500KB |
| Compose build/up + `verify.mjs compose` | PASS TLS, rotas, roles, isolamento, exportação e restore |
| Compose restart + `verify-restart.mjs compose` | PASS API+PG, relatório intacto, novo login/histórico |
| `native-proof.mjs native5` | PASS Node24.19.0/PG17.11, bundle isolado e sessão invalidada no reinício |
| Staging anterior, recuperação, restore, codegen e compatibilidade | PASS preservados |
| Site build + cinco suites existentes | PASS local e checks de engenharia no GitHub |
| `pnpm audit --json` | FAIL3HIGH/1MODERATE; sem aceitação implícita |

Quatro workflows/sete jobs PASS no candidato. O checkout Docker `28529cb21f82014f4cb69855091665042a9ce378` é merge **sintético de CI**, com pais main e candidato conferidos via GitHub; não é merge real. [Prova de checkout](evidence/portable/checkout-proof.json), [logs/recibos com hashes](evidence/portable/manifest.json). HEAD documental posterior e seus checks são informados na PR.

Falhas preservadas: primeiro typecheck corrigido (redeclaração e tipo de fixture TLS); Native1 falhou no transporte e o driver passou a encerrar conexões HTTPS entre chamadas/SQL síncrono; Native4 excedeu30s em initdb antes da API. O harness agora permite120s somente na inicialização e informa a fase; não reduz TLS nem reutiliza cluster incompleto. Native3/Native5 e os dois ciclos Docker posteriores passaram. Logs anteriores não foram substituídos.

O [SBOM dedicado atual](evidence/portable/runtime/dedicated-runtime.cdx.json) tem84 componentes/294 inputs retidos e zero correspondências conhecidas ao [feed consultado](evidence/portable/workspace-audit-summary.json). Não é scan de Node/OS/imagem. Tokens, códigos, dumps, chaves e certificados privados não foram publicados. A colisão Windows preexistente `.github/PULL_REQUEST_TEMPLATE.md` foi excluída dos commits.

Limites: não é independência de software aberto, hardware, rede ou DNS. Não é comprovação de múltiplas regiões, certificação ou novo deploy produtivo. O exportador inclui apenas o bundle dedicado, frontend e contratos de operação; arquivos privados, dumps e chaves são excluídos. O SBOM JS e o audit global têm escopos diferentes; os riscos de dependências registrados permanecem.
