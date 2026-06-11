/**
 * Quantum-Inspired Opportunity Prioritizer (Classical)
 * Uses amplitude-style weighting + risk interference.
 * Advisory only. Coexists with Home Center P0.
 */

import type { OpportunityLikeInput, PriorityAmplitude, QuantumInspiredSignal } from "./quantumInspiredAgentTypes";

export function prioritizeOpportunity(input: OpportunityLikeInput): PriorityAmplitude {
  const base = Math.max(0, Math.min(1, (input.score || 40) / 100));
  const recency = (input.recommendedNextStep || "").toLowerCase().includes("urgent") ? 0.15 : 0.05;
  const catBoost = ["deploy", "fix", "integration", "automation"].some(k => (input.category || "").toLowerCase().includes(k)) ? 0.1 : 0.02;

  const riskPenalty = (input.riskFlags || []).reduce((sum, flag) => {
    if (["external_contact_required", "payment_not_connected", "execution_not_authorized"].includes(flag)) return sum + 0.12;
    if (["no_budget_signal", "unclear_requirements"].includes(flag)) return sum + 0.06;
    return sum + 0.02;
  }, 0);

  const priority = Math.max(0.1, Math.min(0.95, 0.55 + (base - 0.5) * 0.7 + recency + catBoost - riskPenalty));

  const signals: QuantumInspiredSignal[] = [
    { amplitude: base, explanation: `Base score amplitude ${base.toFixed(2)}` },
    { amplitude: recency, explanation: "Recency/urgency signal" },
    { amplitude: -riskPenalty, explanation: `Risk interference penalty ${riskPenalty.toFixed(2)}` },
  ];

  const riskEnergy = Math.round(riskPenalty * 100 + (input.riskFlags?.length || 0) * 5);

  return {
    priority: Number(priority.toFixed(3)),
    signals,
    riskEnergy,
    recommendedAction: priority > 0.7 ? "High priority for qualification and preview generation." : "Manual review recommended before advancing.",
    reasoning: [
      "Classical weighted scoring (score + recency + category - risk penalties).",
      "No quantum hardware used. Advisory only."
    ]
  };
}
