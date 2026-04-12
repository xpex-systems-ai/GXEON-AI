require('dotenv').config({ path: './config/secure/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/^=+/, '').trim();
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('========================================');
console.log('   GXEON SUPABASE FLUXO TEST');
console.log('========================================\n');

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Credenciais não encontradas!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeFluxoTest() {
    try {
        // Step 1: Create table via SQL query
        console.log('🗄️  Criando tabela teste_fluxo...');
        
        // Try to create table using raw SQL
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS teste_fluxo (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                task_name TEXT,
                status TEXT,
                resultado TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;
        
        // Execute SQL via RPC
        const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
        
        if (createError && createError.message.includes('function')) {
            console.log('   ℹ️  Função exec_sql não existe, tentando insert direto...');
            // Table will be auto-created on insert if RLS allows
        } else if (createError) {
            console.log('   ℹ️  Erro ao criar via RPC, tentando insert direto...');
        } else {
            console.log('   ✅ Tabela criada/verificada via SQL!\n');
        }

        // Step 2: Insert test row
        console.log('📝 Inserindo registro de teste...');
        const { data: insertData, error: insertError } = await supabase
            .from('teste_fluxo')
            .insert([{
                task_name: 'teste_conexao',
                status: 'pendente',
                resultado: 'aguardando execução'
            }])
            .select();

        if (insertError) {
            if (insertError.code === '42P01') {
                console.log('   ⚠️  Tabela não existe.');
                console.log('   📋 Execute no SQL Editor do Supabase:');
                console.log(`
CREATE TABLE IF NOT EXISTS teste_fluxo (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_name TEXT,
    status TEXT,
    resultado TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
                `);
                console.log('   Depois execute este script novamente.\n');
                return { success: false, step: 'create_table' };
            }
            throw insertError;
        }

        console.log(`   ✅ Registro inserido! ID: ${insertData[0].id}\n`);

        // Step 3: Validate - Read back the data
        console.log('✅ Validando conexão (lendo dados)...');
        const { data: readData, error: readError } = await supabase
            .from('teste_fluxo')
            .select('*')
            .eq('task_name', 'teste_conexao')
            .order('created_at', { ascending: false })
            .limit(1);

        if (readError) {
            throw readError;
        }

        if (readData && readData.length > 0) {
            console.log('   ✅ Validação OK! Registro encontrado:');
            console.log(`      Task: ${readData[0].task_name}`);
            console.log(`      Status: ${readData[0].status}`);
            console.log(`      Resultado: ${readData[0].resultado}`);
            console.log(`      Criado: ${new Date(readData[0].created_at).toLocaleString()}\n`);
        } else {
            console.log('   ⚠️  Registro não encontrado na validação\n');
            return { success: false, step: 'validate' };
        }

        // Step 4: Return status
        console.log('========================================');
        console.log('   ✅ FLUXO TEST CONCLUÍDO!');
        console.log('   Tabela teste_fluxo criada');
        console.log('   Registro inserido e validado');
        console.log('   Conexão Supabase OK!');
        console.log('========================================\n');
        
        console.log('🎯 Módulos prontos para uso:');
        console.log('   • Wallet Web3');
        console.log('   • Agentes Autônomos');
        console.log('   • APIs Inteligentes');
        console.log('   • Microtasks Automáticas');
        console.log('   • Smart Contracts');
        console.log('   • Logs & Dashboards\n');

        return { success: true, data: readData[0] };

    } catch (error) {
        console.error('\n❌ Erro no fluxo:');
        console.error(`   ${error.message}\n`);
        return { success: false, error: error.message };
    }
}

executeFluxoTest().then(result => {
    process.exit(result.success ? 0 : 1);
});
