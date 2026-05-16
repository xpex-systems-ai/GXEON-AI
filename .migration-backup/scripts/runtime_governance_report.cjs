#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildRuntimeGovernanceSnapshot } = require('../server/runtime/governance.cjs');

const repoRoot = path.resolve(__dirname, '..');
const snapshot = buildRuntimeGovernanceSnapshot();
const outputDir = path.join(repoRoot, 'artifacts');
const outputPath = path.join(outputDir, 'runtime-governance-report.json');

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);

console.log(JSON.stringify({
  status: snapshot.status,
  degraded_reports: snapshot.degraded_reports,
  output: path.relative(repoRoot, outputPath)
}, null, 2));

if (snapshot.status !== 'ready' && process.env.GXEON_ALLOW_DEGRADED_READINESS !== 'true') {
  process.exitCode = 1;
}
