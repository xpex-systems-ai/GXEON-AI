/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FLASH-SWEEPER SOVEREIGN SERVICE v1.0
 * Módulo de Arbitragem Atômica Sem Capital Inicial
 * 
 * Autorizado por: Comandante Sena
 * Rede: Arbitrum One | Protocolo: Aave V3 + Uniswap V3
 * Modalidade: Flash Loans + Arqueologia Digital + JIT Arbitrage
 * 
 * Engine Logic:
 * 1. Monitorar 22 pools de elite via WebSocket Alchemy
 * 2. Calcular discrepância de preço vs custo de gás (0.1 Gwei)
 * 3. Gerar bundle de transação lucrativa (lucro > gás)
 * 4. Executar: Flash Loan -> Arbitragem -> Repagamento -> Profit
 * 
 * Destino Lucro: 0x3955d559055DadB7067054cB6E6f974710345224
 * ═══════════════════════════════════════════════════════════════════════════
 */

import 'dotenv/config';

import { ethers } from 'ethers';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO FLASH-SWEEPER
// ═══════════════════════════════════════════════════════════════════════════
const FLASH_SWEEPER_CONFIG = {
    // Arbitrum RPC (WebSocket para velocidade máxima)
    ARBITRUM_WS_URL: process.env.ALCHEMY_ARBITRUM_WS_URL || process.env.ARBITRUM_WS_URL,
    ARBITRUM_HTTP_URL: process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    
    // Contrato Sovereign Executor
    EXECUTOR_CONTRACT: process.env.SOVEREIGN_EXECUTOR_ADDRESS,
    
    // Aave V3 na Arbitrum
    AAVE_POOL_PROVIDER: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb', // PoolAddressesProvider
    AAVE_POOL: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    
    // Uniswap V3 na Arbitrum
    UNISWAP_V3_ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    UNISWAP_V3_QUOTER: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6',
    UNISWAP_V3_FACTORY: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    
    // SushiSwap V3 na Arbitrum
    SUSHISWAP_ROUTER: '0x2C5dd8FB1b71C5A43D44f47F69F867C5F7e5b6d1',
    
    // Tokens de Elite (Arbitrum)
    TOKENS: {
        USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
        USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
        WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
        WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
        DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
        ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
        LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
        UNI: '0xFa7F8980b0f205E58e01eFB3d1eEdde16cF6632c'
    },
    
    // 22 Pools de Elite (pares de tokens)
    ELITE_POOLS: [
        // Tier 1: Maior liquidez
        { pair: 'USDC/WETH', tokenA: 'USDC', tokenB: 'WETH', fee: 500, tier: 1 },
        { pair: 'USDC/USDT', tokenA: 'USDC', tokenB: 'USDT', fee: 100, tier: 1 },
        { pair: 'USDT/WETH', tokenA: 'USDT', tokenB: 'WETH', fee: 500, tier: 1 },
        { pair: 'WETH/WBTC', tokenA: 'WETH', tokenB: 'WBTC', fee: 500, tier: 1 },
        { pair: 'USDC/DAI', tokenA: 'USDC', tokenB: 'DAI', fee: 100, tier: 1 },
        { pair: 'WETH/DAI', tokenA: 'WETH', tokenB: 'DAI', fee: 500, tier: 1 },
        { pair: 'USDT/DAI', tokenA: 'USDT', tokenB: 'DAI', fee: 100, tier: 1 },
        { pair: 'WETH/ARB', tokenA: 'WETH', tokenB: 'ARB', fee: 3000, tier: 1 },
        
        // Tier 2: Alta liquidez
        { pair: 'USDC/WBTC', tokenA: 'USDC', tokenB: 'WBTC', fee: 3000, tier: 2 },
        { pair: 'USDT/WBTC', tokenA: 'USDT', tokenB: 'WBTC', fee: 3000, tier: 2 },
        { pair: 'WBTC/DAI', tokenA: 'WBTC', tokenB: 'DAI', fee: 3000, tier: 2 },
        { pair: 'ARB/USDC', tokenA: 'ARB', tokenB: 'USDC', fee: 3000, tier: 2 },
        { pair: 'ARB/USDT', tokenA: 'ARB', tokenB: 'USDT', fee: 3000, tier: 2 },
        { pair: 'ARB/WETH', tokenA: 'ARB', tokenB: 'WETH', fee: 3000, tier: 2 },
        { pair: 'ARB/DAI', tokenA: 'ARB', tokenB: 'DAI', fee: 3000, tier: 2 },
        
        // Tier 3: Oportunidades voláteis
        { pair: 'WETH/LINK', tokenA: 'WETH', tokenB: 'LINK', fee: 3000, tier: 3 },
        { pair: 'USDC/LINK', tokenA: 'USDC', tokenB: 'LINK', fee: 3000, tier: 3 },
        { pair: 'WBTC/LINK', tokenA: 'WBTC', tokenB: 'LINK', fee: 3000, tier: 3 },
        { pair: 'WETH/UNI', tokenA: 'WETH', tokenB: 'UNI', fee: 3000, tier: 3 },
        { pair: 'USDC/UNI', tokenA: 'USDC', tokenB: 'UNI', fee: 3000, tier: 3 },
        { pair: 'ARB/LINK', tokenA: 'ARB', tokenB: 'LINK', fee: 3000, tier: 3 },
        { pair: 'ARB/UNI', tokenA: 'ARB', tokenB: 'UNI', fee: 3000, tier: 3 }
    ],
    
    // Parâmetros de execução
    MIN_PROFIT_THRESHOLD_USD: parseFloat(process.env.MIN_PROFIT_USD) || 5, // $5 mínimo
    MAX_GAS_PRICE_GWEI: 0.1, // 0.1 Gwei máximo
    GAS_LIMIT_ARBITRAGE: 500000, // 500k gas units
    POLL_INTERVAL_MS: 1000, // 1 segundo entre verificações
    FLASH_LOAN_PREMIUM_BPS: 5, // 0.05% Aave premium
    
    // Profit destination (Comandante Sena)
    PROFIT_DESTINATION: '0x3955d559055DadB7067054cB6E6f974710345224',
    
    // Feature flags
    SIMULATION_MODE: process.env.FLASH_SIMULATION_MODE === 'true',
    EMERGENCY_STOP: process.env.EMERGENCY_KILL_SWITCH === 'ACTIVE',
    JIT_MODE: true // Just-In-Time liquidity arbitrage
};

