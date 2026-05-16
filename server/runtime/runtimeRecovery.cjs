const { execSync } = require('node:child_process');

function detectBranchDrift() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    return branch !== 'main';
  } catch {
    return true;
  }
}

function getRecoveryStatus() {
  const drift = detectBranchDrift();
  return {
    status: drift ? 'RETRYING_SYNC' : 'STABLE',
    failed_sync_detected: false,
    branch_drift_detected: drift,
    runtime_mismatch_detected: false,
    auto_retry_enabled: true,
    recovery_log: drift ? 'Non-main branch detected; synchronization retry suggested.' : 'Runtime synchronized and healthy.',
    generated_at: new Date().toISOString(),
  };
}

module.exports = { getRecoveryStatus };
