/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌐 A2A POST-DEPLOY VALIDATION
 * Run this AFTER Railway redeploy completes
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://gxeon-core.up.railway.app';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║     🌐 A2A POST-DEPLOY VALIDATION                             ║');
console.log(`║     Target: ${API_BASE.padEnd(46)} ║`);
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

async function checkHealth() {
  console.log('🏥 STEP 1: Health Check');
  try {
    const response = await axios.get(`${API_BASE}/health`, { timeout: 10000 });
    console.log(`   ✅ Server ONLINE (Status: ${response.status})`);
    return true;
  } catch (err) {
    console.log(`   ❌ Server OFFLINE (${err.message})`);
    return false;
  }
}

async function checkRoute(path, method = 'GET', description) {
  try {
    const response = await axios({
      method,
      url: `${API_BASE}${path}`,
      timeout: 10000,
      validateStatus: () => true // Don't throw on error status
    });
    
    // Routes are mounted if they don't return 404
    const isMounted = response.status !== 404;
    console.log(`   ${isMounted ? '✅' : '❌'} ${description} (${response.status})`);
    return isMounted;
  } catch (err) {
    console.log(`   ❌ ${description} (Error: ${err.message})`);
    return false;
  }
}

async function main() {
  const healthy = await checkHealth();
  
  if (!healthy) {
    console.log('\n❌ Server is not responding. Please check:');
    console.log('   1. Railway dashboard for deployment status');
    console.log('   2. Build logs for errors');
    console.log('   3. Environment variables are set');
    process.exit(1);
  }
  
  console.log('\n📡 STEP 2: Route Validation\n');
  
  const routes = [
    { path: '/v1/register-agent', method: 'POST', desc: 'POST /v1/register-agent' },
    { path: '/v1/signals', method: 'GET', desc: 'GET  /v1/signals' },
    { path: '/v1/agent/status', method: 'GET', desc: 'GET  /v1/agent/status' },
    { path: '/v1/upgrade', method: 'POST', desc: 'POST /v1/upgrade' }
  ];
  
  const results = [];
  for (const route of routes) {
    const mounted = await checkRoute(route.path, route.method, route.desc);
    results.push(mounted);
  }
  
  const allMounted = results.every(r => r);
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(allMounted ? '✅ ALL ROUTES MOUNTED' : '❌ SOME ROUTES MISSING');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  if (allMounted) {
    console.log('🚀 Ready for full validation:');
    console.log('   Run: node scripts/a2a_full_validation.js\n');
  } else {
    console.log('⚠️  Routes not found. Possible causes:');
    console.log('   - Server not redeployed yet');
    console.log('   - Build failed (check Railway logs)');
    console.log('   - Routes file not committed');
    console.log('\n🔧 Fix:');
    console.log('   1. Go to Railway dashboard');
    console.log('   2. Click "Redeploy" on latest commit');
    console.log('   3. Wait for build to complete');
    console.log('   4. Run this script again\n');
  }
  
  process.exit(allMounted ? 0 : 1);
}

main().catch(console.error);
