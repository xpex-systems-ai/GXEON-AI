/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON PROTOCOL - VERIFICAÇÃO DE PRONTIDÃO
 * Valida configuração antes do deploy na Arbitrum
 * ═══════════════════════════════════════════════════════════════════════════
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌑 GXEON PROTOCOL - BLINDAGEM SUPREMA');
console.log('═══════════════════════════════════════════════════════════\n');

let checksPassed = 0;
let checksFailed = 0;

function check(name, condition, successMsg, errorMsg) {
    if (condition) {
        console.log(`✅ ${name}: ${successMsg}`);
        checksPassed++;
        return true;
    } else {
        console.log(`❌ ${name}: ${errorMsg}`);
        checksFailed++;
        return false;
    }
}

// 1. Verifica hardhat.config.cjs
const hardhatConfigPath = path.join(__dirname, '..', 'hardhat.config.cjs');
const hardhatConfigExists = fs.existsSync(hardhatConfigPath);
check(
    'Hardhat Config',
    hardhatConfigExists,
    'hardhat.config.cjs presente (CommonJS)',
    'hardhat.config.cjs não encontrado'
);

if (hardhatConfigExists) {
    const configContent = fs.readFileSync(hardhatConfigPath, 'utf8');
    const hasRequire = configContent.includes('require(');
    const hasModuleExports = configContent.includes('module.exports');
    check(
        'Hardhat Syntax',
        hasRequire && hasModuleExports,
        'Sintaxe CommonJS confirmada (require + module.exports)',
        'Sintaxe incorreta - deve usar require e module.exports'
    );
}

// 2. Verifica contrato
const contractPath = path.join(__dirname, '..', 'contracts', 'GxeonSovereignExecutor.sol');
const contractExists = fs.existsSync(contractPath);
check(
    'Contrato Sovereign',
    contractExists,
    'GxeonSovereignExecutor.sol encontrado',
    'Contrato não encontrado'
);

if (contractExists) {
    const contractSource = fs.readFileSync(contractPath, 'utf8');
    
    const hasReentrancyGuard = contractSource.includes('ReentrancyGuard') && 
                               contractSource.includes('nonReentrant');
    check(
        'Proteção Reentrancy',
        hasReentrancyGuard,
        'ReentrancyGuard + nonReentrant ativos',
        'Proteção contra reentrancy ausente'
    );
    
    const hasConstantProfit = contractSource.includes('constant PROFIT_DESTINATION');
    check(
        'Destino do Lucro',
        hasConstantProfit,
        'PROFIT_DESTINATION é constante (imutável)',
        'PROFIT_DESTINATION deve ser constante'
    );
    
    const profitDestination = contractSource.match(/PROFIT_DESTINATION = (0x[a-fA-F0-9]{40})/);
    if (profitDestination) {
        check(
            'Carteira Comandante',
            profitDestination[1] === '0x3955d559055DadB7067054cB6E6f974710345224',
            `Lucro travado em: ${profitDestination[1]}`,
            'Endereço de lucro incorreto'
        );
    }
}

// 3. Verifica .env
const envPath = path.join(__dirname, '..', '.env');
const envExists = fs.existsSync(envPath);
check(
    'Arquivo .env',
    envExists,
    '.env encontrado',
    '.env não encontrado - será criado no deploy'
);

if (envExists) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const hasPrivateKey = envContent.includes('PRIVATE_KEY=') && 
                          !envContent.includes('PRIVATE_KEY=0x000');
    check(
        'Chave Privada',
        hasPrivateKey,
        'PRIVATE_KEY configurada',
        'PRIVATE_KEY não configurada - necessária para deploy'
    );
    
    const hasArbitrumRpc = envContent.includes('ARBITRUM_RPC_URL=') || 
                           envContent.includes('ALCHEMY_ARBITRUM');
    check(
        'RPC Arbitrum',
        hasArbitrumRpc,
        'Conexão Arbitrum configurada',
        'ARBITRUM_RPC_URL não configurada'
    );
}

// 4. Verifica deploy script
const deployScriptPath = path.join(__dirname, 'deploy_executor_contract.js');
const deployScriptExists = fs.existsSync(deployScriptPath);
check(
    'Script de Deploy',
    deployScriptExists,
    'deploy_executor_contract.js encontrado',
    'Script de deploy não encontrado'
);

if (deployScriptExists) {
    const deploySource = fs.readFileSync(deployScriptPath, 'utf8');
    const hasEnvUpdate = deploySource.includes('SOVEREIGN_EXECUTOR_ADDRESS');
    check(
        'Auto-configuração',
        hasEnvUpdate,
        'Deploy atualiza .env automaticamente',
        'Script não atualiza .env'
    );
}

// 5. Verifica flashSweeper
const sweeperPath = path.join(__dirname, '..', 'server', 'services', 'flashSweeper.js');
const sweeperExists = fs.existsSync(sweeperPath);
check(
    'Flash Sweeper',
    sweeperExists,
    'flashSweeper.js encontrado',
    'Serviço flashSweeper não encontrado'
);

if (sweeperExists) {
    const sweeperSource = fs.readFileSync(sweeperPath, 'utf8');
    const readsExecutorAddress = sweeperSource.includes('SOVEREIGN_EXECUTOR_ADDRESS');
    check(
        'Integração Sweeper',
        readsExecutorAddress,
        'FlashSweeper lê endereço do contrato',
        'FlashSweeper não configurado para ler contrato'
    );
}

// Resumo
console.log('\n═══════════════════════════════════════════════════════════');
console.log('📊 RELATÓRIO DE PRONTIDÃO');
console.log('═══════════════════════════════════════════════════════════');
console.log(`✅ Checks Aprovados: ${checksPassed}`);
console.log(`❌ Checks Falhos: ${checksFailed}`);

if (checksFailed === 0) {
    console.log('\n🚀 SISTEMA PRONTO PARA DEPLOY!');
    console.log('\nPróximo comando:');
    console.log('  npx hardhat compile && node scripts/deploy_executor_contract.js deploy');
    process.exit(0);
} else {
    console.log('\n⚠️  CORRIJA OS ERROS ANTES DE PROSSEGUIR');
    process.exit(1);
}
