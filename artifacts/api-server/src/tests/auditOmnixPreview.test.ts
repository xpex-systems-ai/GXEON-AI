import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { Pool, type PoolClient } from "@workspace/db/pool";
import {
  auditWorkflowReportSchema,
  omnixCasesSchema,
} from "@workspace/api-zod";
import { createAuditPilotApp } from "../auditPilotApp";
import { createAuditWorkflowService } from "../services/auditWorkflowService";
import {
  loadOmnixPreviewConfig,
  type OmnixPreviewConfig,
} from "../omnixPreview";

const secret = () => randomBytes(32).toString("base64url");
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const origin = "https://portal.example.invalid";
function identities() {
  const suffix = randomUUID(),
    codes = [secret(), secret(), secret(), secret()];
  const users = [
    {
      id: "test-submitter-a",
      organizationId: "test-org-" + suffix,
      role: "operator" as const,
      name: "TEST DATA · Submissor A",
    },
    {
      id: "test-reviewer-a",
      organizationId: "test-org-" + suffix,
      role: "reviewer" as const,
      name: "TEST DATA · Revisor A",
    },
    {
      id: "test-submitter-b",
      organizationId: "test-other-" + suffix,
      role: "operator" as const,
      name: "TEST DATA · Outra organização",
    },
    {
      id: "test-submitter-c",
      organizationId: "test-org-" + suffix,
      role: "operator" as const,
      name: "TEST DATA · Outro usuário da mesma organização",
    },
  ];
  return {
    codes,
    users,
    config: {
      identities: users.map((u, i) => ({
        ...u,
        accessCodeSha256: hash(codes[i]!),
      })),
      secureCookies: false,
    } satisfies OmnixPreviewConfig,
  };
}
const unavailable = () =>
  createAuditWorkflowService(async () => {
    throw new Error("PRIVATE_DATABASE_DETAILS_MUST_NOT_LEAK");
  });
