# GX-01.5 — snapshot inicial

2026-10-21, America/Sao_Paulo. PR #456 OPEN/DRAFT, merged=false. HEAD remoto e clone novo: **4016b8d32ff1e959e975bc1612a9821d85bfe2af**; base main dbc29fff9a2c55487f85a83db597f41c493af7a8. Opção B foi escolhida pelo usuário; não autoriza criar recursos/deploys.

Os quatro workflows deste SHA foram reconsultados: Typecheck 39495504301, Build 39495504213, Audit OS V1 39495504211 e Monorepo Health 39495504298, success. São resultados históricos do SHA inicial; não aprovam código posterior. REST per_page=100: 42 statuses, **29 falhas/13 sucessos/0 pendentes**, 28 check runs; o pendente anterior terminou. Não houve alteração de projeto/check nesta consulta. Revisão independente não designada, sem review humano registrado.

Checkout anterior permanece em 7687bf248cfc6034af198926a2b07d045ca9b715, com package.json, lockfile, workspace e docs GX-01.4 locais preservados. Nenhum reset, clean, prune, remoção de cache, pull ou sobrescrita. Foi observado espaço livre de aproximadamente 20 GB e criado clone separado GXEON-AI-gx015. O Windows colide dois templates da PR que diferem somente em maiúsculas/minúsculas e marca um template como modificado; não será incluído na mudança. O CI Linux é a referência de checkout integral limpo.

Foram inspecionados diff GX-01.4, seus nove documentos, contratos, composição API, serviço transacional, middleware de papéis, staging, testes e workflows. API geral importa dezenas de rotas, incluindo financeiras/conectores, e dois autorunners; CORS geral é aberto. Isso justifica entrypoint dedicado, sem mudar/remover outros módulos. Novo perfil deve carregar somente health/ready/workflow, exigir credenciais distintas, origem restrita e flags seguras, sem servidor de testes em produção.

| Classificação | Evidência inicial |
| --- | --- |
| IMPLEMENTADO | Fluxo estático autorizado, transações e relatórios íntegros; guards legados |
| TESTADO | Suites do SHA inicial no CI; nenhum PASS carregado a mudanças futuras |
| PROPOSTO | Vercel dedicado + API Railway dedicada + PostgreSQL 17 privado; blueprint sem aplicar |
| BLOQUEADO | Download real, revisão independente, riscos altos, configuração externa e aprovação de piloto |

Audit canônico de referência: pnpm 10.28.1, 74 ocorrências (51 altas/19 moderadas/4 baixas), 0 críticas, exit 1. Reauditar no checkout novo antes de corrigir; registrar feed/CLI e caminhos/alcance. Nenhum aceite automático.

Escopo: hardening do entrypoint, blueprint, recuperação isolada, dependências justificadas, evidências e plano de piloto. Sem merge, produção, contratação, DNS, banco compartilhado, dados de cliente, exclusão protegida ou ativação financeira. Gate global inicial **BLOCKED**.
