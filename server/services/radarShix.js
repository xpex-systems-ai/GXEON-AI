const supabase = require('./supabase');
const axios = require('axios');
const { ethers } = require('ethers');

/**
 * 🦄 DexLiquidityFetcher — Monitoramento de Pools DEX na Arbitrum
 * Substitui o RealTwitterFetcher (erro 402)
 * Usa DexScreener API (gratuita) para detectar novos pares
 */
class DexLiquidityFetcher {
    constructor() {
        this.baseUrl = 'https://api.dexscreener.com/latest';
        this.chainId = 'arbitrum';
        this.minLiquidityThreshold = 10000; // $10k USD
        this.knownPools = new Set(); // Cache de pools já detectados
        this.lastScanTime = 0;
        this.minScanInterval = 30000; // Min 30s between scans (DexScreener rate limit)
    }

    /**
     * Busca novos pares na Arbitrum com liquidez > $10k
     */
    async scanNewPools() {
        // Rate limiting protection
        const now = Date.now();
        if (now - this.lastScanTime < this.minScanInterval) {
            return []; // Skip scan if too soon
        }
        this.lastScanTime = now;

        try {
            // DexScreener API v1 — chain-specific pairs endpoint
            const response = await axios.get(
                `https://api.dexscreener.com/latest/dex/pairs/arbitrum`,
                { timeout: 10000 }
            );

            const pairs = response.data?.pairs || [];
            const newPools = [];

            for (const pair of pairs) {
                // Filtro: apenas Arbitrum, liquidez > $10k, não visto antes
                if (pair.chainId !== 'arbitrum') continue;
                if (parseFloat(pair.liquidity?.usd || 0) < this.minLiquidityThreshold) continue;
                if (this.knownPools.has(pair.pairAddress)) continue;

                // Marca como conhecido
                this.knownPools.add(pair.pairAddress);

                // Calcula métricas avançadas
                const poolData = this.analyzePool(pair);
                newPools.push(poolData);
            }

            console.log(`[DexLiquidityFetcher] Found ${newPools.length} new high-liquidity pools (${pairs.length} scanned)`);
            return newPools;

        } catch (error) {
            console.error('[DexLiquidityFetcher] Error:', error.message);
            return [];
        }
    }

    /**
     * Analisa um pool e calcula métricas de qualidade
     */
    analyzePool(pair) {
        const liquidityUsd = parseFloat(pair.liquidity?.usd || 0);
        const volume24h = parseFloat(pair.volume?.h24 || 0);
        const priceChange24h = parseFloat(pair.priceChange?.h24 || 0);

        // Calcula price impact estimado (simplificado)
        const priceImpact1k = this.estimatePriceImpact(liquidityUsd, 1000);
        const priceImpact10k = this.estimatePriceImpact(liquidityUsd, 10000);

        // Score de liquidez (0-1 baseado em profundidade)
        const liquidityDepth = this.calculateLiquidityDepth(liquidityUsd, volume24h);

        return {
            pairAddress: pair.pairAddress,
            chainId: 42161, // Arbitrum
            dexName: pair.dexId,
            token0: {
                address: pair.baseToken?.address,
                symbol: pair.baseToken?.symbol
            },
            token1: {
                address: pair.quoteToken?.address,
                symbol: pair.quoteToken?.symbol
            },
            liquidityUsd,
            volume24h,
            priceChange24h,
            priceImpact1k,
            priceImpact10k,
            liquidityDepth,
            detectedAt: new Date().toISOString(),
            priceUsd: pair.priceUsd,
            fdv: pair.fdv
        };
    }

    /**
     * Estima impacto de preço para um trade de tamanho específico
     */
    estimatePriceImpact(liquidityUsd, tradeSize) {
        if (liquidityUsd <= 0) return 1.0;
        // Fórmula simplificada: impacto ~ tradeSize / (2 * liquidity)
        const impact = tradeSize / (2 * liquidityUsd);
        return Math.min(impact, 1.0); // Max 100%
    }

