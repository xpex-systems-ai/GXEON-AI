const { saveWorkflowState } = require('../persistence/store.cjs');
const { emitEvent } = require('../telemetry/events.cjs');
const { executeTask } = require('../executors/demoExecutor.cjs');
const { compensate } = require('../compensation/compensator.cjs');

const STATES = ['CREATED','VALIDATED','DISPATCHED','RUNNING','WAITING','RETRYING','COMPENSATING','COMPLETED','FAILED','DEAD_LETTERED'];

function setState(ctx, state, extra = {}) {
  if (!STATES.includes(state)) throw new Error(`INVALID_STATE:${state}`);
  const row = { workflow_id: ctx.workflow_id, state, at: new Date().toISOString(), attempt: ctx.attempt, ...extra };
  saveWorkflowState(row);
  emitEvent('WORKFLOW_STATE_CHANGED', { workflow_id: ctx.workflow_id, state, attempt: ctx.attempt });
}

async function runWorkflow(def, opts = {}) {
  const ctx = { workflow_id: def.workflow_id || `wf_${Date.now()}`, attempt: 0, max_retries: opts.max_retries ?? 2 };
  setState(ctx, 'CREATED');
  setState(ctx, 'VALIDATED');
  setState(ctx, 'DISPATCHED');

  while (ctx.attempt <= ctx.max_retries) {
    try {
      setState(ctx, ctx.attempt === 0 ? 'RUNNING' : 'RETRYING');
      const result = await executeTask(def);
      setState(ctx, 'COMPLETED', { result });
      return { success: true, workflow_id: ctx.workflow_id, result };
    } catch (err) {
      setState(ctx, 'FAILED', { error: err.message });
      if (ctx.attempt >= ctx.max_retries) {
        setState(ctx, 'COMPENSATING');
        await compensate(ctx);
        setState(ctx, 'DEAD_LETTERED', { reason: err.message });
        return { success: false, workflow_id: ctx.workflow_id, dead_lettered: true, error: err.message };
      }
      ctx.attempt += 1;
      setState(ctx, 'WAITING');
    }
  }
}

module.exports = { runWorkflow, STATES };
