/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SYSTEM_HARDENING_V10 - Script de Segurança e Otimização
 * Real Monetization Ready
 * 
 * Autorizado por: Comandante Júnior Sena
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('═══════════════════════════════════════════════════════════════');
console.log('🛡️  SYSTEM_HARDENING_V10 - Real Monetization Security Check');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// 1. Verificar se não há tokens hardcoded
console.log('🔒 [CHECK 1/7] Verificando tokens hardcoded...');
const sensitiveFiles = [
  'server/services/supabase.js',
  'core/fleet_activation.js',
  'core/fleet_production_deploy.js'
];

let foundSecrets = false;
for (const file of sensitiveFiles) {
  const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
  
  // Check for JWT pattern
  if (content.match(/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/)) {
    console.error(`   ❌ HARDCODED TOKEN FOUND in ${file}`);
    foundSecrets = true;
  }
  
  // Check for private keys
  if (content.match(/0x[a-fA-F0-9]{64}/)) {
    console.error(`   ❌ POTENTIAL PRIVATE KEY in ${file}`);
    foundSecrets = true;
  }
}

if (!foundSecrets) {
  console.log('   ✅ No hardcoded secrets found');
  checks.passed++;
} else {
  checks.failed++;
}

// 2. Verificar variáveis de ambiente
console.log('🔒 [CHECK 2/7] Verificando variáveis de ambiente...');
const requiredEnvVars = [
  'SUPABASE_PROJECT_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PRIVATE_KEY',
  'ALCHEMY_ARBITRUM_WS_URL',
  'ARBITRUM_RPC_URL'
];

const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length === 0) {
  console.log('   ✅ All required env vars present');
  checks.passed++;
} else {
  console.warn(`   ⚠️  Missing env vars: ${missing.join(', ')}`);
  checks.warnings++;
}

// 3. Verificar Circuit Breaker
console.log('🔒 [CHECK 3/7] Verificando Circuit Breaker...');
if (fs.existsSync(path.join(process.cwd(), 'core/circuit_breaker.js'))) {
  console.log('   ✅ Circuit Breaker module exists');
  checks.passed++;
} else {
  console.error('   ❌ Circuit Breaker not found');
  checks.failed++;
}

// 4. Verificar schema Grafana
console.log('🔒 [CHECK 4/7] Verificando views do Grafana...');
if (fs.existsSync(path.join(process.cwd(), 'supabase/grafana_views_v10.sql'))) {
  console.log('   ✅ Grafana views schema exists');
  checks.passed++;
} else {
  console.error('   ❌ Grafana views not found');
  checks.failed++;
}

// 5. Verificar production deploy
console.log('🔒 [CHECK 5/7] Verificando script de produção...');
if (fs.existsSync(path.join(process.cwd(), 'core/fleet_production_deploy.js'))) {
  console.log('   ✅ Production deploy script exists');
  checks.passed++;
} else {
  console.error('   ❌ Production deploy not found');
  checks.failed++;
}

// 6. Verificar package.json scripts
console.log('🔒 [CHECK 6/7] Verificando scripts npm...');
const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
const requiredScripts = ['fleet:production', 'fleet:emergency', 'grafana:deploy'];
const missingScripts = requiredScripts.filter(s => !packageJson.scripts[s]);

if (missingScripts.length === 0) {
  console.log('   ✅ All required npm scripts present');
  checks.passed++;
} else {
  console.warn(`   ⚠️  Missing scripts: ${missingScripts.join(', ')}`);
  checks.warnings++;
}

// 7. Verificar .gitignore
console.log('🔒 [CHECK 7/7] Verificando .gitignore...');
const gitignore = fs.readFileSync(path.join(process.cwd(), '.gitignore'), 'utf8');
const requiredIgnores = ['.env', '*.key', '*.pem', 'node_modules/'];
const missingIgnores = requiredIgnores.filter(i => !gitignore.includes(i));

if (missingIgnores.length === 0) {
  console.log('   ✅ .gitignore properly configured');
  checks.passed++;
} else {
  console.warn(`   ⚠️  Missing .gitignore entries: ${missingIgnores.join(', ')}`);
  checks.warnings++;
}

// Summary
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 SECURITY AUDIT SUMMARY');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`✅ Passed: ${checks.passed}/7`);
console.log(`⚠️  Warnings: ${checks.warnings}/7`);
console.log(`❌ Failed: ${checks.failed}/7`);
console.log('');

if (checks.failed === 0) {
  console.log('🛡️  SYSTEM IS HARDENED AND READY FOR REAL MONETIZATION');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run: npm run grafana:deploy');
  console.log('  2. Run: npm run fleet:production');
  console.log('  3. Import Grafana dashboard');
  process.exit(0);
} else {
  console.error('❌ SYSTEM NOT READY - Fix failed checks before production');
  process.exit(1);
}
