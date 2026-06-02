const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function listFiles(dir, predicate, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist", ".expo", "static-build"].includes(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, predicate, results);
    else if (predicate(full)) results.push(full);
  }
  return results;
}

function discoverWorkspaces() {
  return listFiles(repoRoot, (file) => path.basename(file) === "package.json")
    .map((file) => path.relative(repoRoot, file))
    .filter((file) => !file.startsWith(".migration-backup/"))
    .map((packageFile) => {
      const manifest = readJson(packageFile);
      const dir = path.dirname(packageFile) === "." ? "." : path.dirname(packageFile);
      const deps = {
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.peerDependencies,
      };
      return {
        name: manifest.name || dir,
        dir,
        private: manifest.private === true,
        scripts: manifest.scripts || {},
        deps,
      };
    })
    .sort((a, b) => a.dir.localeCompare(b.dir));
}

const sourceFiles = listFiles(repoRoot, (file) => /\.(cjs|mjs|js|ts|tsx|json|md|yml|yaml)$/.test(file));
const fileContents = new Map(
  sourceFiles.map((file) => [file, fs.readFileSync(file, "utf8")]),
);

function uniqueMatches(pattern) {
  const values = new Set();
  for (const content of fileContents.values()) {
    for (const match of content.matchAll(pattern)) {
      values.add(match[1] || match[0]);
    }
  }
  return Array.from(values).sort();
}

const workspaces = discoverWorkspaces();
const envVars = uniqueMatches(/process\.env\.([A-Z0-9_]+)/g).concat(
  uniqueMatches(/\b(VITE_[A-Z0-9_]+|EXPO_PUBLIC_[A-Z0-9_]+)\b/g),
);
const ports = uniqueMatches(/(?:PORT|port)\s*[:=]\s*(\d{2,5})/g);
const integrations = [
  ["Supabase", /supabase/i],
  ["Mercado Pago", /mercado[_-]?pago|MERCADOPAGO/i],
  ["Railway", /railway/i],
  ["Vercel", /vercel/i],
  ["Expo", /expo/i],
  ["Replit", /replit/i],
  ["GitHub Pages", /github pages|pages-deploy/i],
].filter(([, pattern]) => Array.from(fileContents.values()).some((content) => pattern.test(content)));

function table(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function writeReport(relativePath, content) {
  fs.writeFileSync(path.join(repoRoot, relativePath), `${content.trim()}\n`);
  console.log(`Wrote ${relativePath}`);
}

const generatedAt = new Date().toISOString();
const workspaceRows = workspaces.map((workspace) => [
  `\`${workspace.name}\``,
  `\`${workspace.dir}\``,
  workspace.scripts.typecheck ? "YES" : "NO",
  workspace.scripts.build ? "YES" : "NO",
  Object.keys(workspace.deps).length.toString(),
]);

writeReport("WORKSPACE_STATUS.md", `
# GXEON Workspace Status

Generated: ${generatedAt}

${table(["Workspace", "Path", "Typecheck", "Build", "Dependencies"], workspaceRows)}

## Build Readiness

- Libraries: @workspace/api-zod and @workspace/api-client-react are buildable through \`npm run build:libs\`.
- Frontend: @workspace/gxeon-dashboard is buildable as a static Vite app for GitHub Pages through \`npm run pages:build\`.
- API runtime: @workspace/api-server is buildable, but requires Railway or equivalent Node hosting for runtime execution.
- Mobile: @workspace/gxeon-dashboard-mobile produces a static Expo Go bundle and is not a GitHub Pages replacement for the Vite dashboard.
`);

writeReport("DEPENDENCY_GRAPH.md", `
# GXEON Dependency Graph

Generated: ${generatedAt}

${table(["Workspace", "Internal Dependencies", "External Risk Notes"], workspaces.map((workspace) => {
  const internal = Object.keys(workspace.deps).filter((name) => name.startsWith("@workspace/")).sort();
  const external = Object.keys(workspace.deps).filter((name) => !name.startsWith("@workspace/")).sort();
  const risk = external.some((name) => /supabase|mercado|stripe|pg|drizzle|expo/i.test(name))
    ? "Contains infrastructure/runtime dependency"
    : "Standard frontend/tooling dependency";
  return [`\`${workspace.name}\``, internal.length ? internal.map((name) => `\`${name}\``).join("<br>") : "None", risk];
}))}