    /**
     * Calcula profundidade da liquidez (0-1)
     */
    calculateLiquidityDepth(liquidityUsd, volume24h) {
        let score = 0;
        
        // Baseado em liquidez absoluta
        if (liquidityUsd > 1000000) score += 0.4; // > $1M
        else if (liquidityUsd > 100000) score += 0.3; // > $100k
        else if (liquidityUsd > 50000) score += 0.2; // > $50k
        else if (liquidityUsd > 10000) score += 0.1; // > $10k

        // Volume indica liquidez ativa
        const volumeRatio = volume24h / liquidityUsd;
        if (volumeRatio > 1.0) score += 0.3; // Volume > liquidez (muito ativo)
        else if (volumeRatio > 0.5) score += 0.2;
        else if (volumeRatio > 0.1) score += 0.1;

        return Math.min(score, 1.0);
    }

    /**
     * Limpa cache antigo (chamar periodicamente)
     */
    clearCache() {
        // Mantém apenas os últimos 5000 pools no cache
        if (this.knownPools.size > 5000) {
            const toKeep = Array.from(this.knownPools).slice(-4000);
            this.knownPools = new Set(toKeep);
        }
    }
}

/**
 * 🐋 SmartMoneyMonitor — Alchemy WebSocket para movimentações > 5 ETH
 */
class SmartMoneyMonitor {
    constructor() {
        this.provider = null;
        this.alchemyKey = process.env.ALCHEMY_API_KEY;
        this.wsUrl = this.alchemyKey 
            ? `wss://arb-mainnet.g.alchemy.com/v2/${this.alchemyKey}`
            : null;
        this.isConnected = false;
        this.transferCallbacks = [];
        this.minEthThreshold = 5; // 5 ETH
    }

    /**
     * Inicia conexão WebSocket com Alchemy
     */
    async start() {
        if (!this.wsUrl) {
            console.warn('[SmartMoneyMonitor] ALCHEMY_API_KEY not configured, skipping WebSocket');
            return false;
        }

        try {
            this.provider = new ethers.WebSocketProvider(this.wsUrl);

            // Error handling to prevent crashes
            this.provider.on('error', (error) => {
                console.error('[SmartMoneyMonitor] WebSocket error:', error.message);
                this.isConnected = false;
                // Auto-reconnect after 10s
                setTimeout(() => this.start(), 10000);
            });

            this.provider.on('close', () => {
                console.warn('[SmartMoneyMonitor] WebSocket closed, reconnecting...');
                this.isConnected = false;
                setTimeout(() => this.start(), 10000);
            });
            
            // Escuta por grandes transfers de ETH
            this.provider.on('block', async (blockNumber) => {
                await this.processBlock(blockNumber);
            });

            this.isConnected = true;
            console.log(`[SmartMoneyMonitor] WebSocket connected to Arbitrum`);
            return true;

        } catch (error) {
            console.error('[SmartMoneyMonitor] Connection failed:', error.message);
            this.isConnected = false;
            // Retry connection after 30s
            setTimeout(() => this.start(), 30000);
            return false;
        }
    }

    /**
     * Processa um bloco em busca de grandes transfers
     */
    async processBlock(blockNumber) {
        if (!this.provider) return;

        try {
            // Busca transfers de ETH nativo com valor > 5 ETH
            const block = await this.provider.getBlock(blockNumber, true);
            if (!block || !block.transactions) return;

            const largeTransfers = [];

            for (const tx of block.transactions) {
                const valueEth = parseFloat(ethers.formatEther(tx.value || 0));
                
                if (valueEth >= this.minEthThreshold) {
                    const transfer = {
                        chainId: 42161,
                        from: tx.from,
                        to: tx.to,
                        amount: valueEth,
                        amountUsd: await this.estimateUsdValue(valueEth),
                        tokenSymbol: 'ETH',
                        blockNumber,
                        txHash: tx.hash,
                        flowType: this.classifyTransfer(tx),
                        detectedAt: new Date().toISOString()
                    };

                    largeTransfers.push(transfer);
                    
                    // Notifica callbacks
                    this.transferCallbacks.forEach(cb => cb(transfer));
                }
            }

            if (largeTransfers.length > 0) {
                console.log(`[SmartMoneyMonitor] Block ${blockNumber}: ${largeTransfers.length} large transfers detected`);
            }

            return largeTransfers;

        } catch (error) {
            console.error(`[SmartMoneyMonitor] Block ${blockNumber} processing failed:`, error.message);
            return [];
        }
    }

