import { pathToFileURL } from "node:url";

const prefix = "https://github.com/xpex-systems-ai/GXEON-AI/pull/456#pullrequestreview-";
const acceptedScope = "GX030_RENDER_INGRESS_ACCEPTED";

// Read-only preflight. A matching environment string is never human approval.
// Deployment remains a separate operator action after database TLS is resolved.
export async function verifyRenderReview({ commit, reference, reviewer }, read) {
  return verifyReview({ commit, reference, reviewer }, read, acceptedScope);
}
export async function verifyDatabaseReview({ commit, reference, reviewer }, read) {
  return verifyReview({ commit, reference, reviewer }, read, "GX040_DATABASE_EXTERNAL_MODEL_ACCEPTED");
}
async function verifyReview({ commit, reference, reviewer }, read, scope) {
  const refuse = () => { throw new Error("RENDER_HUMAN_REVIEW_REQUIRED"); };
  if (!/^[a-f0-9]{40}$/.test(commit ?? "") || !reference?.startsWith(prefix) ||
      !/^[1-9][0-9]*$/.test(reference.slice(prefix.length)) ||
      !/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(reviewer ?? "")) refuse();
  const pr = await read("pulls/456");
  if (pr.state !== "open" || pr.merged || !pr.draft || pr.head?.sha !== commit ||
      pr.head?.ref !== "codex/gxeon-audit-os-v1-gx01") refuse();
  const review = await read("pulls/456/reviews/" + reference.slice(prefix.length));
  if (review.state !== "APPROVED" || review.commit_id !== commit || review.html_url !== reference ||
      review.user?.type !== "User" || review.user?.login?.toLowerCase() !== reviewer.toLowerCase() ||
      review.user?.login?.toLowerCase() === pr.user?.login?.toLowerCase() ||
      !["OWNER", "MEMBER", "COLLABORATOR"].includes(review.author_association) ||
      !review.body?.split(/\r?\n/).some(line => line.trim() === scope)) refuse();
  return { status: "REVIEW_VERIFIED", sourceCommit: commit, reviewReference: reference,
    reviewer, scope, deploymentAuthorized: false, databaseTlsAccepted: false };
}

export async function githubRead(route, token = process.env.GITHUB_TOKEN) {
  if (!/^(pulls\/456|pulls\/456\/reviews\/[1-9][0-9]*)$/.test(route)) throw new Error("REVIEW_ROUTE_DENIED");
  const response = await fetch("https://api.github.com/repos/xpex-systems-ai/GXEON-AI/" + route, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: "Bearer " + token } : {}) }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("RENDER_REVIEW_UNAVAILABLE");
  const text = await response.text();
  if (text.length > 1048576) throw new Error("RENDER_REVIEW_UNAVAILABLE");
  return JSON.parse(text);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const database = process.argv[2] === "--database";
    if (process.argv.length > (database ? 3 : 2)) throw new Error("REVIEW_MODE_DENIED");
    const result = await (database ? verifyDatabaseReview : verifyRenderReview)({
      commit: process.env[database ? "GXEON_AUDIT_DATABASE_REVIEW_COMMIT" : "GXEON_AUDIT_RENDER_REVIEW_COMMIT"],
      reference: process.env[database ? "GXEON_AUDIT_DATABASE_REVIEW_REFERENCE" : "GXEON_AUDIT_RENDER_REVIEW_REFERENCE"],
      reviewer: process.env[database ? "GXEON_AUDIT_DATABASE_REVIEWER" : "GXEON_AUDIT_RENDER_REVIEWER"] }, githubRead);
    console.log(JSON.stringify({ ...result, at: new Date().toISOString() }));
  } catch {
    console.error("RENDER_HUMAN_REVIEW_REQUIRED"); process.exitCode = 1;
  }
}
