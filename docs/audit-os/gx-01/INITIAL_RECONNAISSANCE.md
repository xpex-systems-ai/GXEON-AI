# GX-01 — Reconhecimento inicial (antes de alterações de código)

Data: 2026-10-19. Base: main, dbc29fff9a2c55487f85a83db597f41c493af7a8.
Issues lidas: #454 e #455, ambas abertas, sem comentários.

| Área | Estado | Evidência / limite |
| --- | --- | --- |
| Monorepo pnpm | IMPLEMENTADO | artifacts/*, lib/*, lib/integrations/* e scripts; Node 24 / pnpm 10.28.1 no CI. |
| Frontend | IMPLEMENTADO | artifacts/gxeon-dashboard: React 19, Vite 7, React Query; AuditOsPage e auditOsService. Há também mobile Expo e mockup-sandbox. |
| Backend | IMPLEMENTADO | artifacts/api-server: Express 5; app monta routes em /api; auditV1 publica /v1/audit/* e auditOs publica /audit-os/*. |
| Persistência | PARCIAL | lib/db: PostgreSQL + Drizzle, 14 tabelas Audit OS; provider Supabase REST alternativo limitado ao bootstrap. Intake comum faz inserts separados sem transação. Banco remoto não validado. |
| Intake/autorização | PARCIAL | Zod e flags de escrita presentes; POST /cases e leituras de casos/evidências sem autenticação na rota. Bootstrap e algumas mutações exigem tokens. |
| Execução/evidências/achados | PARCIAL | Serviços auditEvidenceFindingService e auditMissionRunnerService; runner voltado a baseline interno fixo; não prova auditoria genérica autorizada. |
| Revisão/exportação/fechamento | PARCIAL | audit_reports existe e runner cria INTERNAL_BRIEF; relatório baseline declara operatorReviewed=false. Não localizado ciclo por caso com revisão, export e fechamento atômico. |
| Contratos | PARCIAL | lib/api-zod/src/audit*.ts e lib/api-spec/openapi.yaml; relatórios JSON de contratos são documentos históricos, não testes executados nesta sessão. |
| Duplicidade | IMPLEMENTADO | Dois namespaces Audit OS (catálogo legado e v1), duas configs Railway API idênticas, muitos relatórios históricos e baseline separado do intake genérico. Dois templates de PR diferem só na caixa e colidem em Windows. |
| CI/CD | PARCIAL | build/typecheck/health em PR; Pages e runtime-sync em main/work; Android/video têm workflows próprios. runtime-sync escreve alguns estados fixos: não serão usados como prova. Sem suíte de integração Audit OS encontrada; somente smoke financeiro (fora do escopo). |
| HTML no domínio Vercel | IMPLEMENTADO (causa no código) | vercel.json compila só SPA e reescreve /(.*) para /index.html, incluindo /api. VITE_GXEON_API_BASE_URL ausente resulta em same-origin. Backend é serviço separado. |
| 404 Railway | NÃO VERIFICADO | #455 registra domínio não confirmado e serviços diferentes sem Audit OS. Não há prova de que artifacts/api-server esteja implantado no domínio documentado. Nenhuma URL de proxy será inventada. |
| Oferta/pagamentos | PLANEJADO | #454: contratação e pagamento de teste dependem de gates próprios. Fora desta entrega; nenhuma integração financeira será ativada. |
| Infra/credenciais | BLOQUEADO | Checkout local sem configuração de staging; gh CLI sem login, mas conector GitHub tem acesso. Windows sem WSL operacional; workspace exclui binários Windows. |

## Estratégia resultante
Preservar Express, React, Zod e tabelas existentes. Implementar ciclo mínimo delimitado de análise estática de configuração enviada explicitamente pelo operador (sem fetch de alvos, shell ou conectores), com escopo/consentimento registrado, persistência transacional, evidências com hash, achados rastreáveis, revisão por credencial independente e exportação. Testes locais usarão dados identificados como teste e banco descartável quando disponível. APIs privadas devem exigir autorização; falhas devem ser JSON redigido.

Domínio frontend e API continuam separados. Corrigir fallback e diagnóstico do transporte sem apontar para serviço não comprovado. Homologação remota e produção continuam condicionadas a ambiente comprovado e aprovação humana. A issue #454 não será declarada concluída por este recorte técnico.
