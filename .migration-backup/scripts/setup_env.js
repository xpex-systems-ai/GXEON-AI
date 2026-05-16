#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔧 ENVIRONMENT SETUP - GXEON v4.0.0
 * Configura automaticamente o arquivo .env com credenciais
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ENV_PATH = path.join(__dirname, '..', '.env');
const TEMPLATE_PATH = path.join(__dirname, '..', 'DEPLOY_ENV_CONFIG.env');

// Credenciais do usuário (já fornecidas)
const DEFAULT_CONFIG = {
    SUPABASE_PROJECT_URL: 'https://telxvphgrsvsnxvmjkce.supabase.co',
    ALCHEMY_WSS_URL_PRIMARY: 'wss://arb-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY',
    ALCHEMY_API_KEY: 'YOUR_ALCHEMY_KEY',
    COMMANDER_WALLET_ADDRESS: '0x3955d559055DadB7067054cB6E6f974710345224',
    MIN_AI_CONFIDENCE: '0.85',
    MAX_GAS_PRICE_GWEI: '0.1',
    MIN_PROFIT_THRESHOLD: '0.005',
    FEE_PROTECTION_BUFFER: '0.15',
    EMERGENCY_KILL_SWITCH: 'INACTIVE',
    AUDIT_MODE: 'STRICT',
    PORT: '3000',
    NODE_ENV: 'production'
};

async function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => resolve(answer.trim()));
    });
}

