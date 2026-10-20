import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import express from "express";
import { PGlite } from "@electric-sql/pglite";
import { getPool, closeDb, type PoolClient } from "@workspace/db";
import {
  auditHealthResponseSchema,
  auditWorkflowDetailSchema,
  auditWorkflowReportSchema,
} from "@workspace/api-zod";
import app from "../app";
import { auditWorkflowRouter } from "../routes/auditWorkflow";
import { createAuditWorkflowService } from "../services/auditWorkflowService";
import {
  checkSubmittedConfig,
  digest,
  validateWorkflowIntake,
} from "../services/auditWorkflowChecks";
import { readAuditJson } from "../../../gxeon-dashboard/src/services/auditTransport";
import { readAuditRestRows } from "../services/auditRestRows";
import { buildProposalPreview } from "../services/auditProposalService";

test("REST list contracts reject error objects, invalid JSON and unidentified rows", async () => {
  const response = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  assert.deepEqual(
    await readAuditRestRows(response([{ id: "test-row", title: "TEST DATA" }])),
    [{ id: "test-row", title: "TEST DATA" }],
  );
  assert.deepEqual(await readAuditRestRows(response([])), []);
  await assert.rejects(
    readAuditRestRows(response({ message: "private-provider-detail" }, 503)),
    /AUDIT_REST_READ_FAILED/,
  );
  for (const body of [
    { error: "private-provider-detail" },
    [{}],
    [null],
    [["nested-array"]],
  ]) {
    await assert.rejects(
      readAuditRestRows(response(body)),
      /AUDIT_REST_CONTRACT_INVALID/,
    );
  }
  await assert.rejects(
    readAuditRestRows(new Response("<html>private-provider-detail</html>")),
    /AUDIT_REST_CONTRACT_INVALID/,
  );
});

const intake = {
  requestId: randomUUID(),
  assetName: "GX-01 TEST DATA",
  assetReference: "test-fixture/vercel.json",
  authorizationReference: "test-fixture/authorized-scope",
  authorized: true,
  testData: true,
  checks: ["vercel_api_routing", "vercel_security_headers"],
  artifact: {
    name: "vercel.json",
    content: JSON.stringify({
      rewrites: [{ source: "/(.*)", destination: "/index.html" }],
    }),
  },
};

test("bounded static checks and secret/input validation", () => {
  const valid = validateWorkflowIntake(intake);
  assert.equal(
    checkSubmittedConfig(valid.artifact.content, valid.checks).filter(
      (r) => r.outcome === "observed",
    ).length,
    2,
  );
  for (const bad of [
    { ...intake, authorized: false },
    { ...intake, checks: ["shell"] },
    { ...intake, checks: ["vercel_api_routing", "vercel_api_routing"] },
    { ...intake, assetReference: "https://user:credential@example.invalid" },
    {
      ...intake,
      assetReference: "https://example.invalid/?access_key=private",
    },
    {
      ...intake,
      artifact: { name: "vercel.json", content: '{"password":"private"}' },
    },
    { ...intake, artifact: { name: "vercel.json", content: "invalid json" } },
    { ...intake, artifact: { name: "vercel.json", content: "[]" } },
    {
      ...intake,
      artifact: { name: "vercel.json", content: " ".repeat(16001) },
    },
  ])
    assert.throws(() => validateWorkflowIntake(bad));
  const conditional = JSON.stringify({
    rewrites: [
      {
        source: "/(.*)",
        destination: "/index.html",
        has: [{ type: "header", key: "x-test" }],
      },
    ],
  });
  assert.equal(
    checkSubmittedConfig(conditional, ["vercel_api_routing"])[0]?.outcome,
    "not_observed",
  );
});

test("HTML transport fails with a useful routing diagnostic; raw server errors stay hidden", async () => {
  await assert.rejects(
    readAuditJson(
      new Response("<html>private-debug</html>", {
        headers: { "content-type": "text/html" },
      }),
    ),
    /API_EXPECTED_JSON/,
  );
  await assert.rejects(
    readAuditJson(
      new Response('{"code":"ACCESS_DENIED","message":"private-debug"}', {
        status: 403,
        headers: { "content-type": "application/json" },
      }),
    ),
    (e) =>
      e instanceof Error &&
      !e.message.includes("private-debug") &&
      e.message.includes("ACCESS_DENIED"),
  );
});

