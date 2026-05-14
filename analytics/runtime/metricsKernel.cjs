const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(process.cwd(), '.gxeon_runtime');
const WF_FILE = path.join(DB_DIR, 'workflows.jsonl');
const EVT_FILE = path.join(DB_DIR, 'events.jsonl');

function readJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function summarize() {
  const wf = readJsonl(WF_FILE);
  const ev = readJsonl(EVT_FILE);

  const latest = new Map();
  for (const row of wf) latest.set(row.workflow_id, row);
  const latestStates = [...latest.values()];

  const byState = latestStates.reduce((acc, r) => ((acc[r.state] = (acc[r.state] || 0) + 1), acc), {});
  const attempts = wf.reduce((acc, r) => { acc[r.workflow_id] = Math.max(acc[r.workflow_id] || 0, r.attempt || 0); return acc; }, {});
  const retrying = Object.values(attempts).filter((a) => a > 0).length;

  const queueEvents = ev.filter((e) => e.type && e.type.startsWith('QUEUE_'));
  const workflowEvents = ev.filter((e) => e.type === 'WORKFLOW_STATE_CHANGED');

  return {
    generated_at: new Date().toISOString(),
    workflow_totals: {
      total_unique: latestStates.length,
      completed: byState.COMPLETED || 0,
      failed: byState.FAILED || 0,
      dead_lettered: byState.DEAD_LETTERED || 0,
      running: byState.RUNNING || 0,
      retrying_workflows: retrying
    },
    queue_metrics: {
      events_total: queueEvents.length,
      enqueued: queueEvents.filter((e) => e.type === 'QUEUE_ENQUEUED').length,
      dispatched: queueEvents.filter((e) => e.type === 'QUEUE_DISPATCHED').length,
      saturation_signal: queueEvents.filter((e) => e.type === 'QUEUE_ENQUEUED').length - queueEvents.filter((e) => e.type === 'QUEUE_DISPATCHED').length
    },
    event_metrics: {
      total_events: ev.length,
      workflow_state_events: workflowEvents.length
    },
    health_score: computeHealth(byState, retrying)
  };
}

function computeHealth(byState, retrying) {
  const completed = byState.COMPLETED || 0;
  const dead = byState.DEAD_LETTERED || 0;
  const failed = byState.FAILED || 0;
  const denom = completed + dead + failed || 1;
  const successRatio = completed / denom;
  const retryPenalty = Math.min(retrying * 0.05, 0.4);
  return Math.max(0, Math.min(100, Math.round((successRatio - retryPenalty) * 100)));
}

module.exports = { summarize };
