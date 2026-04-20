#!/usr/bin/env node
/**
 * GXEON Setup Tables - Cria tabelas Supabase automaticamente
 * Sistema: GXEON PREDATOR v4.0.0
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function executeSQL(supabase, sql, description) {
    console.log(`\n--- Executando: ${description} ---`);
    
    // Split SQL into individual statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.length < 10) continue;
        
        try {
            // Try to execute via RPC
            const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
            
            if (error) {
                // If RPC fails, try direct query
                const { error: queryError } = await supabase.from('_sql_query').select('*').limit(0);
                errorCount++;
                if (i === 0 || error.message.includes('already exists')) {
                    // Ignore "already exists" errors
                    errorCount--;
                    successCount++;
                }
            } else {
                successCount++;
            }
        } catch (e) {
            // Check if it's just "already exists" error
            if (e.message && (e.message.includes('already exists') || e.message.includes('duplicate'))) {
                successCount++;
            } else {
                errorCount++;
            }
        }
    }
    
    console.log(`   Statements: ${statements.length} | OK: ${successCount} | Erros: ${errorCount}`);
    return { success: errorCount === 0 || successCount > 0 };
}

async function setupTables() {
    console.log('================================================================');
    console.log('       GXEON SETUP TABLES v4.0.0');
    console.log('       Criando estrutura de banco de dados');
    console.log('================================================================\n');

    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.log('[X] ERRO: Variaveis de ambiente nao configuradas');
        console.log('   Configure SUPABASE_PROJECT_URL e SUPABASE_SERVICE_ROLE_KEY');
        return { success: false };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test connection
    console.log('1. Testando conexao Supabase...');
    const { error: testError } = await supabase.auth.getSession();
    if (testError) {
        console.log('   [X] Falha na conexao:', testError.message);
        return { success: false };
    }
    console.log('   [OK] Conexao estabelecida\n');

    const baseDir = path.join(__dirname, '..', 'supabase');
    const schemas = [
        { file: 'gari_dust_opportunities_schema.sql', name: 'Oportunidades Gari' },
        { file: 'digital_archeology_ledger_schema.sql', name: 'Ledger de Auditoria' },
        { file: 'radar_perpetual_schema.sql', name: 'Radar Perpetuo' }
    ];

    console.log('2. Executando schemas:\n');

    for (const schema of schemas) {
        const filePath = path.join(baseDir, schema.file);
        
        if (!fs.existsSync(filePath)) {
            console.log(`   [X] Arquivo nao encontrado: ${schema.file}`);
            continue;
        }

        const sql = fs.readFileSync(filePath, 'utf8');
        await executeSQL(supabase, sql, schema.name);
    }

    // Verify tables were created
    console.log('\n3. Verificando tabelas criadas...');
    const tables = [
        'gari_dust_opportunities',
        'digital_archeology_ledger',
        'radar_opportunities',
        'radar_scan_telemetry',
        'radar_heartbeat',
        'grafana_alert_logs'
    ];

    let created = 0;
    for (const table of tables) {
        try {
            const { error } = await supabase
                .from(table)
                .select('count', { count: 'exact', head: true });
            
            if (!error) {
                console.log(`   [OK] ${table}`);
                created++;
            } else {
                console.log(`   [X] ${table}: ${error.message}`);
            }
        } catch (e) {
            console.log(`   [X] ${table}: ${e.message}`);
        }
    }

    console.log('\n================================================================');
    console.log('       RESULTADO DA INSTALACAO');
    console.log('================================================================');
    console.log(`Tabelas criadas: ${created}/${tables.length}`);
    
    if (created === tables.length) {
        console.log('[OK] Sistema GXEON pronto para operacao');
    } else if (created > 0) {
        console.log('[AVISO] Sistema parcialmente configurado');
    } else {
        console.log('[X] Falha na criacao das tabelas');
    }

    console.log('\n================================================================');
    console.log('PROXIMO PASSO: Execute "npm run profits" para verificar lucros');
    console.log('================================================================');

    return { success: created > 0, created, total: tables.length };
}

setupTables().then(result => {
    process.exit(result.success ? 0 : 1);
});
