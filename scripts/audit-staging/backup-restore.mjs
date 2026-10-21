// Destructive restore into existing/shared databases is deliberately unsupported.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { canonical, loadConfig, query, stateDir } from "./config.mjs";
import { apiHealth, stopApps, startApps, stopDatabase, startDatabase } from "./stage.mjs";
import { sha256, verifyReport } from "./verify-report.mjs";

export async function verifyBackupRestore() {
  const started = Date.now(), config = await loadConfig();
  await apiHealth(config); // Authenticated instance identity, not just an open port.
  const report = JSON.parse(await readFile(path.join(stateDir, "evidence/api-report.json"), "utf8"));
  const expected = verifyReport(report);
  const target = "gx01_restore_" + randomUUID().replaceAll("-", "");
  const tables = ["audit_assets", "audit_cases", "audit_evidences", "audit_findings", "audit_reports"];
  const snapshot = async database => {
    const result = {};
    for (const table of tables) {
      const rows = (await query(config, `SELECT * FROM ${table} ORDER BY id`, [], true, database)).rows;
      result[table] = { count: rows.length, sha256: sha256(canonical(JSON.parse(JSON.stringify(rows)))) };
    }
    return result;
  };
  const exported = async database => {
    const row = (await query(config,
      "SELECT r.id,r.case_id,r.content,r.metadata,c.status FROM audit_reports r JOIN audit_cases c ON c.id=r.case_id WHERE r.id=$1",
      [expected.reportId], true, database)).rows[0];
    assert.equal(row?.status, "CLOSED");
    const envelope = { ok: true, caseId: row.case_id, reportId: row.id, report: row.content, sha256: row.metadata.contentSha256 };
    verifyReport(envelope);
    assert.equal(canonical(envelope), canonical(report));
  };
  const binary = name => path.join(config.pgBin, name + (process.platform === "win32" ? ".exe" : ""));
  const command = (name, args, input) => {
    const env = { ...process.env, PGPASSWORD: config.adminPassword, PGOPTIONS: "-c log_statement=none -c log_min_error_statement=panic" };
    // Never place a connection URI/password in argv or print subprocess stderr.
    const native = config.mode === "native";
    return execFileSync(native ? binary(name) : "docker", native ?
      ["--host=127.0.0.1", "--port=55432", "--username=gx01_stage_admin", ...args] :
      ["compose", "-f", path.join(import.meta.dirname, "compose.yaml"), "exec", "-T", "-e", "PGPASSWORD", "-e", "PGOPTIONS", "postgres", name, "--username=gx01_stage_admin", ...args],
    { env, input, maxBuffer: 64 * 1024 * 1024, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  };
  let stopped = false;
  try {
    const unsafe = (await query(config, "SELECT EXISTS(SELECT 1 FROM audit_cases WHERE metadata->'scope'->>'testData' IS DISTINCT FROM 'true') AS unsafe", [], true)).rows[0].unsafe;
    assert.equal(unsafe, false, "Only synthetic staging data may be backed up here");
    await stopApps(config); stopped = true;
    const source = await snapshot(config.database);
    const dump = command("pg_dump", ["--dbname=gx01_staging", "--format=custom", "--no-owner", "--no-acl"]);
    assert.deepEqual(await snapshot(config.database), source, "Source changed during backup");
    // Generated safe identifier; CREATE-only target. Never --clean, DROP or overwrite.
    assert.match(target, /^gx01_restore_[a-f0-9]{32}$/);
    await query(config, `CREATE DATABASE ${target} OWNER gx01_stage_admin`, [], true, "postgres");
    command("pg_restore", ["--dbname=" + target, "--exit-on-error", "--no-owner", "--no-acl"], dump);
    const restored = await snapshot(target);
    assert.deepEqual(restored, source);
    await exported(target);
    await stopDatabase(config);
    await startDatabase(config);
    assert.deepEqual(await snapshot(target), source);
    await exported(target);
    await startApps(config); stopped = false;
    await apiHealth(config);
    const response = await fetch(`http://127.0.0.1:5174/api/v1/audit/workflow/cases/${expected.caseId}/report`, {
      headers: { Authorization: "Bearer " + config.operatorToken }, signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200);
    assert.equal(canonical(await response.json()), canonical(report));
    const backupDir = path.join(stateDir, "backups"); await mkdir(backupDir, { recursive: true, mode: 0o700 });
    await writeFile(path.join(backupDir, target + ".dump"), dump, { mode: 0o600 });
    const result = { version: "gx01.5", testData: true, status: "PASS", generatedAt: new Date().toISOString(),
      sourceDatabase: config.database, restoredDatabase: target, targetCreatedNew: true, existingDatabaseOverwritten: false,
      dumpBytes: dump.length, dumpSha256: sha256(dump), tables: source, matchesPersistedRecord: true,
      restoredRecordVerified: true, afterPostgreSQLRestart: true, sourceApiReportUnchanged: true,
      report: expected, elapsedMs: Date.now() - started, browserDownloadVerified: false,
      retention: "Private dump and isolated restored database retained; not automatically deleted or uploaded." };
    await writeFile(path.join(stateDir, "evidence/backup-restore.json"), JSON.stringify(result, null, 2));
    return result;
  } finally {
    if (stopped) { await startDatabase(config).catch(() => undefined); await startApps(config).catch(() => undefined); }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  verifyBackupRestore().then(result => console.log(JSON.stringify(result))).catch(() => {
    console.error("AUDIT_RECOVERY_FAILED: isolated source/target, grants, dump and integrity require inspection; no completion claimed."); process.exitCode = 1;
  });
}
