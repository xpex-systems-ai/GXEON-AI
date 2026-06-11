/**
 * Risk Energy Model (Classical)
 * Higher energy = riskier path. Lower = safer manual-first.
 * Purely advisory.
 */

import type { RiskEnergy } from "./quantumInspiredAgentTypes";

const PENALTIES: Record<string, number> = {
  external_contact_required: 22,
  external_contact: 25,
  payment_not_connected: 18,
  payment_action: 28,
  create_checkout: 27,
  github_write: 20,
  create_issue: 19,
  no_budget_signal: 9,
  unclear_requirements: 8,
  execution_not_authorized: 24,
};

export function computeRiskEnergy(params: {
  riskFlags?: string[];
  forbiddenActions?: string[];
}): RiskEnergy {
  let total = 0;
  const penalties: RiskEnergy["penalties"] = [];

  [...(params.riskFlags || []), ...(params.forbiddenActions || [])].forEach(item => {
    const p = PENALTIES[item] || 5;
    total += p;
    penalties.push({ flagOrAction: item, energyPenalty: p, reason: "Risk or forbidden signal" });
  });

  const riskEnergy = Math.min(90, Math.max(5, Math.round(total)));
  const safetyGrade = Math.max(10, 100 - riskEnergy);

  const blocked = Array.from(new Set([
    ...(params.forbiddenActions || []),
    "external_contact",
    "github_write",
    "payment_action",
    "autonomous_execution"
  ]));

  return {
    riskEnergy,
    safetyGrade,
    blockedActions: blocked,
    safeAlternative: riskEnergy > 50 ? "Remain in manual qualification and preview generation only." : "Generate previews with explicit operator confirmation before any further step.",
    penalties
  };
}
