#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * START MARKETPLACE SUPREME
 * Script de inicialização rápida do marketplace
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { orchestrator, telegramIntegration } from '../server/services/marketplaceOrchestrator.js';

console.log(`
🏪 ═══════════════════════════════════════════════════════════════════
   GXEON SIGNAL MARKETPLACE SUPREME - STARTUP SEQUENCE
══════════════════════════════════════════════════════════════════════
`);

const startTime = Date.now();

async function startup() {
  try {
    // 1. Wait for orchestrator ready
    console.log('⏳ Inicializando módulos...');
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for marketplace ready'));
      }, 30000);
      
      orchestrator.on('marketplace:ready', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      orchestrator.on('marketplace:error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      
      // Check if already ready
      if (orchestrator.isInitialized) {
        clearTimeout(timeout);
        resolve();
      }
    });
    
    const initTime = Date.now() - startTime;
    
    console.log(`✅ Marketplace inicializado em ${initTime}ms\n`);
    
    // 2. Health check
    const health = orchestrator.healthCheck();
    
    console.log('📊 HEALTH CHECK:');
    console.log(`   Status: ${health.status}`);
    console.log(`   Modules: ${Object.entries(health.modules).map(([k, v]) => `${k}: ${v ? '✅' : '❌'}`).join(' | ')}`);
    console.log('');
    
    // 3. Display stats
    const stats = orchestrator.getFullStats();
    
    console.log('📈 MARKETPLACE STATS:');
    console.log(`   Active Signals: ${stats.marketplace?.active_signals || 0}`);
    console.log(`   Providers: ${stats.marketplace?.providers || 0}`);
    console.log(`   Users Acquired: ${stats.acquisition?.total_users || 0}`);
    console.log(`   Revenue (24h): R$ ${stats.revenue?.total_revenue_brl?.toFixed(2) || '0.00'}`);
    console.log(`   Win Rate: ${stats.proof?.win_rate?.toFixed(2) || '0'}%`);
    console.log('');
    
    // 4. List providers
    const providers = orchestrator.modules.provider.listProviders({ sortBy: 'score' });
    
    if (providers.length > 0) {
      console.log('🔌 ACTIVE PROVIDERS:');
      providers.forEach(p => {
        console.log(`   • ${p.name} | Score: ${p.score} | Win Rate: ${p.win_rate}%`);
      });
      console.log('');
    }
    
    // 5. Check telegram integration
    console.log('🤖 TELEGRAM BOT:');
    console.log('   Commands available:');
    console.log('   • /signals - List active signals');
    console.log('   • /upgrade - Show upgrade options');
    console.log('   • /history - Personal signal history');
    console.log('   • /leaderboard - Top signals of the day');
    console.log('   • /referral - Generate referral link');
    console.log('   • /simulate [id] [capital] - Profit simulation');
    console.log('');
    
    // 6. API Endpoints
    console.log('🔗 API ENDPOINTS:');
    console.log('   GET  /v1/marketplace/signals - List available signals');
    console.log('   GET  /v1/marketplace/signals/live - Real-time feed (B2B)');
    console.log('   GET  /v1/marketplace/leaderboard - Top signals/providers');
    console.log('   GET  /v1/marketplace/providers - List providers');
    console.log('   POST /v1/marketplace/subscribe - Subscribe to plan');
    console.log('   GET  /v1/marketplace/cornix/:id - Cornix format');
    console.log('   GET  /v1/marketplace/stats - Marketplace statistics');
    console.log('');
    
    // 7. Pricing
    console.log('💰 PRICING:');
    console.log('   FREE: R$ 0/mês | 5 sinais/dia | 10min delay');
    console.log('   PRO: R$ 25/mês | Sinais ilimitados | Real-time');
    console.log('   ENTERPRISE: R$ 250/mês | API + Webhooks + Priority');
    console.log('   Pay-per-signal: R$ 1.00 (PREMIUM)');
    console.log('');
    
    console.log('══════════════════════════════════════════════════════════════════════');
    console.log('✅ MARKETPLACE SUPREME: ONLINE');
    console.log(`⏱️  Startup time: ${initTime}ms`);
    console.log('🌑 Ready for signals...');
    console.log('══════════════════════════════════════════════════════════════════════\n');
    
    // 8. Keep alive
    process.on('SIGINT', async () => {
      console.log('\n🛑 Desligando marketplace...');
      process.exit(0);
    });
    
    // Keep process alive
    setInterval(() => {
      // Heartbeat
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      if (uptime % 60 === 0) {
        console.log(`[${new Date().toISOString()}] 💓 Heartbeat | Uptime: ${uptime}s`);
      }
    }, 1000);
    
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run startup
startup();
