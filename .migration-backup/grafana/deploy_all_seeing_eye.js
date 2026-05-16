/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON ALL-SEEING EYE — GRAFANA DEPLOY
 * Injeta dashboard via API com configuração automática
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

// Config
const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3001';
const GRAFANA_API_KEY = process.env.GRAFANA_API_KEY;
const DASHBOARD_JSON_PATH = './gxeon-monetization-all-seeing-eye-v1.json';

async function deployDashboard() {
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('👁️ GXEON ALL-SEEING EYE — Grafana Deploy');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    
    if (!GRAFANA_API_KEY) {
        console.log('❌ GRAFANA_API_KEY não definido no .env');
        console.log('   Obtenha em: Grafana → Configuration → API Keys → New API Key');
        console.log('   Permissões necessárias: Editor ou Admin');
        process.exit(1);
    }
    
    try {
        // Ler dashboard JSON
        console.log('📂 Carregando dashboard JSON...');
        const dashboardJson = await fs.readFile(DASHBOARD_JSON_PATH, 'utf8');
        const dashboard = JSON.parse(dashboardJson);
        
        console.log(`   Dashboard: ${dashboard.dashboard.title}`);
        console.log(`   UID: ${dashboard.dashboard.uid}`);
        console.log(`   Panels: ${dashboard.dashboard.panels.length}`);
        console.log('');
        
        // Preparar payload
        const payload = {
            dashboard: dashboard.dashboard,
            overwrite: true,
            message: 'Deployed by GXEON All-Seeing Eye v1.0'
        };
        
        // Deploy via API
        console.log('🚀 Enviando para Grafana...');
        const response = await fetch(`${GRAFANA_URL}/api/dashboards/db`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GRAFANA_API_KEY}`
            },
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Dashboard deployed com sucesso!');
            console.log(`   ID: ${result.id}`);
            console.log(`   UID: ${result.uid}`);
            console.log(`   URL: ${GRAFANA_URL}${result.url}`);
            console.log('');
            console.log('🎯 Dashboard ativo em:');
            console.log(`   ${GRAFANA_URL}/d/${result.uid}`);
            
            // Verificar datasource
            await verifyDatasource();
            
        } else {
            console.log('❌ Erro no deploy:', result.message);
            if (result.message?.includes('dashboard with the same uid exists')) {
                console.log('   ℹ️ Dashboard já existe. Atualizando...');
            }
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
        if (error.message.includes('fetch failed')) {
            console.log('   💡 Verifique se Grafana está rodando em:', GRAFANA_URL);
        }
        process.exit(1);
    }
}

async function verifyDatasource() {
    console.log('');
    console.log('🔌 Verificando datasource...');
    
    try {
        const response = await fetch(`${GRAFANA_URL}/api/datasources`, {
            headers: {
                'Authorization': `Bearer ${GRAFANA_API_KEY}`
            }
        });
        
        const datasources = await response.json();
        const postgresDs = datasources.find(ds => ds.type === 'postgres' || ds.type === 'grafana-postgresql-datasource');
        
        if (postgresDs) {
            console.log(`   ✅ PostgreSQL datasource: ${postgresDs.name}`);
            console.log(`      UID: ${postgresDs.uid}`);
            
            if (postgresDs.uid !== 'gxeon-pooler') {
                console.log('   ⚠️  UID diferente do esperado (gxeon-pooler)');
                console.log('      Atualize o dashboard JSON com o UID correto');
            }
        } else {
            console.log('   ❌ Datasource PostgreSQL não encontrado');
            console.log('   📖 Adicione em: Configuration → Data Sources → Add data source');
        }
        
    } catch (error) {
        console.log('   ⚠️  Não foi possível verificar datasources');
    }
}

async function setupAlerts() {
    console.log('');
    console.log('🚨 Configurando alertas...');
    
    const alertRules = [
        {
            title: 'Profit Threshold Reached',
            condition: 'B',
            query: {
                refId: 'A',
                queryType: '',
                relativeTimeRange: { from: 300, to: 0 },
                datasourceUid: 'gxeon-pooler',
                model: {
                    rawSql: 'SELECT net_profit_24h FROM grafana_financial_master ORDER BY timestamp DESC LIMIT 1',
                    refId: 'A'
                }
            },
            threshold: 1000,
            message: '💰 Lucro de R$ 1000+ atingido! Notificar General Sena.'
        },
        {
            title: 'Performance Degradation',
            condition: 'B',
            query: {
                refId: 'A',
                datasourceUid: 'gxeon-pooler',
                model: {
                    rawSql: 'SELECT api_latency_ms FROM grafana_health_metrics ORDER BY timestamp DESC LIMIT 1',
                    refId: 'A'
                }
            },
            threshold: 500,
            message: '⚠️ Latência alta detectada. Trigger Phoenix Protocol.'
        },
        {
            title: 'High Resource Usage',
            condition: 'B',
            query: {
                refId: 'A',
                datasourceUid: 'gxeon-pooler',
                model: {
                    rawSql: 'SELECT GREATEST(cpu_usage_pct, ram_usage_pct) as max_usage FROM grafana_health_metrics ORDER BY timestamp DESC LIMIT 1',
                    refId: 'A'
                }
            },
            threshold: 90,
            message: '🚨 CPU/RAM acima de 90%. Verificar infraestrutura.'
        }
    ];
    
    for (const alert of alertRules) {
        console.log(`   📌 ${alert.title}`);
    }
    
    console.log('   ℹ️ Alertas devem ser configurados manualmente no Grafana');
    console.log('      Alerting → Alert Rules → New alert rule');
}

// Executar deploy
deployDashboard().then(() => {
    setupAlerts();
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('✅ ALL-SEEING EYE DEPLOYED!');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Próximos passos:');
    console.log('   1. Execute schema SQL: all_seeing_eye_schema.sql');
    console.log('   2. Inicie telemetry collector: node telemetry_collector.js');
    console.log('   3. Acesse dashboard no Grafana');
    console.log('');
    console.log('🎯 Endpoints de visualização:');
    console.log('   • FinOps Nexus: Balance, PNL, Gas');
    console.log('   • Sentinel Health: Uptime, CPU, RAM, Latency');
    console.log('   • Agent Efficiency: Success Rate, Throughput');
    console.log('   • Cyber Shield: Intrusions, Contract Integrity');
    console.log('   • Cornix Sales: Vendas em tempo real');
    console.log('');
}).catch(console.error);
