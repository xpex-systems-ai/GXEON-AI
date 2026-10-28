import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { root } from "./test-support.mjs";
const source = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const dirty = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: root, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
if (dirty.some(line => line.slice(3) !== ".github/PULL_REQUEST_TEMPLATE.md")) throw new Error("COMMITTED_RELEASE_SOURCES_REQUIRED");
const directory = path.join(root, ".gx-selfhost/releases", source);
if (fs.existsSync(directory)) throw new Error("RELEASE_EXISTS_NO_OVERWRITE");
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
const files = [["artifacts/api-server/dist/audit-pilot.mjs", "audit-pilot.mjs"], ["lib/db/drizzle/0002_audit_os_schema.sql", "schema.sql"],
  ["deploy/audit-pilot/grants.example.sql", "grants.sql"], ["deploy/self-hosted/README.md", "README.md"],
  ["deploy/self-hosted/runtime.env.example", "runtime.env.example"],
  ["lib/db/drizzle/0003_omnix_enterprise_identity.sql", "enterprise-schema.sql"],
  ["lib/db/drizzle/0004_omnix_commercial_intake.sql", "commercial-schema.sql"],
  ["deploy/render/enterprise-grants.example.sql", "enterprise-grants.example.sql"],
  ["deploy/self-hosted/encrypted-backup.mjs", "encrypted-backup.mjs"],
  ["docs/audit-os/gx-04-0/IDENTITY.md", "IDENTITY.md"],
  ["docs/audit-os/gx-04-0/DISTRIBUTION.md", "DISTRIBUTION.md"]];
for (const [from, to] of files) fs.copyFileSync(path.join(root, from), path.join(directory, to), fs.constants.COPYFILE_EXCL);
fs.cpSync(path.join(root, "artifacts/gxeon-dashboard/dist/public"), path.join(directory, "public"), { recursive: true, errorOnExist: true, force: false });
const records = [];
function inventory(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
  const file = path.join(dir, item.name); if (item.isSymbolicLink()) throw new Error("NO_RELEASE_SYMLINKS");
  if (item.isDirectory()) inventory(file); else { const bytes = fs.readFileSync(file); records.push({ file: path.relative(directory, file).replaceAll("\\", "/"), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") }); }
} }
inventory(directory); const manifest = { sourceCommit: source, generatedAt: new Date().toISOString(), nodeMajor: 24, postgresMajor: 17,
  providerAccountRequired: false, credentialsIncluded: false, browserTrustConfigured: false,
  excludedWorkstationCollision: dirty.length ? ".github/PULL_REQUEST_TEMPLATE.md" : null, records };
fs.writeFileSync(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2), { flag: "wx" }); console.log(JSON.stringify({ directory, files: records.length, sourceCommit: source }));
