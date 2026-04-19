/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 👁️ SOVEREIGN ORACLE v20.0 — Autonomous A2A Oracle Provider
 * Arquitetura: Event-Driven Microservices
 * Protocolo: JSON-RPC 2.0 + MEV-Compatible Streaming
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { ethers } = require('ethers');
const EventEmitter = require('events');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO ULTRA-LOW LATÊNCIA
// ═══════════════════════════════════════════════════════════════════════════
const ORACLE_CONFIG = {
    chainId: 42161, // Arbitrum Mainnet
    blockTimeMs: 250, // ~4 blocks/second
    syncThreshold: 64, // Bypass após 64 confirmações
    batchWindowMs: 500, // Flush de eventos a cada 500ms
    compression: 'BIP_PACKET', // Protocolo de compressão
    
    // Thresholds de sinal
    minLiquidityUsd: 10000,
    minWhaleEth: 10, // Aumentado de 5 para 10 ETH
    minMempoolEth: 5,
    
    // WebSocket High-Speed
    wsReconnectMs: 1000,
    wsHeartbeatMs: 30000,
    
    // Buffer de eventos
    maxBufferSize: 1000,
    flushIntervalMs: 500
};

// ═══════════════════════════════════════════════════════════════════════════
// JSON-RPC 2.0 FRAMEWORK
// ═══════════════════════════════════════════════════════════════════════════
class JSONRPCFramework {
    static success(id, result) {
        return {
            jsonrpc: '2.0',
            id,
            result,
            timestamp: Date.now()
        };
    }
    
    static error(id, code, message, data = null) {
        return {
            jsonrpc: '2.0',
            id,
            error: { code, message, data },
            timestamp: Date.now()
        };
    }
    
