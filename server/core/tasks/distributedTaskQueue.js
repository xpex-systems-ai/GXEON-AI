import eventBus, { EVENT_TYPES } from '../events/eventBus.js';
import decisionEngine from '../decision/decisionEngine.js';
import vectorMemory from '../memory/vectorMemory.js';

export const TASK_STATES = Object.freeze({
  QUEUED: 'queued',
  ROUTED: 'routed',
  EXECUTING: 'executing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying'
});

class DistributedTaskQueue {
  constructor() {
    this.queue = [];
    this.history = [];
  }

  create(input, validation = {}) {
    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: input.type,
      payload: input.payload || {},
      source: input.source || 'api',
      priority: Number(input.priority || 0),
      state: TASK_STATES.QUEUED,
      attempts: 0,
      max_attempts: Number(input.max_attempts || 3),
      trust_score: validation.trust_score ?? 0.5,
      priority_score: validation.priority_score || 0,
      value_usd: Number(input.value_usd || input.estimated_value_usd || 0),
      callback_url: input.callback_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      execution_proofs: [],
      logs: []
    };
    task.priority_score = task.priority_score || decisionEngine.scoreTask(task);
    this.queue.push(task);
    this.sort();
    vectorMemory.remember('tasks', task);
    eventBus.publish(EVENT_TYPES.TASK_CREATED, task);
    return task;
  }

  sort() {
    this.queue = decisionEngine.rankTasks(this.queue);
  }

  next() {
    this.sort();
    return this.queue.find((task) => [TASK_STATES.QUEUED, TASK_STATES.RETRYING].includes(task.state)) || null;
  }

  update(taskId, patch) {
    const task = this.queue.find((entry) => entry.id === taskId) || this.history.find((entry) => entry.id === taskId);
    if (!task) return null;
    Object.assign(task, patch, { updated_at: new Date().toISOString() });
    return task;
  }

  complete(taskId, proof) {
    const index = this.queue.findIndex((task) => task.id === taskId);
    if (index === -1) return null;
    const [task] = this.queue.splice(index, 1);
    task.state = TASK_STATES.COMPLETED;
    task.execution_proofs.push(proof);
    task.updated_at = new Date().toISOString();
    this.history.push(task);
    if (this.history.length > 1000) this.history.shift();
    vectorMemory.remember('executions', task);
    eventBus.publish(EVENT_TYPES.TASK_EXECUTED, { task_id: task.id, proof });
    return task;
  }

  fail(taskId, error) {
    const task = this.update(taskId, { state: TASK_STATES.FAILED });
    if (!task) return null;
    task.logs.push({ level: 'error', message: error?.message || String(error), ts: new Date().toISOString() });
    if (task.attempts < task.max_attempts) {
      task.state = TASK_STATES.RETRYING;
      task.attempts += 1;
      task.priority_score = decisionEngine.scoreTask(task);
    } else {
      const index = this.queue.findIndex((entry) => entry.id === task.id);
      if (index !== -1) this.history.push(...this.queue.splice(index, 1));
    }
    return task;
  }

  list() {
    return [...this.queue, ...this.history].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  getQueue() {
    return { depth: this.queue.length, tasks: this.queue };
  }

  getHistory() {
    return { count: this.history.length, tasks: this.history.slice(-200) };
  }
}

export const distributedTaskQueue = new DistributedTaskQueue();
export default distributedTaskQueue;
