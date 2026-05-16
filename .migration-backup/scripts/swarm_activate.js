#!/usr/bin/env node
/**
 * 🐝 GXEON SWARM ACTIVATOR v9.0
 * Force first real cycle of SwarmScouter for Arbiscan targets
 * 
 * Execute: node scripts/swarm_activate.js
 */

require('dotenv').config();

const { SwarmScouter } = require('../server/agents/scouter');
const { SwarmInfiltrator } = require('../server/agents/infiltrator');
const { SwarmController } = require('../server/agents/swarm_controller');

async function activateSwarm() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║      🐝 GXEON SWARM v9.0 — REAL POWER ACTIVATION         ║');
  console.log('║         M2M Colmeia Predadora - Exit Simulation           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log();

  // Check required environment variables
  const required = [
    'ARBISCAN_API_KEY',
    'GITHUB_TOKEN', 
    'RAPIDAPI_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.warn('⚠️  Missing environment variables:', missing.join(', '));
    console.warn('   Swarm will operate in LIMITED mode');
  }

  try {
    // 1. Initialize Scouter (for target discovery)
    console.log('[1/4] 🎯 Initializing SwarmScouter...');
    const scouter = new SwarmScouter({
      arbiscanApiKey: process.env.ARBISCAN_API_KEY,
      githubToken: process.env.GITHUB_TOKEN,
      rapidapiKey: process.env.RAPIDAPI_KEY,
      scanInterval: 3600000, // 1 hour
      maxTargetsPerScan: 50
    });
    
    await scouter.initialize();
    console.log(`   ✓ Scouter ready - ${scouter.targets.length} historical targets loaded`);

    // 2. Force first scan IMMEDIATELY
    console.log('[2/4] 🔍 FORCE FIRST REAL SCAN — Arbiscan Target Acquisition...');
    const scanResult = await scouter.executeFullScan();
    
    console.log('   ┌─────────────────────────────────────────┐');
    console.log(`   │ Arbiscan Contracts:  ${scanResult.bySource?.arbiscan || 0}            │`);
    console.log(`   │ GitHub MEV Repos:    ${scanResult.bySource?.github || 0}            │`);
    console.log(`   │ RapidAPI Targets:    ${scanResult.bySource?.rapidapi || 0}            │`);
    console.log(`   │ QUALIFIED LEADS:     ${scanResult.leadsFound || 0} ⭐           │`);
    console.log('   └─────────────────────────────────────────┘');

    if (scanResult.qualifiedLeads?.length > 0) {
      console.log('   📋 Top targets discovered:');
      scanResult.qualifiedLeads.forEach((lead, i) => {
        console.log(`      ${i + 1}. ${lead.type} | Score: ${lead.score?.toFixed(2) || 'N/A'}`);
      });
    }

    // 3. Initialize Infiltrator (for outreach)
    console.log('[3/4] 🤖 Initializing SwarmInfiltrator...');
    const infiltrator = new SwarmInfiltrator({
      rapidapiKey: process.env.RAPIDAPI_KEY,
      encryptionKey: process.env.SWARM_ENCRYPTION_KEY
    });
    await infiltrator.initialize();
    console.log('   ✓ Infiltrator ready for M2M outreach');

    // 4. Initialize Controller (orchestration)
    console.log('[4/4] 🧠 Initializing SwarmController...');
    const controller = new SwarmController({
      scouter,
      infiltrator,
      autoOptimize: true,
      profitThreshold: 1.0
    });
    await controller.initialize();
    console.log('   ✓ Controller active - ROI optimization enabled');

    // Summary
    console.log();
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║              🚀 SWARM ACTIVATION COMPLETE                 ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Status:          ${scanResult.leadsFound > 0 ? '🟢 LIVE & HUNTING' : '🟡 AWAITING TARGETS'}    ║`);
    console.log(`║  First Scan:      ${scanResult.status.toUpperCase()}                    ║`);
    console.log(`║  Targets:         ${scouter.targets.length} qualified                ║`);
    console.log(`║  Next Cycle:      Auto (1h interval)                    ║`);
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log();
    console.log('💡 The swarm is now autonomous. It will:');
    console.log('   • Scan Arbiscan every hour for new contract targets');
    console.log('   • Hunt GitHub for MEV/bot repositories');
    console.log('   • Track RapidAPI competitors');
    console.log('   • Auto-infiltrate qualified leads');
    console.log('   • Self-optimize based on ROI');
    console.log();
    console.log('🌑 GXEON M2M: Machines paying machines.');

    // Keep process alive for monitoring
    if (process.env.SWARM_AUTOSTART === 'true') {
      console.log('⏳ Swarm running in background... Press Ctrl+C to exit');
      await controller.start();
      
      // Graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down Swarm gracefully...');
        await controller.stop();
        process.exit(0);
      });
    }

    return {
      status: 'success',
      scanResult,
      controller
    };

  } catch (error) {
    console.error('❌ Swarm activation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  activateSwarm().catch(console.error);
}

module.exports = { activateSwarm };
