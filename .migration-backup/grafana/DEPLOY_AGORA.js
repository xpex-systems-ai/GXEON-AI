/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON ALL-SEEING EYE — DEPLOY RÁPIDO GRAFANA
 * Comandante: Júnior Sena | GX Executora
 * ═══════════════════════════════════════════════════════════════════════════
 */

import fs from 'fs/promises';

// CONFIGURAÇÃO DIRETA (sem .env)
const GRAFANA_URL = 'https://gxeonai.grafana.net';
const GRAFANA_API_KEY = 'glsa_KbwcaEEtZ6uK35OMFDdlphOvrIVkUA6C_e9a8d477';
const DASHBOARD_JSON_PATH = './gxeon-monetization-all-seeing-eye-v1.json';

console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('👁️ GXEON ALL-SEEING EYE — DEPLOY GRAFANA');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log(`🌐 URL: ${GRAFANA_URL}`);
console.log(`🔑 API Key: ${GRAFANA_API_KEY.substring(0, 20)}...`);
console.log('');

async function deployDashboard() {
    try {
        // Ler dashboard JSON
        console.log('📂 Carregando dashboard...');
        const dashboardJson = await fs.readFile(DASHBOARD_JSON_PATH, 'utf8');
        const dashboard = JSON.parse(dashboardJson);
        
        console.log(`   📊 Dashboard: ${dashboard.dashboard?.title || 'GXEON All-Seeing Eye'}`);
        console.log(`   🆔 UID: ${dashboard.dashboard?.uid || 'gxeon-monetization-v1'}`);
        console.log(`   📋 Panels: ${dashboard.dashboard?.panels?.length || 16}`);
        console.log('');
        
        // Preparar payload
        const payload = {
            dashboard: dashboard.dashboard,
            overwrite: true,
            message: 'Deployed by GXEON All-Seeing Eye v1.0'
        };
        
        // Deploy via API
        console.log('🚀 Enviando para Grafana...');
        console.log(`   POST ${GRAFANA_URL}/api/dashboards/db`);
        console.log('');
        
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
            console.log('═══════════════════════════════════════════════════════════════════════════');
            console.log('✅ DEPLOY CONCLUÍDO COM SUCESSO!');
            console.log('═══════════════════════════════════════════════════════════════════════════');
            console.log('');
            console.log(`📊 Dashboard URL:`);
            console.log(`   ${GRAFANA_URL}${result.url}`);
            console.log('');
            console.log(`🆔 Dashboard ID: ${result.id}`);
            console.log(`🔗 UID: ${result.uid}`);
            console.log(`📁 Folder: ${result.folderUid || 'General'}`);
            console.log(`✏️  Status: ${result.status}`);
            console.log('');
            console.log('═══════════════════════════════════════════════════════════════════════════');
            console.log('🎯 ALL-SEEING EYE OPERACIONAL!');
            console.log('═══════════════════════════════════════════════════════════════════════════');
            console.log('');
            console.log('💡 INSTRUÇÕES:');
            console.log('   1. Acesse o URL acima no navegador');
            console.log('   2. Faça login no Grafana (se necessário)');
            console.log('   3. Veja os 16 painéis de métricas em tempo real');
            console.log('   4. Configure datasource PostgreSQL com Supabase');
            console.log('');
            console.log('📊 PRÓXIMO PASSO: Conectar datasource Supabase');
            console.log('   Configuration → Data Sources → PostgreSQL');
            console.log('   Host: db.XXXX.supabase.co:5432');
            console.log('   Database: postgres');
            console.log('   User: postgres');
            console.log('   Password: [sua senha]');
            console.log('   SSL: Require');
            console.log('');
        } else {
            console.log('❌ ERRO NO DEPLOY:');
            console.log(`   Status: ${response.status}`);
            console.log(`   Mensagem: ${result.message || JSON.stringify(result)}`);
            console.log('');
            console.log('💡 Possíveis causas:');
            console.log('   - API Key inválida ou expirada');
            console.log('   - Permissões insuficientes (precisa Editor/Admin)');
            console.log('   - URL do Grafana incorreta');
        }
        
    } catch (error) {
        console.log('❌ ERRO CRÍTICO:');
        console.log(`   ${error.message}`);
        console.log('');
        console.log('💡 Verificar:');
        console.log('   - Arquivo gxeon-monetization-all-seeing-eye-v1.json existe?');
        console.log('   - Conexão de internet ativa?');
        console.log('   - URL e API Key estão corretos?');
    }
}

deployDashboard();
