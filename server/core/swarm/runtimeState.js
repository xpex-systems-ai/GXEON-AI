import { detectDeploymentTarget } from '../observability/runtimeTelemetry.js';

class SwarmRuntimeState {
  constructor() {
    this.startedAt = Date.now();
    this.mode = process.env.GXEON_RUNTIME_MODE || 'AUTONOMOUS_SWARM_RUNTIME';
  }

  snapshot({ registry, queue, executions, events, memory, monetization }) {
    const agentStatus = registry.getStatus();
    const queueStatus = queue.getQueue();
    const executionStatus = executions.status();
    return {
      mode: this.mode,
      deployment_target: detectDeploymentTarget(),
      uptime_seconds: Math.round((Date.now() - this.startedAt) / 1000),
      active_agents: agentStatus.active,
      active_tasks: queueStatus.depth,
      execution_rate: executionStatus.completed_count,
      failures: queue.getHistory().tasks.filter((task) => task.state === 'failed').length,
      retries: queue.list().reduce((sum, task) => sum + (task.attempts || 0), 0),
      monetization: monetization.getStatus(),
      runtime_health: queueStatus.depth > 100 ? 'degraded' : 'healthy',
      queue_depth: queueStatus.depth,
      events: events.getStatus(),
      memory: memory.getSnapshot()
    };
  }
}

export const swarmRuntimeState = new SwarmRuntimeState();
export default swarmRuntimeState;
