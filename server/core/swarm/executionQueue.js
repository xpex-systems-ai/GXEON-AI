class ExecutionQueue {
  constructor() {
    this.active = new Map();
    this.completed = [];
  }

  start(task, agent) {
    const execution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      task_id: task.id,
      agent_id: agent.id,
      started_at: new Date().toISOString(),
      state: 'executing'
    };
    this.active.set(execution.id, execution);
    return execution;
  }

  finish(executionId, patch = {}) {
    const execution = this.active.get(executionId);
    if (!execution) return null;
    this.active.delete(executionId);
    Object.assign(execution, patch, { finished_at: new Date().toISOString(), state: patch.state || 'completed' });
    this.completed.push(execution);
    if (this.completed.length > 1000) this.completed.shift();
    return execution;
  }

  status() {
    return {
      active: Array.from(this.active.values()),
      completed: this.completed.slice(-100),
      active_count: this.active.size,
      completed_count: this.completed.length
    };
  }
}

export const executionQueue = new ExecutionQueue();
export default executionQueue;
