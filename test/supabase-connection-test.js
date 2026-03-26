require('dotenv').config({ path: './config/secure/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/^=+/, '').trim();
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

console.log('========================================');
console.log('   GXEON SUPABASE CONNECTION TEST');
console.log('========================================\n');

// Debug: Show actual values
console.log('🔧 Debug - Valores lidos:');
console.log(`   SUPABASE_URL raw: "${supabaseUrl}"`);
console.log(`   Length: ${supabaseUrl ? supabaseUrl.length : 0}\n`);

// Check credentials
console.log('🔍 Verificando credenciais...');
console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ Configurado' : '❌ Não encontrado'}`);
console.log(`   SUPABASE_KEY: ${supabaseKey ? '✅ Configurado' : '❌ Não encontrado'}\n`);

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: Credenciais do Supabase não encontradas!');
    console.error('   Verifique se o arquivo .env contém SUPABASE_URL e SUPABASE_SERVICE_KEY\n');
    process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        // Test 1: Check connection
        console.log('🔗 Testando conexão com Supabase...');
        
        // Test connection by checking if we can query (table may or may not exist)
        const { error: connectionError } = await supabase
            .from('teste_conexao')
            .select('count')
            .limit(1);
        
        // If error is about missing table or schema cache, connection is OK but table doesn't exist
        if (connectionError && 
            (connectionError.code === '42P01' || 
             connectionError.message.includes('Could not find the table') ||
             connectionError.message.includes('schema cache'))) {
            console.log('   ✅ Conexão estabelecida! (Tabela não existe, será criada)\n');
        } else if (connectionError) {
            throw new Error(`Connection failed: ${connectionError.message}`);
        } else {
            console.log('   ✅ Conexão estabelecida!\n');
        }

        // Test 2: Try to create table if not exists
        console.log('🗄️  Verificando/Criando tabela de teste...');
        
        const { error: tableError } = await supabase
            .from('teste_conexao')
            .select('id')
            .limit(1);
        
        if (tableError && tableError.code === '42P01') {
            console.log('   ℹ️  Tabela não existe. Execute no SQL Editor do Supabase:');
            console.log(`
   CREATE TABLE IF NOT EXISTS teste_conexao (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       mensagem TEXT,
       created_at TIMESTAMP DEFAULT NOW()
   );
            `);
        } else {
            console.log('   ✅ Tabela existe!\n');
        }

        // Test 3: Insert test data
        console.log('📝 Inserindo dados de teste...');
        const { data: insertData, error: insertError } = await supabase
            .from('teste_conexao')
            .insert([
                { mensagem: 'Teste de conexão GXEON - ' + new Date().toISOString() }
            ])
            .select();

        if (insertError) {
            // If table doesn't exist, create it first
            if (insertError.code === '42P01') {
                console.log('   ℹ️  Criando tabela...');
                
                // Create table using raw SQL
                const { error: sqlError } = await supabase
                    .from('_temp_query')
                    .select('*')
                    .limit(0);
                
                // If we can't create table, try a different approach
                console.log('   ⚠️  Tabela não pode ser criada automaticamente.');
                console.log('   ℹ️  Execute no SQL Editor do Supabase:');
                console.log(`
CREATE TABLE IF NOT EXISTS teste_conexao (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
                `);
                
                // Try insert again
                const { error: retryError } = await supabase
                    .from('teste_conexao')
                    .insert([
                        { mensagem: 'Teste de conexão GXEON' }
                    ]);
                    
                if (retryError) {
                    console.log('   ❌ Não foi possível inserir dados\n');
                } else {
                    console.log('   ✅ Dados inseridos!\n');
                }
            } else {
                throw insertError;
            }
        } else {
            console.log('   ✅ Dados inseridos com sucesso!');
            console.log(`   📄 ID: ${insertData[0].id}\n`);
        }

        // Test 4: Read data
        console.log('📖 Lendo dados da tabela...');
        const { data: readData, error: readError } = await supabase
            .from('teste_conexao')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (readError) {
            throw readError;
        }

        console.log('   ✅ Leitura realizada!');
        console.log(`   📊 Total de registros: ${readData.length}\n`);
        
        if (readData.length > 0) {
            console.log('   📋 Últimos registros:');
            readData.forEach((row, i) => {
                console.log(`      ${i + 1}. ${row.mensagem} (${new Date(row.created_at).toLocaleString()})`);
            });
            console.log('');
        }

        console.log('========================================');
        console.log('   ✅ CONEXÃO SUPABASE OK!');
        console.log('   GXEON está pronto para o próximo módulo.');
        console.log('========================================\n');
        
        return { success: true, data: readData };

    } catch (error) {
        console.error('\n❌ Erro na conexão com Supabase:');
        console.error(`   ${error.message}\n`);
        console.error('========================================');
        console.error('   ⚠️ Verifique suas credenciais:');
        console.error('   - SUPABASE_URL');
        console.error('   - SUPABASE_SERVICE_KEY ou SUPABASE_ANON_KEY');
        console.error('========================================\n');
        
        return { success: false, error: error.message };
    }
}

testConnection().then(result => {
    process.exit(result.success ? 0 : 1);
});
