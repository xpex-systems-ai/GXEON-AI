/**
 * Agent Route Simulator (Classical)
 * Suggests which Home Center-style agents should handle planning/preview work.
 * Never executes. Always requires approval.
 */

import type { AgentRouteCandidate, TaskLikeInput } from "./quantumInspiredAgentTypes";

// Lightweight static view aligned with the spirit of the Home Center registry on main.
// In a full system this could import from homeCenterAgentRegistry.
const AGENT_ROLES = [
  { id: "scout_agent", name: "Scout Agent", caps: ["read_radar", "suggest_category"] },
  { id: "analyst_agent", name: "Analyst Agent", caps: ["risk_analysis", "score_opportunity"] },
  { id: "proposal_agent", name: "Proposal Agent", caps: ["create_proposal_preview", "suggest_price"] },
  { id: "task_agent", name: "Task Agent", caps: ["create_task_preview", "define_checklist"] },
  { id: "security_agent", name: "Security Agent", caps: ["check_boundaries", "flag_risky_actions"] },
];

export function simulateAgentRoutes(input: TaskLikeInput | { title?: string; requiredConnectors?: string[]; forbiddenActions?: string[] }): {
  recommendedRoutes: AgentRouteCandidate[];
  blockedByDefault: string[];
} {
  const title = (input as any).title || "";
  const required = (input as any).requiredConnectors || [];
  const forbidden = (input as any).forbiddenActions || [];

  const routes: AgentRouteCandidate[] = AGENT_ROLES.map(role => {
    let fit = 0.4;
    if (required.some((c: string) => role.caps.some(cap => cap.includes(c.toLowerCase().slice(0,5))))) fit += 0.25;
    if (title.toLowerCase().includes("risk") && role.id.includes("security")) fit += 0.2;
    if (title.toLowerCase().includes("task") && role.id.includes("task")) fit += 0.2;
    if (title.toLowerCase().includes("proposal") && role.id.includes("proposal")) fit += 0.2;

    const blocked = role.caps.filter(cap => forbidden.some((f: string) => f.toLowerCase().includes("write") || f.toLowerCase().includes("contact")));

    return {
      agentId: role.id,
      agentName: role.name,
      fitScore: Number(Math.min(0.95, fit).toFixed(3)),
      roleInRoute: role.id.includes("task") ? "GENERATE_TASKS" : role.id.includes("proposal") ? "DRAFT_PROPOSAL" : "PLAN",
      blockedCapabilities: blocked.length ? blocked : ["None in this preview (still gated)"],
      requiredApprovals: ["Operator must explicitly approve before any PREPARE or DRAFT action."],
      confidence: Number((fit * 0.9).toFixed(3)),
      notes: ["Classical capability matching. Advisory only. Execution disabled."]
    };
  }).sort((a,b) => b.fitScore - a.fitScore).slice(0, 4);

  return {
    recommendedRoutes: routes,
    blockedByDefault: ["external_contact", "github_write", "payment_action", "autonomous_execution", ...forbidden]
  };
}