    /**
     * Estima valor em USD baseado em ETH
     */
    async estimateUsdValue(ethAmount) {
        // Cache local ou valor fixo estimado para não sobrecarregar APIs
        const ethPriceUsd = 3500; // Atualizar conforme mercado ou cache externo
        return ethAmount * ethPriceUsd;
    }

    /**
     * Classifica o tipo de transferência
     */
    classifyTransfer(tx) {
        // Heurísticas simples para classificação
        if (!tx.to) return 'contract_creation';
        
        // Detectar se é contrato conhecido (DEX, Bridge, etc)
        const toLower = tx.to.toLowerCase();
        
        // Endereços comuns de DEX/Bridges na Arbitrum (exemplos)
        const knownContracts = {
            '0xe592427a0aece92de3edee1f18e0157c05861564': 'uniswap_v3',
            '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'uniswap_router',
            '0x0000000000000000000000000000000000000000': 'burn'
        };

        if (knownContracts[toLower]) {
            return knownContracts[toLower];
        }

        // Se valor é muito alto (> 50 ETH), classifica como whale
        const valueEth = parseFloat(ethers.formatEther(tx.value || 0));
        if (valueEth > 50) return 'whale_movement';

        return 'regular_transfer';
    }

    /**
     * Registra callback para novos transfers
     */
    onLargeTransfer(callback) {
        this.transferCallbacks.push(callback);
    }

    /**
     * Para o monitor
     */
    stop() {
        if (this.provider) {
            this.provider.removeAllListeners('block');
            this.provider.destroy();
            this.provider = null;
        }
        this.isConnected = false;
        console.log('[SmartMoneyMonitor] Stopped');
    }
}

/**
 * 🔫 MempoolSniper — Detecção de liquidez em pending transactions
 * Escuta mempool antes da confirmação do bloco
 */
class MempoolSniper {
    constructor() {
        this.provider = null;
        this.alchemyKey = process.env.ALCHEMY_API_KEY;
        this.wsUrl = this.alchemyKey 
            ? `wss://arb-mainnet.g.alchemy.com/v2/${this.alchemyKey}`
            : null;
        this.isConnected = false;
        this.pendingTxCallbacks = [];
        this.stats = {
            totalPendingSeen: 0,
            largeLiquidityDetected: 0
        };
    }

    /**
     * Inicia escuta do mempool
     */
    async start() {
        if (!this.wsUrl) {
            console.warn('[MempoolSniper] ALCHEMY_API_KEY not configured');
            return false;
        }

        try {
            // Usa provider separado para mempool
            this.provider = new ethers.WebSocketProvider(this.wsUrl);

            // Error handling to prevent crashes
            this.provider.on('error', (error) => {
                console.error('[MempoolSniper] WebSocket error:', error.message);
                this.isConnected = false;
                setTimeout(() => this.start(), 10000);
            });

            this.provider.on('close', () => {
                console.warn('[MempoolSniper] WebSocket closed, reconnecting...');
                this.isConnected = false;
                setTimeout(() => this.start(), 10000);
            });
            
            // Escuta pending transactions
            this.provider.on('pending', async (txHash) => {
                await this.processPendingTransaction(txHash);
            });

            this.isConnected = true;
            console.log(`[MempoolSniper] 🔫 Mempool sniper activated — listening for large liquidity adds`);
            return true;

        } catch (error) {
            console.error('[MempoolSniper] Failed:', error.message);
            this.isConnected = false;
            setTimeout(() => this.start(), 30000);
            return false;
        }
    }

