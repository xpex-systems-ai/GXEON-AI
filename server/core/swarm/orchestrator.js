import agentRegistry, { AGENT_STATES } from './agentRegistry.js';
import taskRouter from './taskRouter.js';
import executionQueue from './executionQueue.js';
import swarmRuntimeState from './runtimeState.js';
import distributedTaskQueue from '../tasks/distributedTaskQueue.js';
import shixGuardian from '../shix/shixGuardian.js';
import aletixRuntime from '../aletix/pluginRuntime.js';
import vectorMemory from '../memory/vectorMemory.js';
import eventBus from '../events/eventBus.js';
import monetizationEngine from '../monetization/monetizationEngine.js';

class SwarmOrchestrator {
  constructor() {
    this.booted = false;
  }

  boot() {
    if (this.booted) return this.status();
    [
      { id: 'gx-sentinel', name: 'GXEON Sentinel', capabilities: ['monitor', 'alert', 'report', 'sync'] },
      { id: 'gx-radar', name: 'GXEON Radar', capabilities: ['scan', 'monitor', 'scrape'] },
      { id: 'gx-monetizer', name: 'GXEON Monetizer', capabilities: ['monetize', 'report', 'sync'] },
      { id: 'gx-executor', name: 'GXEON Executor', capabilities: ['trade', 'sync', 'alert'] }
    ].forEach((agent) => agentRegistry.register(agent));
    this.booted = true;
    return this.status();
  }

  createTask(input) {
    const validation = shixGuardian.validateIncomingTask(input);
    if (!validation.accepted) {
      return { accepted: false, validation, task: null };
    }
    const task = distributedTaskQueue.create(input, validation);
    return { accepted: true, validation, task };
  }

  async executeNext() {
    const task = distributedTaskQueue.next();
    if (!task) return { executed: false, reason: 'QUEUE_EMPTY' };
    const route = taskRouter.route(task, agentRegistry);
    if (!route.routed) return { executed: false, reason: route.reason, task };
    const execution = executionQueue.start(task, route.agent);
    try {
      distributedTaskQueue.update(task.id, { state: 'executing' });
      const receipt = await aletixRuntime.execute(task, route.agent);
      const monetization = monetizationEngine.recordExecution(task, receipt, route.agent);
      const completed = distributedTaskQueue.complete(task.id, receipt);
      executionQueue.finish(execution.id, { state: 'completed', receipt, monetization });
      agentRegistry.setState(route.agent.id, AGENT_STATES.IDLE);
      vectorMemory.updateAgentReputation(route.agent.id, 1, 'execution_success');
      return { executed: true, task: completed, agent: route.agent, receipt, monetization };
    } catch (error) {
      distributedTaskQueue.fail(task.id, error);
      executionQueue.finish(execution.id, { state: 'failed', error: error.message });
      agentRegistry.setState(route.agent.id, AGENT_STATES.DEGRADED);
      vectorMemory.updateAgentReputation(route.agent.id, -5, error.message);
      return { executed: false, reason: error.message, task };
    }
  }

  status() {
    return swarmRuntimeState.snapshot({
      registry: agentRegistry,
      queue: distributedTaskQueue,
      executions: executionQueue,
      events: eventBus,
      memory: vectorMemory,
      monetization: monetizationEngine
    });
  }

  get agents() { return agentRegistry.getStatus(); }
  get tasks() { return distributedTaskQueue; }
  get executions() { return executionQueue.status(); }
  get events() { return eventBus.getStatus(); }
  get memory() { return vectorMemory.getSnapshot(); }
  get monetization() { return monetizationEngine.getStatus(); }
  get plugins() { return aletixRuntime.getStatus(); }
}

export const swarmOrchestrator = new SwarmOrchestrator();
export default swarmOrchestrator;