    static notification(method, params) {
        return {
            jsonrpc: '2.0',
            method,
            params,
            timestamp: Date.now()
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HIGH-SPEED EVENT BUFFER (Redis in-memory fallback)
// ═══════════════════════════════════════════════════════════════════════════
class AsyncBatchStream {
    constructor(flushCallback, windowMs = 500) {
        this.buffer = [];
        this.flushCallback = flushCallback;
        this.windowMs = windowMs;
        this.lastFlush = Date.now();
        this.flushTimer = null;
        this.metrics = {
            eventsReceived: 0,
            eventsFlushed: 0,
            avgLatencyMs: 0
        };
    }
    
    push(event) {
        const enrichedEvent = {
            ...event,
            _oracle_timestamp: Date.now(),
            _oracle_sequence: this.metrics.eventsReceived++
        };
        
        this.buffer.push(enrichedEvent);
        
        // Flush imediato se buffer cheio
        if (this.buffer.length >= ORACLE_CONFIG.maxBufferSize) {
            this.flush();
        } else if (!this.flushTimer) {
            // Agendar flush
            this.flushTimer = setTimeout(() => this.flush(), this.windowMs);
        }
    }
    
    async flush() {
        if (this.buffer.length === 0) return;
        
        const batch = this.buffer.splice(0, this.buffer.length);
        const startTime = Date.now();
        
        try {
            await this.flushCallback(batch);
            const latency = Date.now() - startTime;
            this.metrics.eventsFlushed += batch.length;
            this.metrics.avgLatencyMs = (this.metrics.avgLatencyMs * 0.9) + (latency * 0.1);
        } catch (err) {
            console.error(`[ORACLE_BUFFER] Flush failed: ${err.message}`);
            // Re-enfileirar em caso de falha
            this.buffer.unshift(...batch);
        }
        
        this.flushTimer = null;
        this.lastFlush = Date.now();
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            bufferSize: this.buffer.length,
            lastFlushMs: Date.now() - this.lastFlush
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// ALCHEMY HIGH-SPEED WEBSOCKET ENGINE
// ═══════════════════════════════════════════════════════════════════════════
class AlchemyHighSpeedEngine {
    constructor(apiKey, eventEmitter) {
        this.apiKey = apiKey;
        this.wsUrl = `wss://arb-mainnet.g.alchemy.com/v2/${apiKey}`;
        this.emitter = eventEmitter;
        this.provider = null;
        this.isConnected = false;
        this.blockCache = new Map();
        this.pendingTxCache = new Map();
        this.connectionStats = {
            connectedAt: null,
            blocksProcessed: 0,
            pendingTxSeen: 0,
            reconnects: 0,
            latencyMs: 0
        };
    }
    
    async connect() {
        if (!this.apiKey) {
            console.error('[ALCHEMY_ENGINE] API Key não configurada');
            return false;
        }
        
        try {
            const startTime = Date.now();
            this.provider = new ethers.WebSocketProvider(this.wsUrl);
            
            // WebSocket handlers
            this.provider._websocket.on('open', () => {
                this.isConnected = true;
                this.connectionStats.connectedAt = Date.now();
                this.connectionStats.latencyMs = Date.now() - startTime;
                console.log(`[ALCHEMY_ENGINE] Connected (${this.connectionStats.latencyMs}ms handshake)`);
            });
            
            // ═══════════════════════════════════════════════════════════
            // 🛡️ GXEON ESCUDO CONTRA BLOQUEIO DE REDE (429) - v21.1
            // ═══════════════════════════════════════════════════════════
            this.provider._websocket.on('error', (err) => {
                // Rate limit detection (429)
                if (err.message && (err.message.includes('429') || err.message.includes('rate limit') || err.message.includes('Rate limit'))) {
                    console.error('⚠️ [GXEON] Alchemy Rate Limit! Iniciando Protocolo de Recuo (30s)...');
                    this.isConnected = false;
                    
                    // Corta a conexão infectada
                    try {
                        this.provider._websocket.terminate();
                        this.provider.removeAllListeners();
                        this.provider.destroy();
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    
                    // Protocolo de recuo com backoff exponencial
                    const backoffMs = Math.min(30000 * Math.pow(2, Math.min(this.connectionStats.reconnects, 3)), 300000);
                    console.log(`🚀 [GXEON] Tentando decolagem segura em ${backoffMs/1000}s...`);
                    
                    setTimeout(() => {
                        this.connectionStats.reconnects++;
                        this.connect();
                    }, backoffMs);
                    
                    return;
                }
                
                // Frame error protection
                if (err.message && err.message.includes('Invalid WebSocket frame')) {
                    console.warn('🛡️ [GXEON] Frame corrompido detectado e neutralizado.');
                    return;
                }
                
                console.error(`[ALCHEMY_ENGINE] WS Error: ${err.message}`);
                this.isConnected = false;
            });
            
            this.provider._websocket.on('close', () => {
                console.warn('[ALCHEMY_ENGINE] WS Closed - reconnecting...');
                this.isConnected = false;
                this.connectionStats.reconnects++;
                setTimeout(() => this.connect(), ORACLE_CONFIG.wsReconnectMs);
            });
            
            // Block subscription
            this.provider.on('block', async (blockNumber) => {
                const blockStart = Date.now();
                await this.processBlock(blockNumber);
                this.connectionStats.blocksProcessed++;
                this.connectionStats.latencyMs = Date.now() - blockStart;
            });
            
            // Pending transaction subscription
            this.provider.on('pending', async (txHash) => {
                await this.processPendingTx(txHash);
            });
            
            return true;
            
        } catch (err) {
            console.error(`[ALCHEMY_ENGINE] Connection failed: ${err.message}`);
            setTimeout(() => this.connect(), ORACLE_CONFIG.wsReconnectMs);
            return false;
        }
    }
    
    async processBlock(blockNumber) {
        try {
            const block = await this.provider.getBlock(blockNumber, true);
            if (!block || !block.transactions) return;
            
            const signals = [];
            
            for (const tx of block.transactions) {
                const valueEth = parseFloat(ethers.formatEther(tx.value || 0));
                
                // Sinal de whale (>= 10 ETH)
                if (valueEth >= ORACLE_CONFIG.minWhaleEth) {
                    signals.push({
                        type: 'whale_movement',
                        subtype: this.classifyTransaction(tx),
                        blockNumber,
                        timestamp: block.timestamp * 1000,
                        transaction: {
                            hash: tx.hash,
                            from: tx.from,
                            to: tx.to,
                            valueEth,
                            valueUsd: valueEth * 3500, // Estimativa
                            gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : null
                        },
                        metadata: {
                            confirmations: 1,
                            chainId: ORACLE_CONFIG.chainId,
                            priority: valueEth >= 50 ? 'critical' : valueEth >= 20 ? 'high' : 'medium'
                        }
                    });
                }
            }
            
            if (signals.length > 0) {
                this.emitter.emit('oracle:whale_signals', signals);
            }
            
        } catch (err) {
            console.error(`[ALCHEMY_ENGINE] Block ${blockNumber} error: ${err.message}`);
        }
    }
    
    async processPendingTx(txHash) {
        try {
            const tx = await this.provider.getTransaction(txHash);
            if (!tx) return;
            
            this.connectionStats.pendingTxSeen++;
            
            const valueEth = parseFloat(ethers.formatEther(tx.value || 0));
            
            // Apenas transações de alto valor no mempool
            if (valueEth >= ORACLE_CONFIG.minMempoolEth) {
                const signal = {
                    type: 'mempool_liquidity',
                    subtype: this.classifyPendingTransaction(tx),
                    timestamp: Date.now(),
                    transaction: {
                        hash: tx.hash,
                        from: tx.from,
                        to: tx.to,
                        valueEth,
                        valueUsd: valueEth * 3500,
                        gasPrice: tx.gasPrice ? ethers.formatUnits(tx.gasPrice, 'gwei') : null,
                        maxFeePerGas: tx.maxFeePerGas ? ethers.formatUnits(tx.maxFeePerGas, 'gwei') : null,
                        maxPriorityFeePerGas: tx.maxPriorityFeePerGas ? ethers.formatUnits(tx.maxPriorityFeePerGas, 'gwei') : null
                    },
                    metadata: {
                        status: 'pending',
                        chainId: ORACLE_CONFIG.chainId,
                        priority: 'pre_confirmation',
                        estimatedConfirmationMs: 250 // Arbitrum ~250ms/block
                    }
                };
                
                this.emitter.emit('oracle:mempool_signal', signal);
            }
            
        } catch (err) {
            // Silencioso para pending txs não encontradas
        }
    }
    
    classifyTransaction(tx) {
        if (!tx.to) return 'contract_creation';
        
        const toLower = tx.to.toLowerCase();
        
        // DEXes conhecidas
        const dexes = {
            '0xe592427a0aece92de3edee1f18e0157c05861564': 'uniswap_v3_router',
            '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': 'uniswap_universal_router',
            '0x1b02da8cb0d097eb8d57af1756513731fcc32000': 'sushiswap_router',
            '0xc873fecbd354f5a56e99e72b53b7991e4d929c2b': 'camelot_router',
            '0x1111111254eeb25477b68fb85ed929f73a960582': '1inch_router',
            '0xdef1c0ded9bec7f1a1670819833240f027b25eff': '0x_router'
        };
        
        if (dexes[toLower]) return dexes[toLower];
        
        const valueEth = parseFloat(ethers.formatEther(tx.value || 0));
        if (valueEth > 100) return 'institutional_transfer';
        if (valueEth > 50) return 'whale_movement';
        
        return 'high_value_transfer';
    }
    
    classifyPendingTransaction(tx) {
        if (!tx.to) return 'contract_deployment';
        
        const valueEth = parseFloat(ethers.formatEther(tx.value || 0));
        
        if (valueEth >= 50) return 'mega_whale_pending';
        if (valueEth >= 20) return 'whale_pending';
        if (valueEth >= 10) return 'large_transfer_pending';
        
        return 'standard_pending';
    }
    
    disconnect() {
        if (this.provider) {
            this.provider.removeAllListeners();
            this.provider.destroy();
            this.provider = null;
        }
        this.isConnected = false;
    }
    
    getStats() {
        return {
            ...this.connectionStats,
            isConnected: this.isConnected,
            uptimeMs: this.isConnected ? Date.now() - this.connectionStats.connectedAt : 0
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEX LIQUIDITY ORACLE (Integração com DexScreener + Cache)
// ═══════════════════════════════════════════════════════════════════════════
class LiquidityOracleEngine {
    constructor(eventEmitter) {
        this.emitter = eventEmitter;
        this.knownPools = new Map(); // pairAddress -> poolData
        this.lastScan = 0;
        this.scanIntervalMs = 30000; // 30s (respeita rate limit)
        this.baseUrl = 'https://api.dexscreener.com/latest';
        this.metrics = {
            poolsTracked: 0,
            highLiquidityAlerts: 0,
            apiCalls: 0,
            lastScanMs: 0
        };
    }
    
    async scan() {
        const now = Date.now();
        if (now - this.lastScan < this.scanIntervalMs) return [];
        
        this.lastScan = now;
        const startTime = Date.now();
        
        try {
            const axios = require('axios');
            const response = await axios.get(
                `${this.baseUrl}/dex/search?q=arbitrum`,
                { timeout: 10000 }
            );
            
            this.metrics.apiCalls++;
            const pairs = response.data?.pairs || [];
            const newSignals = [];
            
            for (const pair of pairs) {
                if (pair.chainId !== 'arbitrum') continue;
                
                const liquidityUsd = parseFloat(pair.liquidity?.usd || 0);
                if (liquidityUsd < ORACLE_CONFIG.minLiquidityUsd) continue;
                
                const pairAddress = pair.pairAddress;
                const isNew = !this.knownPools.has(pairAddress);
                const existingPool = this.knownPools.get(pairAddress);
                
                // Detectar mudanças significativas de liquidez (>20%)
                const liquidityChanged = existingPool && 
                    Math.abs(liquidityUsd - existingPool.liquidityUsd) / existingPool.liquidityUsd > 0.2;
                
                const poolData = {
                    pairAddress,
                    chainId: ORACLE_CONFIG.chainId,
                    dexId: pair.dexId,
                    token0: {
                        address: pair.baseToken?.address,
                        symbol: pair.baseToken?.symbol,
                        name: pair.baseToken?.name
                    },
                    token1: {
                        address: pair.quoteToken?.address,
                        symbol: pair.quoteToken?.symbol,
                        name: pair.quoteToken?.name
                    },
                    liquidityUsd,
                    volume24h: parseFloat(pair.volume?.h24 || 0),
                    priceUsd: pair.priceUsd,
                    priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
                    fdv: pair.fdv,
                    createdAt: pair.pairCreatedAt,
                    labels: pair.labels || [],
                    scanDetectedAt: Date.now()
                };
                
                this.knownPools.set(pairAddress, poolData);
                
                // Emitir sinal se novo ou mudança significativa
                if (isNew || liquidityChanged) {
                    const signal = {
                        type: isNew ? 'new_pool_detected' : 'liquidity_change',
                        subtype: liquidityUsd >= 100000 ? 'high_liquidity' : 
                                 liquidityUsd >= 50000 ? 'medium_liquidity' : 'standard_liquidity',
                        timestamp: Date.now(),
                        pool: poolData,
                        metadata: {
                            isNew,
                            liquidityChanged,
                            previousLiquidity: existingPool?.liquidityUsd || 0,
                            changePercent: existingPool ? 
                                ((liquidityUsd - existingPool.liquidityUsd) / existingPool.liquidityUsd * 100).toFixed(2) : null,
                            priority: liquidityUsd >= 100000 ? 'high' : 'medium'
                        }
                    };
                    
                    newSignals.push(signal);
                    
                    if (liquidityUsd >= 100000) {
                        this.metrics.highLiquidityAlerts++;
                    }
                }
            }
            
            this.metrics.poolsTracked = this.knownPools.size;
            this.metrics.lastScanMs = Date.now() - startTime;
            
            if (newSignals.length > 0) {
                this.emitter.emit('oracle:liquidity_signals', newSignals);
            }
            
            // Cleanup de pools antigos (não vistos em 24h)
            this.cleanupOldPools();
            
            return newSignals;
            
        } catch (err) {
            console.error(`[LIQUIDITY_ORACLE] Scan error: ${err.message}`);
            return [];
        }
    }
    
    cleanupOldPools() {
        const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24h
        for (const [address, pool] of this.knownPools) {
            if (pool.scanDetectedAt < cutoff) {
                this.knownPools.delete(address);
            }
        }
    }
    
    getPoolByAddress(address) {
        return this.knownPools.get(address);
    }
    
    getAllPools(minLiquidity = 0) {
        return Array.from(this.knownPools.values())
            .filter(p => p.liquidityUsd >= minLiquidity)
            .sort((a, b) => b.liquidityUsd - a.liquidityUsd);
    }
    
    getMetrics() {
        return { ...this.metrics };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOVEREIGN ORACLE MASTER — Integração de todos os motores
// ═══════════════════════════════════════════════════════════════════════════
class SovereignOracle extends EventEmitter {
    constructor() {
        super();
        this.alchemyEngine = null;
        this.liquidityEngine = null;
        this.supabaseStream = null;
        this.eventBuffer = null;
        this.isRunning = false;
        this.startTime = null;
        this.subscribers = new Map(); // wsConnection -> {type, filters}
        this.agentRegistry = new Map(); // agentKey -> {tier, credits, subscribedChannels}
        
        // Métricas de alta densidade
        this.telemetry = {
            eventsEmitted: 0,
            bytesCompressed: 0,
            signalsPerSecond: 0,
            lastSignalsCount: 0,
            avgProcessingMs: 0
        };
    }
    
    async initialize(supabaseClient) {
        console.log('[SOVEREIGN_ORACLE] Initializing v20.0...');
        
        // Inicializar buffer assíncrono
        this.eventBuffer = new AsyncBatchStream(
            async (batch) => this.flushToSupabase(batch, supabaseClient),
            ORACLE_CONFIG.batchWindowMs
        );
        
        // Inicializar motores
        const alchemyKey = process.env.ALCHEMY_API_KEY;
        if (alchemyKey) {
            this.alchemyEngine = new AlchemyHighSpeedEngine(alchemyKey, this);
            this.alchemyEngine.connect();
        }
        
        this.liquidityEngine = new LiquidityOracleEngine(this);
        
        // Setup listeners
        this.setupEventListeners();
        
        console.log('[SOVEREIGN_ORACLE] v20.0 initialized');
    }
    
    setupEventListeners() {
        // Whale signals -> Buffer -> Supabase + Subscribers
        this.on('oracle:whale_signals', (signals) => {
            this.telemetry.lastSignalsCount += signals.length;
            
            signals.forEach(signal => {
                this.eventBuffer.push(signal);
                this.broadcastToSubscribers('whale_telemetry', signal);
            });
        });
        
        // Mempool signals -> Broadcast imediato (baixa latência)
        this.on('oracle:mempool_signal', (signal) => {
            this.broadcastToSubscribers('mempool_sniper', signal);
        });
        
        // Liquidity signals -> Buffer + Broadcast
        this.on('oracle:liquidity_signals', (signals) => {
            signals.forEach(signal => {
                this.eventBuffer.push(signal);
                this.broadcastToSubscribers('liquidity_sniffer', signal);
            });
        });
    }
    
    async flushToSupabase(batch, supabase) {
        if (!supabase || batch.length === 0) return;
        
        try {
            // Separar por tipo
            const whaleSignals = batch.filter(e => e.type === 'whale_movement');
            const liquiditySignals = batch.filter(e => e.type.includes('pool'));
            
            // Batch insert em paralelo
            const promises = [];
            
            if (whaleSignals.length > 0) {
                promises.push(
                    supabase.from('radar_smart_money_flows').insert(
                        whaleSignals.map(s => ({
                            chain_id: s.metadata.chainId,
                            from_address: s.transaction.from,
                            to_address: s.transaction.to,
                            token_symbol: 'ETH',
                            amount: s.transaction.valueEth,
                            amount_usd: s.transaction.valueUsd,
                            flow_type: s.subtype,
                            block_number: s.blockNumber,
                            transaction_hash: s.transaction.hash,
                            detected_at: new Date(s.timestamp).toISOString(),
                            is_whale: s.transaction.valueEth >= 50,
                            smart_score: s.transaction.valueEth >= 50 ? 0.95 : 0.8,
                            metadata: s.metadata
                        }))
                    )
                );
            }
            
            if (liquiditySignals.length > 0) {
                promises.push(
                    supabase.from('radar_liquidity_pools').upsert(
                        liquiditySignals.map(s => ({
                            chain_id: ORACLE_CONFIG.chainId,
                            pair_address: s.pool.pairAddress,
                            token0_address: s.pool.token0.address,
                            token1_address: s.pool.token1.address,
                            token0_symbol: s.pool.token0.symbol,
                            token1_symbol: s.pool.token1.symbol,
                            dex_name: s.pool.dexId,
                            liquidity_usd: s.pool.liquidityUsd,
                            volume_24h_usd: s.pool.volume24h,
                            detected_at: new Date().toISOString(),
                            status: s.metadata.priority === 'high' ? 'high_alert' : 'monitoring',
                            alert_triggered: s.metadata.priority === 'high',
                            metadata: s.metadata
                        })),
                        { onConflict: 'pair_address' }
                    )
                );
            }
            
            await Promise.all(promises);
            
        } catch (err) {
            console.error(`[ORACLE_FLUSH] Error: ${err.message}`);
        }
    }
    
    broadcastToSubscribers(channel, data) {
        const rpcNotification = JSONRPCFramework.notification(`a2a.${channel}`, data);
        const payload = JSON.stringify(rpcNotification);
        
        for (const [connection, metadata] of this.subscribers) {
            if (metadata.channels.includes(channel) || metadata.channels.includes('*')) {
                try {
                    if (connection.readyState === 1) { // WebSocket.OPEN
                        connection.send(payload);
                    }
                } catch (err) {
                    // Remover subscriber morto
                    this.subscribers.delete(connection);
                }
            }
        }
        
        this.telemetry.eventsEmitted++;
    }
    
    // API para A2A Gateway
    subscribe(connection, channels, agentKey) {
        const agent = this.agentRegistry.get(agentKey);
        if (!agent) return false;
        
        this.subscribers.set(connection, {
            agentKey,
            channels,
            subscribedAt: Date.now()
        });
        
        return true;
    }
    
    unsubscribe(connection) {
        this.subscribers.delete(connection);
    }
    
    registerAgent(agentKey, tier = 'standard') {
        this.agentRegistry.set(agentKey, {
            tier,
            credits: 0,
            registeredAt: Date.now(),
            lastActivity: Date.now()
        });
    }
    
    validateAgent(agentKey) {
        return this.agentRegistry.has(agentKey);
    }
    
    async start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.startTime = Date.now();
        
        // Scan loop de liquidez
        this.scanInterval = setInterval(async () => {
            await this.liquidityEngine.scan();
        }, this.liquidityEngine.scanIntervalMs);
        
        // Primeiro scan imediato
        await this.liquidityEngine.scan();
        
        // Telemetry logging (alta densidade)
        this.telemetryInterval = setInterval(() => {
            this.logTelemetry();
        }, 10000); // A cada 10s
        
        console.log('[SOVEREIGN_ORACLE] Autonomous oracle active');
    }
    
    stop() {
        this.isRunning = false;
        if (this.scanInterval) clearInterval(this.scanInterval);
        if (this.telemetryInterval) clearInterval(this.telemetryInterval);
        if (this.alchemyEngine) this.alchemyEngine.disconnect();
    }
    
    logTelemetry() {
        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        const sps = (this.telemetry.lastSignalsCount / 10).toFixed(2);
        
        console.log(`[ORACLE_TLM] ⏱️ ${uptime}s | ⚡ ${sps} sig/s | 📊 ${this.liquidityEngine.metrics.poolsTracked} pools | 🔍 ${this.telemetry.eventsEmitted} emitted | 🧪 ${this.eventBuffer.getMetrics().avgLatencyMs.toFixed(1)}ms flush`);
        
        this.telemetry.lastSignalsCount = 0;
    }
    
    // JSON-RPC API Methods
    getStatus() {
        return {
            jsonrpc: '2.0',
            result: {
                status: this.isRunning ? 'active' : 'inactive',
                version: '20.0.0-sovereign',
                uptime: this.isRunning ? Date.now() - this.startTime : 0,
                alchemy: this.alchemyEngine?.getStats(),
                liquidity: this.liquidityEngine?.getMetrics(),
                buffer: this.eventBuffer?.getMetrics(),
                subscribers: this.subscribers.size,
                agents: this.agentRegistry.size
            }
        };
    }
    
    getLiquidityPools(filters = {}) {
        const { minLiquidity = 0, dex, limit = 50 } = filters;
        let pools = this.liquidityEngine.getAllPools(minLiquidity);
        
        if (dex) {
            pools = pools.filter(p => p.dexId === dex);
        }
        
        return pools.slice(0, limit);
    }
    
    getWhaleSignals(since = Date.now() - 3600000) {
        // Retorna do Supabase (simplificado)
        return {
            jsonrpc: '2.0',
            result: {
                since,
                message: 'Query via /a2a/v1/whale/telemetry endpoint'
            }
        };
    }
}

// Export
module.exports = {
    SovereignOracle,
    JSONRPCFramework,
    ORACLE_CONFIG
};
