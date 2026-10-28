import { auditCheckIds, omnixReadScopes, omnixCapabilityRegistrySchema, type OmnixCapabilityRegistry } from "@workspace/api-zod";

const synthetic = { local: "SYNTHETIC_TEST_ONLY", ci: "SYNTHETIC_TEST_ONLY", protectedRemote: "NOT_VERIFIED", production: "BLOCKED" } as const;
const unavailable = { local: "UNAVAILABLE", ci: "UNAVAILABLE", protectedRemote: "NOT_VERIFIED", production: "BLOCKED" } as const;
const blocked = ["Remote PostgreSQL identity/TLS and recovery not accepted.", "Independent human review pending.", "Enterprise identity and customer-data opening require operational acceptance."];
const roadmap = [
  { id: "github", name: "OMNIX GitHub", provider: "GitHub", assetTypes: ["GITHUB_REPOSITORY"], connector: "githubReadonlyClient (legacy candidate; not tenant-integrated)", rules: [],
    limits: ["Existing reader uses a backend-selected repository/credential; multi-tenant connection ownership, bounded transport and delegated access require adaptation."], dependencies: ["Verified per-organization GitHub connection and selected repository authorization."], evidenceProduced: ["Future repository/workflow evidence; not produced by this specialist today."] },
  { id: "railway", name: "OMNIX Railway", provider: "Railway", assetTypes: ["DEPLOYMENT"], connector: "railwayReadonlyClient (legacy candidate; not tenant-integrated)", rules: [],
    limits: ["Existing GraphQL reader has global backend credential/configuration; no OMNIX customer connection is activated."], dependencies: ["Verified connection ownership, permitted projects/environments and bounded provider transport."], evidenceProduced: ["Future deployment metadata; not produced by this specialist today."] },
  { id: "agent_economy", name: "OMNIX Agent Economy", provider: "Authorized agent and MCP platforms", assetTypes: ["OTHER"], connector: "planned agent/tool inventory adapter", rules: [],
    limits: ["No deployed agent telemetry, complete agent monitoring or third-party execution is claimed."], dependencies: ["Authorized agent/tool inventory and provenance/permission records."], evidenceProduced: ["Future agent/tool permission and execution references."] },
  { id: "web_api", name: "OMNIX Web & API", provider: "Authorized HTTP/API owners", assetTypes: ["API_BACKEND"], connector: "planned bounded HTTP adapter", rules: [],
    limits: ["No arbitrary URL fetch, network scan or live API test is enabled."], dependencies: ["Explicit target ownership, network restrictions and bounded check implementation."], evidenceProduced: ["Future authorized HTTP observations."] },
  { id: "commerce", name: "OMNIX Commerce", provider: "Authorized commerce platforms", assetTypes: ["ECOMMERCE"], connector: "planned commerce adapter", rules: [],
    limits: ["No marketplace account, payment operation, listing mutation or commerce audit is enabled."], dependencies: ["Approved API scopes/contracts; contribution to the first service must be established."], evidenceProduced: ["Future authorized commerce references."] },
] as const;

const catalog = omnixCapabilityRegistrySchema.parse({
  version: "1.0.0", engine: { id: "gxeon-audit-os", workflowVersion: "gx01-v1" },
  release: { status: "RELEASE_BLOCKED", customerDataAllowed: false, publicMcpPublished: false, gates: blocked },
  specialists: [{ id: "vercel", name: "OMNIX Vercel", version: "1.0.0", provider: "Vercel configuration (operator supplied)", assetTypes: ["DEPLOYMENT"],
    permissions: ["omnix:audits:read", "omnix:evidence:read", "omnix:reports:read", "omnix:audits:write", "omnix:approvals:write"], connector: "operator_submitted_artifact", rules: [...auditCheckIds],
    limits: ["One sanitized vercel.json, up to 16000 characters and two canonical static checks.", "No provider API call, deployed-header measurement, pentest or universal audit.", "Current release permits synthetic data only."],
    dependencies: ["Canonical GXEON Audit OS workflow, PostgreSQL17, scoped identity and distinct review."], evidenceProduced: ["Submitted configuration hash, rule findings, evidence references and finalized JSON report."],
    status: "RELEASE_BLOCKED", reviewRequired: true, allowedActions: ["READ", "ANALYZE_SUBMITTED_CONFIG"], environmentAvailability: synthetic },
    ...roadmap.map(s => ({ ...s, version: "1.0.0", permissions: [], status: "PLANNED", reviewRequired: true, allowedActions: [], environmentAvailability: unavailable }))],
  capabilities: [
    ...auditCheckIds.map(id => ({ id, canonicalCheckId: id, version: "1.0.0", specialist: "vercel", method: "checkSubmittedConfig via canonical auditWorkflowService.run", actionType: "ANALYZE_SUBMITTED_CONFIG",
      scope: id === "vercel_api_routing" ? "Static recognition of a submitted SPA fallback that can precede a recognized API rewrite." : "Presence of global CSP and X-Content-Type-Options declarations in submitted configuration.",
      permissions: ["omnix:audits:write"], inputCriteria: ["Backend-authorized operator, explicit asset authorization, sanitized vercel.json object, selected canonical checks, testData=true."], dependencies: ["Existing transaction/idempotency/integrity/review workflow."],
      testEvidence: [{ kind: "AUTOMATED_SYNTHETIC", reference: "https://github.com/xpex-systems-ai/GXEON-AI/actions/runs/40752319267" }, { kind: "SOURCE_TEST", reference: "artifacts/api-server/src/tests/auditPilot.test.ts" }],
      status: "RELEASE_BLOCKED", environmentAvailability: synthetic, approvalRequired: true, limits: ["No remote target is fetched.", "Rule output is an observation, not a security certification.", ...blocked] })),
    { id: "omnix_authorized_read", version: "1.0.0", specialist: "vercel", method: "omnixReadGateway -> canonicalService.forActor -> list/detail/exportReport", actionType: "READ",
      scope: "Read existing authorized cases, findings, evidence, finalized reports and pending review states from the canonical workflow.", permissions: [...omnixReadScopes],
      inputCriteria: ["Verified issuer/audience identity, current membership/delegation, resource scopes and server-selected actor context."],
      dependencies: ["OIDC provider configuration and per-request authorization store.", "The same PostgreSQL workflow used by the portal."], testEvidence: [{ kind: "SOURCE_TEST", reference: "artifacts/api-server/src/tests/auditOmnixDistribution.test.ts" }],
      status: "RELEASE_BLOCKED", environmentAvailability: synthetic, approvalRequired: true, limits: ["Seven fixed read-only tools; no write/execute tools or separate plugin database.", "Lists use the existing canonical limit of 50 records; truncation is explicit.", "Remote OAuth/MCP client compatibility and customer release are not verified."] },
    ...roadmap.map(s => ({ id: `${s.id}_readonly`, version: "1.0.0", specialist: s.id, method: s.connector, scope: s.limits[0], permissions: [], actionType: "READ", inputCriteria: ["Not implemented for OMNIX."],
      dependencies: [...s.dependencies], testEvidence: [], status: "PLANNED", environmentAvailability: unavailable, approvalRequired: true, limits: [...s.limits] })),
  ],
});

// A fresh copy prevents consumers from promoting the shared catalog in memory.
export function getOmnixCapabilities(): OmnixCapabilityRegistry { return structuredClone(catalog); }