    /**
     * Processa transação pendente
     */
    async processPendingTransaction(txHash) {
        try {
            const tx = await this.provider.getTransaction(txHash);
            if (!tx) return;

            this.stats.totalPendingSeen++;

            // Verifica se é transação de alto valor (> 2 ETH no mempool)
            const valueEth = parseFloat(ethers.formatEther(tx.value || 0));
            if (valueEth >= 2) {
                const pendingData = {
                    txHash: tx.hash,
                    from: tx.from,
                    to: tx.to,
                    valueEth,
                    valueUsd: valueEth * 3500, // Estimativa
                    gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : null,
                    detectedAt: new Date().toISOString(),
                    isHighValue: valueEth >= 5,
                    type: this.classifyPendingTx(tx)
                };

                if (valueEth >= 5) {
                    this.stats.largeLiquidityDetected++;
                    console.log(`[MempoolSniper] 🎯 LARGE PENDING: ${valueEth.toFixed(2)} ETH from ${tx.from?.slice(0, 8)}...`);
                }

                // Notifica callbacks
                this.pendingTxCallbacks.forEach(cb => cb(pendingData));
            }

        } catch (error) {
            // Ignora erros de transações não encontradas
        }
    }

    /**
     * Classifica tipo de transação pendente
     */
    classifyPendingTx(tx) {
        if (!tx.to) return 'contract_deployment';
        
        const toLower = tx.to.toLowerCase();
        const valueEth = parseFloat(ethers.formatEther(tx.value || 0));
        
        // Heurísticas para detectar adição de liquidez
        if (valueEth >= 5) {
            return 'potential_liquidity_add';
        }
        
        return 'high_value_transfer';
    }

    onPendingLiquidity(callback) {
        this.pendingTxCallbacks.push(callback);
    }

    getStats() {
        return { ...this.stats };
    }

    stop() {
        if (this.provider) {
            this.provider.removeAllListeners('pending');
            this.provider.destroy();
            this.provider = null;
        }
        this.isConnected = false;
        console.log('[MempoolSniper] Stopped');
    }
}

/**
 * 🎯 RADAR SHIX v2.0 — Liquidity-First DEX Monitoring
 * 
 * Abandona Twitter API (erro 402) em favor de:
 * - DexScreener API para novos pools
 * - Alchemy WebSocket para smart money
 * - Scan a cada 1s (sync com blocos Arbitrum)
 */
class RadarShixService {
    constructor() {
        this.dexFetcher = new DexLiquidityFetcher();
        this.smartMoney = new SmartMoneyMonitor();
        this.mempoolSniper = new MempoolSniper();
        this.isRunning = false;
        this.intervalId = null;
        this.scanInterval = 15000; // 15 segundos — respeita rate limit DexScreener
        this.blockCount = 0;
        this.opportunitiesFound = 0;
        this.startTime = null;
        this.heartbeatInterval = null;
        
        // 🎯 Visual telemetry for Railway Dashboard
        this.telemetry = {
            scansPerSecond: 0,
            lastScansCount: 0,
            pendingTxSeen: 0,
            smartMoneyEvents: 0,
            highLiquidityAlerts: 0
        };
    }

