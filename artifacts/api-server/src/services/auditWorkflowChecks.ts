import { createHash } from "node:crypto";
import {
  auditWorkflowIntakeSchema,
  type AuditWorkflowIntake,
} from "@workspace/api-zod";

export class AuditWorkflowError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const digest = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

// Submitted text is data only. No URLs are fetched, paths opened, regexes evaluated or commands run.
export function validateWorkflowIntake(body: unknown): AuditWorkflowIntake {
  // Defense in depth: bound the GX collection before schema validation.
  // The dedicated contract library separately uses patched Zod 4.6.6.
  const checks = body && typeof body === "object" ? (body as { checks?: unknown }).checks : undefined;
  if (Array.isArray(checks) && checks.length > 2)
    throw new AuditWorkflowError(400, "INVALID_INTAKE", "Select at most two bounded checks.");
  const parsed = auditWorkflowIntakeSchema.safeParse(body);
  if (!parsed.success)
    throw new AuditWorkflowError(
      400,
      "INVALID_INTAKE",
      "Check the required scope, authorization, checks and artifact limits.",
    );
  const input = parsed.data;
  const serialized = JSON.stringify(input) + "\n" + input.artifact.content;
  if (
    /(?:bearer\s+\S+|-----BEGIN .*PRIVATE KEY|(?:password|secret|token|api[_-]?key|service_role|DATABASE_URL)\s*["']?\s*[:=]|postgres(?:ql)?:\/\/|sk-[a-z0-9_-]{12,}|eyJ[a-z0-9_-]{20,}\.)/i.test(
      serialized,
    )
  )
    throw new AuditWorkflowError(
      400,
      "POTENTIAL_SECRET",
      "Remove credentials and secret configuration before submitting.",
    );
  // References are labels, never fetch targets; reject query strings and URL credentials to avoid storing secrets.
  for (const ref of [input.assetReference, input.authorizationReference]) {
    if (/[?#]|:\/\/[^/]*@/.test(ref))
      throw new AuditWorkflowError(
        400,
        "UNSAFE_REFERENCE",
        "Use references without credentials, queries or fragments.",
      );
  }
  let config: unknown;
  try {
    config = JSON.parse(input.artifact.content);
  } catch {
    throw new AuditWorkflowError(
      400,
      "INVALID_JSON",
      "vercel.json must contain valid JSON.",
    );
  }
  if (!config || typeof config !== "object" || Array.isArray(config))
    throw new AuditWorkflowError(
      400,
      "INVALID_CONFIG",
      "vercel.json must be a JSON object.",
    );
  return input;
}

type CheckResult = {
  checkId: AuditWorkflowIntake["checks"][number];
  outcome: "observed" | "not_observed" | "not_verified";
  summary: string;
  recommendation: string;
};
export function checkSubmittedConfig(
  content: string,
  checks: AuditWorkflowIntake["checks"],
): CheckResult[] {
  const config = JSON.parse(content) as Record<string, unknown>;
  return checks.map((checkId) => {
    if (checkId === "vercel_api_routing") {
      const rules = Array.isArray(config.rewrites) ? config.rewrites : [];
      const catchAll = rules.findIndex(
        (r) =>
          r &&
          typeof r === "object" &&
          !r.has &&
          !r.missing &&
          ["/(.*)", "/:path*"].includes(r.source) &&
          r.destination === "/index.html",
      );
      const apiBefore = rules
        .slice(0, catchAll < 0 ? rules.length : catchAll)
        .some(
          (r) =>
            r &&
            typeof r === "object" &&
            !r.has &&
            !r.missing &&
            ["/api/:path*", "/api/(.*)"].includes(r.source) &&
            typeof r.destination === "string" &&
            r.destination !== "/index.html",
        );
      const observed = catchAll >= 0 && !apiBefore;
      return {
        checkId,
        outcome: observed ? "observed" : "not_observed",
        summary: observed
          ? "An unconditional SPA catch-all precedes any recognized API rewrite in the submitted configuration."
          : "The specific unconditional SPA/API rewrite conflict was not observed. Backend reachability remains unverified.",
        recommendation:
          "Exclude /api and /api/* from the SPA fallback; configure only a separately verified backend origin.",
      };
    }
    // Conditional/path-specific rules cannot establish deployed coverage. Report only explicit global declarations.
    const rules = Array.isArray(config.headers) ? config.headers : [];
    const names = rules
      .filter((r) => r && !r.has && !r.missing && ["/(.*)", "/:path*"].includes(r.source))
      .flatMap((r) => (Array.isArray(r.headers) ? r.headers : []))
      .filter(
        (h) =>
          h &&
          typeof h.key === "string" &&
          typeof h.value === "string" &&
          h.value.trim(),
      )
      .map((h) => h.key.toLowerCase());
    const missing = [
      "content-security-policy",
      "x-content-type-options",
    ].filter((n) => !names.includes(n));
    return {
      checkId,
      outcome: missing.length ? "observed" : "not_observed",
      summary: missing.length
        ? `Global nonempty header declarations absent from supplied config: ${missing.join(", ")}. Runtime headers were not measured.`
        : "Both selected global header declarations are present. Their policy quality and runtime delivery were not verified.",
      recommendation:
        "Review header policies and measure the approved deployment separately; static absence alone is not proof of runtime vulnerability.",
    };
  });
}
