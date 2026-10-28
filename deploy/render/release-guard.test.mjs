import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyRenderReview, verifyDatabaseReview } from "./release-guard.mjs";

test("synthetic GitHub fixtures validate review state, exact commit and independent designated human", async () => {
  const commit = "a".repeat(40), reference = "https://github.com/xpex-systems-ai/GXEON-AI/pull/456#pullrequestreview-123";
  const config = { commit, reference, reviewer: "fixture-reviewer" };
  const pr = { state: "open", merged: false, draft: true, head: { sha: commit, ref: "codex/gxeon-audit-os-v1-gx01" }, user: { login: "fixture-author" } };
  const review = { state: "APPROVED", commit_id: commit, html_url: reference,
    user: { type: "User", login: "fixture-reviewer" }, author_association: "COLLABORATOR", body: "TEST DATA ONLY\nGX030_RENDER_INGRESS_ACCEPTED" };
  const read = async route => structuredClone(route === "pulls/456" ? pr : review);
  const result = await verifyRenderReview(config, read);
  assert.equal(result.deploymentAuthorized, false); assert.equal(result.databaseTlsAccepted, false);
  for (const patch of [{ state: "COMMENTED" }, { state: "DISMISSED" }, { commit_id: "b".repeat(40) },
    { user: { login: "fixture-author", type: "User" } }, { user: { login: "fixture-reviewer", type: "Bot" } },
    { user: { login: "someone-else", type: "User" } }, { author_association: "NONE" }, { body: "looks good" }]) {
    await assert.rejects(verifyRenderReview(config, async route => route === "pulls/456" ? pr : { ...review, ...patch }), /RENDER_HUMAN_REVIEW_REQUIRED/);
  }
  for (const patch of [{ merged: true }, { state: "closed" }, { draft: false }, { head: { sha: "b".repeat(40) } }])
    await assert.rejects(verifyRenderReview(config, async route => route === "pulls/456" ? { ...pr, ...patch } : review), /RENDER_HUMAN_REVIEW_REQUIRED/);
  for (const patch of [{ reviewer: undefined }, { reference: reference + "?token=fixture" }, { commit: "HEAD" }])
    await assert.rejects(verifyRenderReview({ ...config, ...patch }, read), /RENDER_HUMAN_REVIEW_REQUIRED/);
});
test("ingress approval fixture never authorizes the distinct external database model", async () => {
  const commit="a".repeat(40),reference="https://github.com/xpex-systems-ai/GXEON-AI/pull/456#pullrequestreview-123",reviewer="fixture-reviewer";
  const pr={state:"open",merged:false,draft:true,head:{sha:commit,ref:"codex/gxeon-audit-os-v1-gx01"},user:{login:"fixture-author"}};
  const review={state:"APPROVED",commit_id:commit,html_url:reference,user:{type:"User",login:reviewer},author_association:"COLLABORATOR",body:"GX030_RENDER_INGRESS_ACCEPTED"};
  await assert.rejects(verifyDatabaseReview({commit,reference,reviewer},async route=>route==='pulls/456'?pr:review),/RENDER_HUMAN_REVIEW_REQUIRED/);
  const result=await verifyDatabaseReview({commit,reference,reviewer},async route=>route==='pulls/456'?pr:{...review,body:"GX040_DATABASE_EXTERNAL_MODEL_ACCEPTED"});
  assert.equal(result.scope,"GX040_DATABASE_EXTERNAL_MODEL_ACCEPTED");
  assert.equal(result.deploymentAuthorized,false);assert.equal(result.databaseTlsAccepted,false,"Reviewing a model does not prove the live endpoint's certificate");
});