    /**
     * Inicia o radar de liquidez
     */
    async start() {
        if (this.isRunning) {
            console.log('[RADAR_SHIX] Already running');
            return;
        }

        this.isRunning = true;
        this.startTime = Date.now();
        
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║  🎯 RADAR SHIX v2.0 — Liquidity First                          ║');
        console.log('╠═══════════════════════════════════════════════════════════════╣');
        console.log('║  Source: DexScreener API (FREE) + Alchemy WebSocket            ║');
        console.log('║  Chain: Arbitrum Mainnet (~1s/block)                           ║');
        console.log('║  Alert: New pools > $10k USD | Smart money > 5 ETH             ║');
        console.log('║  Mempool: 🔫 Sniper active for pending liquidity               ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');

        // Inicia monitor de smart money
        await this.smartMoney.start();
        
        // Inicia mempool sniper para pending transactions
        await this.mempoolSniper.start();
        
        // Registra callback para transfers grandes
        this.smartMoney.onLargeTransfer(async (transfer) => {
            this.telemetry.smartMoneyEvents++;
            await this.logSmartMoneyTransfer(transfer);
        });
        
        // Registra callback para pending transactions
        this.mempoolSniper.onPendingLiquidity(async (pending) => {
            this.telemetry.pendingTxSeen++;
            if (pending.isHighValue) {
                await this.logPendingLiquidity(pending);
            }
        });

        // Primeiro scan imediato
        await this.executeScan();

        // Scan perpétuo a cada 1s
        this.intervalId = setInterval(() => {
            this.executeScan();
        }, this.scanInterval);

        // Heartbeat para Railway Dashboard
        this.startHeartbeat();
    }

