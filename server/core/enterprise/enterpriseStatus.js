import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, extname, join } from 'path';
import { fileURLToPath } from 'url';
import { detectDeploymentTarget } from '../observability/runtimeTelemetry.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '../../..');
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.next', 'artifacts', 'cache', 'coverage', 'logs', 'reports']);
const TEXT_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.json', '.md', '.yml', '.yaml', '.toml', '.env', '.txt', '.sql', '.ps1', '.bat']);

function readJson(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(join(REPO_ROOT, path), 'utf8'));
  } catch (_error) {
    return fallback;
  }
}

function git(args) {
  try {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (_error) {
    return null;
  }
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else if (TEXT_EXTENSIONS.has(extname(entry.name)) || entry.name === '.npmrc' || entry.name === '.nvmrc') files.push(path);
  }
  return files;
}

export function getBranchStatus() {
  const branch = git(['branch', '--show-current']) || 'unknown';
  const status = git(['status', '--short']) || '';
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  const strategy = {
    main: 'stable production',
    develop: 'integration',
    'feature/*': 'isolated features',
    'hotfix/*': 'emergency fixes'
  };
  const allowed = branch === 'main' || branch === 'develop' || branch.startsWith('feature/') || branch.startsWith('hotfix/') || branch === 'work';
  return {
    branch,
    upstream,
    clean: status.length === 0,
    direct_main_commit_block: branch === 'main' ? 'required_via_branch_protection' : 'not_applicable',
    strategy,
    allowed_pattern: allowed,
    drift: upstream ? git(['rev-list', '--left-right', '--count', `${branch}...${upstream}`]) : null,
    status_lines: status ? status.split('\n') : []
  };
}

export function getMergeHealth() {
  const files = walk(REPO_ROOT);
  const conflicts = [];
  for (const file of files) {
    let content = '';
    try {
      if (statSync(file).size > 1024 * 1024) continue;
      content = readFileSync(file, 'utf8');
    } catch (_error) {
      continue;
    }
    if (/^<<<<<<< .+$/m.test(content) || /^=======$/m.test(content) || /^>>>>>>> .+$/m.test(content)) {
      conflicts.push(file.replace(`${REPO_ROOT}/`, ''));
    }
  }
  return {
    healthy: conflicts.length === 0,
    conflict_count: conflicts.length,
    conflicts,
    deterministic_strategy: {
      package_lock: 'package-lock.json is authoritative; regenerate only from root package.json with npm >=10 on Node 22',
      branch_history: 'feature/* rebases on develop; hotfix/* branches from main and back-merges to develop',
      conflict_policy: 'block merge while conflict markers or divergent root dependency declarations exist'
    }
  };
}

export function getDependencyHealth() {
  const pkg = readJson('package.json', {});
  const lock = readJson('package-lock.json', {});
  const root = lock.packages?.[''] || {};
  const pkgDeps = pkg.dependencies || {};
  const pkgDevDeps = pkg.devDependencies || {};
  const lockDeps = root.dependencies || {};
  const lockDevDeps = root.devDependencies || {};
  const missingFromLock = Object.keys(pkgDeps).filter((name) => lockDeps[name] !== pkgDeps[name]);
  const devMissingFromLock = Object.keys(pkgDevDeps).filter((name) => lockDevDeps[name] !== pkgDevDeps[name]);
  const orphanLockDeps = Object.keys(lockDeps).filter((name) => pkgDeps[name] !== lockDeps[name]);
  const orphanDevLockDeps = Object.keys(lockDevDeps).filter((name) => pkgDevDeps[name] !== lockDevDeps[name]);
  const packageEntries = Object.keys(lock.packages || {});
  const duplicateNames = new Map();
  for (const entry of packageEntries) {
    const match = entry.match(/node_modules\/(?:.*node_modules\/)?(@?[^/]+(?:\/[^/]+)?$)/);
    if (!match) continue;
    const name = match[1];
    const version = lock.packages[entry]?.version;
    if (!version) continue;
    const versions = duplicateNames.get(name) || new Set();
    versions.add(version);
    duplicateNames.set(name, versions);
  }
  const duplicates = Array.from(duplicateNames.entries())
    .filter(([, versions]) => versions.size > 1)
    .map(([name, versions]) => ({ name, versions: Array.from(versions).sort() }));
  const nodeEngine = pkg.engines?.node || null;
  const lockNodeEngine = root.engines?.node || null;
  const compatible = missingFromLock.length === 0 && devMissingFromLock.length === 0 && orphanLockDeps.length === 0 && orphanDevLockDeps.length === 0 && nodeEngine === lockNodeEngine;
  return {
    healthy: compatible,
    deterministic_install: 'npm ci --include=dev on Node 22 using committed package-lock.json',
    package_manager: 'npm-lockfile-v3',
    node_engine: nodeEngine,
    lock_node_engine: lockNodeEngine,
    missing_from_lock: missingFromLock,
    dev_missing_from_lock: devMissingFromLock,
    orphan_lock_deps: orphanLockDeps,
    orphan_dev_lock_deps: orphanDevLockDeps,
    duplicate_dependency_trees: duplicates.slice(0, 50),
    duplicate_dependency_tree_count: duplicates.length,
    npm_ci_expected: compatible ? 'ready' : 'blocked_until_package_lock_is_regenerated'
  };
}

