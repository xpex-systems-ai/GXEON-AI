import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig, canonical, stateDir, query } from "./config.mjs";
import { apiHealth, stopApps, startApps, stopDatabase, startDatabase } from "./stage.mjs";
import { verifyReport } from "./verify-report.mjs";

export async function verifyControlledFailures() {
  const config = await loadConfig(); await apiHealth(config);
  const original = JSON.parse(await readFile(path.join(stateDir, "evidence/api-report.json"), "utf8"));
  const expected = verifyReport(original);
  const counts = async () => (await query(config, "SELECT (SELECT count(*) FROM audit_cases) AS cases,(SELECT count(*) FROM audit_evidences) AS evidences,(SELECT count(*) FROM audit_findings) AS findings,(SELECT count(*) FROM audit_reports) AS reports", [], true)).rows[0];
  const request = async () => {
    const r = await fetch(`http://127.0.0.1:5174/api/v1/audit/workflow/cases/${expected.caseId}/report`, {
      headers: { Authorization: "Bearer " + config.operatorToken }, signal: AbortSignal.timeout(15000) });
    assert.match(r.headers.get("content-type") ?? "", /application\/json/);
    return { status: r.status, data: await r.json() };
  };
  let databaseStopped = false, appsStopped = false;
  let step = "baseline";
  try {
    const before = await counts();
    // Test only the authenticated local instance; no external/shared DB or process is stopped.
    step = "api-stop"; await stopApps(config); appsStopped = true;
    await assert.rejects(fetch("http://127.0.0.1:3479/api/healthz", { signal: AbortSignal.timeout(2000) }));
    assert.deepEqual(await counts(), before);
    step = "api-restart"; await startApps(config); appsStopped = false; await apiHealth(config);
    assert.equal(canonical((await request()).data), canonical(original));
    step = "database-stop"; await stopDatabase(config); databaseStopped = true;
    const unavailable = await request();
    if (unavailable.status !== 503) throw new Error("DATABASE_UNAVAILABLE_STATUS_" + unavailable.status);
    for (const key of ["operatorToken", "reviewerToken", "adminPassword", "appPassword", "controlToken"]) assert.ok(!JSON.stringify(unavailable.data).includes(config[key]));
    step = "database-recovery"; await startDatabase(config); databaseStopped = false;
    for (let i = 0; i < 3; i++) {
      const response = await request(); assert.equal(response.status, 200);
      assert.equal(canonical(response.data), canonical(original)); verifyReport(response.data);
    }
    assert.deepEqual(await counts(), before);
    const result = { testData: true, status: "PASS", generatedAt: new Date().toISOString(), apiStoppedAndRecovered: true,
      databaseStoppedWithApiLive: true, databaseUnavailableStatus: 503, recoveredWithoutApiRestart: true,
      repeatedReads: 3, noRecordMutation: true, before, after: await counts(), report: expected,
      matchesPersistedRecord: true, browserDownloadVerified: false, scope: "Authenticated GX016 loopback test instance only; no remote infrastructure verified" };
    await writeFile(path.join(stateDir, "evidence/recovery-failures.json"), JSON.stringify(result, null, 2)); return result;
  } catch (error) {
    console.error("RECOVERY_STEP", step, error instanceof assert.AssertionError ? "ASSERTION" : /^[A-Z_0-9]+$/.test(error.message) ? error.message : error.name);
    throw error;
  } finally {
    if (databaseStopped) await startDatabase(config).catch(() => undefined);
    let healthy = false;
    try { await apiHealth(config); healthy = true; } catch { /* restore only this authenticated fixture */ }
    if (appsStopped || !healthy) {
      await stopApps(config).catch(() => undefined);
      await startApps(config).catch(() => undefined);
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  verifyControlledFailures().then(r => console.log(JSON.stringify(r))).catch(error => {
    console.error("CONTROLLED_RECOVERY_FAILED", error instanceof assert.AssertionError ? "ASSERTION" : error.name);
    process.exitCode = 1;
  });
}