    /**
     * Para o radar
     */
    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.smartMoney.stop();
        this.mempoolSniper.stop();
        console.log('[RADAR_SHIX] Stopped');
    }

    /**
     * Ciclo de scan: DexScreener + Telemetria
     */
    async executeScan() {
        const scanStart = Date.now();
        this.blockCount++;

        try {
            // 1. Busca novos pools no DexScreener
            const newPools = await this.dexFetcher.scanNewPools();
            
            let highLiquidityAlerts = 0;

            // 2. Processa cada novo pool
            for (const pool of newPools) {
                await this.processNewPool(pool);
                
                if (pool.liquidityUsd >= 10000) {
                    highLiquidityAlerts++;
                }
            }

            if (newPools.length > 0) {
                this.opportunitiesFound += newPools.length;
                this.telemetry.highLiquidityAlerts += highLiquidityAlerts;
                console.log(`[RADAR_SCAN] 🎯 ${newPools.length} NEW POOLS | 🚨 ${highLiquidityAlerts} HIGH LIQUIDITY`);
            }

            // 3. Log de telemetria
            await this.logScanTelemetry({
                blockNumber: this.blockCount,
                newPools: newPools.length,
                highLiquidityAlerts,
                durationMs: Date.now() - scanStart
            });

            // 4. Limpa cache periodicamente
            if (this.blockCount % 1000 === 0) {
                this.dexFetcher.clearCache();
            }

        } catch (error) {
            console.error('[RADAR_SCAN] Error:', error.message);
            await this.logScanTelemetry({
                blockNumber: this.blockCount,
                newPools: 0,
                highLiquidityAlerts: 0,
                durationMs: Date.now() - scanStart,
                error: error.message
            });
        }
    }

    /**
     * Processa um novo pool detectado
     */
    async processNewPool(pool) {
        if (!supabase) return;
        try {
            // Insere no Supabase
            const { data, error } = await supabase
                .from('radar_liquidity_pools')
                .insert({
                    chain_id: pool.chainId,
                    pair_address: pool.pairAddress,
                    token0_address: pool.token0.address,
                    token1_address: pool.token1.address,
                    token0_symbol: pool.token0.symbol,
                    token1_symbol: pool.token1.symbol,
                    dex_name: pool.dexName,
                    liquidity_usd: pool.liquidityUsd,
                    liquidity_depth: pool.liquidityDepth,
                    volume_24h_usd: pool.volume24h,
                    price_impact_1k: pool.priceImpact1k,
                    price_impact_10k: pool.priceImpact10k,
                    detected_at: pool.detectedAt,
                    status: pool.liquidityUsd >= 10000 ? 'high_alert' : 'new',
                    alert_triggered: pool.liquidityUsd >= 10000
                })
                .select()
                .single();

            if (error) {
                // Pool já existe (duplicate)
                if (error.code === '23505') return;
                throw error;
            }

            // Log de alerta se alta liquidez
            if (pool.liquidityUsd >= 10000) {
                console.log(`[POOL_ALERT] 🚨 High liquidity detected:`);
                console.log(`  DEX: ${pool.dexName}`);
                console.log(`  Pair: ${pool.token0.symbol}/${pool.token1.symbol}`);
                console.log(`  Liquidity: $${pool.liquidityUsd.toLocaleString()}`);
                console.log(`  Price Impact (10k): ${(pool.priceImpact10k * 100).toFixed(2)}%`);
            }

        } catch (error) {
            console.error('[processNewPool] Error:', error.message);
        }
    }

    /**
     * Log de transferência smart money
     */
    async logSmartMoneyTransfer(transfer) {
        if (!supabase) return;
        try {
            const isWhale = transfer.amountUsd >= 100000;
            const isNewWallet = false; // TODO: implementar verificação

            const { error } = await supabase
                .from('radar_smart_money_flows')
                .insert({
                    chain_id: transfer.chainId,
                    from_address: transfer.from,
                    to_address: transfer.to,
                    token_symbol: transfer.tokenSymbol,
                    amount: transfer.amount,
                    amount_usd: transfer.amountUsd,
                    flow_type: transfer.flowType,
                    block_number: transfer.blockNumber,
                    transaction_hash: transfer.txHash,
                    detected_at: transfer.detectedAt,
                    is_whale: isWhale,
                    is_new_wallet: isNewWallet,
                    smart_score: isWhale ? 0.9 : 0.5
                });

            if (error) throw error;

            if (isWhale) {
                console.log(`[SMART_MONEY] 🐋 WHALE ALERT: ${transfer.amount.toFixed(2)} ETH ($${transfer.amountUsd.toLocaleString()})`);
            }

        } catch (error) {
            console.error('[logSmartMoneyTransfer] Error:', error.message);
        }
    }

    /**
     * Log de liquidez pendente (mempool sniper)
     */
    async logPendingLiquidity(pending) {
        if (!supabase) return;
        try {
            // Log em tabela separada ou mesma de smart money com flag
            const { error } = await supabase
                .from('radar_smart_money_flows')
                .insert({
                    chain_id: 42161,
                    from_address: pending.from,
                    to_address: pending.to,
                    token_symbol: 'ETH',
                    amount: pending.valueEth,
                    amount_usd: pending.valueUsd,
                    flow_type: pending.type,
                    block_number: 0, // Pending = ainda sem bloco
                    transaction_hash: pending.txHash,
                    detected_at: pending.detectedAt,
                    is_whale: pending.valueUsd >= 100000,
                    is_new_wallet: false,
                    smart_score: 0.7, // Alto score por ser pre-confirmação
                    is_pending: true // Flag para identificar mempool
                });

            if (error) throw error;

            console.log(`[PENDING_LIQUIDITY] 🔫 Pre-confirmed: ${pending.valueEth.toFixed(2)} ETH → ${pending.to?.slice(0, 12)}...`);

        } catch (error) {
            console.error('[logPendingLiquidity] Error:', error.message);
        }
    }

    /**
     * Log de telemetria do scan
     */
    async logScanTelemetry({ blockNumber, newPools, highLiquidityAlerts, durationMs, error = null }) {
        if (!supabase) return;
        try {
            await supabase.from('radar_liquidity_telemetry').insert({
                block_number: blockNumber,
                new_pools_detected: newPools,
                high_liquidity_alerts: highLiquidityAlerts,
                total_pools_tracked: this.dexFetcher.knownPools.size,
                scan_duration_ms: durationMs,
                error: error,
                scanned_at: new Date().toISOString()
            });
        } catch (e) {
            // Silencioso
        }
    }

    /**
     * Heartbeat para Railway Dashboard — Visual Telemetry
     */
    startHeartbeat() {
        // Calcula scans por segundo a cada intervalo
        this.telemetry.lastScansCount = this.blockCount;
        
        this.heartbeatInterval = setInterval(async () => {
            const uptime = Math.floor((Date.now() - this.startTime) / 1000);
            const hours = Math.floor(uptime / 3600);
            const mins = Math.floor((uptime % 3600) / 60);
            
            // Calcula scans por segundo
            const scansSinceLast = this.blockCount - this.telemetry.lastScansCount;
            this.telemetry.scansPerSecond = (scansSinceLast / 30).toFixed(2); // 30s interval
            this.telemetry.lastScansCount = this.blockCount;
            
            // 🎯 Visual output for Railway Dashboard
            console.log(`[RADAR_HEARTBEAT] ⏱️ ${hours}h ${mins}m | ⚡ ${this.telemetry.scansPerSecond} scans/s | 🔍 ${this.blockCount} total | 🎯 ${this.opportunitiesFound} pools | 📊 ${this.dexFetcher.knownPools.size} tracked | 🔫 ${this.telemetry.pendingTxSeen} pending | 🐋 ${this.telemetry.smartMoneyEvents} smart`);
            
            // Ping no Supabase com telemetry completa
            if (!supabase) return;
            try {
                await supabase.from('radar_liquidity_heartbeat').upsert({
                    id: 'liquidity_radar_v1',
                    last_ping: new Date().toISOString(),
                    uptime_seconds: uptime,
                    block_count: this.blockCount,
                    total_pools_detected: this.opportunitiesFound,
                    status: 'scanning',
                    scan_interval_ms: this.scanInterval,
                    total_smart_money_events: this.telemetry.smartMoneyEvents,
                    high_liquidity_alerts: this.telemetry.highLiquidityAlerts
                });
            } catch (e) {}
            
        }, 30000); // 30 segundos
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // API ENDPOINT SUPPORT METHODS (Billing-Protected)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get opportunities (high liquidity pools)
     */
    async getOpportunities(limit = 20) {
        if (!supabase) return [];
        try {
            const { data } = await supabase
                .from('radar_liquidity_pools')
                .select('*')
                .eq('alert_triggered', true)
                .order('detected_at', { ascending: false })
                .limit(limit);

            return data || [];
        } catch (error) {
            console.error('[RADAR_SHIX] getOpportunities error:', error);
            return [];
        }
    }

    /**
     * Get last update timestamp
     */
    async getLastUpdateTime() {
        if (!supabase) return new Date().toISOString();
        try {
            const { data } = await supabase
                .from('radar_liquidity_heartbeat')
                .select('last_ping')
                .eq('id', 'liquidity_radar_v1')
                .single();

            return data?.last_ping || new Date().toISOString();
        } catch (error) {
            return new Date().toISOString();
        }
    }

    /**
     * Check if radar is active
     */
    isActive() {
        return this.isRunning;
    }

    /**
     * Get service uptime in seconds
     */
    getUptime() {
        return this.isRunning && this.startTime 
            ? Math.floor((Date.now() - this.startTime) / 1000) 
            : 0;
    }

    /**
     * Get total opportunities count
     */
    async getTotalOpportunities() {
        if (!supabase) return 0;
        try {
            const { count } = await supabase
                .from('radar_liquidity_pools')
                .select('*', { count: 'exact' });
            return count || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            blockCount: this.blockCount,
            opportunitiesFound: this.opportunitiesFound,
            uptimeSeconds: this.getUptime(),
            trackedPools: this.dexFetcher.knownPools.size,
            smartMoneyConnected: this.smartMoney.isConnected,
            scanIntervalMs: this.scanInterval
        };
    }

    /**
     * Trigger manual scan
     */
    async triggerScan() {
        console.log('[RADAR_SHIX] Manual scan triggered via API');
        await this.executeScan();
        return { 
            success: true, 
            message: 'Scan iniciado manualmente',
            status: this.getStatus()
        };
    }
}

// Export singleton
const radarShixService = new RadarShixService();

module.exports = radarShixService;
