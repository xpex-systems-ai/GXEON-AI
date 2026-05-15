const TYPE_WEIGHTS = Object.freeze({
  trade: 100,
  monetize: 90,
  alert: 80,
  monitor: 70,
  scan: 65,
  sync: 55,
  scrape: 50,
  report: 45
});

export class DecisionEngine {
  scoreTask(task) {
    const base = TYPE_WEIGHTS[task.type] || 40;
    const priorityBoost = (task.priority || 0) * 10;
    const valueBoost = Math.min(50, Number(task.value_usd || task.estimated_value_usd || 0));
    const trustBoost = Math.round((task.trust_score || 0.5) * 25);
    const retryPenalty = (task.attempts || 0) * 8;
    return Math.max(0, base + priorityBoost + valueBoost + trustBoost - retryPenalty);
  }

  confidenceFor(agent, task) {
    if (!agent) return 0;
    const capability = agent.capabilities.includes(task.type) ? 0.5 : 0.15;
    const state = agent.state === 'idle' ? 0.25 : agent.state === 'executing' ? 0.05 : 0;
    const reputation = Math.min(0.25, (agent.reputation || 100) / 800);
    return Number(Math.min(0.99, capability + state + reputation).toFixed(3));
  }

  rankTasks(tasks) {
    return [...tasks].sort((a, b) => this.scoreTask(b) - this.scoreTask(a));
  }

  pickAgent(task, agents) {
    return agents
      .map((agent) => ({ agent, confidence: this.confidenceFor(agent, task) }))
      .filter((entry) => entry.confidence >= 0.25)
      .sort((a, b) => b.confidence - a.confidence)[0] || null;
  }
}

export const decisionEngine = new DecisionEngine();
export default decisionEngine;
