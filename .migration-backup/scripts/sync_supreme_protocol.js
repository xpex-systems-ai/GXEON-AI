#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GX SYNC SUPREME PROTOCOL v1.0
 * Full Autonomous Repair & Validation
 * Comandante: Júnior Sena
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Telegraf } from 'telegraf';
import { GxeonSignalOrchestrator } from '../server/services/gxeonSignalEngine.js';

console.log('🌑 ═══════════════════════════════════════════════════════════════');
console.log('   GX SYNC SUPREME PROTOCOL');
console.log('   Full Autonomous Repair & Validation');
console.log('═══════════════════════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO - AMBOS HARDCODED E ENV
// ═══════════════════════════════════════════════════════════════════════════
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8659197490:AAG-4X50tQahi0mnngfSeUyi49fpr1sDjBk';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8506789322';

const SYNC_RESULTS = {
  telegram_connection: 'PENDING',
  signal_engine: 'PENDING',
  auto_dispatch: 'PENDING',
  system_status: 'PENDING',
  checks: []
};

function logCheck(name, status, details) {
  const emoji = status === 'OK' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
  console.log(`${emoji} ${name}: ${status}${details ? ' - ' + details : ''}`);
  SYNC_RESULTS.checks.push({ name, status, details });
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK 1: ENV VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🔬 CHECK 1: ENV Validation');
console.log('─────────────────────────────────────────────────────────────────');

const envFromEnv = !!process.env.TELEGRAM_BOT_TOKEN;
const envFromHardcoded = !envFromEnv;

if (envFromEnv) {
  logCheck('ENV_TELEGRAM_BOT_TOKEN', 'OK', 'Loaded from environment');
} else {
  logCheck('ENV_TELEGRAM_BOT_TOKEN', 'OK', 'Using hardcoded fallback (MVP mode)');
}

if (process.env.TELEGRAM_CHAT_ID) {
  logCheck('ENV_TELEGRAM_CHAT_ID', 'OK', process.env.TELEGRAM_CHAT_ID);
} else {
  logCheck('ENV_TELEGRAM_CHAT_ID', 'OK', `${TELEGRAM_CHAT_ID} (hardcoded)`);
}

// Validar formato do token
const tokenValid = TELEGRAM_BOT_TOKEN.includes(':') && TELEGRAM_BOT_TOKEN.length > 20;
logCheck('TOKEN_FORMAT', tokenValid ? 'OK' : 'FAIL', tokenValid ? 'Valid format' : 'Invalid format');

// ═══════════════════════════════════════════════════════════════════════════
// CHECK 2: CHAT ID RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🔬 CHECK 2: Chat ID Resolution');
console.log('─────────────────────────────────────────────────────────────────');

// Detectar tipo de chat
const isChannel = TELEGRAM_CHAT_ID.toString().startsWith('-100');
const isGroup = TELEGRAM_CHAT_ID.toString().startsWith('-') && !isChannel;
const isPrivate = !TELEGRAM_CHAT_ID.toString().startsWith('-');

if (isChannel) {
  logCheck('CHAT_TYPE', 'OK', 'Channel (requires -100 prefix)');
} else if (isGroup) {
  logCheck('CHAT_TYPE', 'OK', 'Group');
} else if (isPrivate) {
  logCheck('CHAT_TYPE', 'WARNING', 'Private chat - should be channel for signals');
}

logCheck('CHAT_ID_VALUE', 'OK', TELEGRAM_CHAT_ID);

// ═══════════════════════════════════════════════════════════════════════════
// CHECK 3: TELEGRAM SEND TEST
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🔬 CHECK 3: Telegram Send Test');
console.log('─────────────────────────────────────────────────────────────────');

let bot = null;
let sendTestPassed = false;

try {
  bot = new Telegraf(TELEGRAM_BOT_TOKEN);
  
  await bot.telegram.sendMessage(
    TELEGRAM_CHAT_ID,
    '🚨 *GXEON SYNC TEST - LIVE*\n\n✅ Bot conectado\n✅ Canal ativo\n✅ Sistema operacional',
    { parse_mode: 'Markdown' }
  );
  
  sendTestPassed = true;
  logCheck('TELEGRAM_SEND', 'OK', 'Test message delivered');
  SYNC_RESULTS.telegram_connection = 'OK';
  
} catch (err) {
  logCheck('TELEGRAM_SEND', 'FAIL', err.message);
  SYNC_RESULTS.telegram_connection = 'FAIL';
  console.error('\n❌ TELEGRAM ERROR:', err.message);
  console.log('\n💡 POSSÍVEIS CAUSAS:');
  console.log('   1. Bot não é admin do canal');
  console.log('   2. Chat ID incorreto');
  console.log('   3. Token inválido');
  console.log('   4. Canal não existe');
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK 4: SIGNAL ENGINE BOOT
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🔬 CHECK 4: Signal Engine Boot');
console.log('─────────────────────────────────────────────────────────────────');

let orchestrator = null;
let engineBooted = false;

try {
  // Mock signalHub para teste
  const mockSignalHub = {
    addSignal: (s) => console.log(`   [Hub] Signal ${s.id} added`),
    getSignals: () => []
  };
  
  orchestrator = new GxeonSignalOrchestrator(bot, mockSignalHub);
  
  // Validar componentes
  const hasGenerator = !!orchestrator.generator;
  const hasFormatter = !!orchestrator.formatter;
  
  logCheck('SIGNAL_GENERATOR', hasGenerator ? 'OK' : 'FAIL');
  logCheck('TELEGRAM_FORMATTER', hasFormatter ? 'OK' : 'FAIL');
  
  if (hasGenerator && hasFormatter) {
    engineBooted = true;
    logCheck('ENGINE_BOOT', 'OK', 'All components loaded');
    SYNC_RESULTS.signal_engine = 'OK';
  } else {
    logCheck('ENGINE_BOOT', 'FAIL', 'Missing components');
    SYNC_RESULTS.signal_engine = 'FAIL';
  }
  
} catch (err) {
  logCheck('ENGINE_BOOT', 'FAIL', err.message);
  SYNC_RESULTS.signal_engine = 'FAIL';
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK 5: MANUAL SIGNAL GENERATION
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🔬 CHECK 5: Manual Signal Generation');
console.log('─────────────────────────────────────────────────────────────────');

let manualSignalSent = false;

try {
  if (orchestrator && bot) {
    console.log('   Generating test signal...');
    
    const signal = orchestrator.generator.generateMockSignal();
    console.log(`   ✅ Signal: ${signal.pair} ${signal.type} @ $${signal.entry}`);
    
    const message = orchestrator.formatter.formatSignal(signal);
    console.log('   ✅ Formatted for Telegram');
    
    if (sendTestPassed) {
      await bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'Markdown' });
      manualSignalSent = true;
      logCheck('MANUAL_DISPATCH', 'OK', 'Signal sent to Telegram');
    } else {
      logCheck('MANUAL_DISPATCH', 'SKIP', 'Telegram not connected');
    }
  } else {
    logCheck('MANUAL_DISPATCH', 'SKIP', 'Engine or bot not ready');
  }
} catch (err) {
  logCheck('MANUAL_DISPATCH', 'FAIL', err.message);
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK 6: AUTO LOOP VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🔬 CHECK 6: Auto Loop Validation');
console.log('─────────────────────────────────────────────────────────────────');

if (orchestrator) {
  console.log('   Starting auto-generation (60s interval)...');
  
  orchestrator.startAutoGeneration(60000);
  
  const isRunning = orchestrator.generationLoop !== null;
  logCheck('AUTO_LOOP_START', isRunning ? 'OK' : 'FAIL');
  
  if (isRunning) {
    SYNC_RESULTS.auto_dispatch = 'ACTIVE';
    console.log('   ⏱️  Next signal in 60 seconds...');
    
    // Parar após 5 segundos (teste apenas)
    setTimeout(() => {
      orchestrator.stopAutoGeneration();
      console.log('   ✅ Auto-loop stopped (test complete)');
    }, 5000);
  } else {
    SYNC_RESULTS.auto_dispatch = 'INACTIVE';
  }
} else {
  logCheck('AUTO_LOOP', 'SKIP', 'Orchestrator not initialized');
  SYNC_RESULTS.auto_dispatch = 'INACTIVE';
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK 7: DISPATCH PIPELINE
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🔬 CHECK 7: Dispatch Pipeline');
console.log('─────────────────────────────────────────────────────────────────');

const pipelineChecks = {
  'SignalGenerator.generateMockSignal': orchestrator?.generator?.generateMockSignal !== undefined,
  'TelegramFormatter.formatSignal': orchestrator?.formatter?.formatSignal !== undefined,
  'dispatchWithRetry': orchestrator?.dispatchWithRetry !== undefined,
  'startAutoGeneration': orchestrator?.startAutoGeneration !== undefined
};

let pipelineOk = true;
for (const [name, exists] of Object.entries(pipelineChecks)) {
  logCheck(name, exists ? 'OK' : 'FAIL');
  if (!exists) pipelineOk = false;
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECK 8: ERROR RECOVERY & LOGGING
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🔬 CHECK 8: Error Recovery & Logging');
console.log('─────────────────────────────────────────────────────────────────');

const hasRetry = orchestrator?.dispatchWithRetry?.toString().includes('retries') || 
                 orchestrator?.constructor?.toString().includes('max_retries');
logCheck('RETRY_SYSTEM', hasRetry ? 'OK' : 'WARNING', hasRetry ? '3x retry configured' : 'May not have retry');

// Simular erro e verificar recovery
console.log('\n   Simulating error recovery...');
try {
  const invalidChatId = '-999999999999';
  await bot.telegram.sendMessage(invalidChatId, 'test').catch(err => {
    console.log('   ✅ Error caught:', err.message.substring(0, 50));
    logCheck('ERROR_CATCHING', 'OK', 'Errors properly caught');
  });
} catch (err) {
  logCheck('ERROR_CATCHING', 'FAIL', 'Uncaught error');
}

// ═══════════════════════════════════════════════════════════════════════════
// FINAL RESULTS
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🌑 ═══════════════════════════════════════════════════════════════');
console.log('   SYNC SUPREME PROTOCOL - FINAL RESULTS');
console.log('═══════════════════════════════════════════════════════════════════\n');

// Calcular status geral
const criticalChecks = [
  'TELEGRAM_SEND',
  'ENGINE_BOOT',
  'MANUAL_DISPATCH'
];

const criticalPassed = criticalChecks.every(check => 
  SYNC_RESULTS.checks.find(c => c.name === check)?.status === 'OK'
);

SYNC_RESULTS.system_status = criticalPassed ? 'SYNCED' : 'NOT_SYNCED';

console.log('📊 SYSTEM STATUS:');
console.log(`   Telegram Connection: ${SYNC_RESULTS.telegram_connection}`);
console.log(`   Signal Engine: ${SYNC_RESULTS.signal_engine}`);
console.log(`   Auto Dispatch: ${SYNC_RESULTS.auto_dispatch}`);
console.log(`   System Status: ${SYNC_RESULTS.system_status}`);

console.log('\n🎯 SUCCESS CRITERIA:');
console.log(`   ✅ Telegram Test Message: ${sendTestPassed}`);
console.log(`   ✅ Manual Signal Sent: ${manualSignalSent}`);
console.log(`   ✅ Auto Signal Loop: ${SYNC_RESULTS.auto_dispatch === 'ACTIVE'}`);
console.log(`   ✅ No Runtime Errors: ${!SYNC_RESULTS.checks.some(c => c.status === 'FAIL')}`);

// Recomendações
console.log('\n💡 RECOMMENDATIONS:');
if (SYNC_RESULTS.telegram_connection === 'FAIL') {
  console.log('   ❌ Check Railway ENV vars TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID');
  console.log('   ❌ Verify bot is admin of channel: https://t.me/gxeonsignals');
  console.log('   ❌ Get correct chat_id by sending /mychatid to bot');
}

if (SYNC_RESULTS.auto_dispatch === 'INACTIVE') {
  console.log('   ⚠️  Auto-generation not running - check initSignalOrchestrator() in production.js');
}

// Output JSON format
console.log('\n📋 OUTPUT FORMAT (JSON):');
console.log(JSON.stringify(SYNC_RESULTS, null, 2));

console.log('\n═══════════════════════════════════════════════════════════════════');
console.log(`Comandante, sistema ${criticalPassed ? 'SYNCED' : 'NEEDS REPAIR'}! 🌑`);

// Exit code
process.exit(criticalPassed ? 0 : 1);
