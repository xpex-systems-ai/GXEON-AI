import decisionEngine from '../decision/decisionEngine.js';
import { AGENT_STATES } from './agentRegistry.js';

class TaskRouter {
  route(task, registry) {
    const agents = registry.availableFor(task.type);
    const selected = decisionEngine.pickAgent(task, agents);
    if (!selected) return { routed: false, reason: 'NO_AVAILABLE_AGENT', agent: null, confidence: 0 };
    registry.setState(selected.agent.id, AGENT_STATES.EXECUTING);
    selected.agent.load += 1;
    return { routed: true, agent: selected.agent, confidence: selected.confidence, route: 'capability_score' };
  }
}

export const taskRouter = new TaskRouter();
export default taskRouter;
