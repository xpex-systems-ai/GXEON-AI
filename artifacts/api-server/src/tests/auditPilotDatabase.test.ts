import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "@workspace/db/pool";
import { assertAuditPilotDatabase } from "../auditPilotDatabase";
import { createAuditWorkflowService } from "../services/auditWorkflowService";

test("dedicated PostgreSQL 17 startup attestation rejects excessive grants and non-synthetic data", {
  skip: !process.env.TEST_AUDIT_PILOT_DATABASE_URL,
}, async () => {
  const text = process.env.TEST_AUDIT_PILOT_DATABASE_URL;
  assert.ok(text, "Use only the isolated PostgreSQL service created for this test");
  const url = new URL(text);
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
  assert.ok(["5432", "55432"].includes(url.port));
  assert.equal(url.pathname, "/gx01_pilot");
  assert.ok(["gx01_pilot_owner", "gx01_stage_admin"].includes(url.username));
  assert.equal(url.search, ""); assert.equal(url.hash, "");
  const owner = new Pool({ connectionString: text, max: 1 });
  let app: InstanceType<typeof Pool> | undefined;
  try {
    await owner.query("SET log_statement='none'; SET log_min_error_statement='panic'");
    assert.equal((await owner.query("SELECT to_regclass('public.audit_cases') AS name")).rows[0].name, null,
      "A fresh dedicated test database is required; no reset/overwrite is supported");
    await owner.query(await readFile(new URL("../../../../lib/db/drizzle/0002_audit_os_schema.sql", import.meta.url), "utf8"));
    const password = randomBytes(32).toString("base64url");
    await owner.query(`CREATE ROLE gx01_pilot_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 8 PASSWORD '${password}'`);
    await owner.query(`REVOKE ALL ON DATABASE gx01_pilot FROM PUBLIC;
      GRANT CONNECT ON DATABASE gx01_pilot TO gx01_pilot_app;
      REVOKE CREATE ON SCHEMA public FROM PUBLIC;
      GRANT USAGE ON SCHEMA public TO gx01_pilot_app;
      GRANT SELECT, INSERT ON audit_assets,audit_evidences,audit_findings,audit_reports TO gx01_pilot_app;
      GRANT SELECT, INSERT, UPDATE ON audit_cases TO gx01_pilot_app`);
    const appUrl = new URL(text); appUrl.username = "gx01_pilot_app"; appUrl.password = password;
    app = new Pool({ connectionString: appUrl.href, max: 2 });
    await assertAuditPilotDatabase(app);
    await assert.rejects(assertAuditPilotDatabase(owner), /AUDIT_DATABASE_BOUNDARY_REQUIRED/);
    // Even a NOINHERIT membership may permit SET ROLE: the app needs no group role.
    await owner.query("CREATE ROLE gx01_pilot_unexpected NOLOGIN");
    await owner.query("GRANT gx01_pilot_unexpected TO gx01_pilot_app WITH INHERIT FALSE");
    await assert.rejects(assertAuditPilotDatabase(app), /AUDIT_DATABASE_BOUNDARY_REQUIRED/);
    await owner.query("REVOKE gx01_pilot_unexpected FROM gx01_pilot_app");
    await assertAuditPilotDatabase(app);
    await owner.query("GRANT UPDATE ON audit_evidences TO gx01_pilot_app");
    await assert.rejects(assertAuditPilotDatabase(app), /AUDIT_TABLE_PRIVILEGES_REQUIRED/);
    await owner.query("REVOKE UPDATE ON audit_evidences FROM gx01_pilot_app");
    await assertAuditPilotDatabase(app);
    const previous = { ...process.env };
    try {
      Object.assign(process.env, { GXEON_AUDIT_DB_PROVIDER: "postgres", GXEON_AUDIT_WRITE_MODE: "enabled", GXEON_AUDIT_ALLOW_DB_WRITES: "true" });
      const restricted = app;
      const service = createAuditWorkflowService(() => restricted.connect());
      const created = await service.create({ requestId: randomUUID(), authorized: true, testData: true,
        assetName: "GX-01.5 TEST DATA restricted PostgreSQL role", assetReference: "test-fixture/vercel.json",
        authorizationReference: "test-fixture/explicit-scope", checks: ["vercel_api_routing", "vercel_security_headers"],
        artifact: { name: "vercel.json", content: '{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}' } });
      await service.run(created.caseId);
      await service.review(created.caseId, { decision: "approve", humanReviewed: true,
        reviewReference: "TEST DATA service fixture; not human acceptance" });
      await service.finalize(created.caseId);
      const exported = await service.exportReport(created.caseId);
      assert.equal(exported.report.finalStatus, "CLOSED");
      const persisted = (await app.query("SELECT content,metadata FROM audit_reports WHERE id=$1", [exported.reportId])).rows[0];
      assert.deepEqual(persisted.content, exported.report);
      assert.equal(persisted.metadata.contentSha256, exported.sha256);
      await assertAuditPilotDatabase(app);
    } finally {
      for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
      Object.assign(process.env, previous);
    }
    // GX040: additive extensions only in this fresh isolated PG17 database.
    // These migrations preserve the canonical audit tables and their test data.
    await owner.query(await readFile(new URL("../../../../lib/db/drizzle/0003_omnix_enterprise_identity.sql", import.meta.url), "utf8"));
    await owner.query(await readFile(new URL("../../../../lib/db/drizzle/0004_omnix_commercial_intake.sql", import.meta.url), "utf8"));
    await assert.rejects(assertAuditPilotDatabase(app, { enterprise: true, commercial: true }), /OMNIX_EXTENSION_PRIVILEGES_REQUIRED/,
      "Creating extension tables does not grant the app authority to use them");
    await owner.query(await readFile(new URL("../../../../deploy/render/enterprise-grants.example.sql", import.meta.url), "utf8"));
    const extensions = { enterprise: true, commercial: true };
    await assertAuditPilotDatabase(app, { enterprise: true });
    await assertAuditPilotDatabase(app, extensions);
    await assert.rejects(assertAuditPilotDatabase(app, { commercial: true }), /ENTERPRISE_COMMERCIAL_IDENTITY_REQUIRED/);
    // Statements touch zero rows. Their success/failure proves SQL privileges,
    // without changing membership roles, removing audit logs or admitting PII.
    await app.query("UPDATE omnix_memberships SET revoked_at=NULL WHERE false");
    await app.query("UPDATE omnix_commercial_requests SET delivery='ACKNOWLEDGED',acknowledged_at=now() WHERE false");
    const permissionDenied = (error: unknown) => (error as { code?: string }).code === "42501";
    await assert.rejects(app.query("UPDATE omnix_memberships SET role='owner' WHERE false"), permissionDenied);
    await assert.rejects(app.query("DELETE FROM omnix_identity_events WHERE false"), permissionDenied);
    await assert.rejects(app.query("SELECT event FROM omnix_identity_events LIMIT 0"), permissionDenied);
    // Revoke only each additional negative-test grant; do not reset the role or
    // reapply a broad privilege set that could conceal a faulty initial grant.
    await owner.query("GRANT UPDATE(role) ON omnix_memberships TO gx01_pilot_app");
    try {
      await assert.rejects(assertAuditPilotDatabase(app, extensions), /OMNIX_EXTENSION_COLUMN_GRANTS_REQUIRED/);
    } finally {
      await owner.query("REVOKE UPDATE(role) ON omnix_memberships FROM gx01_pilot_app");
    }
    await assertAuditPilotDatabase(app, extensions);
    await owner.query("GRANT UPDATE ON omnix_memberships TO gx01_pilot_app");
    try {
      await assert.rejects(assertAuditPilotDatabase(app, extensions), /OMNIX_EXTENSION_PRIVILEGES_REQUIRED/);
    } finally {
      await owner.query("REVOKE UPDATE ON omnix_memberships FROM gx01_pilot_app");
      // PG17 also removes the previously granted column UPDATE when revoking
      // table UPDATE. Restore only the exact baseline revocation column grant;
      // the initial minimal-grant and forbidden-role checks already ran above.
      await owner.query("GRANT UPDATE(revoked_at) ON omnix_memberships TO gx01_pilot_app");
    }
    await assertAuditPilotDatabase(app, extensions);
    await owner.query("GRANT DELETE ON omnix_identity_events TO gx01_pilot_app");
    try {
      await assert.rejects(assertAuditPilotDatabase(app, extensions), /OMNIX_EXTENSION_PRIVILEGES_REQUIRED/);
    } finally {
      await owner.query("REVOKE DELETE ON omnix_identity_events FROM gx01_pilot_app");
    }
    await assertAuditPilotDatabase(app, extensions);
    await assert.rejects(app.query("UPDATE omnix_memberships SET role='owner' WHERE false"), permissionDenied);
    await assert.rejects(app.query("DELETE FROM omnix_identity_events WHERE false"), permissionDenied);
    await owner.query("INSERT INTO audit_cases(title,status,metadata) VALUES('TEST DATA negative startup attestation','DRAFT',$1::jsonb)",
      [JSON.stringify({ scope: { testData: false } })]);
    await assert.rejects(assertAuditPilotDatabase(app), /SYNTHETIC_PILOT_DATABASE_REQUIRED/);
  } finally {
    await app?.end(); await owner.end();
  }
});
