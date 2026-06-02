# WORKER_MAP.md — MISSÃO 02B GXEON Runtime Mapping Protocol

> Escopo: auditoria estática/local. Nenhum worker foi conectado a serviços externos.

## 1. Workers e executores identificados

| Worker/executor | Arquivo | Tipo | Trigger | Status |
|---|---|---|---|---|
| `runOnce(jobs)` | `runtime/workers/worker.cjs` | Worker local síncrono/assíncrono | Chamada direta via ferramenta/script | Ativo localmente. |
| `QueueDispatcher` | `runtime/dispatcher/queueDispatcher.cjs` | Dispatcher em memória | `enqueue` + `drain` | Ativo localmente. |
| `runWorkflow(def, opts)` | `runtime/engine/workflowEngine.cjs` | Motor de workflow | Dispatcher ou chamada direta | Ativo localmente. |
| `executeTask(input)` | `runtime/executors/demoExecutor.cjs` | Executor demo | Workflow engine | Ativo localmente; falha quando `should_fail=true`. |
| `compensate(workflow)` | `runtime/compensation/compensator.cjs` | Compensador | Workflow failure após retries | Ativo localmente. |
| `runSchedulerCycle` | `server/runtime/autonomousRevenueScheduler.cjs` | Scheduler de receita | API `/runtime/tasks/run-cycle` ou chamada direta | Mapeado; depende de runtimes financeiros. |
| `runXRadarScanCycle` | `server/runtime/xRadarScheduler.cjs` | Scheduler X-Radar scan | API `/x-radar/scan-cycle` | Mapeado. |
| `runXRadarRevenueCycle` | `server/runtime/xRadarScheduler.cjs` | Scheduler X-Radar revenue | API `/x-radar/revenue-cycle` | Mapeado. |
| `processPendingPixFollowups` | `server/runtime/mercadoWebhookRuntime.cjs` | Processador de followups PIX | API `/runtime/pix/followups/process` | Mapeado; Mercado Pago env sensível. |
| `executeAutonomousPixRun` | `server/runtime/paymentOrchestrator.cjs` | Orquestrador PIX | API `/runtime/payments/auto` | Mapeado; Mercado Pago/DB. |

## 2. Fluxo de execução local do worker base

```text
jobs[]
  -> runtime/workers/worker.cjs runOnce()
    -> QueueDispatcher.registerQueue('execution')
    -> QueueDispatcher.enqueue(job)
      -> emitEvent('QUEUE_ENQUEUED')
      -> saveEvent(.gxeon_runtime/events.jsonl)
    -> QueueDispatcher.drain('execution')
      -> emitEvent('QUEUE_DISPATCHED')
      -> runWorkflow(job)
        -> states: CREATED -> VALIDATED -> DISPATCHED -> RUNNING/RETRYING
        -> executeTask(job)
        -> COMPLETED or FAILED -> WAITING -> COMPENSATING -> DEAD_LETTERED
        -> saveWorkflowState(.gxeon_runtime/workflows.jsonl)
```

## 3. Estados do workflow

`CREATED`, `VALIDATED`, `DISPATCHED`, `RUNNING`, `WAITING`, `RETRYING`, `COMPENSATING`, `COMPLETED`, `FAILED`, `DEAD_LETTERED`.

## 4. Triggers mapeados

| Trigger | Entrada | Worker/scheduler acionado | Observação |
|---|---|---|---|
| Script local | `tools/run_live_runtime.cjs` | `runOnce` | Executa job OK e job com falha demo. |
| API protegida | `POST /api/v1/runtime/tasks/enqueue` | `enqueueTask` | Requer `FINANCIAL_AUTH_TOKEN`. |
| API protegida | `POST /api/v1/runtime/tasks/run-cycle` | `runSchedulerCycle` | Requer escopo `financial:revenue:scheduler`. |
| API protegida | `POST /api/v1/runtime/tasks/generate-from-radar` | `generateSellableTasksFromRadar` | Requer escopo `financial:revenue:radar`. |
| API protegida | `POST /api/v1/x-radar/scan-cycle` | `runXRadarScanCycle` | Requer escopo `financial:x-radar:scan`. |
| API protegida | `POST /api/v1/x-radar/revenue-cycle` | `runXRadarRevenueCycle` | Requer escopo `financial:x-radar:revenue`. |
| API protegida | `POST /api/v1/runtime/pix/followups/process` | `processPendingPixFollowups` | Requer escopo `financial:payments:followups`. |
| GitHub Actions | `.github/workflows/gxeon-runtime-sync.yml` | Node inline requiring runtime modules | Gatilho CI/manual; não conecta externamente por si só. |

## 5. Dependências internas

| Worker | Dependências |
|---|---|
| `runOnce` | `QueueDispatcher`. |
| `QueueDispatcher` | `runWorkflow`, `emitEvent`. |
| `runWorkflow` | `saveWorkflowState`, `emitEvent`, `executeTask`, `compensate`. |
| `executeTask` | Nenhuma dependência externa. |
| `compensate` | Nenhuma dependência externa. |
| Schedulers de receita | `runtimeMemory`, `paymentRuntime`, `creditRuntime`, `commissionEngine`, `xRadarEngine`, `subscriptionRuntime`. |
| X-Radar scheduler | `xRadarEngine`, `revenueEngineRuntime`. |
| PIX followups | `runtimeMemory`, `mercadoPagoAdapter`, `subscriptionRuntime`, `financialDb`. |

## 6. Pontos de falha

| Risco | Classificação | Impacto |
|---|---|---|
| Persistência JSONL local (`.gxeon_runtime`) sem bloqueio transacional | Medium | Corrupção/concorrência em execução paralela. |
| Dispatcher em memória sem fila durável | High | Perda de jobs em restart. |
| Worker demo não representa executor de produção | Medium | Métrica de execução real pode divergir. |
| Schedulers financeiros acoplados a Mercado Pago/DB para monetização real | Critical | Sem env completa, mutações críticas ficam bloqueadas. |
| Rate limit/idempotência em memória | Medium | Perde estado após restart; proteção horizontal limitada. |

## 7. Recuperação mapeada

- Workflow base possui retry limitado por `max_retries` e compensação antes de `DEAD_LETTERED`.
- Recovery runtime (`runtimeRecovery.cjs`) fornece status/diagnóstico de recuperação, mas não há worker durável externo neste escopo.
- Reexecução de jobs precisa ser feita por trigger/script/API; não foi identificado consumidor contínuo persistente de fila.
