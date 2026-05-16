const { runWorkflow } = require('../engine/workflowEngine.cjs');
const { emitEvent } = require('../telemetry/events.cjs');

class QueueDispatcher {
  constructor() { this.queues = new Map(); }
  registerQueue(name) { if (!this.queues.has(name)) this.queues.set(name, []); }
  enqueue(name, job) {
    this.registerQueue(name);
    this.queues.get(name).push(job);
    emitEvent('QUEUE_ENQUEUED', { queue: name, workflow_id: job.workflow_id });
  }
  async drain(name) {
    this.registerQueue(name);
    const queue = this.queues.get(name);
    const out = [];
    while (queue.length) {
      const job = queue.shift();
      emitEvent('QUEUE_DISPATCHED', { queue: name, workflow_id: job.workflow_id });
      out.push(await runWorkflow(job));
    }
    return out;
  }
}

module.exports = { QueueDispatcher };
