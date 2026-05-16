#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON DASHBOARD DEPLOY - Direct API Injection v12
 * Bypass do Assistente - Comunicação direta com Grafana Cloud API
 * 
 * Autorizado por: General Júnior Sena
 * Target: https://gxeonai.grafana.net
 * Token: (set via GRAFANA_CLOUD_TOKEN env var)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DO DEPLOY
// ═══════════════════════════════════════════════════════════════════════════
const DEPLOY_CONFIG = {
  // Grafana Cloud
  GRAFANA_URL: 'https://gxeonai.grafana.net',
  GRAFANA_TOKEN: process.env.GRAFANA_CLOUD_TOKEN || '',
  
  // Arquivos
  DASHBOARD_JSON_PATH: path.join(process.cwd(), 'grafana', 'gxeon-apex-v12.json'),
  
  // Data Source
  DATASOURCE_NAME: 'GXeon-Sovereign-Pooler',
  DATASOURCE_CONFIG: {
    name: 'GXeon-Sovereign-Pooler',
    type: 'postgres',
    url: 'aws-0-sa-east-1.pooler.supabase.com:6543',
    database: 'postgres',
    user: 'postgres',
    secureJsonData: {
      password: process.env.SUPABASE_DB_PASSWORD || ''
    },
    jsonData: {
      sslmode: 'require',
      maxOpenConns: 10,
      maxIdleConns: 5,
      connMaxLifetime: 14400
    },
    access: 'proxy',
    isDefault: false
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// LOGGER
// ═══════════════════════════════════════════════════════════════════════════
const log = {
  crown: (msg) => console.log(`\n👑 [DEPLOY] ${msg}`),
  api: (msg) => console.log(`📡 [API] ${msg}`),
  success: (msg) => console.log(`✅ [OK] ${msg}`),
  error: (msg) => console.error(`❌ [FAIL] ${msg}`),
  warn: (msg) => console.log(`⚠️  [WARN] ${msg}`),
  data: (msg) => console.log(`📊 [DATA] ${msg}`)
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════
function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${DEPLOY_CONFIG.GRAFANA_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASSE: GrafanaDeployer
// ═══════════════════════════════════════════════════════════════════════════
class GrafanaDeployer {
  constructor() {
    this.stats = {
      datasourceCreated: false,
      dashboardCreated: false,
      errors: []
    };
  }

  async testConnection() {
    log.crown('Testando conexão com Grafana Cloud...');
    try {
      const response = await axios.get(`${DEPLOY_CONFIG.GRAFANA_URL}/api/health`, {
        headers: getAuthHeaders(),
        timeout: 10000
      });
      log.success(`Grafana Online - Version: ${response.data.version || 'unknown'}`);
      return true;
    } catch (error) {
      if (error.response && error.response.status === 401) {
        log.error('Token inválido! Verifique seu GRAFANA_CLOUD_TOKEN');
      } else {
        log.error(`Erro de conexão: ${error.message}`);
      }
      return false;
    }
  }

  async createOrUpdateDataSource() {
    log.crown('Configurando Data Source PostgreSQL (Pooler)...');
    
    // Verificar se já existe
    try {
      const listRes = await axios.get(`${DEPLOY_CONFIG.GRAFANA_URL}/api/datasources`, {
        headers: getAuthHeaders()
      });
      
      const existing = listRes.data.find(ds => ds.name === DEPLOY_CONFIG.DATASOURCE_NAME);
      
      if (existing) {
        log.success(`Data Source já existe (ID: ${existing.uid})`);
        this.stats.datasourceCreated = true;
        return existing.uid;
      }
    } catch (error) {
      log.warn(`Não foi possível listar datasources: ${error.message}`);
    }

    // Criar novo Data Source
    try {
      // Perguntar senha se não estiver definida
      if (!DEPLOY_CONFIG.DATASOURCE_CONFIG.secureJsonData.password) {
        log.warn('Senha do banco não configurada!');
        log.warn('Defina: $env:SUPABASE_DB_PASSWORD="sua_senha" antes de executar');
        log.warn('Ou o Data Source será criado sem senha (você precisará configurar manualmente)');
      }

      const response = await axios.post(
        `${DEPLOY_CONFIG.GRAFANA_URL}/api/datasources`,
        DEPLOY_CONFIG.DATASOURCE_CONFIG,
        { headers: getAuthHeaders() }
      );
      
      log.success(`Data Source criado (ID: ${response.data.datasource.uid})`);
      this.stats.datasourceCreated = true;
      return response.data.datasource.uid;
      
    } catch (error) {
      log.error(`Falha ao criar Data Source: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(`Resposta: ${JSON.stringify(error.response.data)}`);
      }
      this.stats.errors.push({ step: 'datasource', error: error.message });
      return null;
    }
  }

  async deployDashboard() {
    log.crown('Injetando Dashboard via API...');
    
    // Ler o JSON do dashboard
    if (!fs.existsSync(DEPLOY_CONFIG.DASHBOARD_JSON_PATH)) {
      log.error(`Arquivo não encontrado: ${DEPLOY_CONFIG.DASHBOARD_JSON_PATH}`);
      return false;
    }

    const dashboardJson = JSON.parse(fs.readFileSync(DEPLOY_CONFIG.DASHBOARD_JSON_PATH, 'utf8'));
    
    // Atualizar o uid do datasource nos painéis
    const dsUid = await this.createOrUpdateDataSource();
    if (dsUid) {
      dashboardJson.dashboard.panels.forEach(panel => {
        panel.targets.forEach(target => {
          if (target.datasource) {
            target.datasource.uid = dsUid;
          }
        });
      });
    }

    log.data(`Dashboard: ${dashboardJson.dashboard.title}`);
    log.data(`Panels: ${dashboardJson.dashboard.panels.length}`);
    log.data(`UID: ${dashboardJson.dashboard.uid}`);

    try {
      const response = await axios.post(
        `${DEPLOY_CONFIG.GRAFANA_URL}/api/dashboards/db`,
        dashboardJson,
        { 
          headers: getAuthHeaders(),
          timeout: 30000
        }
      );

      if (response.data && response.data.uid) {
        log.success('═══════════════════════════════════════════════════');
        log.success('DASHBOARD DEPLOYADO COM SUCESSO!');
        log.success('═══════════════════════════════════════════════════');
        log.success(`UID: ${response.data.uid}`);
        log.success(`Version: ${response.data.version}`);
        log.success(`URL: ${DEPLOY_CONFIG.GRAFANA_URL}/d/${response.data.uid}`);
        log.success('═══════════════════════════════════════════════════');
        this.stats.dashboardCreated = true;
        return true;
      }
    } catch (error) {
      log.error(`Falha no deploy: ${error.message}`);
      if (error.response) {
        log.error(`Status: ${error.response.status}`);
        log.error(`Resposta: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      this.stats.errors.push({ step: 'dashboard', error: error.message });
      return false;
    }
  }

  async manualDeployInstructions() {
    log.crown('═══════════════════════════════════════════════════');
    log.crown('INSTRUÇÕES PARA DEPLOY MANUAL (se API falhar)');
    log.crown('═══════════════════════════════════════════════════');
    console.log('');
    console.log('1. Acesse seu Grafana Cloud:');
    console.log(`   ${DEPLOY_CONFIG.GRAFANA_URL}`);
    console.log('');
    console.log('2. Configure Data Source:');
    console.log('   ⚙️ Configuration → Data Sources → Add PostgreSQL');
    console.log('   Name: GXeon-Sovereign-Pooler');
    console.log('   Host: aws-0-sa-east-1.pooler.supabase.com:6543');
    console.log('   Database: postgres');
    console.log('   User: postgres');
    console.log('   Password: [sua senha]');
    console.log('   SSL Mode: require');
    console.log('');
    console.log('3. Importe o Dashboard:');
    console.log('   + Create → Import → Upload JSON file');
    console.log(`   Arquivo: ${DEPLOY_CONFIG.DASHBOARD_JSON_PATH}`);
    console.log('');
    console.log('═══════════════════════════════════════════════════');
  }

  getStatus() {
    return {
      url: DEPLOY_CONFIG.GRAFANA_URL,
      stats: this.stats,
      dashboardUrl: this.stats.dashboardCreated ? 
        `${DEPLOY_CONFIG.GRAFANA_URL}/d/gxeon-apex-v12` : null,
      status: this.stats.dashboardCreated ? 'DEPLOYED' : 'FAILED'
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║     GXEON DASHBOARD DEPLOY - Direct API Injection v12           ║');
  console.log('║              Bypass do Assistente IA                            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  const deployer = new GrafanaDeployer();

  // Testar conexão
  const connected = await deployer.testConnection();
  if (!connected) {
    log.error('Não foi possível conectar ao Grafana');
    await deployer.manualDeployInstructions();
    process.exit(1);
  }

  // Deploy
  const success = await deployer.deployDashboard();

  // Status final
  console.log('');
  log.crown('═══════════════════════════════════════════════════');
  log.crown('RELATÓRIO FINAL');
  log.crown('═══════════════════════════════════════════════════');
  console.log(JSON.stringify(deployer.getStatus(), null, 2));
  console.log('');

  if (success) {
    console.log('');
    console.log('🏎️  FERRARI EDITION v12 - ONLINE! 🏎️');
    console.log('');
    console.log(`🌐 Acesse: ${DEPLOY_CONFIG.GRAFANA_URL}/d/gxeon-apex-v12`);
    console.log('');
  } else {
    await deployer.manualDeployInstructions();
    process.exit(1);
  }
}

main();
