#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON APEX-TITAN v12 - Dashboard Auto-Deployment via Grafana HTTP API
 * 
 * Sistema: GXEON_SOVEREIGN_CORE_V12
 * Mode: DIRECT_API_INJECTION
 * Autorizado por: General Júnior Sena
 * ═══════════════════════════════════════════════════════════════════════════
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════
// GXEON APEX-TITAN v12 CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const APEX_CONFIG = {
  // System Identity
  SYSTEM_APEX: "GXEON_SOVEREIGN_CORE_V12",
  DEPLOYMENT_MODE: "DIRECT_API_INJECTION",
  
  // Telemetry Link (Supabase Pooler)
  TELEMETRY: {
    source: "SUPABASE_POSTGRES_POOLER",
    endpoint: "aws-0-sa-east-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    user: "postgres",
    auth_protocol: "SERVICE_ROLE_BYPASS_RLS"
  },
  
  // Dashboard Manifest
  DASHBOARD: {
    uid: "gxeon-apex-001",
    title: "GXeon Sovereign Console - Ferrari Edition",
    refresh_rate: "5s",
    schema_version: 39,
    timezone: "America/Sao_Paulo",
    panels: [
      {
        id: 1,
        component: "MASTER_FINANCIAL_GAUGE",
        title: "TOTAL NET PROFIT (SOVEREIGN)",
        type: "stat",
        targets: [{
          rawSql: "SELECT timestamp AS \"time\", net_profit_24h AS \"value\" FROM grafana_financial_master ORDER BY 1 DESC LIMIT 1",
          format: "table"
        }],
        thresholds: {
          steps: [
            { color: "#FF4444", value: null },
            { color: "#FFD700", value: 100 },
            { color: "#00C853", value: 1000 }
          ]
        },
        gridPos: { h: 8, w: 12, x: 0, y: 0 },
        options: {
          colorMode: "background",
          graphMode: "area",
          justifyMode: "center"
        }
      },
      {
        id: 2,
        component: "SWARM_INTELLIGENCE_MATRIX",
        title: "AGENT COMBAT STATUS",
        type: "table",
        targets: [{
          rawSql: "SELECT agent_name, status_emoji, status, active_items, daily_value FROM grafana_swarm_matrix",
          format: "table"
        }],
        gridPos: { h: 8, w: 12, x: 12, y: 0 },
        options: {
          showHeader: true,
          sortBy: [{ displayName: "active_items", desc: true }]
        },
        fieldConfig: {
          overrides: [
            { matcher: { id: "byName", options: "status" }, properties: [{ id: "custom.displayMode", value: "color-background" }] }
          ]
        }
      },
      {
        id: 3,
        component: "LIQUIDITY_DIVERGENCE_RADAR",
        title: "REAL-TIME ARBITRAGE SCANNER",
        type: "heatmap",
        targets: [{
          rawSql: "SELECT pair, divergence_percent, alert_level FROM grafana_liquidity_divergence WHERE alert_level = 'HIGH'",
          format: "table"
        }],
        gridPos: { h: 8, w: 24, x: 0, y: 8 },
        options: {
          calculate: true,
          calculation: { xBuckets: { mode: "size", value: 10 } }
        }
      },
      {
        id: 4,
        component: "REVENUE_STREAM_CHART",
        title: "24H REVENUE FLOW",
        type: "timeseries",
        targets: [{
          rawSql: "SELECT timestamp AS \"time\", total_revenue_24h AS \"Revenue\", total_gas_24h AS \"Gas\" FROM grafana_financial_master",
          format: "time_series"
        }],
        gridPos: { h: 8, w: 12, x: 0, y: 16 }
      },
      {
        id: 5,
        component: "ROI_PRECISION_GAUGE",
        title: "ROI PERFORMANCE",
        type: "gauge",
        targets: [{
          rawSql: "SELECT roi_24h_pct AS \"ROI %\" FROM grafana_financial_master LIMIT 1",
          format: "table"
        }],
        gridPos: { h: 8, w: 12, x: 12, y: 16 },
        fieldConfig: {
          defaults: {
            min: 0,
            max: 100,
            thresholds: { steps: [{ color: "green", value: null }, { color: "yellow", value: 50 }, { color: "red", value: 80 }] }
          }
        }
      }
    ]
  },
  
  // AI Automation Layer
  AI_LAYER: {
    directive: "FORCE_BUILD_IF_NOT_EXISTS",
    sync_token: process.env.GRAFANA_CLOUD_TOKEN || "",
    error_handling: "AUTO_RECONNECT_ON_TIMEOUT",
    instance_id: process.env.GRAFANA_INSTANCE_ID || "auto-generated"
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// LOGGER APEX
// ═══════════════════════════════════════════════════════════════════════════
const apexLog = {
  crown: (msg) => console.log(`\n👑 [APEX-TITAN v12] ${msg}`),
  deploy: (msg) => console.log(`🚀 [DEPLOY] ${msg}`),
  api: (msg) => console.log(`📡 [API] ${msg}`),
  data: (msg) => console.log(`📊 [DATA] ${msg}`),
  success: (msg) => console.log(`✅ [SUCCESS] ${msg}`),
  error: (msg) => console.error(`❌ [ERROR] ${msg}`),
  hyper: (msg) => console.log(`⚡ [HYPER] ${msg}`)
};

// ═══════════════════════════════════════════════════════════════════════════
// CLASSE: GrafanaApexDeployer
// ═══════════════════════════════════════════════════════════════════════════
class GrafanaApexDeployer {
  constructor(config) {
    this.config = config;
    this.grafanaBaseUrl = `https://${config.AI_LAYER.instance_id}.grafana.net`;
    this.authHeaders = {
      'Authorization': `Bearer ${config.AI_LAYER.sync_token}`,
      'Content-Type': 'application/json'
    };
    this.deployStats = {
      dataSourceCreated: false,
      dashboardCreated: false,
      panelsDeployed: 0,
      errors: []
    };
  }

  async initialize() {
    apexLog.crown('═══════════════════════════════════════════════════════════════');
    apexLog.crown('GXEON APEX-TITAN v12 - SOVEREIGN CONSOLE DEPLOYMENT');
    apexLog.crown('═══════════════════════════════════════════════════════════════');
    apexLog.hyper(`System: ${this.config.SYSTEM_APEX}`);
    apexLog.hyper(`Mode: ${this.config.DEPLOYMENT_MODE}`);
    apexLog.hyper(`Target: ${this.grafanaBaseUrl}`);
    apexLog.hyper(`Telemetry: ${this.config.TELEMETRY.endpoint}:${this.config.TELEMETRY.port}`);
    console.log('');
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MÉTODO: Criar/Verificar Data Source PostgreSQL
  // ═══════════════════════════════════════════════════════════════════════
  async deployDataSource() {
    apexLog.deploy('Configurando Data Source PostgreSQL (Pooler)...');
    
    const dsConfig = {
      name: "GXeon-Sovereign-Pooler",
      type: "postgres",
      url: `${this.config.TELEMETRY.endpoint}:${this.config.TELEMETRY.port}`,
      database: this.config.TELEMETRY.database,
      user: this.config.TELEMETRY.user,
      secureJsonData: {
        password: process.env.SUPABASE_DB_PASSWORD || "[CONFIGURE_PASSWORD]"
      },
      jsonData: {
        sslmode: "require",
        maxOpenConns: 10,
        maxIdleConns: 5,
        connMaxLifetime: 14400
      },
      access: "proxy",
      isDefault: true
    };

    try {
      // Verificar se já existe
      const listRes = await axios.get(`${this.grafanaBaseUrl}/api/datasources`, {
        headers: this.authHeaders
      });
      
      const existing = listRes.data.find(ds => ds.name === dsConfig.name);
      
      if (existing) {
        apexLog.success(`Data Source já existe (ID: ${existing.id})`);
        this.deployStats.dataSourceCreated = true;
        return existing.id;
      }

      // Criar novo
      const createRes = await axios.post(`${this.grafanaBaseUrl}/api/datasources`, dsConfig, {
        headers: this.authHeaders
      });
      
      apexLog.success(`Data Source criado (ID: ${createRes.data.datasource.id})`);
      this.deployStats.dataSourceCreated = true;
      return createRes.data.datasource.id;
      
    } catch (error) {
      apexLog.error(`Falha no Data Source: ${error.message}`);
      if (error.response) {
        apexLog.error(`Detalhes: ${JSON.stringify(error.response.data)}`);
      }
      this.deployStats.errors.push({ step: 'datasource', error: error.message });
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MÉTODO: Construir Dashboard JSON
  // ═══════════════════════════════════════════════════════════════════════
  buildDashboardJson() {
    const db = this.config.DASHBOARD;
    
    return {
      dashboard: {
        id: null,
        uid: db.uid,
        title: db.title,
        tags: ["gxeon", "sovereign", "v12", "ferrari"],
        timezone: db.timezone,
        schemaVersion: db.schema_version,
        refresh: db.refresh_rate,
        time: { from: "now-6h", to: "now" },
        templating: {
          list: []
        },
        annotations: {
          list: []
        },
        panels: db.panels.map(panel => ({
          id: panel.id,
          title: panel.title,
          type: panel.type,
          targets: panel.targets.map((t, idx) => ({
            refId: String.fromCharCode(65 + idx),
            datasource: { type: "postgres", uid: "gxeon-pooler-ds" },
            rawSql: t.rawSql,
            format: t.format
          })),
          gridPos: panel.gridPos,
          options: panel.options || {},
          fieldConfig: panel.fieldConfig || { defaults: {}, overrides: [] },
          thresholds: panel.thresholds || null,
          transparent: false
        })),
        overwrite: true
      },
      overwrite: true,
      message: "Deployed by GXEON APEX-TITAN v12"
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MÉTODO: Deploy Dashboard via API
  // ═══════════════════════════════════════════════════════════════════════
  async deployDashboard() {
    apexLog.deploy('Injetando Dashboard Sovereign Console...');
    
    const dashboardJson = this.buildDashboardJson();
    
    // Salvar para debug
    const outputPath = path.join(process.cwd(), 'logs', `dashboard_apex_v12_${Date.now()}.json`);
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(dashboardJson, null, 2));
    apexLog.data(`Dashboard JSON salvo: ${outputPath}`);

    try {
      const response = await axios.post(`${this.grafanaBaseUrl}/api/dashboards/db`, dashboardJson, {
        headers: this.authHeaders,
        timeout: 30000
      });

      if (response.data && response.data.uid) {
        apexLog.success(`Dashboard deployed!`);
        apexLog.success(`UID: ${response.data.uid}`);
        apexLog.success(`URL: ${this.grafanaBaseUrl}/d/${response.data.uid}`);
        apexLog.success(`Version: ${response.data.version}`);
        this.deployStats.dashboardCreated = true;
        this.deployStats.panelsDeployed = dashboardJson.dashboard.panels.length;
        return response.data;
      }
    } catch (error) {
      apexLog.error(`Falha no deploy: ${error.message}`);
      if (error.response) {
        apexLog.error(`Status: ${error.response.status}`);
        apexLog.error(`Resposta: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      this.deployStats.errors.push({ step: 'dashboard', error: error.message });
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MÉTODO: Verificar Supabase Connection
  // ═══════════════════════════════════════════════════════════════════════
  async verifySupabaseConnection() {
    apexLog.api('Verificando conexão Supabase (Pooler)...');
    
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseKey) {
      apexLog.error('SUPABASE_SERVICE_ROLE_KEY não configurada');
      return false;
    }

    try {
      const supabase = createClient('https://telxvphgrsvsnxvmjkce.supabase.co', supabaseKey);
      const { data, error } = await supabase.from('grafana_financial_master').select('net_profit_24h').limit(1);
      
      if (error) {
        apexLog.error(`Supabase error: ${error.message}`);
        return false;
      }
      
      apexLog.success(`Supabase conectado! Profit: $${data[0]?.net_profit_24h || 'N/A'}`);
      return true;
    } catch (error) {
      apexLog.error(`Falha na verificação: ${error.message}`);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MÉTODO: Status Final
  // ═══════════════════════════════════════════════════════════════════════
  getStatus() {
    return {
      system: this.config.SYSTEM_APEX,
      deployment: this.config.DEPLOYMENT_MODE,
      stats: this.deployStats,
      url: this.deployStats.dashboardCreated ? `${this.grafanaBaseUrl}/d/${this.config.DASHBOARD.uid}` : null,
      status: this.deployStats.dashboardCreated && this.deployStats.dataSourceCreated ? 'OPERATIONAL' : 'PARTIAL'
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUÇÃO PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  const deployer = new GrafanaApexDeployer(APEX_CONFIG);
  
  try {
    await deployer.initialize();
    
    // Verificar Supabase
    const supabaseOk = await deployer.verifySupabaseConnection();
    if (!supabaseOk) {
      apexLog.error('Supabase não está pronto. Execute SQL primeiro!');
      console.log('');
      console.log('📍 Execute no Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/telxvphgrsvsnxvmjkce/sql-editor');
      console.log('   Cole: supabase/DASHBOARD_IGNITION_FIX.sql');
      console.log('');
    }
    
    // Deploy Data Source
    const dsId = await deployer.deployDataSource();
    
    // Deploy Dashboard
    const dashboard = await deployer.deployDashboard();
    
    // Status Final
    console.log('');
    apexLog.crown('═══════════════════════════════════════════════════════════════');
    apexLog.crown('RELATÓRIO DE DEPLOYMENT APEX-TITAN v12');
    apexLog.crown('═══════════════════════════════════════════════════════════════');
    const status = deployer.getStatus();
    console.log(JSON.stringify(status, null, 2));
    console.log('');
    
    if (status.status === 'OPERATIONAL') {
      apexLog.crown('✅ DASHBOARD SOVEREIGN CONSOLE OPERACIONAL!');
      apexLog.crown(`🌐 Acesse: ${status.url}`);
      apexLog.crown('🏎️ Ferrari Edition - Quinta Geração Ativada!');
    } else {
      apexLog.error('⚠️ Deployment parcial. Verifique erros acima.');
    }
    
  } catch (error) {
    apexLog.error(`Falha crítica: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main();