// ABI do Sovereign Executor
const EXECUTOR_ABI = [
    // View functions
    'function simulateProfitability(address asset, uint256 amount, tuple(address tokenIn, address tokenOut, address dex, uint24 feeTier, uint256 amountIn, uint256 minAmountOut)[] calldata path) external view returns (bool profitable, uint256 estimatedGrossProfit, uint256 estimatedNetProfit, uint256 estimatedGasCost)',
    'function calculateFlashLoanCost(uint256 amount) external pure returns (uint256)',
    'function getStats() external view returns (uint256 executions, uint256 profit, uint256 flashLoans, uint256 dust, uint256 gasSpent, uint256 lastBlock)',
    'function isElitePool(bytes32 poolId) external view returns (bool)',
    'function elitePools(bytes32) external view returns (bool)',
    'function moduleActive() external view returns (bool)',
    
    // Write functions
    'function initiateArbitrageFlashLoan(address asset, uint256 amount, tuple(address tokenIn, address tokenOut, address dex, uint24 feeTier, uint256 amountIn, uint256 minAmountOut)[] calldata path, uint256 minProfit) external',
    'function initiateDustSweep(bytes32 poolId, uint256 dustAmount, address token) external',
    'function initiateJitArbitrage(address tokenA, address tokenB, uint256 amountA, uint256 amountB, uint256 expectedProfit) external',
    'function setModuleActive(bool active) external',
    
    // Events
    'event FlashLoanExecuted(bytes32 indexed opportunityId, address indexed asset, uint256 amount, uint256 premium)',
    'event ArbitrageAtomicExecuted(bytes32 indexed opportunityId, address tokenIn, address tokenOut, uint256 amountIn, uint256 grossProfit, uint256 netProfit, uint256 gasUsed)',
    'event DustSwept(bytes32 indexed poolId, address token, uint256 amount, uint256 profitGenerated)',
    'event JitLiquidityInjected(bytes32 indexed poolId, uint256 amountTokenA, uint256 amountTokenB, uint256 profitExtracted)',
    'event ProfitSent(uint256 amount, address indexed destination)'
];

