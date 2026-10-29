import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { verifyReport } from "../../scripts/audit-staging/verify-report.mjs";
import { canonical } from "../../scripts/audit-staging/canonical.mjs";
import { root, loadProfile, web, sql, command, waitReady } from "./test-support.mjs";
import { createSyntheticBackupRecipient, encryptBackup, decryptBackup } from "./encrypted-backup.mjs";

export async function verifyPortable(profile = "compose") {
  const c = loadProfile(profile); await waitReady(c);
  const sha = value => createHash("sha256").update(value).digest("hex");
  const dir = path.join(c.dir, "evidence"); fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  await assert.rejects(web(c, "/api/healthz", { trusted: false }), /CERT|SELF_SIGNED|VERIFY/);
  await assert.rejects(web(c, "/api/healthz", { servername: "unapproved.invalid" }), /CERT_ALTNAME/);
  const home = await web(c, "/"); assert.equal(home.status, 302); assert.equal(home.headers.location, "/omnix");
  const page = await web(c, "/omnix"); assert.equal(page.status, 200); assert.match(page.headers["content-type"], /text\/html/);
  assert.doesNotMatch(page.text, /<(?:script|link)[^>]*(?:src|href)=["']https?:\/\//i, "Portable entry HTML must use local scripts, styles and fonts");
  assert.match(page.headers["content-security-policy"], /frame-ancestors 'none'/);
  const asset = page.text.match(/src="(\/assets\/[^"\s]+\.js)"/); assert.ok(asset, "Actual compiled frontend must reference a built JS asset");
  assert.equal((await web(c, asset[1])).status, 200);
  for (const route of ["/api/unknown", "/api/v1/stripe/webhook", "/financial"] ) {
    const r = await web(c, route); assert.equal(r.status, 404); assert.match(r.headers["content-type"], /application\/json/);
  }
  assert.equal((await web(c, "/api/omnix/session")).status, 401);
  const access = JSON.parse(fs.readFileSync(path.join(c.dir, "access.json")));
  const login = async identity => {
    const r = await web(c, "/api/omnix/login", { method: "POST", body: { identity: identity.id, code: identity.code } });
    assert.equal(r.status, 200); const set = r.headers["set-cookie"][0];
    assert.match(set, /HttpOnly/); assert.match(set, /Secure/); assert.match(set, /SameSite=Strict/); return set.split(";")[0];
  };
  const operator = await login(access.identities[0]), other = await login(access.identities[2]);
  const call = (route, body, cookie = operator) => web(c, "/api/omnix" + route, { method: body === undefined ? "GET" : "POST", body, cookie });
  const catalog = await call("/distribution/capabilities"); assert.equal(catalog.status, 200);
  assert.equal(catalog.json.data.specialists.length, 6); assert.equal(catalog.json.data.release.customerDataAllowed, false);
  const noReport = await call("/distribution/assistant", { intent: "latest_report" });
  assert.equal(noReport.status, 200); assert.equal(noReport.json.report, null);
  const created = await call("/cases", { requestId: randomUUID(), assetName: "PORTABLE TEST DATA", assetReference: "test-fixture/vercel.json",
    authorizationReference: "TEST DATA / own portable preview", authorized: true, testData: true,
    checks: ["vercel_api_routing", "vercel_security_headers"], artifact: { name: "vercel.json", content: '{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}' } });
  assert.equal(created.status, 201); const id = created.json.caseId;
  assert.equal((await call("/cases/" + id, undefined, other)).status, 404);
  assert.equal((await call("/cases", undefined, other)).json.items.length, 0);
  assert.equal((await call(`/cases/${id}/run`, {})).status, 200);
  assert.equal((await call(`/cases/${id}/review`, { decision: "approve", humanReviewed: true, reviewReference: "TEST DATA" })).status, 403);
  const reviewer = await login(access.identities[1]);
  assert.equal((await call(`/cases/${id}/review`, { decision: "approve", humanReviewed: true,
    reviewReference: "PORTABLE TEST DATA automated distinct identity; no independent human approval" }, reviewer)).status, 200);
  assert.equal((await call(`/cases/${id}/finalize`, {})).status, 200);
  const download = await call(`/cases/${id}/report`); assert.equal(download.status, 200); assert.match(download.headers["content-disposition"], /attachment/);
  const proof = verifyReport(download.json); assert.equal(proof.status, "CLOSED");
  const distributed = await call("/distribution/mcp", { jsonrpc: "2.0", id: 1, method: "tools/call",
    params: { name: "omnix_get_report", arguments: { caseId: id } } });
  assert.equal(distributed.status, 200); assert.equal(distributed.json.result.isError, false);
  assert.ok(JSON.stringify(distributed.json.result.structuredContent).includes(proof.reportId));
  const denied = await call("/distribution/mcp", { jsonrpc: "2.0", id: 2, method: "tools/call",
    params: { name: "omnix_get_report", arguments: { caseId: id } } }, other);
  assert.equal(denied.json.result.isError, true);
  assert.equal(sql(c, "SELECT bool_and(ssl) FROM pg_stat_ssl s JOIN pg_stat_activity a USING(pid) WHERE a.usename='gx01_pilot_app';"), "t");
  const tableHash = (table, database) => sha(sql(c, `SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.id),'[]'::jsonb)::text FROM ${table} t;`, database));
  const tables = ["audit_assets", "audit_cases", "audit_evidences", "audit_findings", "audit_reports"], before = Object.fromEntries(tables.map(t => [t, tableHash(t)]));
  const dump = command(c, "pg_dump", ["--no-owner", "--no-privileges"]);
  const backups = path.join(c.dir, "backups"); fs.mkdirSync(backups, { recursive: true, mode: 0o700 });
  const backupFile = path.join(backups, proof.reportId + ".sql"); fs.writeFileSync(backupFile, dump, { flag: "wx", mode: 0o600 });
  const recipient = createSyntheticBackupRecipient(c.dir);
  const encryptedFile = backupFile + ".cms", decryptedFile = backupFile + ".authenticated.sql";
  const encryptionReceipt = encryptBackup({ inputFile: backupFile, outputFile: encryptedFile, certificate: recipient.certificate });
  const damaged = fs.readFileSync(encryptedFile); damaged[damaged.length - 1] ^= 1;
  const damagedFile = encryptedFile + ".tampered"; fs.writeFileSync(damagedFile, damaged, { flag: "wx", mode: 0o600 });
  const failedOutput = backupFile + ".rejected.sql";
  assert.throws(() => decryptBackup({ inputFile: damagedFile, outputFile: failedOutput, ...recipient }), /BACKUP_OPENSSL_OPERATION_FAILED/);
  assert.equal(fs.existsSync(failedOutput), false);
  assert.throws(() => decryptBackup({ inputFile: encryptedFile, outputFile: failedOutput,
    certificate: recipient.certificate, privateKey: path.join(c.dir, "web.key") }), /BACKUP_OPENSSL_OPERATION_FAILED/);
  assert.equal(fs.existsSync(failedOutput), false);
  assert.deepEqual(decryptBackup({ inputFile: encryptedFile, outputFile: decryptedFile, ...recipient }), encryptionReceipt);
  assert.equal(encryptionReceipt.plaintextSha256, sha(dump));
  assert.equal(encryptionReceipt.plaintextBytes, Buffer.byteLength(dump));
  const restored = "gx01_restore_" + randomUUID().replaceAll("-", "");
  sql(c, `CREATE DATABASE ${restored} OWNER gx01_pilot_owner;`, "postgres");
  command(c, "psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1"], fs.readFileSync(decryptedFile, "utf8"), restored);
  for (const table of tables) { assert.equal(tableHash(table, restored), before[table]); assert.equal(tableHash(table), before[table]); }
  const sourceRow = JSON.parse(sql(c, `SELECT content::text FROM audit_reports WHERE id='${proof.reportId}';`));
  assert.equal(canonical(sourceRow), canonical(download.json.report));
  const privateSecrets = ["admin-password", "app-password", "operator-token", "reviewer-token"].map(n => fs.readFileSync(path.join(c.dir, n), "utf8").trim());
  privateSecrets.push(...access.identities.map(i => i.code));
  const reportBytes = Buffer.from(download.text); for (const value of privateSecrets) assert.ok(!reportBytes.includes(Buffer.from(value)));
  const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const dirty = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: root, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
  const result = { checkedAt: new Date().toISOString(), sourceCommit, sourceDirty: dirty.some(line => line.slice(3) !== ".github/PULL_REQUEST_TEMPLATE.md"),
    knownWorkstationCollisionExcluded: dirty.some(line => line.slice(3) === ".github/PULL_REQUEST_TEMPLATE.md"),
    clientNodeVersion: process.version, postgresVersion: sql(c, "SHOW server_version_num;"), testData: true, transport: "HTTPS + pinned CA -> same-process frontend/API -> private PostgreSQL17 with verified TLS",
    mode: c.native ? "native" : "docker-compose", browserDownloadVerified: false, exportMechanism: "Node HTTPS test client; not browser download",
    vendorCredentialsRequired: false, publicDatabasePort: false, role: "gx01_pilot_app", sslVerified: true, wrongCaRejected: true, wrongHostnameRejected: true,
    frontendAssetVerified: true, apiMissesAreJson: true, ownerIsolationVerified: true, sessionCookieSecure: true,
    caseId: id, reportId: proof.reportId, reportSha256: proof.sha256, bytesSha256: sha(reportBytes), evidenceCount: proof.evidenceCount, findingCount: proof.findingCount,
    review: "Synthetic automation, not independent human approval", backupRestore: { createdNewDatabase: restored, dumpBytes: Buffer.byteLength(dump), dumpSha256: sha(dump), tableHashes: before, sourceUnchanged: true, encryptionReceipt } };
  fs.writeFileSync(path.join(dir, "portable-report.json"), reportBytes, { flag: "wx" });
  fs.writeFileSync(path.join(dir, "portable-acceptance.json"), JSON.stringify(result, null, 2), { flag: "wx" });
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyPortable(process.argv[2]).then(r => console.log(JSON.stringify(r))).catch(error => {
    console.error(JSON.stringify({ event: "PORTABLE_ACCEPTANCE_FAILED", kind: error.name, source: error.stack?.split("\n").find(l => l.trim().startsWith("at ")) })); process.exitCode = 1;
  });
}