async function listen(
  config: OmnixPreviewConfig,
  service = unavailable(),
  log?: (value: object) => void,
) {
  const server = createAuditPilotApp({
    origins: [origin],
    portal: config,
    service,
    ready: async () => undefined,
    log,
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `http://127.0.0.1:${address.port}/api/omnix`;
  const request = (
    route: string,
    cookie = "",
    body?: unknown,
    source: string | null = origin,
  ) =>
    fetch(url + route, {
      method: body === undefined ? "GET" : "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(source ? { Origin: source } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const close = async () => {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  };
  return { request, close, url };
}
test("GX019 preview config is opt-in, synthetic only and has no default or role-shared login", () => {
  assert.equal(loadOmnixPreviewConfig({}), undefined);
  assert.throws(
    () => loadOmnixPreviewConfig({ GXEON_OMNIX_PREVIEW_ENABLED: "true" }),
    /CONFIGURATION_REQUIRED/,
  );
  const fixture = identities();
  assert.equal(
    loadOmnixPreviewConfig({
      GXEON_OMNIX_PREVIEW_ENABLED: "true",
      GXEON_OMNIX_PREVIEW_IDENTITIES: JSON.stringify(fixture.config.identities),
    })?.secureCookies,
    true,
  );
  assert.throws(
    () =>
      loadOmnixPreviewConfig({
        GXEON_OMNIX_PREVIEW_ENABLED: "true",
        GXEON_OMNIX_PREVIEW_IDENTITIES: JSON.stringify([
          { ...fixture.config.identities[0], id: "real-customer" },
        ]),
      }),
    /CONFIGURATION_REQUIRED/,
  );
  assert.throws(
    () =>
      createAuditPilotApp({
        origins: [origin],
        portal: {
          ...fixture.config,
          identities: [
            fixture.config.identities[0]!,
            fixture.config.identities[0]!,
          ],
        },
        service: unavailable(),
        ready: async () => undefined,
      }),
    /UNIQUE_SYNTHETIC/,
  );
});
test("GX019 sessions reject CSRF, expire, revoke, rate-limit and never expose secrets or raw storage errors", async () => {
  const f = identities(),
    records: object[] = [];
  let time = Date.now();
  const api = await listen(
    { ...f.config, now: () => time },
    unavailable(),
    (v) => records.push(v),
  );
  const login = { identity: f.users[0]!.id, code: f.codes[0] };
  try {
    assert.equal((await api.request("/login", "", login, null)).status, 403);
    assert.equal(
      (
        await api.request(
          "/login",
          "",
          login,
          "https://attacker.example.invalid",
        )
      ).status,
      403,
    );
    assert.equal(
      (await api.request("/login", "", { ...login, role: "reviewer" })).status,
      401,
    );
    assert.equal(
      (await api.request("/login", "", { ...login, identity: "test-unknown" }))
        .status,
      401,
    );
    const response = await api.request("/login", "", login);
    assert.equal(response.status, 200);
    const setCookie = response.headers.get("set-cookie")!;
    const cookie = setCookie.split(";")[0]!;
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Strict/);
    assert.match(setCookie, /Path=\/api\/omnix/);
    const profile = await response.text();
    assert.ok(
      !profile.includes(f.codes[0]!) && !profile.includes("accessCodeSha256"),
    );
    assert.equal((await api.request("/session", cookie)).status, 200);
    const failed = await api.request("/cases", cookie);
    assert.equal(failed.status, 503);
    assert.ok(!(await failed.text()).includes("PRIVATE_DATABASE"));
    for (let i = 0; i < 61; i++) await api.request("/session", cookie);
    assert.equal((await api.request("/session", cookie)).status, 429);
    time += 31 * 60000;
    assert.equal((await api.request("/session", cookie)).status, 401);
    const again = await api.request("/login", "", login),
      second = again.headers.get("set-cookie")!.split(";")[0]!;
    assert.equal((await api.request("/logout", second, {})).status, 200);
    assert.equal((await api.request("/session", second)).status, 401);
    for (let i = 0; i < 11; i++)
      await api.request("/login", "", { ...login, code: secret() });
    assert.equal((await api.request("/login", "", login)).status, 429);
    assert.ok(
      !JSON.stringify(records).includes(f.codes[0]!) &&
        !JSON.stringify(records).includes(cookie),
    );
  } finally {
    await api.close();
  }
  const secure = await listen({ ...f.config, secureCookies: true });
  try {
    assert.match(
      (await secure.request("/login", "", login)).headers.get("set-cookie")!,
      /; Secure/,
    );
  } finally {
    await secure.close();
  }
});
test("GX019 persisted portal lifecycle isolates owners and organizations, distinct review, history and export survive API restart", async () => {
  const saved = { ...process.env },
    f = identities();
  let engine: PGlite | undefined, pool: InstanceType<typeof Pool> | undefined;
  let connect: () => Promise<Pick<PoolClient, "query" | "release">>;
  const schema = await readFile(
    new URL(
      "../../../../lib/db/drizzle/0002_audit_os_schema.sql",
      import.meta.url,
    ),
    "utf8",
  );
  if (process.env.TEST_AUDIT_DATABASE_URL) {
    const u = new URL(process.env.TEST_AUDIT_DATABASE_URL);
    assert.ok(
      ["127.0.0.1", "localhost"].includes(u.hostname) &&
        u.pathname === "/gx01_test",
      "Own loopback gx01_test only",
    );
    const admin = new Pool({ connectionString: u.href });
    try {
      if (
        !(
          await admin.query(
            "SELECT 1 FROM pg_database WHERE datname='gx019_omnix_test'",
          )
        ).rows.length
      )
        await admin.query("CREATE DATABASE gx019_omnix_test");
    } finally {
      await admin.end();
    }
    u.pathname = "/gx019_omnix_test";
    pool = new Pool({ connectionString: u.href, max: 4 });
    if (
      !(await pool.query("SELECT to_regclass('public.audit_cases') AS name"))
        .rows[0]?.name
    )
      await pool.query(schema);
    assert.equal(
      (
        await pool.query(
          "SELECT EXISTS(SELECT 1 FROM audit_cases WHERE metadata->'scope'->>'testData' IS DISTINCT FROM 'true') AS unsafe",
        )
      ).rows[0]?.unsafe,
      false,
    );
    connect = () => pool!.connect();
  } else {
    engine = await PGlite.create();
    await engine.exec(schema);
    let tail = Promise.resolve();
    connect = async () => {
      const previous = tail;
      let release!: () => void;
      tail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      return {
        query: (q: string, params?: unknown[]) => engine!.query(q, params),
        release,
      } as Pick<PoolClient, "query" | "release">;
    };
  }
  Object.assign(process.env, {
    GXEON_AUDIT_DB_PROVIDER: "postgres",
    GXEON_AUDIT_WRITE_MODE: "enabled",
    GXEON_AUDIT_ALLOW_DB_WRITES: "true",
  });
  const service = createAuditWorkflowService(connect);
  let api = await listen(f.config, service);
  const login = async (index: number) => {
    const r = await api.request("/login", "", {
      identity: f.users[index]!.id,
      code: f.codes[index],
    });
    assert.equal(r.status, 200);
    return r.headers.get("set-cookie")!.split(";")[0]!;
  };
  try {
    let a = await login(0);
    const reviewer = await login(1),
      other = await login(2),
      colleague = await login(3);
    const intake = {
      requestId: randomUUID(),
      assetName: "GX019 TEST DATA",
      assetReference: "test-fixture/vercel.json",
      authorizationReference: "test-fixture/authorized",
      authorized: true,
      testData: true,
      checks: ["vercel_api_routing", "vercel_security_headers"],
      artifact: {
        name: "vercel.json",
        content:
          '{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}',
      },
    };
    assert.equal(
      (await api.request("/cases", a, { ...intake, testData: false })).status,
      400,
    );
    assert.equal((await api.request("/cases", reviewer, intake)).status, 403);
    assert.equal(
      (await api.request("/cases", a, { ...intake, userId: f.users[2]!.id }))
        .status,
      400,
    );
    const created = await api.request("/cases", a, intake);
    assert.equal(created.status, 201);
    const id = (await created.json()).caseId;
    assert.equal((await api.request("/cases", a, intake)).status, 201);
    assert.equal(
      (await api.request("/cases", other, intake)).status,
      404,
      "Global requestId collision cannot disclose another owner's case",
    );
    for (const cookie of [other, colleague]) {
      assert.equal((await api.request(`/cases/${id}`, cookie)).status, 404);
      assert.equal(
        (await api.request(`/cases/${id}/run`, cookie, {})).status,
        404,
      );
      assert.equal(
        (await api.request(`/cases/${id}/report`, cookie)).status,
        404,
      );
      const list = omnixCasesSchema.parse(
        await (await api.request("/cases", cookie)).json(),
      );
      assert.equal(list.summary.total, 0);
      assert.equal(list.items.length, 0);
    }
    assert.equal(
      (await api.request(`/cases/${id}/run`, reviewer, {})).status,
      403,
    );
    assert.equal((await api.request(`/cases/${id}/run`, a, {})).status, 200);
    const review = {
      decision: "approve",
      humanReviewed: true,
      reviewReference:
        "TEST DATA / automated synthetic reviewer; no independent human approval",
    };
    assert.equal(
      (await api.request(`/cases/${id}/review`, a, review)).status,
      403,
    );
    assert.equal(
      (await api.request(`/cases/${id}/review`, reviewer, review)).status,
      200,
    );
    assert.equal(
      (await api.request(`/cases/${id}/finalize`, reviewer, {})).status,
      403,
    );
    assert.equal(
      (await api.request(`/cases/${id}/finalize`, a, {})).status,
      200,
    );
    const exported = await api.request(`/cases/${id}/report`, a);
    assert.equal(exported.status, 200);
    const report = auditWorkflowReportSchema.parse(await exported.json());
    assert.equal(report.report.evidence.length, 1);
    assert.equal(report.report.findings.length, 2);
    assert.equal(report.report.testData, true);
    const metrics = omnixCasesSchema.parse(
      await (await api.request("/cases", a)).json(),
    );
    assert.equal(metrics.summary.total, 1);
    assert.equal(metrics.summary.closed, 1);
    assert.equal(metrics.summary.open, 0);
    assert.equal(metrics.items[0]!.id, id);
    assert.equal(metrics.summary.findingsBySeverity.MEDIUM, 2);
    const repeated = await api.request(`/cases/${id}/run`, a, {});
    assert.equal(repeated.status, 200);
    assert.equal((await repeated.json()).reused, true);
    assert.deepEqual(
      await (await api.request(`/cases/${id}/report`, a)).json(),
      report,
      "Idempotent closed-case run cannot mutate the report",
    );
    await api.close();
    api = await listen(f.config, createAuditWorkflowService(connect));
    assert.equal(
      (await api.request("/session", a)).status,
      401,
      "API restart invalidates memory session without deleting persistent cases",
    );
    a = await login(0);
    assert.deepEqual(
      await (await api.request(`/cases/${id}/report`, a)).json(),
      report,
    );
    assert.equal(
      omnixCasesSchema.parse(await (await api.request("/cases", a)).json())
        .summary.closed,
      1,
    );
  } finally {
    await api.close();
    await engine?.close();
    await pool?.end();
    for (const key of Object.keys(process.env))
      if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