async function setupEnvironment() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║           🔧 GXEON ENVIRONMENT SETUP v4.0.0                    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    // Verificar se .env já existe
    let existingEnv = {};
    if (fs.existsSync(ENV_PATH)) {
        console.log('📁 Arquivo .env encontrado.');
        const envContent = fs.readFileSync(ENV_PATH, 'utf8');
        
        // Parse existing env
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^#=]+)=(.*)$/);
            if (match) {
                existingEnv[match[1].trim()] = match[2].trim();
            }
        });
    } else {
        console.log('📁 Arquivo .env não encontrado. Criando novo...');
    }
    
    // Perguntar pela SUPABASE_SERVICE_ROLE_KEY
    console.log('\n🗄️  Supabase Configuration:');
    console.log(`   URL: ${DEFAULT_CONFIG.SUPABASE_PROJECT_URL}`);
    
    let supabaseKey = existingEnv.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseKey || supabaseKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...') {
        console.log('\n⚠️  SUPABASE_SERVICE_ROLE_KEY não configurada!');
        console.log('   Obtenha a chave em: https://telxvphgrsvsnxvmjkce.supabase.co/project/settings/api');
        console.log('   Navegue para: Project Settings → API → service_role key\n');
        
        supabaseKey = await question('📝 Cole sua SUPABASE_SERVICE_ROLE_KEY: ');
        
        if (!supabaseKey || supabaseKey.length < 20) {
            console.log('\n❌ Chave inválida! Usando placeholder temporário...');
            console.log('   ⚠️  Você precisa editar manualmente o .env depois!');
            supabaseKey = 'YOUR_SUPABASE_SERVICE_ROLE_KEY';
        }
    } else {
        console.log('   ✅ SUPABASE_SERVICE_ROLE_KEY já configurada');
    }
    
    // Perguntar pela PRIVATE_KEY (opcional para validação)
    console.log('\n🔐 Blockchain Configuration:');
    let privateKey = existingEnv.PRIVATE_KEY || 'your_private_key_here';
    
    if (privateKey === 'your_private_key_here') {
        console.log('   ⚠️  PRIVATE_KEY não configurada (necessária para execução on-chain)');
        const configurePrivateKey = await question('   Deseja configurar agora? (s/n): ');
        
        if (configurePrivateKey.toLowerCase() === 's') {
            privateKey = await question('   Cole sua PRIVATE_KEY (com 0x): ');
        }
    }
    
    // Construir conteúdo do .env
    const envContent = `# 🌑 GXEON SOVEREIGN PROSPERITY v4.0.0 - PRODUCTION ENVIRONMENT
# Configurado em: ${new Date().toISOString()}
# =============================================================================

# ==========================================
# 🗄️ SUPABASE - REALTIME SYNC
# ==========================================
SUPABASE_PROJECT_URL=${DEFAULT_CONFIG.SUPABASE_PROJECT_URL}
SUPABASE_SERVICE_ROLE_KEY=${supabaseKey}

# ==========================================
# ⚡ ALCHEMY - WEBSOCKET FAILOVER
# ==========================================
ALCHEMY_WSS_URL_PRIMARY=${DEFAULT_CONFIG.ALCHEMY_WSS_URL_PRIMARY}
ALCHEMY_WSS_URL_BACKUP=wss://arb-mainnet.g.alchemy.com/v2/BACKUP_KEY_PLACEHOLDER
ALCHEMY_API_KEY=${DEFAULT_CONFIG.ALCHEMY_API_KEY}

# ==========================================
# 💰 FAMILY SUSTENANCE - REVENUE STREAM
# ==========================================
COMMANDER_WALLET_ADDRESS=${DEFAULT_CONFIG.COMMANDER_WALLET_ADDRESS}

# ==========================================
# 🧠 MAMMOUTH AI ORACLE
# ==========================================
MAMMOUTH_HQ_URL=https://mammouth-ai.example.com/webhook
MAMMOUTH_API_KEY=your_mammouth_api_key
MIN_AI_CONFIDENCE=${DEFAULT_CONFIG.MIN_AI_CONFIDENCE}

# ==========================================
# ⛽ GAS OPTIMIZATION - LOW GWEI STRATEGY
# ==========================================
MAX_GAS_PRICE_GWEI=${DEFAULT_CONFIG.MAX_GAS_PRICE_GWEI}
MIN_PROFIT_THRESHOLD=${DEFAULT_CONFIG.MIN_PROFIT_THRESHOLD}
FEE_PROTECTION_BUFFER=${DEFAULT_CONFIG.FEE_PROTECTION_BUFFER}

# ==========================================
# 🛡️ GUARDIAN SHIELD
# ==========================================
EMERGENCY_KILL_SWITCH=${DEFAULT_CONFIG.EMERGENCY_KILL_SWITCH}
AUDIT_MODE=${DEFAULT_CONFIG.AUDIT_MODE}
ANTI_429_SHIELD=ENABLED
PROCESS_PERSISTENCE=INFINITE_RETRY

# ==========================================
# 🔗 BLOCKCHAIN - ARBITRUM MAINNET
# ==========================================
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/${DEFAULT_CONFIG.ALCHEMY_API_KEY}
CHAIN_ID=42161

# ==========================================
# 🔐 SECURITY
# ==========================================
PRIVATE_KEY=${privateKey}
VAULT_ADDRESS=0x...
GXEON_TREASURY_ADDRESS=0x...

# ==========================================
# 🚀 SERVER CONFIG
# ==========================================
PORT=${DEFAULT_CONFIG.PORT}
NODE_ENV=${DEFAULT_CONFIG.NODE_ENV}
LOG_LEVEL=info
`;
    
    // Salvar arquivo
    fs.writeFileSync(ENV_PATH, envContent);
    
    console.log('\n✅ Arquivo .env criado/atualizado com sucesso!');
    console.log(`   Local: ${ENV_PATH}`);
    
    // Resumo
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║           ✅ ENVIRONMENT CONFIGURADO                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    console.log('Configurações aplicadas:');
    console.log(`   • Supabase URL: ${DEFAULT_CONFIG.SUPABASE_PROJECT_URL}`);
    console.log(`   • Alchemy Key: ${DEFAULT_CONFIG.ALCHEMY_API_KEY.slice(0, 15)}...`);
    console.log(`   • Commander: ${DEFAULT_CONFIG.COMMANDER_WALLET_ADDRESS.slice(0, 20)}...`);
    console.log(`   • AI Confidence: ${DEFAULT_CONFIG.MIN_AI_CONFIDENCE}`);
    console.log(`   • Max Gas: ${DEFAULT_CONFIG.MAX_GAS_PRICE_GWEI} Gwei`);
    
    if (supabaseKey === 'YOUR_SUPABASE_SERVICE_ROLE_KEY') {
        console.log('\n⚠️  ATENÇÃO: Você precisa obter a chave real do Supabase!');
        console.log('   1. Acesse: https://supabase.com/dashboard/project/telxvphgrsvsnxvmjkce/settings/api');
        console.log('   2. Copie a "service_role key"');
        console.log('   3. Edite o arquivo .env e substitua a chave placeholder');
    }
    
    console.log('\n🚀 Próximo passo:');
    console.log('   npm run deploy:final');
    
    rl.close();
}

// Executar
setupEnvironment().catch(err => {
    console.error('Erro:', err);
    rl.close();
    process.exit(1);
});