test("real SQL persistence and HTTP lifecycle, independent review, rollback and evidence integrity", async (t) => {
  const originalEnv = { ...process.env };
  const dir = await mkdtemp(path.join(tmpdir(), "gx01-test-"));
  const testUrl = process.env.TEST_AUDIT_DATABASE_URL;
  let engine: PGlite | undefined;
  let connect: () => Promise<Pick<PoolClient, "query" | "release">>;
  let sql: (
    statement: string,
    values?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
  if (testUrl) {
    const url = new URL(testUrl);
    assert.ok(
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname),
      "Test database must be local",
    );
    assert.ok(
      url.pathname.endsWith("/gx01_test"),
      "Only a dedicated gx01_test database may be initialized",
    );
    process.env.DATABASE_URL = testUrl;
    const pool = getPool();
    connect = () => pool.connect();
    sql = (q, values) => pool.query(q, values);
  } else {
    delete process.env.DATABASE_URL;
    engine = await PGlite.create(path.join(dir, "postgres"));
    sql = (q, values) => engine!.query(q, values);
    // PGlite has one connection. Serialize transactions at the adapter boundary.
    let tail = Promise.resolve();
    connect = async () => {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      return {
        query: (q: string, values?: unknown[]) => engine!.query(q, values),
        release,
      } as Pick<PoolClient, "query" | "release">;
    };
  }
  const schema = await readFile(
    new URL(
      "../../../../lib/db/drizzle/0002_audit_os_schema.sql",
      import.meta.url,
    ),
    "utf8",
  );
  if (engine) await engine.exec(schema);
  else {
    const client = await getPool().connect();
    try {
      await client.query(schema);
    } finally {
      client.release();
    }
  }
  process.env.GXEON_AUDIT_OPERATOR_TOKEN = "test-only-operator-credential";
  process.env.GXEON_AUDIT_REVIEWER_TOKEN = "test-only-reviewer-credential";
  process.env.GXEON_AUDIT_DB_PROVIDER = "postgres";
  process.env.GXEON_AUDIT_WRITE_MODE = "enabled";
  process.env.GXEON_AUDIT_ALLOW_DB_WRITES = "true";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const service = createAuditWorkflowService(connect);
  const harness = express();
  harness.use(express.json());
  harness.use("/api/v1/audit/workflow", auditWorkflowRouter(service));
  harness.use(app);
  const server = harness.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const calls: {
    method: string;
    path: string;
    status: number;
    contentType: string | null;
  }[] = [];
  async function request(
    route: string,
    method = "GET",
    body?: unknown,
    role = "operator",
  ) {
    const token =
      role === "operator"
        ? process.env.GXEON_AUDIT_OPERATOR_TOKEN
        : role === "reviewer"
          ? process.env.GXEON_AUDIT_REVIEWER_TOKEN
          : role;
    const res = await fetch(`${origin}/api${route}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    calls.push({
      method,
      path: route,
      status: res.status,
      contentType: res.headers.get("content-type"),
    });
    assert.match(res.headers.get("content-type") ?? "", /application\/json/);
    return { status: res.status, data: await res.json(), headers: res.headers };
  }
  const base = "/v1/audit/workflow/cases";
  try {
    await t.test(
      "private routes deny missing/invalid credentials; public contracts and unknown API routes are JSON",
      async () => {
        for (const route of [
          "/v1/audit/cases",
          "/v1/audit/mission-control",
          "/v1/audit/schema-diagnostics",
          base + "/00000000-0000-4000-8000-000000000000",
        ])
          assert.equal(
            (await request(route, "GET", undefined, "")).status,
            401,
          );
        assert.equal(
          (await request(base, "POST", intake, "wrong-test-credential")).status,
          403,
        );
        assert.equal(
          (await request(base, "POST", intake, "reviewer")).status,
          403,
        );
        assert.equal(
          (await request("/v1/audit/cases", "POST", {}, "")).status,
          401,
        );
        for (const route of [
          "/healthz",
          "/v1/audit/health",
          "/v1/audit/modules",
          "/v1/audit/offers/catalog",
        ])
          assert.equal(
            (await request(route, "GET", undefined, "")).status,
            200,
          );
        auditHealthResponseSchema.parse(
          (await request("/v1/audit/health", "GET", undefined, "")).data,
        );
        assert.equal((await request("/v1/audit/not-a-route")).status, 404);
      },
    );
    const created = await request(base, "POST", intake);
    assert.equal(created.status, 201);
    const id = created.data.caseId as string;
    assert.equal((await request(base, "POST", intake)).data.caseId, id);
    assert.equal(
      (
        await request(base, "POST", {
          ...intake,
          assetName: "changed test payload",
        })
      ).status,
      409,
    );
    await t.test(
      "write flags, validation and review gate prevent unsafe transitions",
      async () => {
        assert.equal(
          (await request(`${base}/${id}/finalize`, "POST", {})).status,
          409,
        );
        assert.equal(
          (
            await request(`${base}/${id}/review`, "POST", {
              decision: "approve",
              humanReviewed: true,
              reviewReference: "test-fixture/review",
            })
          ).status,
          403,
        );
        assert.equal(
          (await request(base, "POST", { ...intake, authorized: false }))
            .status,
          400,
        );
        process.env.GXEON_AUDIT_ALLOW_DB_WRITES = "false";
        assert.equal(
          (await request(`${base}/${id}/run`, "POST", {})).status,
          409,
        );
        process.env.GXEON_AUDIT_ALLOW_DB_WRITES = "true";
        assert.equal((await request(`${base}/invalid-id`)).status, 400);
      },
    );
    await t.test(
      "intake → checks → review → report → closed; repeated runs/finalization do not duplicate",
      async () => {
        const runs = await Promise.all([
          request(`${base}/${id}/run`, "POST", {}),
          request(`${base}/${id}/run`, "POST", {}),
        ]);
        assert.ok(runs.every((r) => r.status === 200));
        let detail = auditWorkflowDetailSchema.parse(
          (await request(`${base}/${id}`)).data,
        );
        assert.equal(detail.item.status, "IN_REVIEW");
        assert.equal(detail.findings.length, 2);
        assert.equal(detail.evidences.length, 1);
        assert.equal(
          detail.evidences[0]?.metadata.sha256,
          digest(intake.artifact.content),
        );
        assert.ok(
          detail.findings.every((f) =>
            (f.metadata.evidenceIds as string[]).includes(
              detail.evidences[0]!.id,
            ),
          ),
        );
        assert.equal((await request(`${base}/${id}/report`)).status, 409);
        assert.equal(
          (
            await request(
              `${base}/${id}/review`,
              "POST",
              {
                decision: "reject",
                humanReviewed: true,
                reviewReference: "test-fixture/rejected",
              },
              "reviewer",
            )
          ).status,
          200,
        );
        assert.equal(
          (await request(`${base}/${id}/finalize`, "POST", {})).status,
          409,
        );
        assert.equal(
          (
            await request(
              `${base}/${id}/review`,
              "POST",
              {
                decision: "approve",
                humanReviewed: true,
                reviewReference: "test-fixture/approved",
              },
              "reviewer",
            )
          ).status,
          200,
        );
        const final = await request(`${base}/${id}/finalize`, "POST", {});
        assert.equal(final.status, 200);
        assert.equal(final.data.status, "CLOSED");
        assert.equal(
          (await request(`${base}/${id}/finalize`, "POST", {})).data.reportId,
          final.data.reportId,
        );
        detail = auditWorkflowDetailSchema.parse(
          (await request(`${base}/${id}`, "GET", undefined, "reviewer")).data,
        );
        assert.equal(detail.reports.length, 1);
        const exported = await request(
          `${base}/${id}/report`,
          "GET",
          undefined,
          "reviewer",
        );
        auditWorkflowReportSchema.parse(exported.data);
        assert.equal(exported.status, 200);
        assert.match(
          exported.headers.get("content-disposition") ?? "",
          /attachment/,
        );
        assert.equal(exported.data.report.testData, true);
        assert.equal(exported.data.report.caseId, id);
        assert.equal(
          exported.data.report.evidence[0].sha256,
          digest(intake.artifact.content),
        );
        if (process.env.GXEON_AUDIT_TEST_EVIDENCE_DIR) {
          await mkdir(process.env.GXEON_AUDIT_TEST_EVIDENCE_DIR, {
            recursive: true,
          });
          await writeFile(
            path.join(
              process.env.GXEON_AUDIT_TEST_EVIDENCE_DIR,
              "test-report.json",
            ),
            JSON.stringify(exported.data, null, 2),
          );
        }
        if (testUrl) {
          assert.equal(
            (
              await request("/v1/audit/findings", "POST", {
                caseId: id,
                title: "attempted bypass",
              })
            ).status,
            409,
          );
          const preview = await buildProposalPreview({
            caseId: id,
            offerKey: "technical_audit",
          });
          assert.match(preview.proposal.proposalCopy, /Reports: 1/);
          assert.equal(preview.noWrite, true);
        }
      },
    );
    await t.test(
      "tampered evidence is blocked; failed intake rolls back assets and cases",
      async () => {
        const next = await request(base, "POST", {
          ...intake,
          requestId: randomUUID(),
        });
        await sql(
          "UPDATE audit_evidences SET redacted_text='{}' WHERE case_id=$1",
          [next.data.caseId],
        );
        assert.equal(
          (await request(`${base}/${next.data.caseId}/run`, "POST", {})).status,
          409,
        );
        const before = await sql("SELECT count(*)::int AS n FROM audit_assets");
        await sql(
          "ALTER TABLE audit_evidences ADD CONSTRAINT gx01_injected_failure CHECK (title <> 'Submitted vercel.json') NOT VALID",
        );
        assert.equal(
          (await request(base, "POST", { ...intake, requestId: randomUUID() }))
            .status,
          503,
        );
        await sql(
          "ALTER TABLE audit_evidences DROP CONSTRAINT gx01_injected_failure",
        );
        assert.deepEqual(
          (await sql("SELECT count(*)::int AS n FROM audit_assets")).rows,
          before.rows,
        );
      },
    );
    await t.test(
      "identical operator/reviewer tokens cannot approve; provider failures are redacted",
      async () => {
        process.env.GXEON_AUDIT_REVIEWER_TOKEN =
          process.env.GXEON_AUDIT_OPERATOR_TOKEN;
        assert.equal(
          (await request(`${base}/${id}/review`, "POST", {}, "reviewer"))
            .status,
          403,
        );
        process.env.GXEON_AUDIT_REVIEWER_TOKEN =
          "test-only-reviewer-credential";
        process.env.GXEON_AUDIT_DB_PROVIDER = "supabase_rest";
        assert.equal((await request(base, "POST", intake)).status, 503);
        process.env.GXEON_AUDIT_DB_PROVIDER = "postgres";
      },
    );
    await t.test(
      "changes after review invalidate approval; report tampering blocks export",
      async () => {
        const next = await request(base, "POST", {
          ...intake,
          requestId: randomUUID(),
        });
        const nextId = next.data.caseId as string;
        assert.equal(
          (await request(`${base}/${nextId}/run`, "POST", {})).status,
          200,
        );
        assert.equal(
          (
            await request(
              `${base}/${nextId}/review`,
              "POST",
              {
                decision: "approve",
                humanReviewed: true,
                reviewReference: "test-fixture/stale-review",
              },
              "reviewer",
            )
          ).status,
          200,
        );
        await sql(
          "UPDATE audit_findings SET summary='Changed after review - TEST DATA' WHERE case_id=$1",
          [nextId],
        );
        assert.equal(
          (await request(`${base}/${nextId}/finalize`, "POST", {})).data.code,
          "REVIEW_STALE",
        );
        await sql(
          'UPDATE audit_reports SET content=content || \'{"title":"Altered TEST DATA"}\'::jsonb WHERE case_id=$1',
          [id],
        );
        assert.equal(
          (await request(`${base}/${id}/report`)).data.code,
          "REPORT_INTEGRITY_FAILED",
        );
      },
    );
    if (engine) {
      await engine.close();
      engine = await PGlite.create(path.join(dir, "postgres"));
      assert.equal(
        (await sql("SELECT status FROM audit_cases WHERE id=$1", [id])).rows[0]
          ?.status,
        "CLOSED",
      );
    }
    if (process.env.GXEON_AUDIT_TEST_EVIDENCE_DIR)
      await writeFile(
        path.join(process.env.GXEON_AUDIT_TEST_EVIDENCE_DIR, "http-calls.json"),
        JSON.stringify(
          {
            testData: true,
            engine: testUrl
              ? "PostgreSQL local test service"
              : "PGlite file-backed PostgreSQL WASM",
            calls,
          },
          null,
          2,
        ),
      );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (engine) await engine.close();
    if (testUrl) await closeDb();
    for (const key of Object.keys(process.env))
      if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    assert.ok(
      path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep) &&
        path.basename(dir).startsWith("gx01-test-"),
    );
    await rm(dir, { recursive: true, force: true });
  }
});