export function getRuntimeCompatibility() {
  const serverPackage = readJson('server/package.json', {});
  const files = walk(join(REPO_ROOT, 'server'));
  const cjsPatterns = [];
  const esmPatterns = [];
  for (const file of files.filter((path) => path.endsWith('.js'))) {
    const content = readFileSync(file, 'utf8');
    const rel = file.replace(`${REPO_ROOT}/`, '');
    if (content.includes('require(') || content.includes('module.exports')) cjsPatterns.push(rel);
    if (/^\s*import\s|^\s*export\s/m.test(content)) esmPatterns.push(rel);
  }
  return {
    module_strategy: 'ESM-first; legacy CommonJS files must be isolated behind .cjs or dynamic import boundaries',
    server_type: serverPackage.type || 'commonjs',
    cjs_pattern_count: cjsPatterns.length,
    esm_pattern_count: esmPatterns.length,
    high_risk_files: cjsPatterns.filter((file) => esmPatterns.includes(file)).slice(0, 50),
    compatibility: cjsPatterns.length > 0 && serverPackage.type === 'module' ? 'mixed-boundary-warning' : 'stable'
  };
}

export function getCiCdHealth() {
  const required = [
    '.github/workflows/enterprise-validation.yml',
    '.github/workflows/railway-deploy.yml',
    '.github/workflows/vercel-deploy.yml'
  ];
  return {
    healthy: required.every((file) => existsSync(join(REPO_ROOT, file))),
    required_workflows: required.map((file) => ({ file, exists: existsSync(join(REPO_ROOT, file)) })),
    validation_gates: ['syntax', 'runtime', 'health', 'providers', 'swarm', 'watchdog', 'monetization', 'supabase', 'build_integrity', 'dependency_integrity']
  };
}

export function getDeploymentStatus() {
  const dependency = getDependencyHealth();
  const merge = getMergeHealth();
  const compatibility = getRuntimeCompatibility();
  const ready = dependency.healthy && merge.healthy;
  return {
    target: detectDeploymentTarget(),
    ready,
    readiness_gate: ready ? (compatibility.compatibility === 'mixed-boundary-warning' ? 'pass_with_runtime_compatibility_warning' : 'pass') : 'blocked',
    rollback_metadata: {
      commit: git(['rev-parse', '--short', 'HEAD']),
      branch: getBranchStatus().branch,
      generated_at: new Date().toISOString()
    },
    railway: { compatible: true, node: '22.x', healthcheck: '/health' },
    vercel: { compatible: true, node: '22.x', output: 'web' },
    replit: { compatible: true, start: 'npm start' }
  };
}

export function getEnterpriseStatus() {
  return {
    generated_at: new Date().toISOString(),
    branch: getBranchStatus(),
    merge: getMergeHealth(),
    dependencies: getDependencyHealth(),
    ci_cd: getCiCdHealth(),
    runtime_compatibility: getRuntimeCompatibility(),
    deployment: getDeploymentStatus()
  };
}

export function writeRecoveryReport() {
  const report = {
    type: 'GXEON_ENTERPRISE_RECOVERY_REPORT',
    status: getEnterpriseStatus()
  };
  const dir = join(REPO_ROOT, 'reports/recovery');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `recovery-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  return { path: path.replace(`${REPO_ROOT}/`, ''), report };
}

export default {
  getBranchStatus,
  getMergeHealth,
  getDependencyHealth,
  getRuntimeCompatibility,
  getCiCdHealth,
  getDeploymentStatus,
  getEnterpriseStatus,
  writeRecoveryReport
};
