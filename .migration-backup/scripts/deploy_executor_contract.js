/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEPLOY SOVEREIGN EXECUTOR CONTRACT
 * Deploy do Flash-Sweeper na Arbitrum One
 * 
 * Contrato: GxeonSovereignExecutor.sol
 * Rede: Arbitrum One (Chain ID: 42161)
 * 
 * Endereços Arbitrum:
 * - Aave V3 PoolAddressesProvider: 0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb
 * - Uniswap V3 Router: 0xE592427A0AEce92De3Edee1F18E0157C05861564
 * - Uniswap V3 Quoter: 0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6
 * - SushiSwap Router: 0x2C5dd8FB1b71C5A43D44f47F69F867C5F7e5b6d1
 * 
 * Tokens:
 * - USDC: 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8
 * - USDT: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9
 * - WETH: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1
 * - WBTC: 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f
 * - DAI: 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1
 * - ARB: 0x912CE59144191C1204E64559FE8253a0e49E6548
 * ═══════════════════════════════════════════════════════════════════════════
 */

import 'dotenv/config';

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE DEPLOY
// ═══════════════════════════════════════════════════════════════════════════

const DEPLOY_CONFIG = {
    // Rede Arbitrum
    ARBITRUM: {
        RPC_URL: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
        CHAIN_ID: 42161,
        NAME: 'Arbitrum One'
    },
    
    // Endereços dos contratos dependentes
    ADDRESSES: {
        // Aave V3
        AAVE_POOL_ADDRESSES_PROVIDER: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
        AAVE_POOL: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
        
        // Uniswap V3
        UNISWAP_V3_ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        UNISWAP_V3_QUOTER: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
        UNISWAP_V3_FACTORY: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        
        // SushiSwap V3
        SUSHISWAP_ROUTER: '0x2C5dd8FB1b71C5A43D44f47F69F867C5F7e5b6d1',
        
        // Tokens principais
        USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
        DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548'
    },
    
    // Gas settings para Arbitrum
    GAS_SETTINGS: {
        maxFeePerGas: ethers.parseUnits('0.1', 'gwei'), // 0.1 Gwei
        maxPriorityFeePerGas: ethers.parseUnits('0.01', 'gwei'),
        gasLimit: 5000000 // 5M gas
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÕES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════

function validateEnvironment() {
    const required = ['PRIVATE_KEY'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        console.error('❌ [DEPLOY] Variáveis de ambiente faltando:', missing.join(', '));
        process.exit(1);
    }
    
    // Valida formato da private key
    const pk = process.env.PRIVATE_KEY;
    if (!pk.startsWith('0x') || pk.length !== 66) {
        console.error('❌ [DEPLOY] PRIVATE_KEY deve começar com 0x e ter 66 caracteres');
        process.exit(1);
    }
    
    console.log('✅ [DEPLOY] Ambiente validado');
}

function loadContractBytecode() {
    const artifactsDir = path.join(__dirname, '..', 'artifacts', 'contracts');
    const contractPath = path.join(artifactsDir, 'GxeonSovereignExecutor.sol', 'GxeonSovereignExecutor.json');
    
    if (!fs.existsSync(contractPath)) {
        console.error('❌ [DEPLOY] Contrato não compilado. Execute primeiro:');
        console.error('   npx hardhat compile');
        process.exit(1);
    }
    
    const artifact = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    return {
        abi: artifact.abi,
        bytecode: artifact.bytecode
    };
}

function loadContractSource() {
    const contractPath = path.join(__dirname, '..', 'contracts', 'GxeonSovereignExecutor.sol');
    
    if (!fs.existsSync(contractPath)) {
        console.error('❌ [DEPLOY] Arquivo de contrato não encontrado:', contractPath);
        process.exit(1);
    }
    
    return fs.readFileSync(contractPath, 'utf8');
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL DE DEPLOY
// ═══════════════════════════════════════════════════════════════════════════

async function deploySovereignExecutor() {
    console.log('🚀 [DEPLOY] INICIANDO DEPLOY DO FLASH-SWEEPER SOVEREIGN');
    console.log('═══════════════════════════════════════════════════════════');
    
    // Valida ambiente
    validateEnvironment();
    
    // Carrega contrato
    const source = loadContractSource();
    console.log('📄 [DEPLOY] Contrato carregado: GxeonSovereignExecutor.sol');
    console.log(`   Tamanho do source: ${source.length} bytes`);
    
    // Conecta à rede Arbitrum
    console.log(`\n🌐 [DEPLOY] Conectando à rede: ${DEPLOY_CONFIG.ARBITRUM.NAME}`);
    console.log(`   RPC: ${DEPLOY_CONFIG.ARBITRUM.RPC_URL}`);
    
    const provider = new ethers.JsonRpcProvider(
        DEPLOY_CONFIG.ARBITRUM.RPC_URL,
        {
            name: DEPLOY_CONFIG.ARBITRUM.NAME,
            chainId: DEPLOY_CONFIG.ARBITRUM.CHAIN_ID
        }
    );
    
    // Testa conexão
    try {
        const blockNumber = await provider.getBlockNumber();
        const network = await provider.getNetwork();
        console.log(`✅ [DEPLOY] Conectado - Block: ${blockNumber}, Chain ID: ${network.chainId}`);
    } catch (error) {
        console.error('❌ [DEPLOY] Falha ao conectar à rede:', error.message);
        process.exit(1);
    }
    
    // Cria wallet
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const balance = await provider.getBalance(wallet.address);
    
    console.log(`\n🔐 [DEPLOY] Wallet: ${wallet.address}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance < ethers.parseEther('0.001')) {
        console.error('❌ [DEPLOY] Saldo insuficiente para deploy (mínimo 0.001 ETH)');
        process.exit(1);
    }
    
    // Prepara constructor arguments
    const args = [
        DEPLOY_CONFIG.ADDRESSES.AAVE_POOL_ADDRESSES_PROVIDER, // _poolAddressesProvider
        DEPLOY_CONFIG.ADDRESSES.USDC,                         // _usdc
        DEPLOY_CONFIG.ADDRESSES.USDT,                         // _usdt
        DEPLOY_CONFIG.ADDRESSES.WETH,                         // _weth
        DEPLOY_CONFIG.ADDRESSES.WBTC,                         // _wbtc
        DEPLOY_CONFIG.ADDRESSES.DAI,                          // _dai
        DEPLOY_CONFIG.ADDRESSES.ARB,                          // _arb
        DEPLOY_CONFIG.ADDRESSES.UNISWAP_V3_ROUTER,            // _uniswapV3Router
        DEPLOY_CONFIG.ADDRESSES.SUSHISWAP_ROUTER,             // _sushiswapRouter
        DEPLOY_CONFIG.ADDRESSES.UNISWAP_V3_QUOTER             // _uniswapV3Quoter
    ];
    
    console.log('\n📋 [DEPLOY] Constructor Arguments:');
    console.log('─────────────────────────────────────');
    const argNames = [
        'PoolAddressesProvider',
        'USDC',
        'USDT',
        'WETH',
        'WBTC',
        'DAI',
        'ARB',
        'UniswapV3Router',
        'SushiSwapRouter',
        'UniswapV3Quoter'
    ];
    args.forEach((arg, i) => {
        console.log(`   ${argNames[i]}: ${arg}`);
    });
    
    // Carrega bytecode (precisa compilar primeiro)
    // Se não tiver artifact, usa hardhat para deploy
    console.log('\n🔨 [DEPLOY] Compilando contrato...');
    
    try {
        // Tenta carregar artifact
        const { abi, bytecode } = loadContractBytecode();
        console.log('✅ [DEPLOY] Artifact carregado');
        
        // Cria factory
        const factory = new ethers.ContractFactory(abi, bytecode, wallet);
        
        // Estima gas
        console.log('⛽ [DEPLOY] Estimando gas...');
        const deployTx = await factory.getDeployTransaction(...args);
        const gasEstimate = await provider.estimateGas(deployTx);
        console.log(`   Gas estimado: ${gasEstimate.toString()} units`);
        
        // Executa deploy
        console.log('\n🚀 [DEPLOY] EXECUTANDO DEPLOY...');
        console.log('─────────────────────────────────────');
        
        const contract = await factory.deploy(...args, {
            maxFeePerGas: DEPLOY_CONFIG.GAS_SETTINGS.maxFeePerGas,
            maxPriorityFeePerGas: DEPLOY_CONFIG.GAS_SETTINGS.maxPriorityFeePerGas,
            gasLimit: gasEstimate * 120n / 100n // 20% buffer
        });
        
        console.log(`   Hash: ${contract.deploymentTransaction().hash}`);
        console.log('   Aguardando confirmação...');
        
        await contract.waitForDeployment();
        
        const contractAddress = await contract.getAddress();
        
        console.log('\n✅ [DEPLOY] CONTRATO DEPLOYADO COM SUCESSO!');
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`   📍 Endereço: ${contractAddress}`);
        console.log(`   🔗 Explorer: https://arbiscan.io/address/${contractAddress}`);
        console.log('═══════════════════════════════════════════════════════════');
        
        // Verifica deployment
        await verifyDeployment(contract, provider);
        
        // Salva artifact de deploy
        await saveDeploymentArtifact(contractAddress, args, contract.deploymentTransaction().hash);
        
        // Atualiza .env
        await updateEnvFile(contractAddress);
        
        return contractAddress;
        
    } catch (error) {
        console.error('\n❌ [DEPLOY] Erro no deploy:', error.message);
        if (error.reason) console.error('   Reason:', error.reason);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICAÇÃO E LOGGING
// ═══════════════════════════════════════════════════════════════════════════

async function verifyDeployment(contract, provider) {
    console.log('\n🔍 [DEPLOY] Verificando deployment...');
    
    try {
        // Verifica owner
        const owner = await contract.owner();
        console.log(`   Owner: ${owner}`);
        
        // Verifica tokens
        const usdc = await contract.USDC();
        const weth = await contract.WETH();
        console.log(`   USDC: ${usdc}`);
        console.log(`   WETH: ${weth}`);
        
        // Verifica módulo ativo
        const active = await contract.moduleActive();
        console.log(`   Módulo Ativo: ${active}`);
        
        // Verifica pools de elite
        const pools = await contract.getElitePools();
        console.log(`   Pools de Elite: ${pools.length}`);
        
        // Verifica profit destination
        const profitDest = await contract.PROFIT_DESTINATION();
        console.log(`   Profit Destination: ${profitDest}`);
        
        console.log('✅ [DEPLOY] Verificação concluída');
        
    } catch (error) {
        console.warn('⚠️ [DEPLOY] Erro na verificação:', error.message);
    }
}

async function saveDeploymentArtifact(address, args, txHash) {
    const artifact = {
        contract: 'GxeonSovereignExecutor',
        network: 'arbitrum',
        chainId: 42161,
        address,
        constructorArgs: args,
        deployTx: txHash,
        timestamp: new Date().toISOString(),
        deployer: process.env.PRIVATE_KEY ? 
            new ethers.Wallet(process.env.PRIVATE_KEY).address : 'unknown'
    };
    
    const outputDir = path.join(__dirname, '..', 'artifacts', 'deployments');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, `GxeonSovereignExecutor_${Date.now()}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(artifact, null, 2));
    
    console.log(`\n📝 [DEPLOY] Artifact salvo: ${outputFile}`);
}

async function updateEnvFile(contractAddress) {
    const envPath = path.join(__dirname, '..', '.env');
    
    if (!fs.existsSync(envPath)) {
        console.warn('⚠️ [DEPLOY] .env não encontrado, criando...');
    }
    
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    
    // Atualiza ou adiciona SOVEREIGN_EXECUTOR_ADDRESS
    const envLine = `SOVEREIGN_EXECUTOR_ADDRESS=${contractAddress}`;
    
    if (envContent.includes('SOVEREIGN_EXECUTOR_ADDRESS=')) {
        envContent = envContent.replace(
            /SOVEREIGN_EXECUTOR_ADDRESS=.*/,
            envLine
        );
    } else {
        envContent += `\n${envLine}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`📝 [DEPLOY] .env atualizado com SOVEREIGN_EXECUTOR_ADDRESS`);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUÇÃO
// ═══════════════════════════════════════════════════════════════════════════

if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    
    switch (command) {
        case 'deploy':
            deploySovereignExecutor()
                .then(address => {
                    console.log('\n🎉 [DEPLOY] Deploy concluído com sucesso!');
                    console.log(`   Contrato: ${address}`);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('\n💥 [DEPLOY] Deploy falhou:', error);
                    process.exit(1);
                });
            break;
            
        case 'verify':
            console.log('🔍 [DEPLOY] Modo verificação (não implementado)');
            console.log('   Use o Hardhat para verificar no Arbiscan:');
            console.log('   npx hardhat verify --network arbitrum <address> [args...]');
            break;
            
        default:
            console.log(`
🌙 DEPLOY SOVEREIGN EXECUTOR - Arbitrum One

Uso: node deploy_executor_contract.js [comando]

Comandos:
  deploy  - Executa deploy do contrato GxeonSovereignExecutor
  verify  - Mostra instruções para verificação no Arbiscan

Pré-requisitos:
  1. Compilar contrato: npx hardhat compile
  2. Configurar .env com PRIVATE_KEY
  3. Ter saldo em ETH na Arbitrum

Endereços de referência (Arbitrum):
  Aave PoolProvider: ${DEPLOY_CONFIG.ADDRESSES.AAVE_POOL_ADDRESSES_PROVIDER}
  Uniswap V3 Router: ${DEPLOY_CONFIG.ADDRESSES.UNISWAP_V3_ROUTER}
  USDC: ${DEPLOY_CONFIG.ADDRESSES.USDC}
  WETH: ${DEPLOY_CONFIG.ADDRESSES.WETH}
            `);
    }
}

export { deploySovereignExecutor, DEPLOY_CONFIG };
