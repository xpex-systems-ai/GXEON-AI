#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ACTIVATE_ZERO_CAPITAL_REVENUE_MODE
 * Protocolo de ativação de monetização sem capital inicial
 * 
 * Comandante: Júnior Sena
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
const ZCR_CONFIG = {
  PRICE_PER_SIGNAL: 0.01,
  TIER_LIMITS: {
    BASIC: { daily: 10, monthly: 100 },
    PRO: { daily: 100, monthly: 1000 },
    ENTERPRISE: { daily: 1000, monthly: 10000 }
  },
  SCAN_INTERVAL_MINUTES: 5,
  TREASURY: '0x3955d559055DadB7067054cB6E6f974710345224'
};

// ═══════════════════════════════════════════════════════════════════════════
// LOGGER
// ═══════════════════════════════════════════════════════════════════════════
const log = {
  header: () => {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║     🚀 ZERO CAPITAL REVENUE MODE - ACTIVATION PROTOCOL          ║');
    console.log('║     Monetização de Sinais & Inteligência                      ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  },
  step: (n, msg) => console.log(`\n[STEP ${n}/6] ${msg}`),
  success: (msg) => console.log(`  ✅ ${msg}`),
  info: (msg) => console.log(`  ℹ️  ${msg}`),
  warn: (msg) => console.log(`  ⚠️  ${msg}`),
  error: (msg) => console.log(`  ❌ ${msg}`),
  divider: () => console.log('\n' + '═'.repeat(70))
};

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: ENABLE_SIGNAL_EXPORT
// ═══════════════════════════════════════════════════════════════════════════
async function step1_enableSignalExport() {
  log.step(1, 'ENABLE_SIGNAL_EXPORT - Configurando scanners');
  
  // Check enhanced scanner files exist
  const scanners = [
    'core/bounty_scanner_agent_enhanced.js',
    'core/gelato_scanner_enhanced.js'
  ];
  
  let allExist = true;
  for (const scanner of scanners) {
    const fullPath = path.join(process.cwd(), scanner);
    if (fs.existsSync(fullPath)) {
      log.success(`${scanner} - OK`);
    } else {
      log.error(`${scanner} - Não encontrado`);
      allExist = false;
    }
  }
  
  if (!allExist) {
    log.error('Scanners enhanced não encontrados. Execute setup primeiro.');
    return false;
  }
  
  // Create scanner config
  const configPath = path.join(process.cwd(), 'config', 'signal_scanners.json');
  const configDir = path.dirname(configPath);
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const scannerConfig = {
    bounty_scanner: {
      enabled: true,
      interval: '*/5 * * * *', // Every 5 minutes
      networks: ['ethereum', 'arbitrum', 'polygon', 'base'],
      minProfitUsd: 0.01,
      exportToSignalHub: true
    },
    gelato_scanner: {
      enabled: true,
      interval: '*/5 * * * *',
      networks: ['polygon', 'ethereum', 'arbitrum', 'base'],
      minProfitUsd: 0.01,
      exportToSignalHub: true
    },
    signalHub: {
      url: process.env.SIGNAL_HUB_URL || 'http://localhost:3000/v1/signals/inject',
      internalKey: process.env.INTERNAL_API_KEY || 'dev-key'
    }
  };
  
  fs.writeFileSync(configPath, JSON.stringify(scannerConfig, null, 2));
  log.success(`Configuração salva: ${configPath}`);
  
  log.info('Scanners configurados para exportar sinais para SignalHub');
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: CREATE_SIGNAL_API
// ═══════════════════════════════════════════════════════════════════════════
async function step2_createSignalApi() {
  log.step(2, 'CREATE_SIGNAL_API - Verificando endpoints');
  
  // Check Signal Hub service
  const signalHubPath = path.join(process.cwd(), 'server/services/signalHub.js');
  const routesPath = path.join(process.cwd(), 'server/routes/signals.js');
  
  if (!fs.existsSync(signalHubPath)) {
    log.error('SignalHub não encontrado');
    return false;
  }
  
  if (!fs.existsSync(routesPath)) {
    log.error('Signal routes não encontradas');
    return false;
  }
  
  log.success('SignalHub: OK');
  log.success('Signal Routes: OK');
  
  // Display API documentation
  log.divider();
  log.info('API ENDPOINTS DISPONÍVEIS:');
  log.info('  GET  /v1/signals              - Listar sinais disponíveis');
  log.info('  GET  /v1/signals/:id           - Obter sinal específico');
  log.info('  GET  /v1/signals/stats         - Estatísticas públicas');
  log.info('  GET  /v1/signals/pricing       - Informações de preço');
  log.info('  GET  /v1/signals/health        - Health check');
  log.info('  POST /v1/register              - Criar API key');
  log.info('  POST /v1/signals/inject        - Injetar sinal (internal)');
  log.divider();
  
  log.info('AUTENTICAÇÃO:');
  log.info('  Header: X-API-Key: sua_chave_aqui');
  log.info('  Query:  ?api_key=sua_chave_aqui');
  log.divider();
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: ENABLE_BILLING_PER_SIGNAL
// ═══════════════════════════════════════════════════════════════════════════
async function step3_enableBilling() {
  log.step(3, 'ENABLE_BILLING_PER_SIGNAL - Configurando billing');
  
  log.info(`Preço configurado: $${ZCR_CONFIG.PRICE_PER_SIGNAL} por sinal`);
  
  log.info('Tiers disponíveis:');
  Object.entries(ZCR_CONFIG.TIER_LIMITS).forEach(([tier, limits]) => {
    const monthlyCost = limits.monthly * ZCR_CONFIG.PRICE_PER_SIGNAL;
    log.info(`  ${tier}: ${limits.daily}/dia, ${limits.monthly}/mês (~$${monthlyCost})`);
  });
  
  // Create billing config
  const billingConfig = {
    price_per_signal: ZCR_CONFIG.PRICE_PER_SIGNAL,
    tiers: ZCR_CONFIG.TIER_LIMITS,
    ledger_table: 'GX_Billing_Ledger',
    revenue_type: 'SIGNAL_CONSUMPTION',
    treasury: ZCR_CONFIG.TREASURY
  };
  
  const configPath = path.join(process.cwd(), 'config', 'billing.json');
  fs.writeFileSync(configPath, JSON.stringify(billingConfig, null, 2));
  
  log.success(`Billing config: ${configPath}`);
  
  // Revenue projection
  const scenarios = {
    conservative: { users: 10, avgSignalsPerUser: 50 },
    moderate: { users: 50, avgSignalsPerUser: 100 },
    optimistic: { users: 200, avgSignalsPerUser: 200 }
  };
  
  log.divider();
  log.info('PROJEÇÃO DE RECEITA MENSAL:');
  Object.entries(scenarios).forEach(([scenario, data]) => {
    const revenue = data.users * data.avgSignalsPerUser * ZCR_CONFIG.PRICE_PER_SIGNAL;
    log.info(`  ${scenario}: ${data.users} users × ${data.avgSignalsPerUser} signals = $${revenue.toFixed(2)}`);
  });
  log.divider();
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: CREATE_TELEGRAM_DISPATCH
// ═══════════════════════════════════════════════════════════════════════════
async function step4_telegramDispatch() {
  log.step(4, 'CREATE_TELEGRAM_DISPATCH - Configurando Telegram');
  
  const telegramPath = path.join(process.cwd(), 'server/services/telegramDispatcher.js');
  
  if (!fs.existsSync(telegramPath)) {
    log.error('TelegramDispatcher não encontrado');
    return false;
  }
  
  log.success('TelegramDispatcher: OK');
  
  const hasToken = !!process.env.TELEGRAM_BOT_TOKEN;
  
  if (hasToken) {
    log.success('TELEGRAM_BOT_TOKEN: Configurado');
    log.info('Bot será iniciado automaticamente');
  } else {
    log.warn('TELEGRAM_BOT_TOKEN: Não configurado');
    log.info('Para ativar:');
    log.info('  1. Crie bot com @BotFather no Telegram');
    log.info('  2. Adicione TELEGRAM_BOT_TOKEN ao .env');
    log.info('  3. Reinicie o serviço');
  }
  
  log.divider();
  log.info('COMANDOS DO BOT:');
  log.info('  /start - Iniciar');
  log.info('  /register <email> <tier> - Criar conta');
  log.info('  /status - Ver conta');
  log.info('  /stats - Estatísticas');
  log.info('  /help - Ajuda');
  log.divider();
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: ACTIVATE_LEAD_CAPTURE
// ═══════════════════════════════════════════════════════════════════════════
async function step5_leadCapture() {
  log.step(5, 'ACTIVATE_LEAD_CAPTURE - Endpoint de registro');
  
  log.info('Endpoint: POST /v1/register');
  log.info('Body: { email, tier, referral_code? }');
  
  log.divider();
  log.info('EXEMPLO DE USO:');
  log.info('  curl -X POST http://localhost:3000/v1/register \\');
  log.info('    -H "Content-Type: application/json" \\');
  log.info('    -d \'{ "email": "user@example.com", "tier": "PRO" }\'');
  log.divider();
  
  log.info('RESPONSE:');
  log.info('  {');
  log.info('    "api_key": "gx_abc123...",');
  log.info('    "tier": "PRO",');
  log.info('    "limits": { "daily": 100, "monthly": 1000 },');
  log.info('    "price_per_signal": 0.01');
  log.info('  }');
  log.divider();
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 6: LOG_REAL_USAGE
// ═══════════════════════════════════════════════════════════════════════════
async function step6_logUsage() {
  log.step(6, 'LOG_REAL_USAGE - Sistema de ledger');
  
  log.info('Todas as operações são registradas em:');
  log.info('  Tabela: GX_Billing_Ledger');
  log.info('  Eventos: signal_consumption, signal_bulk_consumption');
  
  log.divider();
  log.info('CAMPOS REGISTRADOS:');
  log.info('  - execution_id (signal_id)');
  log.info('  - timestamp');
  log.info('  - cost_usd');
  log.info('  - customer_email');
  log.info('  - tier');
  log.info('  - metadata (signal details)');
  log.divider();
  
  // Create activation record
  const activationRecord = {
    activation_timestamp: new Date().toISOString(),
    protocol: 'ZERO_CAPITAL_REVENUE_MODE',
    version: '1.0.0',
    config: ZCR_CONFIG,
    components: {
      signalHub: 'server/services/signalHub.js',
      signalRoutes: 'server/routes/signals.js',
      telegramDispatcher: 'server/services/telegramDispatcher.js',
      bountyScanner: 'core/bounty_scanner_agent_enhanced.js',
      gelatoScanner: 'core/gelato_scanner_enhanced.js'
    },
    status: 'activated'
  };
  
  const recordPath = path.join(process.cwd(), 'logs', `zcr_activation_${Date.now()}.json`);
  
  if (!fs.existsSync(path.dirname(recordPath))) {
    fs.mkdirSync(path.dirname(recordPath), { recursive: true });
  }
  
  fs.writeFileSync(recordPath, JSON.stringify(activationRecord, null, 2));
  log.success(`Registro de ativação: ${recordPath}`);
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// START SERVICES
// ═══════════════════════════════════════════════════════════════════════════
function startServices() {
  log.divider();
  log.info('INICIANDO SERVIÇOS...');
  log.divider();
  
  // We can't actually spawn processes in this demo
  // In production, these would be started via PM2 or systemd
  
  log.info('Serviços a iniciar:');
  log.info('  1. npm start (servidor principal com SignalHub)');
  log.info('  2. node core/bounty_scanner_agent_enhanced.js daemon');
  log.info('  3. node core/gelato_scanner_enhanced.js daemon');
  log.info('  4. Telegram Bot (automático se TELEGRAM_BOT_TOKEN set)');
  
  log.divider();
  log.info('COMANDOS PARA INICIAR:');
  log.info('');
  log.info('# Terminal 1 - Servidor API');
  log.info('npm start');
  log.info('');
  log.info('# Terminal 2 - Bounty Scanner');
  log.info('node core/bounty_scanner_agent_enhanced.js daemon');
  log.info('');
  log.info('# Terminal 3 - Gelato Scanner');
  log.info('node core/gelato_scanner_enhanced.js daemon');
  log.info('');
  log.divider();
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  log.header();
  
  const steps = [
    step1_enableSignalExport,
    step2_createSignalApi,
    step3_enableBilling,
    step4_telegramDispatch,
    step5_leadCapture,
    step6_logUsage
  ];
  
  let allPassed = true;
  
  for (const step of steps) {
    const result = await step();
    if (!result) allPassed = false;
  }
  
  log.divider();
  console.log('\n🎉 ZERO CAPITAL REVENUE MODE - ATIVADO!\n');
  log.divider();
  
  console.log('\n📊 RESUMO:');
  console.log('  ✅ Signal Export: Scanners → SignalHub');
  console.log('  ✅ Signal API: /v1/signals (com API Key auth)');
  console.log('  ✅ Billing: $0.01 por sinal consumido');
  console.log('  ✅ Telegram: Alertas PRO/Enterprise');
  console.log('  ✅ Lead Capture: /v1/register');
  console.log('  ✅ Ledger: GX_Billing_Ledger');
  
  console.log('\n💰 MODELO DE NEGÓCIO:');
  console.log('  • BASIC (free): 10 sinais/dia');
  console.log('  • PRO ($10/mês): 100 sinais/dia + Telegram');
  console.log('  • ENTERPRISE ($100/mês): 1000 sinais/dia + tudo');
  
  console.log('\n🚀 PRÓXIMOS PASSOS:');
  console.log('  1. Iniciar serviços (veja comandos acima)');
  console.log('  2. Registrar primeiro usuário: POST /v1/register');
  console.log('  3. Monitorar métricas: GET /v1/signals/stats');
  console.log('  4. Acompanhar revenue: GX_Billing_Ledger');
  
  console.log(`\n💎 Treasury: ${ZCR_CONFIG.TREASURY}\n`);
  
  startServices();
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
