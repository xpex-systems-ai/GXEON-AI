#!/usr/bin/env node
/**
 * Auto Deploy Script - GXeon
 * 
 * Reads EXECUTAR_NO_SUPABASE.sql and executes it automatically
 * using Supabase Service Role Key (bypasses manual dashboard copy/paste)
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function autoDeploy() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     🚀 AUTO DEPLOY - GXeon Schema Injection            ║');
  console.log('║     Executando SQL automaticamente via Service Role    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Initialize Supabase with Service Role Key
  const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }
  
  console.log('🔗 Conectando ao Supabase...');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   KEY: ${supabaseKey.substring(0, 20)}...\n`);
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Read SQL file
  const sqlFilePath = path.join(__dirname, '..', 'EXECUTAR_NO_SUPABASE.sql');
  
  console.log('📁 Lendo arquivo SQL...');
  let sqlContent;
  try {
    sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
    console.log(`   ✅ Arquivo carregado (${sqlContent.length} caracteres)\n`);
  } catch (error) {
    console.error('❌ Erro ao ler arquivo SQL:', error.message);
    process.exit(1);
  }

  // Split SQL into individual statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

  console.log(`📊 Total de comandos SQL: ${statements.length}\n`);

  // Execute each statement
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    const shortDesc = statement.substring(0, 50).replace(/\s+/g, ' ');
    
    try {
      // Use rpc to execute raw SQL (requires exec_sql function in Supabase)
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      });

      if (error) {
        // Try alternative: direct query execution
        const { error: queryError } = await supabase.from('_temp_query').select('*').limit(0);
        
        // If the statement is a CREATE TABLE, try alternative method
        if (statement.toLowerCase().includes('create table')) {
          console.log(`   ⚠️  Comando ${i + 1} requer execução manual no Dashboard`);
          console.log(`      ${shortDesc}...`);
        } else {
          console.log(`   ⚠️  Comando ${i + 1}: ${error.message || 'Skipped'}`);
        }
        errorCount++;
        errors.push({ cmd: i + 1, error: error.message });
      } else {
        console.log(`   ✅ Comando ${i + 1}: OK`);
        successCount++;
      }
    } catch (error) {
      // Some statements might fail due to permissions or function not existing
      if (statement.toLowerCase().includes('create table') || 
          statement.toLowerCase().includes('create policy')) {
        console.log(`   ⏭️  Comando ${i + 1}: Requer execução no Dashboard SQL Editor`);
      } else {
        console.log(`   ⚠️  Comando ${i + 1}: ${error.message}`);
        errorCount++;
        errors.push({ cmd: i + 1, error: error.message });
      }
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║              📊 RESUMO DA EXECUÇÃO                     ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`   Comandos executados: ${successCount}`);
  console.log(`   Comandos com erro: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log('\n   ⚠️  Alguns comandos DDL (CREATE TABLE/POLICY) precisam ser');
    console.log('      executados manualmente no Supabase SQL Editor.');
    console.log('\n   📝 Instruções:');
    console.log('      1. Acesse: https://app.supabase.com/project/_/sql');
    console.log('      2. Cole o conteúdo de: EXECUTAR_NO_SUPABASE.sql');
    console.log('      3. Execute');
  }

  // Verification
  console.log('\n🔍 Verificando tabelas criadas...');
  try {
    // Try to count records in keeper_rewards
    const { count, error } = await supabase
      .from('keeper_rewards')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`   ❌ Tabela keeper_rewards: ${error.message}`);
      console.log('   ⚠️  Execute o SQL manualmente no Dashboard');
    } else {
      console.log(`   ✅ Tabela keeper_rewards: EXISTE (${count} registros)`);
    }

    // Check audit_logs
    const { count: auditCount, error: auditError } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    if (auditError) {
      console.log(`   ❌ Tabela audit_logs: ${auditError.message}`);
    } else {
      console.log(`   ✅ Tabela audit_logs: EXISTE (${auditCount} registros)`);
    }

  } catch (error) {
    console.log(`   ❌ Erro na verificação: ${error.message}`);
  }

  console.log('\n✅ Auto Deploy concluído!\n');
}

// Run deployment
autoDeploy().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
