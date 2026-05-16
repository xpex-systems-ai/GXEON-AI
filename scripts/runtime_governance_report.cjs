#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { registerCommonJsBoundary } = require('../server/runtime/compatibility.cjs');
registerCommonJsBoundary();
const { buildRuntimeGovernanceSnapshot } = require('../server/runtime/governance.cjs');
const { buildActivationReports, buildDashboardRuntime } = require('../server/runtime/phase5Activation.cjs');

const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(repoRoot, 'artifacts');
const governancePath = path.join(outputDir, 'runtime-governance-report.json');
const activationPath = path.join(outputDir, 'phase5-activation-report.json');

const snapshot = buildRuntimeGovernanceSnapshot();
const activation = {
  system: 'GXEON Phase 5 Autonomous Revenue and Dashboard Activation',
  generated_at: new Date().toISOString(),
  status: 'ready',
  dashboard_runtime: buildDashboardRuntime(),
  reports: buildActivationReports()
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(governancePath, `${JSON.stringify(snapshot, null, 2)}\n`);
fs.writeFileSync(activationPath, `${JSON.stringify(activation, null, 2)}\n`);

console.log(JSON.stringify({
  status: snapshot.status,
  activation_status: activation.status,
  degraded_reports: snapshot.degraded_reports,
  outputs: [path.relative(repoRoot, governancePath), path.relative(repoRoot, activationPath)]
}, null, 2));

if (snapshot.status !== 'ready' && process.env.GXEON_ALLOW_DEGRADED_READINESS !== 'true') {
  process.exitCode = 1;
}
