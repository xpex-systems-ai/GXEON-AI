#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GRAFANA CONNECT SETUP v10.1
 * Script de configuração automática da conexão Grafana + Supabase
 * 
 * Uso: node scripts/grafana_connect_setup.js
 * 
 * Autorizado por: Comandante Júnior Sena
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔌 GRAFANA CONNECT SETUP v10.1');
console.log('Configuração automática da conexão completa');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES UTILITÁRIAS
// ═══════════════════════════════════════════════════════════════════════════

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function logStep(step, total, message) {
  console.log(`[${step}/${total}] ${message}`);
}

function logSuccess(message) {
  console.log(`   ✅ ${message}`);
}

function logError(message) {
  console.log(`   ❌ ${message}`);
}

function logWarning(message) {
  console.log(`   ⚠️  ${message}`);
}

function logInfo(message) {
  console.log(`   ℹ️  ${message}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSO 1: VERIFICAR PRÉ-REQUISITOS
// ═══════════════════════════════════════════════════════════════════════════
async function checkPrerequisites() {
  logStep(1, 7, 'Verificando pré-requisitos...');
  
  const checks = {
    node: false,
    npm: false,
    psql: false,
    alloy: false
  };
  
  // Verificar Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    checks.node = true;
    logSuccess(`Node.js ${nodeVersion}`);
  } catch {
    logError('Node.js não encontrado. Instale: https://nodejs.org');
  }
  
  // Verificar psql (PostgreSQL client)
  try {
    execSync('psql --version', { encoding: 'utf8' });
    checks.psql = true;
    logSuccess('PostgreSQL client (psql)');
  } catch {
    logWarning('psql não encontrado. Opcional para testes.');
    logInfo('Windows: https://www.postgresql.org/download/windows/');
    logInfo('Linux: sudo apt-get install postgresql-client');
  }
  
  // Verificar Grafana Alloy
  try {
    execSync('alloy --version', { encoding: 'utf8' });
    checks.alloy = true;
    logSuccess('Grafana Alloy');
  } catch {
    logWarning('Grafana Alloy não encontrado.');
    logInfo('Instalação: https://grafana.com/docs/alloy/latest/set-up/install/');
    logInfo('Windows: choco install grafana-alloy');
    logInfo('Linux: sudo apt-get install grafana-alloy');
  }
  
  return checks;
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSO 2: CONFIGURAR VARIÁVEIS DE AMBIENTE
// ═══════════════════════════════════════════════════════════════════════════
async function setupEnvironment() {
  logStep(2, 7, 'Configurando variáveis de ambiente...');
  
  const envPath = path.join(process.cwd(), 'grafana', '.env');
  const envExamplePath = path.join(process.cwd(), 'grafana', '.env.example');
  
  // Verificar se .env já existe
  if (fs.existsSync(envPath)) {
    const overwrite = await question('Arquivo .env já existe. Sobrescrever? (s/N): ');
    if (overwrite.toLowerCase() !== 's') {
      logInfo('Usando .env existente');
      return true;
    }
  }
  
  // Copiar template
  if (!fs.existsSync(envExamplePath)) {
    logError('Template .env.example não encontrado');
    return false;
  }
  
  console.log('\n📝 Preencha as credenciais do Grafana Cloud:');
  console.log('   (Obtenha em: https://grafana.com/login → My Account → Your Stack)');
  console.log('');
  
  const grafanaUrl = await question('Grafana Prometheus URL (ex: https://prometheus-prod-...grafana.net/api/prom/push): ');
  const grafanaUser = await question('Grafana User ID: ');
  const grafanaKey = await question('Grafana API Key: ');
  const lokiUrl = await question('Grafana Loki URL (ex: https://logs-prod-...grafana.net/loki/api/v1/push): ');
  
  console.log('\n📝 Preencha as credenciais do Supabase:');
  console.log('   (Obtenha em: https://supabase.com/dashboard/project/telxvphgrsvsnxvmjkce/settings/database)');
  console.log('');
  
  const supabasePassword = await question('Supabase Database Password: ');
  
  // Ler template
  let envContent = fs.readFileSync(envExamplePath, 'utf8');
  
  // Substituir valores
  envContent = envContent.replace(
    'GRAFANA_REMOTE_WRITE_URL=https://prometheus-prod-SEU-REGION.grafana.net/api/prom/push',
    `GRAFANA_REMOTE_WRITE_URL=${grafanaUrl}`
  );
  envContent = envContent.replace(
    'GRAFANA_REMOTE_WRITE_USERNAME=123456',
    `GRAFANA_REMOTE_WRITE_USERNAME=${grrafanaUser}`
  );
  envContent = envContent.replace(
    'GRAFANA_API_KEY=glsa_SUA_CHAVE_AQUI_XXXXXXXXXXXXXXXXXXXXXXXX',
    `GRAFANA_API_KEY=${grafanaKey}`
  );
  envContent = envContent.replace(
    'GRAFANA_LOKI_URL=https://logs-prod-SEU-REGION.grafana.net/loki/api/v1/push',
    `GRAFANA_LOKI_URL=${lokiUrl}`
  );
  envContent = envContent.replace(
    /SUPABASE_DB_PASSWORD=sua_senha_aqui/g,
    `SUPABASE_DB_PASSWORD=${supabasePassword}`
  );
  
  // Salvar
  fs.writeFileSync(envPath, envContent);
  logSuccess(`Arquivo .env criado em: ${envPath}`);
  logWarning('⚠️  NUNCA commite este arquivo!');
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSO 3: TESTAR CONEXÃO SUPABASE
// ═══════════════════════════════════════════════════════════════════════════
async function testSupabaseConnection() {
  logStep(3, 7, 'Testando conexão Supabase...');
  
  const envPath = path.join(process.cwd(), 'grafana', '.env');
  if (!fs.existsSync(envPath)) {
    logError('Arquivo .env não encontrado');
    return false;
  }
  
  // Carregar .env
  const envContent = fs.readFileSync(envPath, 'utf8');
  const password = envContent.match(/SUPABASE_DB_PASSWORD=(.+)/)?.[1];
  
  if (!password) {
    logError('Senha do Supabase não encontrada no .env');
    return false;
  }
  
  // Testar conexão com Supabase JS
  const supabaseUrl = `https://telxvphgrsvsnxvmjkce.supabase.co`;
  const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1] || 'dummy';
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    
    const { data, error } = await supabase
      .from('grafana_financial_master')
      .select('*')
      .limit(1);
    
    if (error) {
      logError(`Erro na conexão: ${error.message}`);
      logInfo('Verifique se o script SQL foi executado no Supabase');
      return false;
    }
    
    logSuccess('Conexão Supabase OK');
    logInfo(`Dados encontrados: ${data ? 'SIM' : 'NÃO'}`);
    return true;
  } catch (error) {
    logError(`Erro crítico: ${error.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSO 4: CRIAR DATA SOURCE NO GRAFANA (se possível via API)
// ═══════════════════════════════════════════════════════════════════════════
async function createGrafanaDataSource() {
  logStep(4, 7, 'Criando Data Source no Grafana (manual)...');
  
  logInfo('Acesse seu Grafana Cloud:');
  logInfo('1. https://SEU-STACK.grafana.net');
  logInfo('2. Configuration → Data Sources');
  logInfo('3. Add Data Source → PostgreSQL');
  logInfo('');
  logInfo('Configure com:');
  logInfo('  Host: db.telxvphgrsvsnxvmjkce.supabase.co:5432');
  logInfo('  Database: postgres');
  logInfo('  User: postgres');
  logInfo('  Password: [sua senha do .env]');
  logInfo('  SSL Mode: require');
  logInfo('');
  
  const done = await question('Data Source criado? (S/n): ');
  return done.toLowerCase() !== 'n';
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSO 5: CONFIGURAR GRAFANA ALLOY
// ═══════════════════════════════════════════════════════════════════════════
async function configureAlloy() {
  logStep(5, 7, 'Verificando configuração do Grafana Alloy...');
  
  const configPath = path.join(process.cwd(), 'grafana', 'config', 'alloy-config.river');
  
  if (!fs.existsSync(configPath)) {
    logError(`Configuração não encontrada: ${configPath}`);
    logInfo('Execute primeiro: npm run grafana:fix');
    return false;
  }
  
  logSuccess('Configuração Alloy encontrada');
  logInfo('Para iniciar o Alloy:');
  logInfo('  alloy run grafana/config/alloy-config.river');
  
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSO 6: VERIFICAR DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
async function verifyDashboard() {
  logStep(6, 7, 'Verificando Dashboard...');
  
  // Testar queries principais
  const envPath = path.join(process.cwd(), 'grafana', '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1];
  
  if (!supabaseKey) {
    logWarning('SUPABASE_SERVICE_ROLE_KEY não encontrada');
    logInfo('Usando modo de teste...');
    return true;
  }
  
  const supabase = createClient('https://telxvphgrsvsnxvmjkce.supabase.co', supabaseKey, {
    auth: { persistSession: false }
  });
  
  const views = [
    'grafana_financial_master',
    'grafana_swarm_matrix',
    'grafana_profit_realtime',
    'grafana_agent_status'
  ];
  
  let allOk = true;
  
  for (const view of views) {
    try {
      const { data, error } = await supabase.from(view).select('*').limit(1);
      if (error) {
        logError(`${view}: ${error.message}`);
        allOk = false;
      } else {
        logSuccess(`${view}: OK (${data?.length || 0} rows)`);
      }
    } catch (error) {
      logError(`${view}: ${error.message}`);
      allOk = false;
    }
  }
  
  return allOk;
}

// ═══════════════════════════════════════════════════════════════════════════
// PASSO 7: RESUMO E PRÓXIMOS PASSOS
// ═══════════════════════════════════════════════════════════════════════════
async function showSummary() {
  logStep(7, 7, 'Resumo da configuração...');
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 STATUS DA CONEXÃO');
  console.log('═══════════════════════════════════════════════════════════════');
  
  console.log('');
  console.log('🎯 PRÓXIMOS PASSOS:');
  console.log('');
  console.log('1. INICIAR GRAFANA ALLOY:');
  console.log('   alloy run grafana/config/alloy-config.river');
  console.log('');
  console.log('2. OU USE CONEXÃO DIRETA (mais simples):');
  console.log('   - Grafana → Data Sources → Add PostgreSQL');
  console.log('   - Host: db.telxvphgrsvsnxvmjkce.supabase.co:5432');
  console.log('   - SSL: require');
  console.log('');
  console.log('3. VERIFICAR NO GRAFANA:');
  console.log('   - Explore → Metrics: procure gxeon_*');
  console.log('   - Se aparecer, CONEXÃO OK!');
  console.log('');
  console.log('4. IMPORTAR DASHBOARD:');
  console.log('   - Dashboards → Import');
  console.log('   - Cole o JSON do Master Dashboard');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  
  console.log('');
  console.log('💡 COMANDOS ÚTEIS:');
  console.log('  npm run grafana:fix       # Corrigir dados');
  console.log('  npm run fleet:production  # Iniciar frota');
  console.log('  npm run fleet:status      # Ver status');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  try {
    // Passos
    const prerequisites = await checkPrerequisites();
    
    if (!prerequisites.node) {
      console.log('');
      logError('Node.js é obrigatório. Instale antes de continuar.');
      process.exit(1);
    }
    
    await sleep(500);
    const envOk = await setupEnvironment();
    
    if (!envOk) {
      logError('Falha ao configurar .env');
      process.exit(1);
    }
    
    await sleep(500);
    const connectionOk = await testSupabaseConnection();
    
    await sleep(500);
    await createGrafanaDataSource();
    
    await sleep(500);
    await configureAlloy();
    
    await sleep(500);
    const dashboardOk = await verifyDashboard();
    
    await sleep(500);
    await showSummary();
    
    console.log('');
    if (connectionOk && dashboardOk) {
      console.log('✅ CONEXÃO CONFIGURADA COM SUCESSO!');
      console.log('🚀 Pronto para ativar a Ferrari Financeira.');
    } else {
      console.log('⚠️  Verifique os erros acima antes de continuar.');
    }
    
    rl.close();
  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    rl.close();
    process.exit(1);
  }
}

main();
