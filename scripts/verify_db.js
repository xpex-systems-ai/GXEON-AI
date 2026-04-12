#!/usr/bin/env node
/**
 * Quick Database Verification
 * Checks if tables exist without needing full schema deployment
 */

require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function verifyDatabase() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     🔍 VERIFICAÇÃO RÁPIDA DO BANCO                       ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Credenciais não encontradas no .env.local');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log(`🔗 URL: ${supabaseUrl}\n`);

  // Test tables
  const tables = ['keeper_rewards', 'audit_logs'];
  let allOk = true;

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
        allOk = false;
      } else {
        console.log(`   ✅ ${table}: EXISTE (${count} registros)`);
      }
    } catch (error) {
      console.log(`   ❌ ${table}: ${error.message}`);
      allOk = false;
    }
  }

  console.log('\n' + (allOk ? '✅ Banco de dados pronto!' : '⚠️  Execute o SQL no Dashboard primeiro'));
  console.log('');
  
  return allOk;
}

verifyDatabase().then(ok => {
  process.exit(ok ? 0 : 1);
}).catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});
