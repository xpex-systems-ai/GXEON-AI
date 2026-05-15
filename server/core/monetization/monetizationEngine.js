import eventBus, { EVENT_TYPES } from '../events/eventBus.js';
import vectorMemory from '../memory/vectorMemory.js';

class MonetizationEngine {
  constructor() {
    this.ledger = [];
    this.streams = new Map();
  }

  estimateTaskValue(task) {
    const explicit = Number(task.value_usd || task.estimated_value_usd || 0);
    if (explicit > 0) return explicit;
    const defaults = { trade: 5, monetize: 3, scrape: 1, scan: 0.5, monitor: 0.25, sync: 0.2, report: 0.75, alert: 0.1 };
    return defaults[task.type] || 0.1;
  }

  recordExecution(task, receipt, agent) {
    const value = this.estimateTaskValue(task);
    const entry = {
      id: `mon_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      task_id: task.id,
      agent_id: agent?.id || null,
      receipt_id: receipt?.id || null,
      value_usd: value,
      stream: task.type,
      payout_prepared: value > 0,
      ts: new Date().toISOString()
    };
    this.ledger.push(entry);
    if (this.ledger.length > 1000) this.ledger.shift();
    this.streams.set(task.type, (this.streams.get(task.type) || 0) + value);
    vectorMemory.remember('monetization', entry);
    eventBus.publish(EVENT_TYPES.MONETIZATION_EVENT, entry);
    return entry;
  }

  getStatus() {
    const total = this.ledger.reduce((sum, entry) => sum + entry.value_usd, 0);
    const agents = new Map();
    for (const entry of this.ledger) {
      if (!entry.agent_id) continue;
      agents.set(entry.agent_id, (agents.get(entry.agent_id) || 0) + entry.value_usd);
    }
    return {
      total_revenue_usd: Number(total.toFixed(6)),
      active_revenue_streams: Array.from(this.streams.entries()).map(([stream, value]) => ({ stream, value_usd: Number(value.toFixed(6)) })),
      execution_value_usd: Number(total.toFixed(6)),
      profitable_agents: Array.from(agents.entries()).map(([agent_id, value]) => ({ agent_id, value_usd: Number(value.toFixed(6)) })),
      monetized_tasks: this.ledger.length,
      proof_ledger: this.ledger.slice(-100)
    };
  }
}

export const monetizationEngine = new MonetizationEngine();
export default monetizationEngine;
