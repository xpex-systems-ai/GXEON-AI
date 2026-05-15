import decisionEngine from '../decision/decisionEngine.js';

const TASK_TYPES = new Set(['scan', 'monitor', 'trade', 'sync', 'scrape', 'report', 'alert', 'monetize']);

class ShixGuardian {
  constructor() {
    this.recentFingerprints = new Map();
  }

  fingerprint(task) {
    return `${task.type}:${task.source || 'unknown'}:${JSON.stringify(task.payload || {})}`;
  }

  validateIncomingTask(input) {
    const errors = [];
    const type = input?.type;
    if (!TASK_TYPES.has(type)) errors.push('INVALID_TASK_TYPE');
    if (!input?.payload || typeof input.payload !== 'object') errors.push('PAYLOAD_REQUIRED');
    if (type === 'trade' && !input?.funding_confirmed) errors.push('FUNDING_REQUIRED_FOR_TRADE');

    const fp = this.fingerprint(input || {});
    const lastSeen = this.recentFingerprints.get(fp);
    if (lastSeen && Date.now() - lastSeen < 30000) errors.push('ANTI_LOOP_DUPLICATE_TASK');
    this.recentFingerprints.set(fp, Date.now());

    const trust_score = this.trustScore(input || {}, errors);
    return {
      accepted: errors.length === 0,
      errors,
      trust_score,
      priority_score: decisionEngine.scoreTask({ ...input, trust_score }),
      route_hint: input?.preferred_agent || null
    };
  }

  trustScore(task, errors = []) {
    let score = 0.75;
    if (task.source === 'internal') score += 0.15;
    if (task.funding_confirmed) score += 0.05;
    if (Number(task.estimated_value_usd || 0) > 0) score += 0.05;
    score -= errors.length * 0.2;
    return Number(Math.max(0, Math.min(1, score)).toFixed(3));
  }
}

export const shixGuardian = new ShixGuardian();
export default shixGuardian;
