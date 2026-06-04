#!/usr/bin/env node
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const generatedAt = new Date().toISOString();
const mission = 'MISSION_003_8_SUPABASE_GO_LIVE';

const env = {
  DATABASE_URL: process.env.DATABASE_URL || '',
  DIRECT_URL: process.env.DIRECT_URL || '',
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

const artifacts = {
  markdown: path.join(rootDir, 'SUPABASE_GO_LIVE_REPORT.md'),
  health: path.join(rootDir, 'artifacts/DATABASE_HEALTH_REPORT.json'),
  smoke: path.join(rootDir, 'artifacts/DATABASE_SMOKE_RESULT.json'),
  runtime: path.join(rootDir, 'artifacts/FINANCIAL_RUNTIME_REPORT.json'),
  endpoints: path.join(rootDir, 'artifacts/FINANCIAL_ENDPOINT_VALIDATION.json'),
  activationHealth: path.join(rootDir, 'artifacts/SUPABASE_HEALTH_REPORT.json'),
};

function writeJson(filePath, payload) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function readJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function maskSecret(value) {
  if (!value) return null;
  if (value.startsWith('postgres')) {
    try {
      const url = new URL(value);
      if (url.username) url.username = '***';
      if (url.password) url.password = '***';
      return url.toString();
    } catch {
      return value.replace(/:\/\/([^:@]+):([^@]+)@/, '://***:***@');
    }
  }
  if (value.startsWith('http')) return value;
  return `${value.slice(0, 12)}***${value.slice(-6)}`;
}

function detectProjectId() {
  const explicit = process.env.SUPABASE_PROJECT_ID || process.env.SUPABASE_PROJECT_REF;
  if (explicit) return explicit;

  const candidates = [env.SUPABASE_URL, env.DATABASE_URL, env.DIRECT_URL].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const hostname = new URL(candidate).hostname;
      const urlMatch = hostname.match(/^([^.]+)\.supabase\.co$/);
      if (urlMatch) return urlMatch[1];
      const dbMatch = hostname.match(/^db\.([^.]+)\.supabase\.co$/);
      if (dbMatch) return dbMatch[1];
    } catch {
      // Ignore malformed secrets; downstream validation will report them.
    }
  }
  return null;
}

