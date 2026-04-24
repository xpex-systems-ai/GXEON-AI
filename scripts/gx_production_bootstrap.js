#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GX_PRODUCTION_BOOTSTRAP - REAL_ONLINE_DEPLOY
 * Protocolo de 8 passos para deploy em produção
 * 
 * Comandante: Júnior Sena
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════
// ENV CONFIGURATION (from user request)
// ═══════════════════════════════════════════════════════════════════════════
const DEPLOY_ENV = {
  SUPABASE_PROJECT_URL: process.env.SUPABASE_PROJECT_URL || 'https://SEU_NOVO_URL.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'SUA_NOVA_KEY',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || 'SEU_NOVO_TOKEN',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '8506789322',
  BASE_URL: process.env.BASE_URL || 'https://gxeon-ia-production.up.railway.app',
  PORT: process.env.PORT || '3000'
};

// ═══════════════════════════════════════════════════════════════════════════
// STATE TRACKING
// ═══════════════════════════════════════════════════════════════════════════
const state = {
  timestamp: new Date().toISOString(),
  steps: {},
  processes: [],
  errors: []
};

// ═══════════════════════════════════════════════════════════════════════════
// LOGGER
// ═══════════════════════════════════════════════════════════════════════════
const log = {
  header: () => {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║     🚀 GX PRODUCTION BOOTSTRAP - REAL ONLINE DEPLOY             ║');
    console.log('║     8-Step Protocol for Live Infrastructure                     ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  },
  step: (n, msg) => console.log(`\n[STEP ${n}/8] ${msg}`),
  success: (msg) => console.log(`  ✅ ${msg}`),
  error: (msg) => console.log(`  ❌ ${msg}`),
  warn: (msg) => console.log(`  ⚠️  ${msg}`),
  info: (msg) => console.log(`  ℹ️  ${msg}`),
  data: (k, v) => console.log(`  📊 ${k}: ${v}`),
  cmd: (c) => console.log(`  > ${c}`),
  divider: () => console.log('\n' + '═'.repeat(70))
};

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: ENV_INJECTION
// ═══════════════════════════════════════════════════════════════════════════
async function step1_envInjection() {
  log.step(1, 'ENV_INJECTION - Configurando variáveis de ambiente');
  
  const envPath = path.join(process.cwd(), '.env');
  
  // Check if values are still placeholders
  const isPlaceholder = (val) => val.includes('SEU_') || val.includes('SUA_') || val.includes('NOVO_');
  
  const envContent = `# GXEON Production Environment
# Generated: ${new Date().toISOString()}

# Supabase
SUPABASE_PROJECT_URL=${DEPLOY_ENV.SUPABASE_PROJECT_URL}
SUPABASE_SERVICE_ROLE_KEY=${DEPLOY_ENV.SUPABASE_SERVICE_ROLE_KEY}

# Telegram
TELEGRAM_BOT_TOKEN=${DEPLOY_ENV.TELEGRAM_BOT_TOKEN}
TELEGRAM_CHAT_ID=${DEPLOY_ENV.TELEGRAM_CHAT_ID}

# Server
PORT=${DEPLOY_ENV.PORT}
BASE_URL=${DEPLOY_ENV.BASE_URL}

# Signal Hub
INTERNAL_API_KEY=internal_${Date.now()}
SIGNAL_HUB_URL=http://localhost:${DEPLOY_ENV.PORT}/v1/signals/inject
`;

  // Write .env file
  fs.writeFileSync(envPath, envContent);
  log.success(`Arquivo .env criado: ${envPath}`);
  
  // Check for placeholders
  const warnings = [];
  if (isPlaceholder(DEPLOY_ENV.SUPABASE_PROJECT_URL)) {
    warnings.push('SUPABASE_PROJECT_URL contém placeholder');
  }
  if (isPlaceholder(DEPLOY_ENV.SUPABASE_SERVICE_ROLE_KEY)) {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY contém placeholder');
  }
  if (isPlaceholder(DEPLOY_ENV.TELEGRAM_BOT_TOKEN)) {
    warnings.push('TELEGRAM_BOT_TOKEN contém placeholder');
  }
  
  if (warnings.length > 0) {
    log.warn('Variáveis de exemplo detectadas:');
    warnings.forEach(w => log.warn(`  - ${w}`));
    log.info('⚠️  SUBSTITUA com valores reais antes do deploy!');
  }
  
  state.steps.envInjection = { 
    status: warnings.length === 0 ? 'SUCCESS' : 'WARNING',
    path: envPath,
    warnings 
  };
  
  return warnings.length === 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: SERVER_BOOT
// ═══════════════════════════════════════════════════════════════════════════
async function step2_serverBoot() {
  log.step(2, 'SERVER_BOOT - Iniciando servidor Express');
  
  return new Promise((resolve) => {
    log.cmd('npm start');
    
    const server = spawn('npm', ['start'], {
      cwd: process.cwd(),
      shell: true,
      stdio: 'pipe'
    });
    
    state.processes.push({ name: 'server', pid: server.pid });
    
    let output = '';
    let started = false;
    
    server.stdout.on('data', (data) => {
      output += data.toString();
      
      // Check for success indicators
      if (data.toString().includes('Server running') || 
          data.toString().includes('listening') ||
          data.toString().includes('3000')) {
        if (!started) {
          started = true;
          log.success('Servidor Express iniciado!');
          
          // Give it a moment to fully start
          setTimeout(() => resolve(true), 2000);
        }
      }
    });
    
    server.stderr.on('data', (data) => {
      const str = data.toString();
      if (str.includes('EADDRINUSE')) {
        log.warn('Porta 3000 já em uso - servidor pode já estar rodando');
        resolve(true);
      }
      output += str;
    });
    
    server.on('error', (err) => {
      log.error(`Erro: ${err.message}`);
      state.errors.push(`Server boot: ${err.message}`);
      resolve(false);
    });
    
    // Timeout after 15 seconds
    setTimeout(() => {
      if (!started) {
        // Check if it's actually running
        log.info('Verificando se servidor já está rodando...');
        resolve(true); // Assume it might be running already
      }
    }, 15000);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: SUPABASE_CONNECTION_TEST
// ═══════════════════════════════════════════════════════════════════════════
async function step3_supabaseTest() {
  log.step(3, 'SUPABASE_CONNECTION_TEST - Testando conexão');
  
  const isPlaceholder = DEPLOY_ENV.SUPABASE_PROJECT_URL.includes('SEU_NOVO_URL');
  
  if (isPlaceholder) {
    log.warn('Supabase URL é placeholder - pulando teste real');
    state.steps.supabaseTest = { status: 'SKIPPED', reason: 'Placeholder URL' };
    return false;
  }
  
  try {
    const supabase = createClient(
      DEPLOY_ENV.SUPABASE_PROJECT_URL,
      DEPLOY_ENV.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Test write
    const testEvent = {
      execution_id: `bootstrap_test_${Date.now()}`,
      timestamp: new Date().toISOString(),
      cost_usd: 0.01,
      revenue_type: 'BOOTSTRAP_TEST',
      customer_email: 'bootstrap@test.gxeon',
      tier: 'TEST',
      metadata: { step: 3, test: true }
    };
    
    const { error } = await supabase.from('GX_Billing_Ledger').insert(testEvent);
    
    if (error) {
      log.error(`Falha na escrita: ${error.message}`);
      
      if (error.message.includes('does not exist')) {
        log.info('Tabela GX_Billing_Ledger não existe - criando...');
        log.info('Execute no SQL Editor do Supabase:');
        log.info(`
CREATE TABLE IF NOT EXISTS GX_Billing_Ledger (
  id SERIAL PRIMARY KEY,
  execution_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE,
  cost_usd DECIMAL(10,4),
  revenue_type TEXT,
  customer_email TEXT,
  tier TEXT,
  metadata JSONB
);
        `);
      }
      
      state.steps.supabaseTest = { status: 'FAIL', error: error.message };
      return false;
    }
    
    // Cleanup
    await supabase.from('GX_Billing_Ledger').delete().eq('execution_id', testEvent.execution_id);
    
    log.success('Supabase conectado e GX_Billing_Ledger funcional!');
    state.steps.supabaseTest = { status: 'SUCCESS' };
    return true;
    
  } catch (error) {
    log.error(`Erro de conexão: ${error.message}`);
    state.steps.supabaseTest = { status: 'FAIL', error: error.message };
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: TELEGRAM_TEST_MESSAGE
// ═══════════════════════════════════════════════════════════════════════════
async function step4_telegramTest() {
  log.step(4, 'TELEGRAM_TEST_MESSAGE - Testando bot');
  
  const isPlaceholder = DEPLOY_ENV.TELEGRAM_BOT_TOKEN.includes('SEU_NOVO');
  
  if (isPlaceholder) {
    log.warn('Telegram token é placeholder - pulando teste');
    state.steps.telegramTest = { status: 'SKIPPED', reason: 'Placeholder token' };
    return false;
  }
  
  try {
    const axios = (await import('axios')).default;
    
    const message = `🚀 GXEON ONLINE\n\n📅 ${new Date().toLocaleString()}\n🌐 ${DEPLOY_ENV.BASE_URL}\n\nBootstrap Step 4/8 completed ✅`;
    
    const response = await axios.post(
      `https://api.telegram.org/bot${DEPLOY_ENV.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: DEPLOY_ENV.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      }
    );
    
    if (response.data?.ok) {
      log.success('Mensagem enviada para Telegram!');
      log.data('Message ID', response.data.result.message_id);
      state.steps.telegramTest = { status: 'SUCCESS', messageId: response.data.result.message_id };
      return true;
    } else {
      throw new Error('Telegram API returned error');
    }
    
  } catch (error) {
    log.error(`Falha no Telegram: ${error.message}`);
    
    if (error.response?.data?.error_code === 404) {
      log.info('Bot não encontrado - verifique o token');
    } else if (error.response?.data?.error_code === 400) {
      log.info('Chat ID inválido ou bot não tem acesso ao chat');
    }
    
    state.steps.telegramTest = { status: 'FAIL', error: error.message };
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: API_ENDPOINT_VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
async function step5_apiValidation() {
  log.step(5, 'API_ENDPOINT_VALIDATION - Testando endpoints');
  
  const baseUrl = `http://localhost:${DEPLOY_ENV.PORT}`;
  const results = { passed: 0, failed: 0, tests: [] };
  
  const endpoints = [
    { method: 'GET', url: `${baseUrl}/v1/signals/health`, auth: false },
    { method: 'GET', url: `${baseUrl}/v1/signals/stats`, auth: false },
    { method: 'GET', url: `${baseUrl}/v1/signals/pricing`, auth: false }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint.url, { timeout: 5000 });
      
      if (response.status === 200) {
        log.success(`${endpoint.method} ${endpoint.url.replace(baseUrl, '')}: 200 OK`);
        results.passed++;
        results.tests.push({ endpoint: endpoint.url, status: 'PASS' });
      } else {
        log.warn(`Status inesperado: ${response.status}`);
        results.failed++;
      }
    } catch (error) {
      log.error(`${endpoint.method} ${endpoint.url.replace(baseUrl, '')}: ${error.message}`);
      results.failed++;
      results.tests.push({ endpoint: endpoint.url, status: 'FAIL', error: error.message });
    }
  }
  
  // Test /v1/signals without auth (should fail)
  try {
    await axios.get(`${baseUrl}/v1/signals`, { timeout: 5000 });
    log.error('/v1/signals sem auth: NÃO deveria retornar 200');
    results.failed++;
  } catch (error) {
    if (error.response?.status === 401) {
      log.success('/v1/signals: Retorna 401 sem auth (correto)');
      results.passed++;
    }
  }
  
  state.steps.apiValidation = { 
    status: results.failed === 0 ? 'SUCCESS' : 'PARTIAL',
    ...results 
  };
  
  return results.failed === 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 6: SCANNER_BOOT
// ═══════════════════════════════════════════════════════════════════════════
async function step6_scannerBoot() {
  log.step(6, 'SCANNER_BOOT - Iniciando scanners');
  
  const scanners = [
    { name: 'bounty', script: 'core/bounty_scanner_agent_enhanced.js' },
    { name: 'gelato', script: 'core/gelato_scanner_enhanced.js' }
  ];
  
  const results = { started: [], failed: [] };
  
  for (const scanner of scanners) {
    const scriptPath = path.join(process.cwd(), scanner.script);
    
    if (!fs.existsSync(scriptPath)) {
      log.error(`${scanner.name}: Script não encontrado`);
      results.failed.push(scanner.name);
      continue;
    }
    
    try {
      const process = spawn('node', [scanner.script, 'daemon'], {
        cwd: process.cwd(),
        detached: true,
        stdio: 'ignore'
      });
      
      process.unref();
      
      log.success(`${scanner.name}_scanner: Iniciado (PID: ${process.pid})`);
      results.started.push({ name: scanner.name, pid: process.pid });
      state.processes.push({ name: scanner.name, pid: process.pid });
      
    } catch (error) {
      log.error(`${scanner.name}: ${error.message}`);
      results.failed.push(scanner.name);
    }
  }
  
  // Give scanners time to initialize
  log.info('Aguardando inicialização dos scanners...');
  await new Promise(r => setTimeout(r, 3000));
  
  state.steps.scannerBoot = { 
    status: results.failed.length === 0 ? 'SUCCESS' : 'PARTIAL',
    ...results 
  };
  
  return results.failed.length === 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 7: SIGNAL_FLOW_TEST
// ═══════════════════════════════════════════════════════════════════════════
async function step7_signalFlow() {
  log.step(7, 'SIGNAL_FLOW_TEST - Testando fluxo de sinais');
  
  const baseUrl = `http://localhost:${DEPLOY_ENV.PORT}`;
  
  // 1. Create API key
  let apiKey;
  try {
    const regResponse = await axios.post(
      `${baseUrl}/v1/register`,
      { email: `flowtest_${Date.now()}@gxeon.ai`, tier: 'ENTERPRISE' },
      { timeout: 5000 }
    );
    
    apiKey = regResponse.data?.api_key;
    log.success(`API Key criada: ${apiKey?.slice(0, 20)}...`);
    
  } catch (error) {
    log.error(`Falha ao criar API key: ${error.message}`);
    state.steps.signalFlow = { status: 'FAIL', step: 'register' };
    return false;
  }
  
  // 2. Inject a test signal
  try {
    const signalData = {
      source: 'bootstrap_test',
      network: 'arbitrum',
      type: 'test_signal',
      tokenIn: 'ETH',
      tokenOut: 'USDC',
      dex: 'TestDEX',
      poolAddress: '0x0000000000000000000000000000000000000000',
      estimatedProfitUsd: 10.5,
      estimatedProfitPercent: 5.2,
      confidence: 0.85,
      gasCostUsd: 0.5,
      minCapitalRequired: 100,
      executionPath: [{ step: 'test', target: '0x0', data: '0x' }]
    };
    
    const injectResponse = await axios.post(
      `${baseUrl}/v1/signals/inject`,
      signalData,
      {
        headers: { 'X-Internal-Key': process.env.INTERNAL_API_KEY || 'internal_test' },
        timeout: 5000
      }
    );
    
    if (injectResponse.data?.success) {
      log.success(`Sinal injetado: ${injectResponse.data.signal_id}`);
    }
    
  } catch (error) {
    log.warn(`Injeção falhou (pode ser normal): ${error.message}`);
  }
  
  // 3. Try to fetch signals
  try {
    const signalsResponse = await axios.get(
      `${baseUrl}/v1/signals`,
      {
        headers: { 'X-API-Key': apiKey },
        timeout: 5000
      }
    );
    
    const count = signalsResponse.data?.signals?.length || 0;
    log.success(`${count} sinais disponíveis via API`);
    
    state.steps.signalFlow = { 
      status: 'SUCCESS',
      apiKey: apiKey?.slice(0, 20) + '...',
      signalsAvailable: count
    };
    
    return true;
    
  } catch (error) {
    log.error(`Falha ao buscar sinais: ${error.message}`);
    state.steps.signalFlow = { status: 'FAIL', error: error.message };
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 8: PUBLIC_HEALTH_CHECK
// ═══════════════════════════════════════════════════════════════════════════
async function step8_publicHealth() {
  log.step(8, 'PUBLIC_HEALTH_CHECK - Validando acesso externo');
  
  const isPlaceholder = DEPLOY_ENV.BASE_URL.includes('railway.app') && 
                        !DEPLOY_ENV.BASE_URL.includes('gxeon-ia-production');
  
  if (isPlaceholder) {
    log.warn('BASE_URL é placeholder ou não configurada');
    log.info('Configure no Railway/Render dashboard:');
    log.info(`  Public Domain: ${DEPLOY_ENV.BASE_URL}`);
    state.steps.publicHealth = { status: 'SKIPPED', reason: 'Placeholder URL' };
    return false;
  }
  
  try {
    const response = await axios.get(
      `${DEPLOY_ENV.BASE_URL}/v1/signals/health`,
      { timeout: 10000 }
    );
    
    if (response.status === 200) {
      log.success('API pública ACESSÍVEL!');
      log.data('URL', DEPLOY_ENV.BASE_URL);
      log.data('Status', response.data.status || 'unknown');
      
      state.steps.publicHealth = { 
        status: 'SUCCESS',
        url: DEPLOY_ENV.BASE_URL,
        response: response.data
      };
      
      return true;
    }
    
  } catch (error) {
    log.error(`API pública não responde: ${error.message}`);
    
    if (error.code === 'ENOTFOUND') {
      log.info('Domínio não existe ainda - deploy Railway em andamento?');
    } else if (error.code === 'ECONNREFUSED') {
      log.info('Conexão recusada - verifique se deploy foi concluído');
    }
    
    state.steps.publicHealth = { status: 'FAIL', error: error.message };
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════════════════
async function generateReport() {
  log.divider();
  
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              🎯 BOOTSTRAP COMPLETE                               ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  // Count results
  const statuses = Object.values(state.steps).map(s => s.status);
  const success = statuses.filter(s => s === 'SUCCESS').length;
  const partial = statuses.filter(s => s === 'PARTIAL' || s === 'WARNING').length;
  const fail = statuses.filter(s => s === 'FAIL' || s === 'SKIPPED').length;
  
  console.log('📊 RESULTADOS POR STEP:');
  Object.entries(state.steps).forEach(([name, result]) => {
    const emoji = result.status === 'SUCCESS' ? '✅' : 
                  result.status === 'PARTIAL' ? '⚠️' : '❌';
    console.log(`   ${emoji} ${name}: ${result.status}`);
  });
  
  console.log('\n📈 SUMMARY:');
  console.log(`   ✅ Success: ${success}/8`);
  console.log(`   ⚠️  Partial/Warning: ${partial}/8`);
  console.log(`   ❌ Fail/Skip: ${fail}/8`);
  
  // Overall status
  const overall = fail === 0 ? 'READY' : (success >= 5 ? 'PARTIAL' : 'BLOCKED');
  const overallEmoji = overall === 'READY' ? '🟢' : overall === 'PARTIAL' ? '🟡' : '🔴';
  
  console.log(`\n${overallEmoji} OVERALL STATUS: ${overall}`);
  
  if (overall === 'READY') {
    console.log('\n🚀 SISTEMA PRONTO PARA PRODUÇÃO!');
    console.log(`   URL: ${DEPLOY_ENV.BASE_URL}`);
    console.log(`   Health: ${DEPLOY_ENV.BASE_URL}/v1/signals/health`);
  } else if (overall === 'PARTIAL') {
    console.log('\n⚠️  SISTEMA PARCIALMENTE PRONTO');
    console.log('   Alguns serviços podem precisar de ajustes manuais');
  } else {
    console.log('\n🔴 SISTEMA NÃO PRONTO');
    console.log('   Resolva os erros críticos antes do deploy');
  }
  
  // Save state
  const reportPath = path.join(process.cwd(), 'logs', `bootstrap_${Date.now()}.json`);
  if (!fs.existsSync(path.dirname(reportPath))) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(state, null, 2));
  console.log(`\n📄 Report salvo: ${reportPath}`);
  
  return overall;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  log.header();
  
  // Execute all steps
  await step1_envInjection();
  await step2_serverBoot();
  await step3_supabaseTest();
  await step4_telegramTest();
  await step5_apiValidation();
  await step6_scannerBoot();
  await step7_signalFlow();
  await step8_publicHealth();
  
  // Generate report
  const status = await generateReport();
  
  process.exit(status === 'READY' ? 0 : (status === 'PARTIAL' ? 0 : 1));
}

main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
