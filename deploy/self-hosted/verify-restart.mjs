import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadProfile, web, waitReady, sql } from "./test-support.mjs";
import { verifyReport } from "../../scripts/audit-staging/verify-report.mjs";
import { canonical } from "../../scripts/audit-staging/canonical.mjs";
const c = loadProfile(process.argv[2] ?? "compose"); await waitReady(c);
const before = JSON.parse(fs.readFileSync(path.join(c.dir, "evidence/portable-report.json"))), token = fs.readFileSync(path.join(c.dir, "operator-token"), "utf8").trim();
const after = await web(c, `/api/v1/audit/workflow/cases/${before.caseId}/report`, { token });
assert.equal(after.status, 200); assert.equal(canonical(after.json), canonical(before)); const proof = verifyReport(after.json);
const identity = JSON.parse(fs.readFileSync(path.join(c.dir, "access.json"))).identities[0];
const login = await web(c, "/api/omnix/login", { method: "POST", body: { identity: identity.id, code: identity.code } }); assert.equal(login.status, 200);
const history = await web(c, "/api/omnix/cases", { cookie: login.headers["set-cookie"][0].split(";")[0] });
assert.equal(history.status, 200); assert.ok(history.json.items.some(i => i.id === before.caseId));
const result = { checkedAt: new Date().toISOString(), reportSha256: proof.sha256, caseId: proof.caseId, restartApiAndPostgres: true,
  persistedReportUnchanged: true, newLoginAndHistoryVerified: true, databaseTls: sql(c, "SELECT bool_and(ssl) FROM pg_stat_ssl s JOIN pg_stat_activity a USING(pid) WHERE a.usename='gx01_pilot_app';") === "t" };
assert.equal(result.databaseTls, true); fs.writeFileSync(path.join(c.dir, "evidence/portable-restart.json"), JSON.stringify(result, null, 2), { flag: "wx" }); console.log(JSON.stringify(result));
