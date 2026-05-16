#!/usr/bin/env node
/**
 * Emergency Railway Deploy Fix Script
 * Run: node railway-deploy-fix.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚨 EMERGENCY RAILWAY DEPLOY FIX v4.0\n');

// Step 1: Check git status
try {
  console.log('[1/7] Checking git status...');
  const status = execSync('git status --short', { encoding: 'utf8' });
  console.log(status || '  (no changes)');
} catch (e) {
  console.log('  ⚠️ Git status failed');
}

// Step 2: Find and remove any Dockerfile
try {
  console.log('\n[2/7] Removing Dockerfile references...');
  const files = fs.readdirSync('.');
  const dockerfiles = files.filter(f => f.toLowerCase().includes('dockerfile') && !f.endsWith('.backup'));
  
  for (const df of dockerfiles) {
    console.log(`  🗑️  Removing: ${df}`);
    try {
      execSync(`git rm --cached "${df}" 2>/dev/null`);
      fs.unlinkSync(df);
    } catch (e) {
      // Ignore errors
    }
  }
  console.log('  ✅ Dockerfile cleanup complete');
} catch (e) {
  console.log('  ⚠️ Dockerfile cleanup failed:', e.message);
}

// Step 3: Fix package.json - ensure type: module and correct deps
console.log('\n[3/7] Validating package.json...');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Ensure type: module
  if (!pkg.type) {
    pkg.type = 'module';
    console.log('  ✅ Added "type": "module"');
  }
  
  // Ensure start script uses production.js
  if (pkg.scripts?.start && !pkg.scripts.start.includes('production')) {
    pkg.scripts.start = 'node server/production.js';
    pkg.scripts['start:legacy'] = 'node server/index.js';
    console.log('  ✅ Updated start script to use production.js');
  }
  
  // Ensure dependencies exist
  const required = ['cors', 'express', 'dotenv', '@supabase/supabase-js', 'axios'];
  const missing = required.filter(dep => !pkg.dependencies?.[dep]);
  
  if (missing.length > 0) {
    console.log(`  ⚠️  Missing dependencies: ${missing.join(', ')}`);
    console.log('  📦 Run: npm install ' + missing.join(' '));
  } else {
    console.log('  ✅ All required dependencies present');
  }
  
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  console.log('  ✅ package.json updated');
} catch (e) {
  console.log('  ❌ package.json validation failed:', e.message);
}

// Step 4: Create railway.json config
console.log('\n[4/7] Creating railway.json...');
const railwayConfig = {
  $schema: 'https://railway.app/railway.schema.json',
  build: {
    builder: 'NIXPACKS'
  },
  deploy: {
    startCommand: 'npm start',
    restartPolicyType: 'ON_FAILURE',
    restartPolicyMaxRetries: 10,
    healthcheckPath: '/health',
    healthcheckTimeout: 100,
    numReplicas: 1
  }
};

try {
  fs.writeFileSync('railway.json', JSON.stringify(railwayConfig, null, 2) + '\n');
  console.log('  ✅ railway.json created with NIXPACKS builder');
} catch (e) {
  console.log('  ❌ Failed to create railway.json:', e.message);
}

// Step 5: Add all changes
try {
  console.log('\n[5/7] Adding changes to git...');
  execSync('git add -A');
  console.log('  ✅ Changes staged');
} catch (e) {
  console.log('  ⚠️ Git add failed:', e.message);
}

// Step 6: Commit
try {
  console.log('\n[6/7] Creating commit...');
  const commitMsg = 'Emergency deploy fix v4.0: NIXPACKS, production server, WebSocket fix';
  execSync(`git commit -m "${commitMsg}"`);
  console.log('  ✅ Commit created');
} catch (e) {
  console.log('  ⚠️ Commit failed (may be nothing to commit):', e.message);
}

// Step 7: Push
try {
  console.log('\n[7/7] Pushing to origin...');
  execSync('git push origin main');
  console.log('  ✅ Push successful!');
} catch (e) {
  console.log('  ❌ Push failed:', e.message);
  console.log('\n  💡 Manual fix:');
  console.log('     git push origin main --force-with-lease');
}

console.log('\n' + '='.repeat(60));
console.log('🎉 DEPLOY FIX COMPLETE');
console.log('='.repeat(60));
console.log('\n📋 Next steps:');
console.log('   1. Check Railway dashboard for build status');
console.log('   2. If build fails again, redeploy with "Clear Build Cache"');
console.log('\n🔗 Useful commands:');
console.log('   curl https://gxeon-ia-production.up.railway.app/health');
console.log('\n💎 Treasury: 0x3955d559055DadB7067054cB6E6f974710345224\n');
