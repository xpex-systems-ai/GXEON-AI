import type { RequestHandler } from "express";

export type RenderIngressConfig = {
  origin: string;
  serviceId: string;
  sourceCommit: string;
  reviewReference: string;
};

// A configuration guard, not proof of a human approval. deploy/render/release-guard.mjs
// independently checks the GitHub review. Never populate this from a request header.
export function loadRenderIngress(env: NodeJS.ProcessEnv): RenderIngressConfig {
  const refuse = (): never => { throw new Error("RENDER_INGRESS_REVIEW_REQUIRED"); };
  let origin: URL;
  try { origin = new URL(env.RENDER_EXTERNAL_URL ?? ""); } catch { return refuse(); }
  const commit = env.RENDER_GIT_COMMIT ?? "", review = env.GXEON_AUDIT_RENDER_REVIEW_REFERENCE ?? "";
  if (env.RENDER !== "true" || !/^srv-[a-z0-9]{10,32}$/.test(env.RENDER_SERVICE_ID ?? "") ||
      origin.protocol !== "https:" || origin.origin !== env.RENDER_EXTERNAL_URL ||
      !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.onrender\.com$/.test(origin.hostname) || origin.port ||
      env.RENDER_EXTERNAL_HOSTNAME !== origin.hostname || env.GXEON_AUDIT_ALLOWED_ORIGINS !== origin.origin ||
      !/^[a-f0-9]{40}$/.test(commit) || env.GXEON_AUDIT_RENDER_REVIEW_COMMIT !== commit ||
      !/^https:\/\/github\.com\/xpex-systems-ai\/GXEON-AI\/pull\/456#pullrequestreview-[1-9][0-9]*$/.test(review)) refuse();
  return { origin: origin.origin, serviceId: env.RENDER_SERVICE_ID!, sourceCommit: commit, reviewReference: review };
}

export function renderIngressBoundary(config: RenderIngressConfig): RequestHandler {
  const host = new URL(config.origin).host;
  return (req, res, next) => {
    // Render's documented edge redirects HTTP and terminates HTTPS. The backend
    // port is private to its ingress. Forwarded headers grant no identity/authority.
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
    if (!(req.method === "GET" && req.path === "/api/healthz") && req.get("host")?.toLowerCase() !== host) {
      res.status(403).json({ ok: false, code: "RENDER_HOST_DENIED" }); return;
    }
    delete req.headers["x-forwarded-host"];
    delete req.headers["x-forwarded-proto"];
    delete req.headers["x-forwarded-for"];
    next();
  };
}
