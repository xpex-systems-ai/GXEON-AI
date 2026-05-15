import eventBus from '../events/eventBus.js';

const TABLES = Object.freeze([
  'system_events',
  'swarm_tasks',
  'agent_registry',
  'execution_history',
  'runtime_memory',
  'monetization_events'
]);

class VectorMemory {
  constructor() {
    this.runtime = [];
    this.events = [];
    this.tasks = [];
    this.executions = [];
    this.providers = [];
    this.agentReputation = new Map();
    this.monetization = [];
  }

  remember(domain, record) {
    const entry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      domain,
      record,
      ts: new Date().toISOString()
    };
    const bucket = this[domain] || this.runtime;
    bucket.push(entry);
    if (bucket.length > 1000) bucket.shift();
    return entry;
  }

  rememberEvent(event) {
    this.events.push(event);
    if (this.events.length > 1000) this.events.shift();
  }

  updateAgentReputation(agentId, delta, reason) {
    const current = this.agentReputation.get(agentId) || { agent_id: agentId, score: 100, executions: 0, failures: 0, reasons: [] };
    current.score = Math.max(0, Math.min(200, current.score + delta));
    current.executions += delta >= 0 ? 1 : 0;
    current.failures += delta < 0 ? 1 : 0;
    current.reasons.push({ reason, delta, ts: new Date().toISOString() });
    current.reasons = current.reasons.slice(-25);
    this.agentReputation.set(agentId, current);
    return current;
  }

  getSnapshot() {
    return {
      tables: TABLES,
      runtime_memory: this.runtime.slice(-100),
      event_memory: this.events.slice(-100),
      task_memory: this.tasks.slice(-100),
      execution_history: this.executions.slice(-100),
      provider_memory: this.providers.slice(-100),
      agent_reputation: Array.from(this.agentReputation.values()),
      monetization_history: this.monetization.slice(-100)
    };
  }
}

export const vectorMemory = new VectorMemory();
eventBus.on('*', (event) => vectorMemory.rememberEvent(event));
export default vectorMemory;
