import eventBus, { EVENT_TYPES } from '../events/eventBus.js';
import vectorMemory from '../memory/vectorMemory.js';

export const AGENT_STATES = Object.freeze({
  IDLE: 'idle',
  EXECUTING: 'executing',
  DEGRADED: 'degraded',
  RECOVERING: 'recovering',
  OFFLINE: 'offline'
});

class AgentRegistry {
  constructor() {
    this.agents = new Map();
  }

  register(agent) {
    const existing = this.agents.get(agent.id);
    const record = {
      id: agent.id,
      name: agent.name || agent.id,
      capabilities: agent.capabilities || [],
      state: agent.state || AGENT_STATES.IDLE,
      load: existing?.load || 0,
      reputation: existing?.reputation || 100,
      heartbeat_at: new Date().toISOString(),
      registered_at: existing?.registered_at || new Date().toISOString(),
      metadata: agent.metadata || {}
    };
    this.agents.set(record.id, record);
    vectorMemory.remember('runtime', { type: 'agent_registered', agent: record });
    eventBus.publish(EVENT_TYPES.AGENT_ONLINE, { agent_id: record.id, capabilities: record.capabilities });
    return record;
  }

  heartbeat(agentId, patch = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;
    Object.assign(agent, patch, { heartbeat_at: new Date().toISOString() });
    if (agent.state === AGENT_STATES.OFFLINE) agent.state = AGENT_STATES.RECOVERING;
    return agent;
  }

  setState(agentId, state) {
    const agent = this.agents.get(agentId);
    if (!agent) return null;
    agent.state = state;
    agent.heartbeat_at = new Date().toISOString();
    if (state === AGENT_STATES.OFFLINE) eventBus.publish(EVENT_TYPES.AGENT_OFFLINE, { agent_id: agentId });
    return agent;
  }

  availableFor(taskType) {
    return Array.from(this.agents.values()).filter((agent) =>
      [AGENT_STATES.IDLE, AGENT_STATES.RECOVERING].includes(agent.state) && agent.capabilities.includes(taskType)
    );
  }

  getStatus() {
    const agents = Array.from(this.agents.values());
    return {
      total: agents.length,
      active: agents.filter((agent) => agent.state !== AGENT_STATES.OFFLINE).length,
      states: agents.reduce((acc, agent) => ({ ...acc, [agent.state]: (acc[agent.state] || 0) + 1 }), {}),
      agents
    };
  }
}

export const agentRegistry = new AgentRegistry();
export default agentRegistry;
