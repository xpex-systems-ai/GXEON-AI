'use strict';

const assert = require('assert/strict');
const { spawnSync } = require('child_process');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: 'pipe', ...options });
  return { command: `${command} ${args.join(' ')}`, status: result.status, stdout: result.stdout, stderr: result.stderr };
}

async function main() {
  const enterprise = await import('../server/core/enterprise/enterpriseStatus.js');
  const merge = enterprise.getMergeHealth();
  const dependency = enterprise.getDependencyHealth();
  const ci = enterprise.getCiCdHealth();
  const compatibility = enterprise.getRuntimeCompatibility();
  const deployment = enterprise.getDeploymentStatus();

  assert.equal(merge.healthy, true, `merge conflicts detected: ${merge.conflicts.join(', ')}`);
  assert.equal(dependency.missing_from_lock.length, 0, 'package dependencies diverge from package-lock');
  assert.equal(dependency.dev_missing_from_lock.length, 0, 'dev dependencies diverge from package-lock');
  assert.equal(dependency.orphan_lock_deps.length, 0, 'package-lock has orphan dependencies');
  assert.equal(dependency.orphan_dev_lock_deps.length, 0, 'package-lock has orphan dev dependencies');
  assert.equal(dependency.node_engine, dependency.lock_node_engine, 'package.json and package-lock node engines diverge');
  assert.equal(ci.healthy, true, 'required CI/CD workflows are missing');

  const checks = [
    run(process.execPath, ['--check', 'server/index.js']),
    run(process.execPath, ['scripts/validate_core_boot.cjs']),
    run(process.execPath, ['scripts/validate_runtime.cjs']),
    run(process.execPath, ['scripts/validate_swarm_runtime.cjs'])
  ];
  const failed = checks.filter((check) => check.status !== 0);
  assert.equal(failed.length, 0, failed.map((check) => `${check.command}\n${check.stderr}`).join('\n'));

  const report = {
    status: 'enterprise_validated',
    merge: { healthy: merge.healthy },
    dependency: {
      healthy: dependency.healthy,
      duplicate_dependency_tree_count: dependency.duplicate_dependency_tree_count,
      deterministic_install: dependency.deterministic_install
    },
    ci_cd: ci,
    runtime_compatibility: compatibility,
    deployment,
    checks: checks.map((check) => ({ command: check.command, status: check.status }))
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