function validateEnvironment() {
  const required = [
    'DATABASE_URL',
    'DIRECT_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  const configured = Object.fromEntries(required.map((key) => [key, Boolean(env[key])]));
  const missing = required.filter((key) => !configured[key]);

  return {
    configured,
    missing,
    masked: {
      DATABASE_URL: maskSecret(env.DATABASE_URL),
      DIRECT_URL: maskSecret(env.DIRECT_URL),
      SUPABASE_URL: maskSecret(env.SUPABASE_URL),
      SUPABASE_ANON_KEY: maskSecret(env.SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: maskSecret(env.SUPABASE_SERVICE_ROLE_KEY),
    },
    supabaseProjectId: detectProjectId(),
    valid: missing.length === 0,
  };
}

async function validateSupabaseRest(environment) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      status: 'BLOCKED',
      anon: { ok: false, status: null },
      serviceRole: { ok: false, status: null },
      reason: 'SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are required for REST validation.',
    };
  }

  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
  async function probe(label, key) {
    const started = performance.now();
    try {
      const response = await fetch(`${baseUrl}/rest/v1/`, {
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
        },
      });
      return {
        label,
        ok: response.status < 500,
        status: response.status,
        latencyMs: Math.round((performance.now() - started) * 100) / 100,
      };
    } catch (error) {
      return {
        label,
        ok: false,
        status: null,
        latencyMs: Math.round((performance.now() - started) * 100) / 100,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  const [anon, serviceRole] = await Promise.all([
    probe('anon', env.SUPABASE_ANON_KEY),
    probe('service_role', env.SUPABASE_SERVICE_ROLE_KEY),
  ]);

  return {
    status: anon.ok && serviceRole.ok ? 'PASS' : 'FAILED',
    projectId: environment.supabaseProjectId,
    anon,
    serviceRole,
  };
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: process.env,
    encoding: 'utf8',
    ...options,
  });
  return {
    command: [command, ...args].join(' '),
    exitCode: result.status,
    status: result.status === 0 ? 'PASS' : 'FAILED',
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function blockedPayloads(environment, rest) {
  const reason = `Supabase go-live blocked. Missing required env vars: ${environment.missing.join(', ') || 'none'}.`;
  const health = {
    report: 'DATABASE_HEALTH_REPORT',
    mission,
    generatedAt,
    status: 'BLOCKED',
    databaseConnection: false,
    schemaDeployed: false,
    crudValidated: false,
    rollbackValidated: false,
    apiStatus: 'BLOCKED',
    productionReady: false,
    supabaseProjectId: environment.supabaseProjectId,
    environment,
    supabaseRest: rest,
    operationalScore: 0,
    reason,
  };
  const smoke = {
    report: 'DATABASE_SMOKE_RESULT',
    mission,
    generatedAt,
    status: 'BLOCKED',
    checks: {
      database_connection: false,
      schema_deployed: false,
      crud_validated: false,
      rollback_validated: false,
      api_status_200: false,
      production_ready: false,
    },
    reason,
  };
  const runtime = {
    report: 'FINANCIAL_RUNTIME_REPORT',
    mission,
    generatedAt,
    status: 'BLOCKED',
    financialRuntime: 'BLOCKED',
    reason,
  };
  return { health, smoke, runtime };
}

function scoreGoLive({ environment, rest, activationHealth, smoke, runtime, endpoints }) {
  const checks = [
    environment.valid,
    rest.status === 'PASS',
    activationHealth?.databaseConnected === true,
    activationHealth?.schemaApplied === true,
    smoke?.checks?.wallet_crud === true,
    smoke?.checks?.transaction_crud === true,
    smoke?.checks?.payment_attempt_crud === true,
    smoke?.checks?.ledger_crud === true,
    smoke?.checks?.rollback_test === true,
    runtime?.status === 'HEALTHY',
    endpoints?.passed === true,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function writeMarkdown({ health, smoke, runtime, endpoints, environment, rest, activationCommand }) {
  const lines = [
    '# SUPABASE GO-LIVE REPORT — MISSION_003_8_SUPABASE_GO_LIVE',
    '',
    `- **Generated at:** ${generatedAt}`,
    '- **Branch:** `feature/supabase-go-live`',
    `- **Mission status:** ${health.status}`,
    `- **Supabase Project ID:** ${environment.supabaseProjectId || 'not detected'}`,
    `- **Database connection:** ${health.databaseConnection}`,
    `- **Schema deployed:** ${health.schemaDeployed}`,
    `- **CRUD validated:** ${health.crudValidated}`,
    `- **Rollback validated:** ${health.rollbackValidated}`,
    `- **API status:** ${health.apiStatus}`,
    `- **Production ready:** ${health.productionReady}`,
    `- **Operational score:** ${health.operationalScore}`,
    '',
    '## Environment validation',
    '',
    `- DATABASE_URL: ${environment.configured.DATABASE_URL}`,
    `- DIRECT_URL: ${environment.configured.DIRECT_URL}`,
    `- SUPABASE_URL: ${environment.configured.SUPABASE_URL}`,
    `- SUPABASE_ANON_KEY: ${environment.configured.SUPABASE_ANON_KEY}`,
    `- SUPABASE_SERVICE_ROLE_KEY: ${environment.configured.SUPABASE_SERVICE_ROLE_KEY}`,
    `- Missing: ${environment.missing.join(', ') || 'none'}`,
    '',
    '## Supabase REST validation',
    '',
    `- REST status: ${rest.status}`,
    `- Anon status: ${rest.anon?.status ?? 'n/a'}`,
    `- Service role status: ${rest.serviceRole?.status ?? 'n/a'}`,
    '',
    '## Schema and database',
    '',
    `- Drizzle push: ${activationCommand?.status ?? 'not executed'}`,
    `- Tables present: ${smoke?.checks?.all_tables_present ?? false}`,
    `- Enums present: ${smoke?.checks?.all_enums_present ?? false}`,
    `- Foreign keys valid: ${smoke?.checks?.foreign_keys_valid ?? false}`,
    `- Indexes valid: ${smoke?.checks?.indexes_valid ?? false}`,
    `- Database latency: ${health.databaseLatencyMs ?? 'n/a'} ms`,
    '',
    '## Financial CRUD and transactions',
    '',
    `- Wallet CRUD: ${smoke?.checks?.wallet_crud ?? false}`,
    `- Transaction CRUD: ${smoke?.checks?.transaction_crud ?? false}`,
    `- Payment attempt CRUD: ${smoke?.checks?.payment_attempt_crud ?? false}`,
    `- Ledger CRUD: ${smoke?.checks?.ledger_crud ?? false}`,
    `- Delete validation: ${smoke?.checks?.delete_validation ?? false}`,
    `- Rollback validation: ${smoke?.checks?.rollback_test ?? false}`,
    '',
    '## API validation',
    '',
    `- Endpoint validation: ${endpoints?.status ?? 'not executed'}`,
    `- Runtime database endpoint: ${endpoints?.endpoints?.find?.((item) => item.endpoint === '/v1/runtime/database')?.httpStatus ?? 'n/a'}`,
    `- Financial health endpoint: ${endpoints?.endpoints?.find?.((item) => item.endpoint === '/v1/financial/health')?.httpStatus ?? 'n/a'}`,
    '',
    '## Final status',
    '',
    health.productionReady
      ? '- GXEON database is released for production and the next mission can start.'
      : `- Go-live is blocked: ${health.reason || 'one or more validation gates failed.'}`,
  ];
  writeFileSync(artifacts.markdown, `${lines.join('\n')}\n`);
}

async function main() {
  const environment = validateEnvironment();
  const rest = await validateSupabaseRest(environment);

  if (!environment.valid) {
    const { health, smoke, runtime } = blockedPayloads(environment, rest);
    const endpoints = {
      report: 'FINANCIAL_ENDPOINT_VALIDATION',
      mission,
      generatedAt,
      status: 'BLOCKED',
      passed: false,
      endpoints: [],
      reason: health.reason,
    };
    writeJson(artifacts.health, health);
    writeJson(artifacts.smoke, smoke);
    writeJson(artifacts.runtime, runtime);
    writeJson(artifacts.endpoints, endpoints);
    writeMarkdown({ health, smoke, runtime, endpoints, environment, rest, activationCommand: null });
    console.error(JSON.stringify(health, null, 2));
    process.exitCode = 1;
    return;
  }

  const activationCommand = runCommand('pnpm', ['run', 'supabase:activate:push']);
  const activationHealth = readJson(artifacts.activationHealth, null);
  const smoke = readJson(artifacts.smoke, null);
  const runtime = readJson(artifacts.runtime, null);
  const endpoints = readJson(artifacts.endpoints, null);
  const operationalScore = scoreGoLive({ environment, rest, activationHealth, smoke, runtime, endpoints });
  const productionReady = operationalScore === 100
    && activationCommand.status === 'PASS'
    && activationHealth?.status === 'PASS'
    && runtime?.status === 'HEALTHY'
    && endpoints?.passed === true;

  const health = {
    report: 'DATABASE_HEALTH_REPORT',
    mission,
    generatedAt,
    status: productionReady ? 'PASS' : 'FAILED',
    databaseConnection: activationHealth?.databaseConnected === true,
    schemaDeployed: activationHealth?.schemaApplied === true,
    crudValidated: Boolean(smoke?.checks?.wallet_crud && smoke?.checks?.transaction_crud && smoke?.checks?.payment_attempt_crud && smoke?.checks?.ledger_crud),
    rollbackValidated: smoke?.checks?.rollback_test === true,
    apiStatus: endpoints?.passed ? '200' : 'FAILED',
    productionReady,
    supabaseProjectId: environment.supabaseProjectId,
    databaseLatencyMs: activationHealth?.databaseLatencyMs ?? null,
    tableCounts: activationHealth?.tableCounts ?? null,
    environment,
    supabaseRest: rest,
    activationCommand: {
      command: activationCommand.command,
      status: activationCommand.status,
      exitCode: activationCommand.exitCode,
    },
    operationalScore,
    reason: productionReady ? null : 'Supabase go-live requires every environment, schema, CRUD, rollback and API gate to pass.',
  };

  writeJson(artifacts.health, health);
  writeMarkdown({ health, smoke, runtime, endpoints, environment, rest, activationCommand });
  console.log(JSON.stringify(health, null, 2));
  process.exitCode = productionReady ? 0 : 1;
}

main().catch((error) => {
  const environment = validateEnvironment();
  const health = {
    report: 'DATABASE_HEALTH_REPORT',
    mission,
    generatedAt,
    status: 'FAILED',
    productionReady: false,
    environment,
    operationalScore: 0,
    error: error instanceof Error ? error.message : String(error),
  };
  writeJson(artifacts.health, health);
  writeMarkdown({ health, smoke: null, runtime: null, endpoints: null, environment, rest: { status: 'FAILED' }, activationCommand: null });
  console.error(JSON.stringify(health, null, 2));
  process.exitCode = 1;
});
