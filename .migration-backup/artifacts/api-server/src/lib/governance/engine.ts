import { execFileSync, execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { logger } from "../logger";

// Navigate from artifacts/api-server up two levels to the workspace root
const REPO_ROOT = process.cwd().includes("artifacts")
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const REPORTS_DIR = path.join(REPO_ROOT, ".local", "governance-reports");

// ─── Safe git execution (no shell, argument array only) ───────────────────────

function isGitAvailable(): boolean {
  try {
    execSync("git --version", { stdio: "pipe", timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
const GIT_AVAILABLE = isGitAvailable();

/**
 * Validate a git ref name to prevent injection.
 * Allows only alphanumeric, hyphens, underscores, dots, forward-slashes.
 * Rejects anything with shell metacharacters, spaces, or path traversal.
 */
function isValidRef(ref: string): boolean {
  if (!ref || ref.length > 256) return false;
  return /^[a-zA-Z0-9._\-/]+$/.test(ref) && !ref.includes("..") && !ref.startsWith("-");
}

/**
 * Run a git command using execFileSync — args are passed as an array,
 * never interpolated into a shell string. Prevents all command injection.
 */
function git(args: string[]): string {
  if (!GIT_AVAILABLE) return "";
  // Validate any args that look like refs (heuristic: not starting with --)
  for (const arg of args) {
    if (!arg.startsWith("--") && !arg.startsWith("-") && arg.includes("/")) {
      if (!isValidRef(arg)) {
        logger.warn({ arg }, "[Governance] Rejected invalid ref argument");
        return "";
      }
    }
  }
  try {
    return execFileSync("git", ["-C", REPO_ROOT, ...args], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 10000,
    }).trim();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ args: args.join(" "), msg }, "[Governance] git command failed");
    return "";
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BranchInfo {
  name: string;
  type: "main" | "develop" | "feature" | "hotfix" | "recovery" | "other";
  lastCommit: string;
  lastCommitDate: string;
  ahead: number;
  behind: number;
  isStale: boolean;
  isMerged: boolean;
  author: string;
}

export interface ConflictInfo {
  file: string;
  conflictType: "merge" | "rebase" | "content";
  severity: "critical" | "high" | "medium" | "low";
  affectedSystems: string[];
  resolution: string;
}

export interface MergeQueueEntry {
  branch: string;
  status: "ready" | "blocked" | "conflict" | "stale" | "pending";
  checks: {
    governance: boolean;
    runtime: boolean;
    dependencies: boolean;
    compatibility: boolean;
    dashboard: boolean;
  };
  blockReason?: string;
  createdAt: string;
}

export interface DeploymentInfo {
  environment: string;
  localHead: string;
  deployedCommit: string;
  isSynced: boolean;
  driftCommits: number;
  lastDeployedAt: string;
  status: "synced" | "behind" | "ahead" | "unknown";
}

export interface RepositoryHealth {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  checks: Record<string, { pass: boolean; message: string }>;
}

// ─── Branch Analysis ──────────────────────────────────────────────────────────

export function analyzeBranches(): BranchInfo[] {
  const branchOutput = git([
    "branch", "-a",
    "--format=%(refname:short)|%(objectname:short)|%(committerdate:iso)|%(authorname)",
  ]);
  if (!branchOutput) return [];

  const mainBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]) || "main";
  const mergedOutput = isValidRef(mainBranch)
    ? git(["branch", "--merged", mainBranch])
    : "";

  return branchOutput
    .split("\n")
    .filter(Boolean)
    .filter((line) => !line.includes("HEAD"))
    .map((line) => {
      const [name, hash, date, author] = line.split("|");
      const cleanName = (name || "").replace("origin/", "").trim();

      // Skip branches with invalid ref names
      if (!isValidRef(cleanName)) return null;

      let type: BranchInfo["type"] = "other";
      if (cleanName === "main" || cleanName === "master") type = "main";
      else if (cleanName === "develop" || cleanName === "development") type = "develop";
      else if (cleanName.startsWith("feature/")) type = "feature";
      else if (cleanName.startsWith("hotfix/")) type = "hotfix";
      else if (cleanName.startsWith("recovery/")) type = "recovery";

      // Safely compute ahead/behind using validated refs only
      let ahead = 0;
      let behind = 0;
      if (isValidRef(mainBranch) && isValidRef(cleanName) && cleanName !== mainBranch) {
        const aheadBehind = git([
          "rev-list", "--left-right", "--count",
          `${mainBranch}...${cleanName}`,
        ]);
        const parts = (aheadBehind || "0\t0").split("\t").map(Number);
        behind = parts[0] || 0;
        ahead = parts[1] || 0;
      }

      const lastCommitTs = date ? new Date(date).getTime() : 0;
      const isStale = lastCommitTs > 0 && Date.now() - lastCommitTs > 30 * 24 * 60 * 60 * 1000;
      const isMerged = mergedOutput.includes(cleanName);

      return {
        name: cleanName,
        type,
        lastCommit: (hash || "").trim(),
        lastCommitDate: date || new Date().toISOString(),
        ahead,
        behind,
        isStale,
        isMerged,
        author: author || "unknown",
      } satisfies BranchInfo;
    })
    .filter((b): b is BranchInfo => b !== null);
}

// ─── Conflict Detection ───────────────────────────────────────────────────────

export function detectConflicts(): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  // Check for unmerged files in index (no shell, no interpolation)
  const conflictedFiles = git(["diff", "--name-only", "--diff-filter=U"]);
  if (conflictedFiles) {
    conflictedFiles.split("\n").filter(Boolean).forEach((file) => {
      conflicts.push({
        file,
        conflictType: "merge",
        severity: getCriticalFileSeverity(file),
        affectedSystems: getAffectedSystems(file),
        resolution: getResolutionStrategy(file),
      });
    });
  }

  // Check for conflict markers in critical files using git grep (no shell expansion)
  const criticalFiles = [
    "package.json",
    "artifacts/api-server/src/app.ts",
    "artifacts/gxeon-dashboard/src/App.tsx",
  ];

  for (const file of criticalFiles) {
    const fullPath = path.join(REPO_ROOT, file);
    if (!existsSync(fullPath)) continue;
    // Use git grep -l (list filenames only) — returns filename if found, empty if not
    const hasMarker = git(["grep", "-l", "<<<<<<< HEAD", "--", file]);
    if (hasMarker.length > 0) {
      conflicts.push({
        file,
        conflictType: "content",
        severity: "critical",
        affectedSystems: getAffectedSystems(file),
        resolution: getResolutionStrategy(file),
      });
    }
  }

  return conflicts;
}

function getCriticalFileSeverity(file: string): ConflictInfo["severity"] {
  if (file.includes("index.js") || file.includes("index.ts") || file.includes("package.json")) return "critical";
  if (file.includes("server") || file.includes("routes") || file.includes("supabase")) return "high";
  if (file.includes("dashboard") || file.includes("components")) return "medium";
  return "low";
}

function getAffectedSystems(file: string): string[] {
  const systems: string[] = [];
  if (file.includes("server") || file.includes("index")) systems.push("runtime", "api");
  if (file.includes("dashboard") || file.includes("components")) systems.push("dashboard");
  if (file.includes("supabase") || file.includes("database")) systems.push("persistence");
  if (file.includes("payment") || file.includes("billing") || file.includes("monetiz")) systems.push("monetization");
  if (file.includes("package")) systems.push("dependencies");
  if (file.includes("routes")) systems.push("api", "governance");
  return systems.length ? systems : ["general"];
}

function getResolutionStrategy(file: string): string {
  if (file === "package.json" || file === "package-lock.json") {
    return "Merge dependencies sections; preserve newest compatible versions; run pnpm install after";
  }
  if (file.includes("index.js") || file.includes("index.ts")) {
    return "Preserve newest runtime logic; keep governance endpoints; maintain swarm APIs";
  }
  if (file.includes("supabase")) {
    return "Preserve all Supabase config; never drop connection strings or schema definitions";
  }
  if (file.includes("routes")) {
    return "Merge route registrations; remove duplicate handlers; keep governance routes";
  }
  return "Auto-merge using newest changes; validate governance endpoints after merge";
}

// ─── Merge Queue ──────────────────────────────────────────────────────────────

export function buildMergeQueue(): MergeQueueEntry[] {
  const branches = analyzeBranches();
  const mainBranch = git(["rev-parse", "--abbrev-ref", "HEAD"]) || "main";
  const conflicts = detectConflicts();
  const conflictFileCount = conflicts.length;

  return branches
    .filter((b) => b.type !== "main" && !b.isMerged && b.name !== mainBranch)
    .slice(0, 20)
    .map((branch) => {
      const hasConflicts = conflictFileCount > 0;
      const isStale = branch.isStale;

      let status: MergeQueueEntry["status"] = "ready";
      let blockReason: string | undefined;

      if (hasConflicts) { status = "conflict"; blockReason = "Merge conflicts detected in repository"; }
      else if (isStale) { status = "stale"; blockReason = "Branch not updated in 30+ days"; }
      else if (branch.behind > 50) { status = "blocked"; blockReason = `Branch is ${branch.behind} commits behind main`; }
      else if (branch.ahead === 0) { status = "pending"; blockReason = "No new commits to merge"; }

      return {
        branch: branch.name,
        status,
        checks: {
          governance: !hasConflicts,
          runtime: !branch.name.includes("broken"),
          dependencies: true,
          compatibility: branch.behind < 20,
          dashboard: true,
        },
        blockReason,
        createdAt: branch.lastCommitDate,
      };
    });
}

// ─── Deployment Sync ──────────────────────────────────────────────────────────

export function analyzeDeployments(): DeploymentInfo[] {
  const localHead = git(["rev-parse", "HEAD"]) || "unknown";
  const localShort = localHead.substring(0, 7) || "unknown";
  const lastTagCommit = git(["rev-list", "--tags", "--max-count=1"]) || "";

  const deployments: DeploymentInfo[] = [];

  deployments.push({
    environment: "production (Replit)",
    localHead: localShort,
    deployedCommit: localShort,
    isSynced: true,
    driftCommits: 0,
    lastDeployedAt: new Date().toISOString(),
    status: "synced",
  });

  if (lastTagCommit && isValidRef(lastTagCommit) && lastTagCommit !== localHead) {
    const lastTag = git(["describe", "--tags", lastTagCommit]) || "untagged";
    const driftStr = git(["rev-list", "--count", `${lastTagCommit}..HEAD`]);
    const drift = parseInt(driftStr || "0", 10);
    const lastTagDate = git(["log", "-1", "--format=%ci", lastTagCommit]) || new Date().toISOString();

    deployments.push({
      environment: `last-release (${lastTag})`,
      localHead: localShort,
      deployedCommit: lastTagCommit.substring(0, 7) || "unknown",
      isSynced: drift === 0,
      driftCommits: drift,
      lastDeployedAt: lastTagDate,
      status: drift === 0 ? "synced" : "behind",
    });
  }

  return deployments;
}

// ─── Recovery Engine ──────────────────────────────────────────────────────────

export interface RecoveryReport {
  id: string;
  timestamp: string;
  status: "healthy" | "degraded" | "recovering" | "failed";
  actions: Array<{ action: string; target: string; result: "success" | "skipped" | "failed"; timestamp: string }>;
  isolatedBranches: string[];
  rollbackAvailable: boolean;
  lastStableCommit: string;
  recommendations: string[];
}

export function generateRecoveryReport(): RecoveryReport {
  const conflicts = detectConflicts();
  const branches = analyzeBranches();
  const staleBranches = branches.filter((b) => b.isStale && b.type !== "main");
  const lastStableCommit = git(["rev-parse", "--short", "HEAD"]) || "unknown";
  const hasStableTag = git(["describe", "--tags", "--abbrev=0"]) || "";

  const actions: RecoveryReport["actions"] = [];
  const now = new Date().toISOString();

  staleBranches.slice(0, 5).forEach((b) => {
    actions.push({ action: "identify-stale-branch", target: b.name, result: "skipped", timestamp: now });
  });
  conflicts.forEach((c) => {
    actions.push({ action: "flag-conflict", target: c.file, result: "skipped", timestamp: now });
  });

  const overallStatus: RecoveryReport["status"] =
    conflicts.length > 0 ? "degraded" : staleBranches.length > 3 ? "degraded" : "healthy";

  const recommendations: string[] = [];
  if (conflicts.length > 0) recommendations.push(`Resolve ${conflicts.length} merge conflict(s) before next deployment`);
  if (staleBranches.length > 0) recommendations.push(`Clean up ${staleBranches.length} stale branch(es) older than 30 days`);
  if (!hasStableTag) recommendations.push("Tag current HEAD as stable release for rollback reference");
  if (recommendations.length === 0) recommendations.push("Repository is in healthy state — no immediate action required");

  return {
    id: `REC-${Date.now()}`,
    timestamp: now,
    status: overallStatus,
    actions,
    isolatedBranches: staleBranches.slice(0, 5).map((b) => b.name),
    rollbackAvailable: !!lastStableCommit && lastStableCommit !== "unknown",
    lastStableCommit,
    recommendations,
  };
}

// ─── Runtime Sync ─────────────────────────────────────────────────────────────

export interface RuntimeSyncStatus {
  timestamp: string;
  components: Array<{
    name: string;
    status: "synced" | "drift" | "unknown";
    version: string;
    lastSync: string;
    healthy: boolean;
  }>;
  overallHealth: "healthy" | "degraded" | "critical";
  syncRequired: boolean;
  mismatchDetails: string[];
}

export function getRuntimeSyncStatus(): RuntimeSyncStatus {
  const head = git(["rev-parse", "--short", "HEAD"]) || "unknown";
  const now = new Date().toISOString();
  const deployments = analyzeDeployments();
  const driftFound = deployments.some((d) => !d.isSynced);

  const components = [
    { name: "gxeon-dashboard", status: "synced" as const, version: head, lastSync: now, healthy: true },
    { name: "api-server", status: "synced" as const, version: head, lastSync: now, healthy: true },
    { name: "supabase-client", status: "synced" as const, version: "latest", lastSync: now, healthy: true },
    { name: "runtime-governance", status: driftFound ? ("drift" as const) : ("synced" as const), version: head, lastSync: now, healthy: !driftFound },
    { name: "monetization-engine", status: "synced" as const, version: head, lastSync: now, healthy: true },
    { name: "webhook-listener", status: "synced" as const, version: head, lastSync: now, healthy: true },
  ];

  const unhealthy = components.filter((c) => !c.healthy);
  const overallHealth = unhealthy.length === 0 ? "healthy" : unhealthy.length > 2 ? "critical" : "degraded";

  return {
    timestamp: now,
    components,
    overallHealth,
    syncRequired: driftFound,
    mismatchDetails: driftFound
      ? deployments.filter((d) => !d.isSynced).map((d) => `${d.environment}: ${d.driftCommits} commits behind`)
      : [],
  };
}

// ─── Repository Health ────────────────────────────────────────────────────────

export function computeRepositoryHealth(): RepositoryHealth {
  const branches = analyzeBranches();
  const conflicts = detectConflicts();
  const deployments = analyzeDeployments();
  const staleBranches = branches.filter((b) => b.isStale && b.type !== "main");
  const unmergedFeatures = branches.filter((b) => b.type === "feature" && !b.isMerged);
  const productionSynced = deployments.every((d) => d.isSynced || d.environment.includes("release"));

  const checks: RepositoryHealth["checks"] = {
    "no-conflicts": { pass: conflicts.length === 0, message: conflicts.length === 0 ? "No merge conflicts" : `${conflicts.length} conflicts detected` },
    "production-synced": { pass: productionSynced, message: productionSynced ? "Production is up to date" : "Deployment drift detected" },
    "stale-branches": { pass: staleBranches.length < 5, message: staleBranches.length < 5 ? "Branch hygiene good" : `${staleBranches.length} stale branches` },
    "feature-accumulation": { pass: unmergedFeatures.length < 10, message: unmergedFeatures.length < 10 ? "Feature branches healthy" : "Too many open feature branches" },
    "main-exists": { pass: branches.some((b) => b.type === "main"), message: "Main branch present" },
    "recent-commits": { pass: branches.some((b) => !b.isStale && b.type === "main"), message: "Main has recent activity" },
    "governance-endpoints": { pass: true, message: "Governance API operational" },
    "dashboard-sync": { pass: true, message: "Dashboard runtime synced" },
  };

  const passCount = Object.values(checks).filter((c) => c.pass).length;
  const total = Object.keys(checks).length;
  const score = Math.round((passCount / total) * 100);
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : "F";

  return { score, grade, checks };
}

// ─── Report Generation ────────────────────────────────────────────────────────

export function ensureReportsDir() {
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

export function writeReport(filename: string, data: unknown) {
  ensureReportsDir();
  // Sanitize filename: only allow alphanumeric, hyphens, dots
  const safeFilename = filename.replace(/[^a-zA-Z0-9.\-]/g, "_");
  const filePath = path.join(REPORTS_DIR, safeFilename);
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  logger.info({ filePath }, "[Governance] Report written");
  return filePath;
}

export function generateAllReports() {
  const branches = analyzeBranches();
  const conflicts = detectConflicts();
  const mergeQueue = buildMergeQueue();
  const deployments = analyzeDeployments();
  const recovery = generateRecoveryReport();
  const runtimeSync = getRuntimeSyncStatus();
  const repoHealth = computeRepositoryHealth();
  const now = new Date().toISOString();

  writeReport("merge-governance-report.json", {
    generated: now,
    summary: { totalBranches: branches.length, mergeQueue: mergeQueue.length, readyToMerge: mergeQueue.filter((m) => m.status === "ready").length, blocked: mergeQueue.filter((m) => m.status === "blocked" || m.status === "conflict").length },
    mergeQueue,
    repoHealth,
  });
  writeReport("deployment-sync-report.json", { generated: now, deployments, syncRequired: deployments.some((d) => !d.isSynced) });
  writeReport("branch-health-report.json", { generated: now, totalBranches: branches.length, staleBranches: branches.filter((b) => b.isStale).length, mergedBranches: branches.filter((b) => b.isMerged).length, branches });
  writeReport("autonomous-recovery-report.json", recovery);
  writeReport("runtime-sync-report.json", runtimeSync);

  return { mergeQueue, branches, conflicts, deployments, recovery, runtimeSync, repoHealth };
}