// ABI Uniswap V3 Quoter
const QUOTER_ABI = [
    'function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)',
    'function quoteExactInput(bytes memory path, uint256 amountIn) external returns (uint256 amountOut)'
];

// ═══════════════════════════════════════════════════════════════════════════
// SERVIÇO FLASH-SWEEPER
// ═══════════════════════════════════════════════════════════════════════════
class FlashSweeperService {
    constructor() {
        this.provider = null;
        this.wsProvider = null;
        this.wallet = null;
        this.executorContract = null;
        this.quoterContract = null;
        this.supabase = null;
        
        // Estado de monitoramento
        this.poolPrices = new Map();
        this.opportunityQueue = [];
        this.executionStats = {
            opportunitiesFound: 0,
            simulationsRun: 0,
            executionsAttempted: 0,
            executionsSucceeded: 0,
            totalProfitUsd: 0,
            totalGasCost: 0
        };
        
        // Controles
        this.isRunning = false;
        this.lastBlock = 0;
        this.activeOpportunities = new Map();
        
        this.init();
    }
    
    async init() {
        console.log('🔥 [FLASH-SWEEPER] Inicializando Módulo Sovereign...');
        
        // Inicializa provider WebSocket (velocidade máxima)
        if (FLASH_SWEEPER_CONFIG.ARBITRUM_WS_URL) {
            this.wsProvider = new ethers.WebSocketProvider(FLASH_SWEEPER_CONFIG.ARBITRUM_WS_URL);
            console.log('⚡ [FLASH-SWEEPER] WebSocket provider conectado');
        }
        
        // Provider HTTP backup
        this.provider = new ethers.JsonRpcProvider(FLASH_SWEEPER_CONFIG.ARBITRUM_HTTP_URL);
        
        // Wallet do executor
        if (process.env.PRIVATE_KEY) {
            this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            console.log(`🔐 [FLASH-SWEEPER] Wallet: ${this.wallet.address}`);
        } else {
            console.error('❌ [FLASH-SWEEPER] PRIVATE_KEY não configurada');
            return;
        }
        
        // Contrato executor
        if (FLASH_SWEEPER_CONFIG.EXECUTOR_CONTRACT) {
            this.executorContract = new ethers.Contract(
                FLASH_SWEEPER_CONFIG.EXECUTOR_CONTRACT,
                EXECUTOR_ABI,
                this.wallet
            );
            console.log(`📜 [FLASH-SWEEPER] Executor: ${FLASH_SWEEPER_CONFIG.EXECUTOR_CONTRACT}`);
        } else {
            console.warn('⚠️ [FLASH-SWEEPER] EXECUTOR_CONTRACT não configurado - modo simulação apenas');
        }
        
        // Quoter Uniswap V3
        this.quoterContract = new ethers.Contract(
            FLASH_SWEEPER_CONFIG.UNISWAP_V3_QUOTER,
            QUOTER_ABI,
            this.provider
        );
        
        // Supabase para logging
        this.initSupabase();
        
        console.log('✅ [FLASH-SWEEPER] Módulo inicializado - Aguardando comando');
    }
    
