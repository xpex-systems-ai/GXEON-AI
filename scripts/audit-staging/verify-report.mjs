import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonical, loadConfig } from "./config.mjs";

export const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");
export function verifyReport(envelope) {
  const report = envelope.report;
  assert.equal(envelope.ok, true);
  assert.equal(report.version, "gx01-v1");
  assert.match(envelope.caseId, /^[0-9a-f-]{36}$/i);
  assert.match(envelope.reportId, /^[0-9a-f-]{36}$/i);
  assert.equal(report.caseId, envelope.caseId);
  assert.equal(report.testData, true, "Only synthetic staging reports may be verified here");
  assert.equal(report.finalStatus, "CLOSED");
  assert.equal(report.scope.authorized, true);
  assert.equal(report.review.role, "reviewer");
  assert.equal(report.review.decision, "approve");
  assert.equal(sha256(canonical(report)), envelope.sha256);
  assert.equal(report.evidence.length, 1);
  const evidence = report.evidence[0];
  assert.equal(sha256(evidence.content), evidence.sha256);
  for (const finding of report.findings) {
    assert.ok(finding.evidenceIds.length > 0);
    assert.ok(finding.evidenceIds.every((id) => id === evidence.id));
  }
  return { caseId: envelope.caseId, reportId: envelope.reportId, sha256: envelope.sha256,
    evidenceCount: report.evidence.length, findingCount: report.findings.length, status: report.finalStatus, testData: true };
}

async function main() {
  if (!process.argv[2]) throw new Error("Provide the local JSON file path; no browser policy bypass is used.");
  const downloaded = JSON.parse(await readFile(path.resolve(process.argv[2]), "utf8"));
  const result = verifyReport(downloaded);
  const config = await loadConfig();
  const response = await fetch(`http://127.0.0.1:5174/api/v1/audit/workflow/cases/${result.caseId}/report`, {
    headers: { Authorization: "Bearer " + config.operatorToken }, signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /application\/json/);
  const persisted = await response.json();
  verifyReport(persisted);
  assert.equal(canonical(downloaded), canonical(persisted), "File must match the persisted report envelope");
  console.log(JSON.stringify({ ...result, matchesPersistedRecord: true }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch(() => { console.error("REPORT_VERIFICATION_FAILED: check file format, hashes, references and staging availability."); process.exitCode = 1; });
}
