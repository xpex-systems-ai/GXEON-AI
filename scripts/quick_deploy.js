#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 QUICK DEPLOY - GXEON v4.0.0
 * Deploy rápido para testes sem Supabase configurado
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║           🚀 GXEON QUICK DEPLOY v4.0.0                        ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const envPath = path.join(__dirname, '..', '.env');
const hasEnv = fs.existsSync(envPath);

if (!hasEnv) {
    console.log('⚠️  Arquivo .env não encontrado!\n');
    console.log('🔧 Opções:\n');
    console.log('   1. [RECOMENDADO] Configure o ambiente:');
    console.log('      npm run setup:env\n');
    console.log('   2. [RÁPIDO] Execute com variáveis de ambiente temporárias:');
    console.log('      $env:SUPABASE_SERVICE_ROLE_KEY="sua_chave_aqui"');
    console.log('      npm run deploy:final\n');
    console.log('   3. [MANUAL] Crie o arquivo .env:');
    console.log('      copy DEPLOY_ENV_CONFIG.env .env');
    console.log('      # Edite .env e adicione suas chaves\n');
    
    // Oferecer opção de continuar em modo simulação
    console.log('🎮 Modo de Simulação disponível para testes:\n');
    console.log('   npm run deploy:simulation\n');
    
    process.exit(1);
}

// Verificar se .env tem a chave do Supabase
const envContent = fs.readFileSync(envPath, 'utf8');
const hasSupabaseKey = envContent.includes('SUPABASE_SERVICE_ROLE_KEY=') && 
                      !envContent.includes('SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_KEY') &&
                      !envContent.includes('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key') &&
                      !envContent.includes('SUPABASE_SERVICE_ROLE_KEY=...');

if (!hasSupabaseKey) {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY não configurada no .env!\n');
    console.log('🔧 Para corrigir:\n');
    console.log('   1. Acesse: https://supabase.com/dashboard/project/telxvphgrsvsnxvmjkce/settings/api');
    console.log('   2. Copie a "service_role key"');
    console.log('   3. Execute: npm run setup:env');
    console.log('   4. Cole a chave quando solicitado\n');
    process.exit(1);
}

console.log('✅ Arquivo .env encontrado');
console.log('🚀 Iniciando deploy completo...\n');

try {
    // Executar o deploy final
    execSync('npm run deploy:final', { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
    });
} catch (err) {
    console.error('\n❌ Deploy falhou:', err.message);
    process.exit(1);
}