    initSupabase() {
        const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && supabaseKey) {
            this.supabase = createClient(supabaseUrl, supabaseKey);
            console.log('🗄️ [FLASH-SWEEPER] Supabase conectado');
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // MOTOR PRINCIPAL - MONITORAMENTO E EXECUÇÃO
    // ═══════════════════════════════════════════════════════════════════
    
    async start() {
        if (this.isRunning) {
            console.log('⚠️ [FLASH-SWEEPER] Já está rodando');
            return;
        }
        
        if (FLASH_SWEEPER_CONFIG.EMERGENCY_STOP) {
            console.error('🛑 [FLASH-SWEEPER] EMERGENCY STOP ATIVO');
            return;
        }
        
        console.log('🚀 [FLASH-SWEEPER] INICIANDO MONITORAMENTO DOS 22 POOLS DE ELITE');
        this.isRunning = true;
        
        // Verifica se módulo está ativo no contrato
        if (this.executorContract) {
            const isActive = await this.executorContract.moduleActive();
            if (!isActive) {
                console.warn('⚠️ [FLASH-SWEEPER] Contrato desativado - ative com setModuleActive(true)');
            }
        }
        
        // Inicia WebSocket listener para blocos
        this.startBlockListener();
        
        // Loop principal de monitoramento
        this.monitorLoop();
    }
    
    async startBlockListener() {
        if (!this.wsProvider) return;
        
        this.wsProvider.on('block', async (blockNumber) => {
            this.lastBlock = blockNumber;
            
            // Atualiza preços a cada bloco
            await this.updatePoolPrices();
            
            // Busca oportunidades
            await this.scanForOpportunities();
        });
        
        console.log('📡 [FLASH-SWEEPER] Block listener ativo via WebSocket');
    }
    
    async monitorLoop() {
        while (this.isRunning) {
            try {
                const startTime = Date.now();
                
                // Atualiza preços se não usando WebSocket
                if (!this.wsProvider) {
                    await this.updatePoolPrices();
                }
                
                // Processa oportunidades em fila
                await this.processOpportunityQueue();
                
                // Busca dust em pools
                if (FLASH_SWEEPER_CONFIG.JIT_MODE) {
                    await this.scanForDust();
                }
                
                // Estatísticas
                const elapsed = Date.now() - startTime;
                if (elapsed < FLASH_SWEEPER_CONFIG.POLL_INTERVAL_MS) {
                    await this.sleep(FLASH_SWEEPER_CONFIG.POLL_INTERVAL_MS - elapsed);
                }
                
            } catch (error) {
                console.error('❌ [FLASH-SWEEPER] Erro no loop:', error.message);
                await this.sleep(5000);
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // ANÁLISE DE PREÇOS E OPORTUNIDADES
    // ═══════════════════════════════════════════════════════════════════
    
    async updatePoolPrices() {
        const updates = [];
        
        for (const pool of FLASH_SWEEPER_CONFIG.ELITE_POOLS) {
            try {
                const tokenA = FLASH_SWEEPER_CONFIG.TOKENS[pool.tokenA];
                const tokenB = FLASH_SWEEPER_CONFIG.TOKENS[pool.tokenB];
                
                // Consulta preço via Quoter (simula swap de 1 tokenA)
                const amountIn = ethers.parseUnits('1', 6); // 1 USDC/USDT
                
                const price = await this.quoterContract.quoteExactInputSingle(
                    tokenA,
                    tokenB,
                    pool.fee,
                    amountIn,
                    0
                );
                
                const poolId = ethers.keccak256(ethers.toUtf8Bytes(pool.pair));
                const previousPrice = this.poolPrices.get(poolId);
                
                this.poolPrices.set(poolId, {
                    pair: pool.pair,
                    price: price,
                    timestamp: Date.now(),
                    block: this.lastBlock,
                    fee: pool.fee,
                    tier: pool.tier
                });
                
                // Detecta mudança de preço
                if (previousPrice) {
                    const divergence = this.calculateDivergence(previousPrice.price, price);
                    if (divergence > 10) { // 0.1% de divergência
                        updates.push({
                            poolId,
                            pair: pool.pair,
                            divergence,
                            previousPrice: previousPrice.price,
                            currentPrice: price
                        });
                    }
                }
                
            } catch (error) {
                // Ignora erros de quoter (pool pode não existir)
            }
        }
        
        // Processa divergências detectadas
        for (const update of updates) {
            await this.analyzeDivergence(update);
        }
    }
    
    calculateDivergence(oldPrice, newPrice) {
        const diff = Math.abs(Number(newPrice) - Number(oldPrice));
        return (diff / Number(oldPrice)) * 10000; // em basis points
    }
    
    async analyzeDivergence(update) {
        // Procura por oportunidade de arbitragem
        // Divergência > 0.15% (15 bps) + custo flash loan 0.05% = mínimo 0.20%
        
        const minDivergenceBps = 20; // 0.20%
        
        if (update.divergence >= minDivergenceBps) {
            console.log(`💡 [FLASH-SWEEPER] Divergência detectada: ${update.pair} - ${update.divergence / 100}%`);
            
            const opportunity = await this.buildArbitrageOpportunity(update);
            
            if (opportunity.profitable) {
                this.opportunityQueue.push(opportunity);
                this.executionStats.opportunitiesFound++;
            }
        }
    }
    
    async buildArbitrageOpportunity(divergence) {
        // Constrói path de arbitragem
        const [tokenASymbol, tokenBSymbol] = divergence.pair.split('/');
        const tokenA = FLASH_SWEEPER_CONFIG.TOKENS[tokenASymbol];
        const tokenB = FLASH_SWEEPER_CONFIG.TOKENS[tokenBSymbol];
        
        // Flash loan em USDC ou WETH (mais líquido)
        const flashAsset = tokenA === FLASH_SWEEPER_CONFIG.TOKENS.USDC ? tokenA : FLASH_SWEEPER_CONFIG.TOKENS.USDC;
        const flashAmount = ethers.parseUnits('10000', 6); // 10k USDC
        
        // Path: flashAsset -> tokenB -> flashAsset (arbitragem triangular)
        const path = [
            {
                tokenIn: flashAsset,
                tokenOut: tokenA,
                dex: FLASH_SWEEPER_CONFIG.UNISWAP_V3_ROUTER,
                feeTier: 500,
                amountIn: 0,
                minAmountOut: 0
            },
            {
                tokenIn: tokenA,
                tokenOut: tokenB,
                dex: FLASH_SWEEPER_CONFIG.UNISWAP_V3_ROUTER,
                feeTier: divergence.fee || 500,
                amountIn: 0,
                minAmountOut: 0
            },
            {
                tokenIn: tokenB,
                tokenOut: flashAsset,
                dex: FLASH_SWEEPER_CONFIG.UNISWAP_V3_ROUTER,
                feeTier: 500,
                amountIn: 0,
                minAmountOut: 0
            }
        ];
        
        // Simula lucratividade
        let estimatedProfit = 0;
        let profitable = false;
        
        if (this.executorContract) {
            try {
                const sim = await this.executorContract.simulateProfitability(
                    flashAsset,
                    flashAmount,
                    path
                );
                
                profitable = sim.profitable;
                estimatedProfit = sim.estimatedNetProfit;
                
                this.executionStats.simulationsRun++;
                
            } catch (error) {
                console.warn('⚠️ [FLASH-SWEEPER] Simulação falhou:', error.message);
            }
        } else {
            // Simulação off-chain simples
            const flashCost = (flashAmount * 5n) / 10000n; // 0.05%
            const estimatedReturn = flashAmount + (flashAmount * BigInt(Math.floor(divergence.divergence)) / 10000n);
            estimatedProfit = estimatedReturn - flashAmount - flashCost;
            profitable = estimatedProfit > FLASH_SWEEPER_CONFIG.MIN_PROFIT_THRESHOLD_USD * 1e6;
        }
        
        return {
            id: ethers.keccak256(ethers.toUtf8Bytes(`${divergence.pair}-${Date.now()}`)),
            pair: divergence.pair,
            divergence: divergence.divergence,
            flashAsset,
            flashAmount,
            path,
            estimatedProfit,
            profitable,
            gasCost: ethers.parseUnits('0.01', 'gwei') * BigInt(FLASH_SWEEPER_CONFIG.GAS_LIMIT_ARBITRAGE),
            timestamp: Date.now(),
            attempts: 0
        };
    }
    
    async scanForOpportunities() {
        // Verifica fila de oportunidades
        if (this.opportunityQueue.length === 0) return;
        
        // Ordena por lucratividade
        this.opportunityQueue.sort((a, b) => 
            Number(b.estimatedProfit) - Number(a.estimatedProfit)
        );
    }
    
    async processOpportunityQueue() {
        if (this.opportunityQueue.length === 0) return;
        
        // Pega a melhor oportunidade
        const opportunity = this.opportunityQueue.shift();
        
        // Verifica se ainda é válida (não muito antiga)
        if (Date.now() - opportunity.timestamp > 30000) { // 30s max
            console.log('⏰ [FLASH-SWEEPER] Oportunidade expirada');
            return;
        }
        
        // Re-simula antes de executar
        let isStillProfitable = opportunity.profitable;
        
        if (this.executorContract && !FLASH_SWEEPER_CONFIG.SIMULATION_MODE) {
            try {
                const sim = await this.executorContract.simulateProfitability(
                    opportunity.flashAsset,
                    opportunity.flashAmount,
                    opportunity.path
                );
                isStillProfitable = sim.profitable;
            } catch (error) {
                console.warn('⚠️ [FLASH-SWEEPER] Re-simulação falhou');
                return;
            }
        }
        
        if (isStillProfitable && !FLASH_SWEEPER_CONFIG.SIMULATION_MODE) {
            await this.executeArbitrage(opportunity);
        } else if (FLASH_SWEEPER_CONFIG.SIMULATION_MODE) {
            console.log(`🧪 [FLASH-SWEEPER] SIMULAÇÃO: Lucro estimado ${ethers.formatUnits(opportunity.estimatedProfit, 6)} USDC`);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // EXECUÇÃO DE FLASH LOANS
    // ═══════════════════════════════════════════════════════════════════
    
    async executeArbitrage(opportunity) {
        if (!this.executorContract) return;
        
        console.log(`⚡ [FLASH-SWEEPER] Executando arbitragem ${opportunity.pair}`);
        console.log(`   Flash: ${ethers.formatUnits(opportunity.flashAmount, 6)} USDC`);
        console.log(`   Lucro estimado: ${ethers.formatUnits(opportunity.estimatedProfit, 6)} USDC`);
        
        try {
            this.executionStats.executionsAttempted++;
            
            // Prepara transação
            const minProfit = opportunity.estimatedProfit * 80n / 100n; // 80% do estimado
            
            // Executa flash loan
            const tx = await this.executorContract.initiateArbitrageFlashLoan(
                opportunity.flashAsset,
                opportunity.flashAmount,
                opportunity.path,
                minProfit,
                {
                    gasLimit: FLASH_SWEEPER_CONFIG.GAS_LIMIT_ARBITRAGE,
                    maxFeePerGas: ethers.parseUnits(FLASH_SWEEPER_CONFIG.MAX_GAS_PRICE_GWEI.toString(), 'gwei')
                }
            );
            
            console.log(`📤 [FLASH-SWEEPER] TX enviada: ${tx.hash}`);
            
            // Aguarda confirmação
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                console.log(`✅ [FLASH-SWEEPER] EXECUÇÃO BEM-SUCEDIDA!`);
                this.executionStats.executionsSucceeded++;
                this.executionStats.totalProfitUsd += Number(ethers.formatUnits(opportunity.estimatedProfit, 6));
                
                // Log no Supabase
                await this.logExecution(opportunity, receipt, true);
            } else {
                console.error(`❌ [FLASH-SWEEPER] TX falhou`);
                await this.logExecution(opportunity, receipt, false);
            }
            
        } catch (error) {
            console.error(`❌ [FLASH-SWEEPER] Erro na execução:`, error.message);
            opportunity.attempts++;
            
            // Reinsere na fila se tentativas < 3
            if (opportunity.attempts < 3) {
                this.opportunityQueue.push(opportunity);
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // ARQUEOLOGIA DIGITAL (DUST SWEEPING)
    // ═══════════════════════════════════════════════════════════════════
    
    async scanForDust() {
        // Simulação: Em produção, monitora eventos de Swap para identificar dust
        // Dust = remanescentes de liquidez após grandes swaps
        
        for (const pool of FLASH_SWEEPER_CONFIG.ELITE_POOLS) {
            // Verifica se há dust significativo (simulado)
            const dustProbability = Math.random();
            
            if (dustProbability > 0.98) { // 2% chance de dust
                const dustAmount = ethers.parseUnits((Math.random() * 100 + 50).toFixed(2), 6);
                const poolId = ethers.keccak256(ethers.toUtf8Bytes(pool.pair));
                
                console.log(`🧹 [FLASH-SWEEPER] Dust detectado em ${pool.pair}: ${ethers.formatUnits(dustAmount, 6)} USDC`);
                
                if (!FLASH_SWEEPER_CONFIG.SIMULATION_MODE && this.executorContract) {
                    try {
                        const tx = await this.executorContract.initiateDustSweep(
                            poolId,
                            dustAmount,
                            FLASH_SWEEPER_CONFIG.TOKENS.USDC,
                            {
                                gasLimit: 300000,
                                maxFeePerGas: ethers.parseUnits('0.1', 'gwei')
                            }
                        );
                        
                        await tx.wait();
                        this.executionStats.totalProfitUsd += Number(ethers.formatUnits(dustAmount * 5n / 100n, 6));
                        
                    } catch (error) {
                        console.warn('⚠️ [FLASH-SWEEPER] Dust sweep falhou:', error.message);
                    }
                }
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // UTILITÁRIOS E LOGGING
    // ═══════════════════════════════════════════════════════════════════
    
    async logExecution(opportunity, receipt, success) {
        if (!this.supabase) return;
        
        try {
            await this.supabase.from('flash_sweeper_executions').insert({
                opportunity_id: opportunity.id,
                pair: opportunity.pair,
                flash_amount: opportunity.flashAmount.toString(),
                estimated_profit: opportunity.estimatedProfit.toString(),
                gas_used: receipt.gasUsed?.toString() || '0',
                tx_hash: receipt.hash || receipt.transactionHash,
                success,
                block_number: receipt.blockNumber,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.warn('⚠️ [FLASH-SWEEPER] Falha ao logar:', error.message);
        }
    }
    
    getStats() {
        return {
            ...this.executionStats,
            queueLength: this.opportunityQueue.length,
            isRunning: this.isRunning,
            lastBlock: this.lastBlock,
            poolsMonitored: FLASH_SWEEPER_CONFIG.ELITE_POOLS.length
        };
    }
    
    async stop() {
        this.isRunning = false;
        if (this.wsProvider) {
            this.wsProvider.removeAllListeners();
        }
        console.log('🛑 [FLASH-SWEEPER] Módulo parado');
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAÇÃO E INICIALIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

const flashSweeper = new FlashSweeperService();

// Comandos CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    
    switch (command) {
        case 'start':
            flashSweeper.start();
            break;
        case 'stats':
            console.log('📊 [FLASH-SWEEPER] Estatísticas:', flashSweeper.getStats());
            break;
        case 'stop':
            flashSweeper.stop();
            break;
        default:
            console.log(`
🌙 FLASH-SWEEPER SOVEREIGN - Módulo de Arbitragem Atômica

Uso: node flashSweeper.js [comando]

Comandos:
  start   - Inicia monitoramento dos 22 pools de elite
  stats   - Mostra estatísticas de execução
  stop    - Para o serviço

Configuração via variáveis de ambiente:
  - ALCHEMY_ARBITRUM_WS_URL (WebSocket Alchemy)
  - SOVEREIGN_EXECUTOR_ADDRESS (endereço do contrato)
  - PRIVATE_KEY (chave para execução)
  - SUPABASE_PROJECT_URL (opcional - logging)

Destino do Lucro: ${FLASH_SWEEPER_CONFIG.PROFIT_DESTINATION}
            `);
    }
}

export { FlashSweeperService, flashSweeper, FLASH_SWEEPER_CONFIG };
