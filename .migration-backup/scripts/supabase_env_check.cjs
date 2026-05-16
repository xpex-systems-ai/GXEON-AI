#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { getSupabaseRuntimeStatus } = require('../server/runtime/supabaseRuntime.cjs');

const status = getSupabaseRuntimeStatus();
const outDir = path.resolve(__dirname, '../artifacts');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'supabase-runtime-report.json'), JSON.stringify(status, null, 2) + '\n');
console.log(JSON.stringify(status, null, 2));

if (!status.all_required_keys_configured) process.exitCode = 1;
