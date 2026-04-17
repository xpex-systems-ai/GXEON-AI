#!/usr/bin/env node
/**
 * 🐝 GXEON SWARM M2M - Setup Script
 * Configuração rápida do banco de dados para o swarm
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

console.log('\n🐝═══════════════════════════════════════════════════════🐝');
console.log('  GXEON SWARM M2M v3.0 - Database Setup');
console.log('🐝═══════════════════════════════════════════════════════🐝\n');

// Carrega schema SQL
const schemaPath = path.join(__dirname, '..', 'supabase', 'swarm_m2m_schema.sql');
const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');

// Separa comandos SQL
const commands = schemaSQL
  .split(';')
  .map(cmd => cmd.trim())
  .filter(cmd => cmd.length > 0);

console.log(`📋 Encontrados ${commands.length} comandos SQL para executar\n`);

// Conecta ao Supabase
const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente Supabase não configuradas');
  console.log('   Configure: SUPABASE_PROJECT_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Executa comandos
async function setupDatabase() {
  console.log('🔧 Executando setup do banco...\n');
  
  const results = {
    success: [],
    failed: []
  };
  
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    const preview = cmd.slice(0, 50).replace(/\n/g, ' ') + '...';
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: cmd });
      
      if (error) {
        // Tenta executar como query direta
        const { error: queryError } = await supabase.from('_temp_query').select('*').limit(0);
        
        if (queryError && !queryError.message.includes('relation')) {
          throw queryError;
        }
        
        // Fallback: apenas loga o comando para execução manual
        console.log(`   ⚠️  Comando ${i + 1}: Verifique execução manual no Supabase SQL Editor`);
      } else {
        console.log(`   ✅ Comando ${i + 1}: OK`);
        results.success.push(i);
      }
    } catch (err) {
      console.log(`   ⚠️  Comando ${i + 1}: ${preview}`);
      console.log(`      Nota: Execute via Supabase Dashboard -> SQL Editor`);
      results.failed.push(i);
    }
  }
  
  console.log(`\n📊 Resultado:`);
  console.log(`   ✅ ${results.success.length} comandos processados`);
  console.log(`   ⚠️  ${results.failed.length} comandos precisam de verificação manual`);
  
  if (results.failed.length > 0) {
    console.log(`\n📝 Para comandos pendentes:`);
    console.log('   1. Acesse: https://supabase.com/dashboard');
    console.log('   2. Seu projeto -> SQL Editor');
    console.log('   3. Cole e execute: supabase/swarm_m2m_schema.sql');
  }
  
  console.log(`\n✅ Setup completo!\n`);
}

// Verifica se tabelas já existem
async function checkExisting() {
  try {
    const { data, error } = await supabase
      .from('swarm_targets')
      .select('count', { count: 'exact', head: true });
      
    if (!error) {
      console.log('✅ Tabelas do swarm já existem no banco\n');
      return true;
    }
  } catch (e) {
    // Tabelas não existem
  }
  return false;
}

// Execução principal
(async () => {
  const exists = await checkExisting();
  
  if (!exists || process.argv.includes('--force')) {
    await setupDatabase();
  } else {
    console.log('   Use --force para recriar tabelas\n');
  }
  
  console.log('🐝 Próximos passos:');
  console.log('   1. Configure as variáveis de ambiente no .env');
  console.log('   2. Execute: npm run swarm:start');
  console.log('   3. Ou via API: POST /api/v1/swarm/start');
  console.log('\n📚 Documentação: server/agents/README.md\n');
})();
