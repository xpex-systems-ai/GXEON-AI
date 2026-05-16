#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GX_PRODUCTION_READINESS_AUDIT - STRICT_REALITY_CHECK
 * Validação rigorosa da infraestrutura antes de tráfego real
 * 
 * Comandante: Júnior Sena
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
const AUDIT_CONFIG = {
  LOCAL_API_URL: 'http://localhost:3000',
  PUBLIC_API_URL: process.env.PUBLIC_API_URL || null,
  TIMEOUT_MS: 10000,
  SCANNER_MAX_AGE_MS: 60000, // 60 segundos
  TREASURY: '0x3955d559055DadB7067054cB6E6f974710345224'
};

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT STATE
// ═══════════════════════════════════════════════════════════════════════════
const auditResults = {
  timestamp: new Date().toISOString(),
  overallStatus: 'PENDING',
  steps: {},
  criticalIssues: [],
  warnings: [],
  recommendations: []
};

// ═══════════════════════════════════════════════════════════════════════════
// LOGGER
// ═══════════════════════════════════════════════════════════════════════════
const log = {
  header: () => {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║     🔍 GX PRODUCTION READINESS AUDIT                              ║');
    console.log('║     STRICT_REALITY_CHECK - Validação de Infraestrutura Real       ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  },
  step: (n, msg) => console.log(`\n[STEP ${n}/9] ${msg}`),
  pass: (msg) => console.log(`  ✅ ${msg}`),
  fail: (msg) => console.log(`  ❌ ${msg}`),
  warn: (msg) => console.log(`  ⚠️  ${msg}`),
  info: (msg) => console.log(`  ℹ️  ${msg}`),
  data: (label, value) => console.log(`  📊 ${label}: ${value}`),
  divider: () => console.log('\n' + '═'.repeat(70) + '\n')
};

// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: GATEWAY_ONLINE_CHECK
// ═══════════════════════════════════════════════════════════════════════════
async function step1_gatewayOnline() {
  log.step(1, 'GATEWAY_ONLINE_CHECK - Testando servidor Express');
  
  const results = {
    status: 'FAIL',
    localOnline: false,
    healthCheck: null,
    errors: []
  };
  
  try {
    // Test local API
    const response = await axios.get(`${AUDIT_CONFIG.LOCAL_API_URL}/v1/signals/health`, {
      timeout: AUDIT_CONFIG.TIMEOUT_MS
    });
    
    if (response.status === 200) {
      results.localOnline = true;
      results.healthCheck = response.data;
      log.pass('Servidor local ONLINE (/v1/signals/health: 200 OK)');
      log.data('Service', response.data.service || 'Unknown');
      log.data('Version', response.data.version || 'Unknown');
    } else {
      results.errors.push(`Unexpected status: ${response.status}`);
      log.fail(`Status inesperado: ${response.status}`);
    }
    
    // Test signals endpoint (without auth - should fail or redirect)
    try {
      await axios.get(`${AUDIT_CONFIG.LOCAL_API_URL}/v1/signals`, {
        timeout: AUDIT_CONFIG.TIMEOUT_MS
      });
    } catch (error) {
      if (error.response?.status === 401) {
        log.pass('Endpoint /v1/signals responde (401 sem auth - correto)');
      }
    }
    
    results.status = results.localOnline ? 'PASS' : 'FAIL';
    
  } catch (error) {
    results.errors.push(error.message);
    log.fail(`Servidor NÃO RESPONDE: ${error.message}`);
    log.info('Verifique se npm start foi executado');
    results.status = 'FAIL';
  }
  
  auditResults.steps.gatewayOnline = results;
  
  if (results.status === 'FAIL') {
    auditResults.criticalIssues.push('Servidor Express offline - GATEWAY_FAIL');
  }
  
  return results.status;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 2: API_ENDPOINT_VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
async function step2_apiValidation() {
  log.step(2, 'API_ENDPOINT_VALIDATION - Validando endpoints críticos');
  
  const endpoints = [
    { method: 'GET', path: '/v1/signals/health', auth: false },
    { method: 'GET', path: '/v1/signals/stats', auth: false },
    { method: 'GET', path: '/v1/signals/pricing', auth: false },
    { method: 'POST', path: '/v1/register', auth: false, testData: { email: `test_${Date.now()}@audit.gxeon`, tier: 'BASIC' } }
  ];
  
  const results = {
    status: 'FAIL',
    tested: 0,
    passed: 0,
    failed: 0,
    endpoints: {}
  };
  
  for (const endpoint of endpoints) {
    results.tested++;
    const url = `${AUDIT_CONFIG.LOCAL_API_URL}${endpoint.path}`;
    
    try {
      let response;
      if (endpoint.method === 'GET') {
        response = await axios.get(url, { timeout: AUDIT_CONFIG.TIMEOUT_MS });
      } else {
        response = await axios.post(url, endpoint.testData, { 
          timeout: AUDIT_CONFIG.TIMEOUT_MS,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const isJson = response.headers['content-type']?.includes('application/json');
      const hasData = response.data && typeof response.data === 'object';
      
      if (response.status >= 200 && response.status < 300 && isJson && hasData) {
        results.passed++;
        results.endpoints[endpoint.path] = { status: 'PASS', code: response.status };
        log.pass(`${endpoint.method} ${endpoint.path}: ${response.status} (JSON válido)`);
      } else {
        results.failed++;
        results.endpoints[endpoint.path] = { status: 'FAIL', code: response.status, reason: 'Invalid response' };
        log.fail(`${endpoint.method} ${endpoint.path}: Resposta inválida`);
      }
      
    } catch (error) {
      results.failed++;
      const code = error.response?.status || 'TIMEOUT';
      results.endpoints[endpoint.path] = { status: 'FAIL', code, error: error.message };
      
      // Some endpoints should fail without auth
      if (endpoint.path === '/v1/signals' && code === 401) {
        log.pass(`${endpoint.method} ${endpoint.path}: ${code} (auth required - correto)`);
        results.passed++;
        results.failed--;
        results.endpoints[endpoint.path].status = 'PASS';
      } else {
        log.fail(`${endpoint.method} ${endpoint.path}: ${code} - ${error.message}`);
      }
    }
  }
  
  results.status = results.failed === 0 ? 'PASS' : (results.passed > 0 ? 'PARTIAL' : 'FAIL');
  auditResults.steps.apiValidation = results;
  
  log.divider();
  log.data('Endpoints testados', results.tested);
  log.data('Passaram', results.passed);
  log.data('Falharam', results.failed);
  
  if (results.failed > 0) {
    auditResults.warnings.push(`${results.failed} endpoints falharam`);
  }
  
  return results.status;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 3: SCANNER_LIVENESS_CHECK
// ═══════════════════════════════════════════════════════════════════════════
async function step3_scannerLiveness() {
  log.step(3, 'SCANNER_LIVENESS_CHECK - Verificando processos ativos');
  
  const results = {
    status: 'WARNING',
    processes: {},
    signalGeneration: { recent: false, lastSignal: null }
  };
  
  try {
    // Check for running node processes
    const platform = process.platform;
    let processList = '';
    
    if (platform === 'win32') {
      try {
        processList = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', { encoding: 'utf-8' });
      } catch (e) {
        processList = '';
      }
    } else {
      try {
        processList = execSync('ps aux | grep node', { encoding: 'utf-8' });
      } catch (e) {
        processList = '';
      }
    }
    
    // Check for bounty scanner
    const bountyRunning = processList.includes('bounty_scanner');
    results.processes.bounty = bountyRunning;
    
    if (bountyRunning) {
      log.pass('bounty_scanner_agent_enhanced: PROCESSO ATIVO');
    } else {
      log.warn('bounty_scanner_agent_enhanced: NÃO ENCONTRADO');
    }
    
    // Check for gelato scanner
    const gelatoRunning = processList.includes('gelato_scanner');
    results.processes.gelato = gelatoRunning;
    
    if (gelatoRunning) {
      log.pass('gelato_scanner_enhanced: PROCESSO ATIVO');
    } else {
      log.warn('gelato_scanner_enhanced: NÃO ENCONTRADO');
    }
    
    // Check recent signal generation via logs
    const logsDir = path.join(process.cwd(), 'logs');
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir)
        .filter(f => f.startsWith('activation_') || f.includes('signal'))
        .map(f => ({
          name: f,
          path: path.join(logsDir, f),
          mtime: fs.statSync(path.join(logsDir, f)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      if (files.length > 0) {
        const latest = files[0];
        const ageMs = Date.now() - latest.mtime.getTime();
        
        results.signalGeneration.lastSignal = latest.name;
        results.signalGeneration.lastSignalTime = latest.mtime.toISOString();
        results.signalGeneration.ageSeconds = Math.floor(ageMs / 1000);
        
        if (ageMs < AUDIT_CONFIG.SCANNER_MAX_AGE_MS) {
          results.signalGeneration.recent = true;
          log.pass(`Sinal recente: ${latest.name} (${Math.floor(ageMs/1000)}s atrás)`);
        } else {
          log.warn(`Último sinal: ${latest.name} (${Math.floor(ageMs/1000)}s atrás - >60s)`);
        }
      } else {
        log.warn('Nenhum log de sinal encontrado');
      }
    } else {
      log.warn('Diretório logs/ não existe');
    }
    
    // Determine status
    if (results.processes.bounty || results.processes.gelato) {
      results.status = results.signalGeneration.recent ? 'PASS' : 'WARNING';
    } else {
      results.status = 'WARNING';
      auditResults.warnings.push('Nenhum scanner ativo detectado');
    }
    
  } catch (error) {
    log.warn(`Erro ao verificar processos: ${error.message}`);
    results.status = 'WARNING';
  }
  
  auditResults.steps.scannerLiveness = results;
  return results.status;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 4: SIGNAL_FLOW_VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
async function step4_signalFlow() {
  log.step(4, 'SIGNAL_FLOW_VALIDATION - Confirmando fluxo de sinais');
  
  const results = {
    status: 'FAIL',
    flow: {
      scanner: false,
      signalHub: false,
      api: false
    },
    availableSignals: 0
  };
  
  try {
    // Check SignalHub directly
    const signalHubPath = path.join(process.cwd(), 'server/services/signalHub.js');
    if (fs.existsSync(signalHubPath)) {
      results.flow.signalHub = true;
      log.pass('SignalHub: Arquivo presente');
    } else {
      log.fail('SignalHub: Arquivo NÃO encontrado');
    }
    
    // Try to get signals via API (we need to create a test API key first)
    try {
      // Create a test API key
      const registerResponse = await axios.post(
        `${AUDIT_CONFIG.LOCAL_API_URL}/v1/register`,
        { email: `flow_test_${Date.now()}@audit.gxeon`, tier: 'ENTERPRISE' },
        { timeout: AUDIT_CONFIG.TIMEOUT_MS }
      );
      
      if (registerResponse.data?.api_key) {
        const testKey = registerResponse.data.api_key;
        log.pass('Test API key criada');
        
        // Now try to get signals
        try {
          const signalsResponse = await axios.get(
            `${AUDIT_CONFIG.LOCAL_API_URL}/v1/signals`,
            { 
              headers: { 'X-API-Key': testKey },
              timeout: AUDIT_CONFIG.TIMEOUT_MS
            }
          );
          
          results.flow.api = true;
          results.availableSignals = signalsResponse.data?.signals?.length || 0;
          
          if (results.availableSignals > 0) {
            log.pass(`${results.availableSignals} sinais disponíveis via API`);
          } else {
            log.warn('API funciona mas nenhum sinal disponível');
          }
          
        } catch (error) {
          if (error.response?.status === 429) {
            log.warn('Rate limit atingido (esperado para novo usuário)');
            results.flow.api = true;
          } else {
            log.fail(`API error: ${error.response?.status || error.message}`);
          }
        }
      }
    } catch (error) {
      log.fail(`Falha ao criar test key: ${error.message}`);
    }
    
    // Check if scanners are configured to export
    const bountyPath = path.join(process.cwd(), 'core/bounty_scanner_agent_enhanced.js');
    const gelatoPath = path.join(process.cwd(), 'core/gelato_scanner_enhanced.js');
    
    if (fs.existsSync(bountyPath) && fs.existsSync(gelatoPath)) {
      results.flow.scanner = true;
      log.pass('Scanners enhanced configurados');
    }
    
    // Determine status
    if (results.flow.signalHub && results.flow.api) {
      results.status = results.availableSignals > 0 ? 'PASS' : 'WARNING';
    } else {
      results.status = 'FAIL';
      if (!results.flow.signalHub) auditResults.criticalIssues.push('SignalHub não funcional');
      if (!results.flow.api) auditResults.criticalIssues.push('API não responde');
    }
    
  } catch (error) {
    log.fail(`Erro: ${error.message}`);
    results.status = 'FAIL';
  }
  
  auditResults.steps.signalFlow = results;
  return results.status;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 5: TELEGRAM_DISPATCH_TEST
// ═══════════════════════════════════════════════════════════════════════════
async function step5_telegramTest() {
  log.step(5, 'TELEGRAM_DISPATCH_TEST - Testando envio Telegram');
  
  const results = {
    status: 'WARNING',
    configured: false,
    botRunning: false,
    testSent: false
  };
  
  // Check if Telegram bot token is configured
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken) {
    results.configured = true;
    log.pass('TELEGRAM_BOT_TOKEN: Configurado');
  } else {
    log.warn('TELEGRAM_BOT_TOKEN: NÃO configurado');
    auditResults.warnings.push('Telegram bot não configurado');
    results.status = 'WARNING';
  }
  
  // Check if dispatcher file exists
  const dispatcherPath = path.join(process.cwd(), 'server/services/telegramDispatcher.js');
  if (fs.existsSync(dispatcherPath)) {
    log.pass('TelegramDispatcher: Arquivo presente');
  } else {
    log.fail('TelegramDispatcher: Arquivo NÃO encontrado');
    results.status = 'FAIL';
  }
  
  // Note: We can't actually test sending a message without a real chat ID
  if (results.configured) {
    log.info('Bot pode ser iniciado. Teste real requer chat ID válido.');
  }
  
  auditResults.steps.telegramTest = results;
  return results.status;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 6: LEDGER_WRITE_TEST
// ═══════════════════════════════════════════════════════════════════════════
async function step6_ledgerTest() {
  log.step(6, 'LEDGER_WRITE_TEST - Validando GX_Billing_Ledger');
  
  const results = {
    status: 'FAIL',
    supabaseConnected: false,
    tableExists: false,
    writeTest: false,
    readTest: false
  };
  
  try {
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      log.fail('Supabase não configurado (SUPABASE_PROJECT_URL ou SUPABASE_SERVICE_ROLE_KEY)');
      auditResults.criticalIssues.push('Supabase não configurado - Ledger não funcional');
      results.status = 'FAIL';
      auditResults.steps.ledgerTest = results;
      return results.status;
    }
    
    results.supabaseConnected = true;
    log.pass('Supabase: Credenciais configuradas');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try to write a test event
    const testEvent = {
      execution_id: `audit_test_${Date.now()}`,
      timestamp: new Date().toISOString(),
      cost_usd: 0.01,
      revenue_type: 'AUDIT_TEST',
      customer_email: 'audit@test.gxeon',
      tier: 'TEST',
      metadata: { test: true, audit: true }
    };
    
    try {
      const { error: writeError } = await supabase
        .from('GX_Billing_Ledger')
        .insert(testEvent);
      
      if (writeError) {
        if (writeError.message?.includes('does not exist')) {
          log.fail('GX_Billing_Ledger: Tabela NÃO existe');
          log.info('Execute migration para criar tabela');
        } else {
          log.fail(`Write error: ${writeError.message}`);
        }
      } else {
        results.writeTest = true;
        results.tableExists = true;
        log.pass('GX_Billing_Ledger: Write test OK');
        
        // Try to read it back
        const { data, error: readError } = await supabase
          .from('GX_Billing_Ledger')
          .select('*')
          .eq('execution_id', testEvent.execution_id)
          .single();
        
        if (readError) {
          log.warn(`Read error: ${readError.message}`);
        } else if (data) {
          results.readTest = true;
          log.pass('GX_Billing_Ledger: Read test OK');
          
          // Clean up test data
          await supabase.from('GX_Billing_Ledger').delete().eq('execution_id', testEvent.execution_id);
          log.info('Test data cleaned up');
        }
      }
    } catch (error) {
      log.fail(`Ledger test error: ${error.message}`);
    }
    
  } catch (error) {
    log.fail(`Supabase error: ${error.message}`);
  }
  
  // Determine status
  if (results.writeTest && results.readTest) {
    results.status = 'PASS';
  } else if (results.writeTest) {
    results.status = 'PARTIAL';
    auditResults.warnings.push('Ledger write OK, read falhou');
  } else {
    results.status = 'FAIL';
    auditResults.criticalIssues.push('GX_Billing_Ledger não funcional');
  }
  
  auditResults.steps.ledgerTest = results;
  return results.status;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 7: PUBLIC_ENDPOINT_EXPOSURE
// ═══════════════════════════════════════════════════════════════════════════
async function step7_publicExposure() {
  log.step(7, 'PUBLIC_ENDPOINT_EXPOSURE - Verificando acesso externo');
  
  const results = {
    status: 'WARNING',
    hasPublicUrl: false,
    publicUrl: null,
    reachable: false,
    hosting: null
  };
  
  // Check for Railway, Render, or other hosting
  const publicUrl = process.env.PUBLIC_API_URL || 
                   process.env.RAILWAY_STATIC_URL ||
                   process.env.RAILWAY_PUBLIC_DOMAIN ||
                   process.env.RENDER_EXTERNAL_URL;
  
  if (publicUrl) {
    results.hasPublicUrl = true;
    results.publicUrl = publicUrl;
    log.pass(`URL pública: ${publicUrl}`);
    
    // Try to reach it
    try {
      const response = await axios.get(`${publicUrl}/v1/signals/health`, {
        timeout: AUDIT_CONFIG.TIMEOUT_MS * 2
      });
      
      if (response.status === 200) {
        results.reachable = true;
        log.pass('Endpoint público ACESSÍVEL');
        results.status = 'PASS';
      }
    } catch (error) {
      log.warn(`URL pública não responde: ${error.message}`);
      log.info('API local funciona mas não está exposta publicamente');
      results.status = 'WARNING';
      auditResults.warnings.push('API não exposta publicamente');
    }
  } else {
    log.warn('URL pública NÃO configurada');
    log.info('Variáveis para configurar:');
    log.info('  - PUBLIC_API_URL');
    log.info('  - RAILWAY_STATIC_URL');
    log.info('  - RENDER_EXTERNAL_URL');
    
    results.status = 'WARNING';
    auditResults.warnings.push('API apenas local - não pronta para tráfego externo');
  }
  
  auditResults.steps.publicExposure = results;
  return results.status;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 8: FAIL_SAFE_VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
async function step8_failSafe() {
  log.step(8, 'FAIL_SAFE_VALIDATION - Testando bloqueio sem API key');
  
  const results = {
    status: 'FAIL',
    blocksWithoutKey: false,
    returns401: false,
    blocksInvalidKey: false
  };
  
  try {
    // Test without API key
    try {
      await axios.get(`${AUDIT_CONFIG.LOCAL_API_URL}/v1/signals`, {
        timeout: AUDIT_CONFIG.TIMEOUT_MS
      });
      log.fail('API NÃO bloqueia sem API key');
      results.status = 'FAIL';
      auditResults.criticalIssues.push('API vulnerável - não requer autenticação');
    } catch (error) {
      if (error.response?.status === 401) {
        results.blocksWithoutKey = true;
        results.returns401 = true;
        log.pass('API bloqueia sem API key (401)');
      } else {
        log.warn(`Resposta inesperada: ${error.response?.status}`);
      }
    }
    
    // Test with invalid API key
    try {
      await axios.get(`${AUDIT_CONFIG.LOCAL_API_URL}/v1/signals`, {
        headers: { 'X-API-Key': 'invalid_key_12345' },
        timeout: AUDIT_CONFIG.TIMEOUT_MS
      });
      log.fail('API NÃO bloqueia com key inválida');
    } catch (error) {
      if (error.response?.status === 401) {
        results.blocksInvalidKey = true;
        log.pass('API bloqueia com key inválida (401)');
      }
    }
    
    // Determine status
    if (results.blocksWithoutKey && results.blocksInvalidKey) {
      results.status = 'PASS';
    } else if (results.blocksWithoutKey) {
      results.status = 'PARTIAL';
    } else {
      results.status = 'FAIL';
      auditResults.criticalIssues.push('Falha na autenticação - CRÍTICO');
    }
    
  } catch (error) {
    log.fail(`Test error: ${error.message}`);
    results.status = 'FAIL';
  }
  
  auditResults.steps.failSafe = results;
  return results.status;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP 9: REPORT_GENERATION
// ═══════════════════════════════════════════════════════════════════════════
async function step9_reportGeneration() {
  log.step(9, 'REPORT_GENERATION - Gerando relatório final');
  
  // Calculate overall status
  const stepStatuses = Object.values(auditResults.steps).map(s => s.status);
  
  const criticalFails = stepStatuses.filter(s => s === 'FAIL').length;
  const warnings = stepStatuses.filter(s => s === 'WARNING').length;
  const passes = stepStatuses.filter(s => s === 'PASS').length;
  
  if (criticalFails > 0) {
    auditResults.overallStatus = 'BLOCKED';
  } else if (warnings > 0) {
    auditResults.overallStatus = 'PARTIAL';
  } else {
    auditResults.overallStatus = 'READY';
  }
  
  log.divider();
  log.info('RESUMO DOS TESTES:');
  log.data('PASS', passes);
  log.data('WARNING', warnings);
  log.data('FAIL', criticalFails);
  log.divider();
  
  // Generate recommendations
  if (auditResults.criticalIssues.length > 0) {
    auditResults.recommendations.push('🔴 RESOLVER CRÍTICOS ANTES DE PRODUÇÃO:');
    auditResults.criticalIssues.forEach(issue => {
      auditResults.recommendations.push(`   - ${issue}`);
    });
  }
  
  if (auditResults.warnings.length > 0) {
    auditResults.recommendations.push('🟡 RECOMENDAÇÕES:');
    auditResults.warnings.forEach(warning => {
      auditResults.recommendations.push(`   - ${warning}`);
    });
  }
  
  if (auditResults.overallStatus === 'READY') {
    auditResults.recommendations.push('🟢 Sistema pronto para tráfego real');
  }
  
  // Save report
  const reportPath = path.join(process.cwd(), 'logs', `production_readiness_audit_${Date.now()}.json`);
  
  if (!fs.existsSync(path.dirname(reportPath))) {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
  log.pass(`Relatório salvo: ${reportPath}`);
  
  return auditResults.overallStatus;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  log.header();
  
  const steps = [
    step1_gatewayOnline,
    step2_apiValidation,
    step3_scannerLiveness,
    step4_signalFlow,
    step5_telegramTest,
    step6_ledgerTest,
    step7_publicExposure,
    step8_failSafe,
    step9_reportGeneration
  ];
  
  for (const step of steps) {
    await step();
  }
  
  // Final output
  log.divider();
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║              🎯 RESULTADO FINAL DO AUDIT                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const status = auditResults.overallStatus;
  const statusEmoji = status === 'READY' ? '🟢' : status === 'PARTIAL' ? '🟡' : '🔴';
  
  console.log(`  ${statusEmoji} STATUS: ${status}`);
  console.log('');
  
  if (auditResults.criticalIssues.length > 0) {
    console.log('❌ PROBLEMAS CRÍTICOS:');
    auditResults.criticalIssues.forEach(issue => {
      console.log(`   • ${issue}`);
    });
    console.log('');
  }
  
  if (auditResults.warnings.length > 0) {
    console.log('⚠️  AVISOS:');
    auditResults.warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
    console.log('');
  }
  
  console.log('📋 RECOMENDAÇÕES:');
  auditResults.recommendations.forEach(rec => {
    console.log(`   ${rec}`);
  });
  
  console.log('');
  console.log(`💎 Treasury: ${AUDIT_CONFIG.TREASURY}`);
  console.log(`📄 Report: logs/production_readiness_audit_*.json`);
  console.log('');
  
  process.exit(status === 'READY' ? 0 : (status === 'PARTIAL' ? 0 : 1));
}

main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
