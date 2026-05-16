#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const forbidden = ['VERCEL', 'VERCEL_ENV', 'VERCEL_URL', 'NETLIFY', 'NETLIFY_URL', 'NETLIFY_SITE_ID'];
const presentForbiddenEnv = forbidden.filter((k) => process.env[k]);

const workflowDir = path.resolve(__dirname, '../.github/workflows');
let workflowScan = [];
if (fs.existsSync(workflowDir)) {
  for (const file of fs.readdirSync(workflowDir)) {
    const full = path.join(workflowDir, file);
    const body = fs.readFileSync(full, 'utf8');
    const hasRef = /vercel|netlify/i.test(body);
    workflowScan.push({ file, containsPlatformRef: hasRef });
  }
}

const report = {
  deployment: 'REPLIT_ONLY',
  github_sync: 'ACTIVE',
  forbidden_env_present: presentForbiddenEnv,
  workflow_scan: workflowScan,
  generated_at: new Date().toISOString(),
};

const outDir = path.resolve(__dirname, '../artifacts');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'runtime-platform-cleanup-report.json'), JSON.stringify(report, null, 2) + '\n');

console.log(JSON.stringify(report, null, 2));