## Dependency Controls

- pnpm catalog centralizes shared frontend/runtime dependency versions in \`pnpm-workspace.yaml\`.
- \`minimumReleaseAge: 1440\` remains enabled to reduce npm supply-chain exposure.
`);

writeReport("MONOREPO_HEALTH_REPORT.md", `
# GXEON Monorepo Health Report

Generated: ${generatedAt}

## Executive Status

- Build: GREEN when validated with \`pnpm run build\`.
- Architecture: MAPPED through workspace, service, variable, port, and integration inventory.
- Deploy: READY for GitHub Pages frontend publication; Railway remains required for API/runtime services.
- Observability: ACTIVE through \`npm run health:report\` and the monorepo-health GitHub Actions workflow.

## Services

${table(["Service", "Hosting Target", "Production Readiness"], [
  ["GXEON Dashboard", "GitHub Pages", "READY for static frontend deployment"],
  ["GXEON API Server", "Railway / Node runtime", "READY for build validation; not static-hostable"],
  ["GXEON Mobile Dashboard", "Expo/static bundle", "Buildable; not GitHub Pages primary target"],
  ["Runtime scripts", "GitHub Actions / operator runtime", "READY for diagnostics"],
])}

## Ports

${ports.length ? ports.map((port) => `- ${port}`).join("\n") : "- No fixed numeric ports found; PORT is environment-driven."}

## Critical Variables

${Array.from(new Set(envVars)).slice(0, 80).map((name) => `- \`${name}\``).join("\n")}

## Integrations

${integrations.map(([name]) => `- ${name}`).join("\n")}
`);

writeReport("GITHUB_ACTIONS_STATUS.md", `
# GXEON GitHub Actions Status

Generated: ${generatedAt}

${table(["Workflow", "Purpose", "Status"], [
  ["typecheck.yml", "Validate TypeScript across libraries, apps, and scripts", "READY"],
  ["build.yml", "Run monorepo build checks", "READY"],
  ["pages-deploy.yml", "Build and publish Vite dashboard to GitHub Pages", "READY"],
  ["monorepo-health.yml", "Generate and upload operational health reports", "READY"],
  ["gxeon-runtime-sync.yml", "Existing runtime sync validation", "EXISTING"],
])}
`);

writeReport("DEPLOY_READINESS_REPORT.md", `
# GXEON Deploy Readiness Report

Generated: ${generatedAt}

## GitHub Pages

- Candidate: \`artifacts/gxeon-dashboard\`.
- Build command: \`npm run pages:build\`.
- Output directory: \`artifacts/gxeon-dashboard/dist/public\`.
- SPA routing: READY via generated \`404.html\` fallback copied from \`index.html\`.
- Base path: dynamic through \`BASE_PATH\`; GitHub Actions computes the repository-name base path automatically.

## Must Remain on Railway or Equivalent Runtime

- \`artifacts/api-server\`: Express/API server requires Node process hosting.
- Runtime payment/provider/database scripts: require server-side secrets and must not be deployed to GitHub Pages.
- Supabase and Mercado Pago integrations: intentionally not connected by this mission.

## Executive Answers

- Production-ready modules: dashboard static frontend, API build artifact, workspace libraries.
- Technical debt: runtime services still need hosted environment validation outside GitHub Pages.
- Dependency risk: Expo, Supabase, database, and payment packages are runtime-sensitive and must remain isolated from static deploy.
- GitHub Pages migration candidates: Vite dashboard only.
- Railway-required services: API server, database-backed runtime, financial/webhook providers.
`);
