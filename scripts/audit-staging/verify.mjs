import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { canonical, loadConfig, query, repoRoot, stateDir } from "./config.mjs";
import { apiHealth, restart, startApps, stopApps } from "./stage.mjs";
import { sha256, verifyReport } from "./verify-report.mjs";

// Synthetic acceptance fixture. The reviewer credential exercises the gate; it
// does not stand for a human's PR approval or a production audit attestation.
const config = await loadConfig();
const base = "/api/v1/audit/workflow/cases";
const calls = [];
const checks = [];
const directory = path.join(stateDir, "evidence");
await mkdir(directory, { recursive: true });
const payload = () => ({
  requestId: randomUUID(), assetName: "GX-01.3 TEST DATA",
  assetReference: "test-fixture/vercel.json", authorizationReference: "test-fixture/authorized-scope",
  authorized: true, testData: true, checks: ["vercel_api_routing", "vercel_security_headers"],
  artifact: { name: "vercel.json", content: JSON.stringify({ rewrites: [{ source: "/(.*)", destination: "/index.html" }] }) },
});
async function request(route, method = "GET", body, role = "operator") {
  const credential = role === "operator" ? config.operatorToken : role === "reviewer" ? config.reviewerToken : role;
  const response = await fetch("http://127.0.0.1:5174" + route, {
    method, headers: { "Content-Type": "application/json", ...(credential ? { Authorization: "Bearer " + credential } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000),
  });
  const contentType = response.headers.get("content-type");
  calls.push({ method, route: route.split("?")[0], status: response.status, contentType });
  assert.match(contentType ?? "", /application\/json/, "API contracts must be JSON through the frontend origin");
  return { status: response.status, data: await response.json(), headers: response.headers };
}
async function expect(route, method, body, role, status, code) {
  const result = await request(route, method, body, role);
  assert.equal(result.status, status, route);
  if (code) assert.equal(result.data.code, code, route);
  return result;
}
async function check(name, fn) { await fn(); checks.push({ name, status: "PASS" }); console.log("PASS " + name); }
async function counts() {
  return (await query(config, "SELECT (SELECT count(*)::int FROM audit_assets) AS assets, (SELECT count(*)::int FROM audit_cases) AS cases, (SELECT count(*)::int FROM audit_evidences) AS evidences, (SELECT count(*)::int FROM audit_findings) AS findings, (SELECT count(*)::int FROM audit_reports) AS reports")).rows[0];
}
async function approve(id) {
  await expect(`${base}/${id}/review`, "POST", {
    decision: "approve", humanReviewed: true,
    reviewReference: "TEST DATA - automated credential fixture; human acceptance remains pending",
  }, "reviewer", 200);
}
let result;
try {
  const before = await apiHealth(config);
  await check("built frontend, proxy, PostgreSQL 17 and restricted role", async () => {
    const response = await fetch("http://127.0.0.1:5174/audit-os");
    assert.equal(response.status, 200); assert.match(await response.text(), /<html/);
    assert.equal(before.database.role, "gx01_app"); assert.equal(before.database.rolsuper, false);
    assert.ok(before.database.version >= 170000 && before.database.version < 180000);
    await expect("/api/healthz", "GET", undefined, "", 200);
    await expect("/api/v1/audit/health", "GET", undefined, "", 200);
    await expect("/api/v1/stripe/not-executed", "POST", {}, "operator", 404, "STAGING_SCOPE_ONLY");
  });
  const intake = payload();
  await check("authentication, roles, consent, validation and test-data fence", async () => {
    await expect(base, "POST", intake, "", 401);
    await expect(base, "POST", intake, "invalid-test-credential", 403);
    await expect(base, "POST", intake, "reviewer", 403);
    await expect(base, "POST", { ...intake, authorized: false }, "operator", 400);
    await expect(base, "POST", { ...intake, testData: false }, "operator", 400, "STAGING_REQUIRES_TEST_DATA");
    await expect(base, "POST", { ...intake, checks: ["shell"] }, "operator", 400);
    await expect(`${base}/invalid-id`, "GET", undefined, "operator", 400);
  });
  let id;
  await check("concurrent intake is idempotent and conflicting scope is rejected", async () => {
    const created = await Promise.all(Array.from({ length: 3 }, () => request(base, "POST", intake)));
    assert.ok(created.every((r) => r.status === 201));
    id = created[0].data.caseId;
    assert.ok(created.every((r) => r.data.caseId === id));
    await expect(base, "POST", { ...intake, assetName: "TEST DATA changed scope" }, "operator", 409, "REQUEST_ID_CONFLICT");
    assert.equal((await query(config, "SELECT count(*)::int AS n FROM audit_cases WHERE id=$1", [id])).rows[0].n, 1);
  });
  await check("checks are bounded, concurrent runs do not duplicate evidence or findings", async () => {
    await expect(`${base}/${id}/finalize`, "POST", {}, "operator", 409, "REVIEW_REQUIRED");
    await expect(`${base}/${id}/run`, "POST", {}, "reviewer", 403);
    const run = await Promise.all([request(`${base}/${id}/run`, "POST", {}), request(`${base}/${id}/run`, "POST", {})]);
    assert.ok(run.every((r) => r.status === 200));
    const detail = (await request(`${base}/${id}`)).data;
    assert.equal(detail.item.status, "IN_REVIEW"); assert.equal(detail.evidences.length, 1); assert.equal(detail.findings.length, 2);
    assert.equal(detail.evidences[0].metadata.sha256, sha256(intake.artifact.content));
    assert.ok(detail.findings.every((f) => f.metadata.evidenceIds.includes(detail.evidences[0].id)));
    await expect(`${base}/${id}/report`, "GET", undefined, "operator", 409, "REPORT_NOT_READY");
  });
  let exported;
  await check("review gate and concurrent finalization produce one traceable report", async () => {
    const review = { decision: "approve", humanReviewed: true, reviewReference: "TEST DATA - credential fixture" };
    await expect(`${base}/${id}/review`, "POST", review, "operator", 403);
    await expect(`${base}/${id}/review`, "POST", { ...review, humanReviewed: false }, "reviewer", 400);
    await expect(`${base}/${id}/review`, "POST", { ...review, decision: "reject" }, "reviewer", 200);
    await expect(`${base}/${id}/finalize`, "POST", {}, "operator", 409, "REVIEW_REQUIRED");
    await approve(id);
    await expect(`${base}/${id}/finalize`, "POST", {}, "reviewer", 403);
    const finalized = await Promise.all([request(`${base}/${id}/finalize`, "POST", {}), request(`${base}/${id}/finalize`, "POST", {})]);
    assert.ok(finalized.every((r) => r.status === 200));
    assert.equal(finalized[0].data.reportId, finalized[1].data.reportId);
    const response = await request(`${base}/${id}/report`, "GET", undefined, "reviewer");
    assert.equal(response.status, 200); assert.match(response.headers.get("content-disposition"), /attachment/);
    exported = response.data; result = verifyReport(exported);
    const record = (await query(config, "SELECT id,content,metadata FROM audit_reports WHERE case_id=$1", [id])).rows;
    assert.equal(record.length, 1); assert.equal(record[0].id, result.reportId);
    assert.equal(canonical(record[0].content), canonical(exported.report));
    assert.equal(record[0].metadata.contentSha256, result.sha256);
    await writeFile(path.join(directory, "api-report.json"), JSON.stringify(exported, null, 2));
  });
  await check("alternative legacy UUID encodings cannot mutate a closed workflow", async () => {
    const original = await counts();
    for (const caseId of [id, ` ${id} `, `\t${id}\n`, id.replace(/-/g, ""), `{${id.toUpperCase()}}`]) {
      for (const route of ["findings", "evidences"]) {
        await expect(`/api/v1/audit/${route}`, "POST", {
          caseId, title: "TEST DATA attempted mutation", summary: "TEST DATA", redactedText: "TEST DATA",
        }, "operator", 409, "WORKFLOW_ROUTE_REQUIRED");
      }
    }
    assert.deepEqual(await counts(), original);
    await expect(`${base}/${id}/review`, "POST", { decision: "approve", humanReviewed: true, reviewReference: "TEST DATA" }, "reviewer", 409, "INVALID_STATE");
  });
  await check("application DB role cannot update evidence, delete records or create tables", async () => {
    for (const sql of ["UPDATE audit_evidences SET title=title WHERE false", "DELETE FROM audit_cases WHERE false", "CREATE TABLE public.gx012_forbidden(id int)"]) {
      await assert.rejects(query(config, sql), (error) => error.code === "42501");
    }
  });
  await check("legacy inferred baseline cannot mutate a closed GX case by asset reference", async () => {
    const collision = (await expect(base, "POST", { ...payload(), assetReference: "https://github.com/xpex-systems-ai/GXEON-AI" }, "operator", 201)).data.caseId;
    await expect(`${base}/${collision}/run`, "POST", {}, "operator", 200);
    await approve(collision);
    await expect(`${base}/${collision}/finalize`, "POST", {}, "operator", 200);
    const original = await counts();
    await expect("/api/v1/audit/baseline/first-evidence-finding", "POST", {}, "operator", 404, "FIRST_INTERNAL_CASE_NOT_FOUND");
    assert.deepEqual(await counts(), original);
  });
  await check("injected intake failure rolls back the entire transaction", async () => {
    const original = await counts();
    await query(config, "ALTER TABLE audit_evidences ADD CONSTRAINT gx012_staging_failure CHECK (title <> 'Submitted vercel.json') NOT VALID", [], true);
    try { await expect(base, "POST", payload(), "operator", 503); }
    finally { await query(config, "ALTER TABLE audit_evidences DROP CONSTRAINT gx012_staging_failure", [], true); }
    assert.deepEqual(await counts(), original);
  });
  await check("unknown evidence references and stale reviews cannot be finalized", async () => {
    const other = (await expect(base, "POST", payload(), "operator", 201)).data.caseId;
    await expect(`${base}/${other}/run`, "POST", {}, "operator", 200);
    await query(config, "UPDATE audit_findings SET metadata=jsonb_set(metadata,'{evidenceIds}',$2::jsonb) WHERE case_id=$1", [other, JSON.stringify([randomUUID()])], true);
    await approve(other);
    await expect(`${base}/${other}/finalize`, "POST", {}, "operator", 409, "FINDING_REFERENCE_INVALID");
    await query(config, "UPDATE audit_findings SET summary=summary || ' TEST DATA change' WHERE case_id=$1", [other], true);
    await expect(`${base}/${other}/finalize`, "POST", {}, "operator", 409, "REVIEW_STALE");
    assert.equal((await query(config, "SELECT count(*)::int AS n FROM audit_reports WHERE case_id=$1", [other])).rows[0].n, 0);
  });
  await check("export rejects tampering, invalid references and changed embedded evidence", async () => {
    const original = (await query(config, "SELECT content,metadata FROM audit_reports WHERE id=$1", [result.reportId])).rows[0];
    try {
      for (const [mutate, code, updateHash] of [
        [(r) => { r.title += " altered"; }, "REPORT_INTEGRITY_FAILED", false],
        [(r) => { r.findings[0].evidenceIds = [randomUUID()]; }, "REPORT_REFERENCE_INVALID", true],
        [(r) => { r.evidence[0].content = "{}"; }, "REPORT_EVIDENCE_INTEGRITY_FAILED", true],
      ]) {
        const content = structuredClone(original.content); mutate(content);
        const metadata = { ...original.metadata, ...(updateHash ? { contentSha256: sha256(canonical(content)) } : {}) };
        await query(config, "UPDATE audit_reports SET content=$2::jsonb,metadata=$3::jsonb WHERE id=$1", [result.reportId, JSON.stringify(content), JSON.stringify(metadata)], true);
        await expect(`${base}/${id}/report`, "GET", undefined, "operator", 409, code);
      }
    } finally { await query(config, "UPDATE audit_reports SET content=$2::jsonb,metadata=$3::jsonb WHERE id=$1", [result.reportId, JSON.stringify(original.content), JSON.stringify(original.metadata)], true); }
  });
  await check("write-disabled mode refuses mutations while retaining report reads", async () => {
    await stopApps(config); await startApps(config, false);
    try {
      await expect(base, "POST", payload(), "operator", 409, "WRITE_DISABLED");
      assert.equal(canonical((await request(`${base}/${id}/report`)).data), canonical(exported));
    } finally { await stopApps(config); await startApps(config, true); }
  });
  let after;
  await check("API and database restart retain closed status, IDs, references and hashes", async () => {
    const immediatelyBefore = await apiHealth(config);
    await restart(config); after = await apiHealth(config);
    assert.notEqual(after.pid, immediatelyBefore.pid); assert.notEqual(after.databaseStartedAt, immediatelyBefore.databaseStartedAt);
    const again = await request(`${base}/${id}/report`);
    assert.equal(again.status, 200); assert.deepEqual(verifyReport(again.data), result);
    assert.equal(canonical(again.data), canonical(exported));
    const detail = (await request(`${base}/${id}`)).data;
    assert.equal(detail.item.status, "CLOSED"); assert.equal(detail.reports.length, 1);
  });
  await check("logs and public frontend bundle do not contain staging credentials", async () => {
    for (const file of ["api.log", "frontend.log", ...(config.mode === "native" ? ["database.log"] : [])]) {
      const log = await readFile(path.join(stateDir, file), "utf8");
      for (const key of ["adminPassword", "appPassword", "operatorToken", "reviewerToken", "controlToken"]) assert.ok(!log.includes(config[key]), `${file} must redact credentials`);
    }
    const publicRoot = path.join(repoRoot, "artifacts/gxeon-dashboard/dist/public");
    for (const file of await readdir(publicRoot, { recursive: true, withFileTypes: true })) {
      if (!file.isFile()) continue;
      const content = await readFile(path.join(file.parentPath, file.name));
      for (const key of ["adminPassword", "appPassword", "operatorToken", "reviewerToken", "controlToken"]) assert.ok(!content.includes(config[key]), "Public bundle must not contain staging credentials");
    }
  });
  const evidence = {
    version: "gx01.3", testData: true, generatedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(),
    sourceDirty: Boolean(execFileSync("git", ["status", "--porcelain"], { cwd: repoRoot, encoding: "utf8" }).trim()),
    mode: config.mode, databaseVersion: before.database.version, appRole: before.database.role,
    transport: "built frontend loopback HTTP proxy -> existing Express API -> isolated PostgreSQL 17",
    reviewFixture: "Automated credential fixture; no human approval claimed", browserDownloadVerified: false,
    before: { apiPid: before.pid, databaseStartedAt: before.databaseStartedAt },
    after: { apiPid: after.pid, databaseStartedAt: after.databaseStartedAt }, result, checks, calls,
  };
  await writeFile(path.join(directory, "acceptance.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ status: "PASS", checks: checks.length, ...result }));
} catch (error) {
  await writeFile(path.join(directory, "failure.json"), JSON.stringify({ testData: true, checks, calls, failure: error.code ?? error.name }, null, 2));
  console.error("STAGING_ACCEPTANCE_FAILED", error instanceof assert.AssertionError ? error.message : error.code ?? error.name);
  process.exitCode = 1;
}
