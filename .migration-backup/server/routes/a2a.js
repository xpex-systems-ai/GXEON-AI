/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌐 A2A REST API ROUTES v20.0
 * Endpoints JSON-RPC para Agent-to-Agent communication
 * MEV-Compatible + Streaming Signals
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const { agentAuthMiddleware, agentActivityTracker, getAgentStats, generateAgentKey } = require('../middleware/agentAuth');
const { JSONRPCFramework } = require('../services/sovereignOracle');

// Aplicar auth em todas as rotas A2A
router.use(agentAuthMiddleware);
router.use(agentActivityTracker);

/**
 * POST /a2a/v1/liquidity/sniffer
 * Exporta dados brutos de pools detectados para bots de arbitragem externa
 * Formato: MEV-COMPATIBLE JSON-RPC
 */
router.post('/v1/liquidity/sniffer', async (req, res) => {
    const { id, method, params } = req.body;
    const requestStart = Date.now();
    
    try {
        const { 
            min_liquidity_usd = 10000,
            dex_filter,
            token_address,
            limit = 100,
            sort_by = 'liquidity_desc'
        } = params || {};
        
        // Obter oracle da app global
        const oracle = req.app.get('sovereignOracle');
        if (!oracle) {
            return res.json(JSONRPCFramework.error(id, -32603, 'ORACLE_NOT_READY'));
        }
        
        let pools = oracle.getLiquidityPools({
            minLiquidity: min_liquidity_usd,
            dex: dex_filter,
            limit
        });
        
        // Filtrar por token se especificado
        if (token_address) {
            const tokenLower = token_address.toLowerCase();
            pools = pools.filter(p => 
                p.token0.address?.toLowerCase() === tokenLower ||
                p.token1.address?.toLowerCase() === tokenLower
            );
        }
        
        // Formato MEV-Compatible (compatível com mev-share, flashbots, etc)
        const mevFormatted = pools.map(pool => ({
            // Identificação
            chain_id: 42161,
            pool_address: pool.pairAddress,
            dex: pool.dexId,
            
            // Tokens
            token_in: pool.token0,
            token_out: pool.token1,
            
            // Liquidez
            liquidity_usd: pool.liquidityUsd,
            liquidity_depth_score: Math.min(pool.liquidityUsd / 100000, 1.0),
            
            // Preço e impacto
            spot_price: pool.priceUsd,
            price_impact_1k: (1000 / pool.liquidityUsd) * 0.5,
            price_impact_10k: (10000 / pool.liquidityUsd) * 0.5,
            
            // Volume (atividade)
            volume_24h: pool.volume24h,
            price_change_24h: pool.priceChange24h,
            
            // Metadados MEV
            mev_extractable: pool.liquidityUsd > 50000,
            sandwich_risk: pool.liquidityUsd < 50000 ? 'high' : pool.liquidityUsd < 100000 ? 'medium' : 'low',
            
            // Timestamp
            discovered_at: pool.createdAt,
            updated_at: pool.scanDetectedAt
        }));
        
        // Log técnico de alta densidade
        const latency = Date.now() - requestStart;
        if (latency > 50) {
            console.log(`[A2A_API] liquidity/sniffer | Agent:${req.agent.id.slice(0,8)} | Pools:${mevFormatted.length} | ${latency}ms`);
        }
        
        res.json(JSONRPCFramework.success(id, {
            pools: mevFormatted,
            meta: {
                total: mevFormatted.length,
                chain_id: 42161,
                timestamp: Date.now(),
                response_latency_ms: latency
            }
        }));
        
    } catch (err) {
        console.error(`[A2A_API] liquidity/sniffer error: ${err.message}`);
        res.json(JSONRPCFramework.error(id, -32603, 'INTERNAL_ERROR', err.message));
    }
});

/**
 * POST /a2a/v1/whale/telemetry
 * Sinaliza movimentações de carteiras institucionais detectadas no mempool
 * JWT Agent Handshake required
 */
router.post('/v1/whale/telemetry', async (req, res) => {
    const { id, params } = req.body;
    const requestStart = Date.now();
    
    try {
        const {
            min_amount_eth = 10,
            since = Date.now() - 300000, // Últimos 5 minutos
            flow_type,
            limit = 50
        } = params || {};
        
        const supabase = require('../services/supabase');
        
        // Query construtor
        let query = supabase
            .from('radar_smart_money_flows')
            .select('*')
            .eq('chain_id', 42161)
            .gte('amount', min_amount_eth)
            .gte('detected_at', new Date(since).toISOString())
            .order('detected_at', { ascending: false })
            .limit(limit);
        
        if (flow_type) {
            query = query.eq('flow_type', flow_type);
        }
        
        const { data: flows, error } = await query;
        
        if (error) {
            throw error;
        }
        
        // Formatar para telemetry
        const telemetry = (flows || []).map(flow => ({
            signal_id: `whale_${flow.id}`,
            timestamp: new Date(flow.detected_at).getTime(),
            block_number: flow.block_number,
            
            actor: {
                from: flow.from_address,
                to: flow.to_address,
                classification: flow.is_whale ? 'institutional' : 'whale'
            },
            
            movement: {
                token: flow.token_symbol,
                amount: flow.amount,
                amount_usd: flow.amount_usd,
                flow_type: flow.flow_type
            },
            
            analysis: {
                smart_score: flow.smart_score,
                is_new_wallet: flow.is_new_wallet,
                is_pending: flow.is_pending || false
            },
            
            transaction: {
                hash: flow.transaction_hash,
                chain_id: flow.chain_id
            }
        }));
        
        const latency = Date.now() - requestStart;
        console.log(`[A2A_API] whale/telemetry | Agent:${req.agent.id.slice(0,8)} | Signals:${telemetry.length} | ${latency}ms`);
        
        res.json(JSONRPCFramework.success(id, {
            signals: telemetry,
            meta: {
                total: telemetry.length,
                since,
                chain_id: 42161,
                response_latency_ms: latency
            }
        }));
        
    } catch (err) {
        console.error(`[A2A_API] whale/telemetry error: ${err.message}`);
        res.json(JSONRPCFramework.error(id, -32603, 'INTERNAL_ERROR', err.message));
    }
});

/**
 * POST /a2a/v1/mempool/sniper
 * Acesso a sinais de mempool em tempo real (pre-confirmação)
 */
router.post('/v1/mempool/sniper', async (req, res) => {
    const { id, params } = req.body;
    
    try {
        const { min_value_eth = 5, target_contracts } = params || {};
        
        const oracle = req.app.get('sovereignOracle');
        if (!oracle || !oracle.alchemyEngine) {
            return res.json(JSONRPCFramework.error(id, -32603, 'MEMPOOL_NOT_AVAILABLE'));
        }
        
        // Retornar stats do mempool
        const stats = oracle.alchemyEngine.getStats();
        
        res.json(JSONRPCFramework.success(id, {
            mempool_status: {
                connected: stats.isConnected,
                pending_tx_seen: stats.pendingTxSeen,
                latency_ms: stats.latencyMs
            },
            filter: {
                min_value_eth,
                target_contracts: target_contracts || 'all'
            },
            message: 'Subscribe to WebSocket channel mempool_sniper for real-time signals',
            ws_endpoint: '/a2a/v1/stream'
        }));
        
    } catch (err) {
        res.json(JSONRPCFramework.error(id, -32603, 'INTERNAL_ERROR'));
    }
});

/**
 * POST /a2a/v1/agent/register
 * Registro de novo agente no sistema
 */
router.post('/v1/agent/register', (req, res) => {
    const { id, params } = req.body;
    
    try {
        const { tier = 'standard', metadata = {} } = params || {};
        
        // Apenas agentes enterprise podem registrar outros agentes
        if (req.agent.tier !== 'enterprise') {
            return res.json(JSONRPCFramework.error(id, -32006, 'INSUFFICIENT_TIER', { required: 'enterprise' }));
        }
        
        const newKey = generateAgentKey(tier);
        
        console.log(`[A2A_API] agent/register | Creator:${req.agent.id.slice(0,8)} | New:${newKey.slice(0,12)}... | Tier:${tier}`);
        
        res.json(JSONRPCFramework.success(id, {
            agent_key: newKey,
            tier,
            created_at: Date.now(),
            message: 'Store this key securely - it cannot be retrieved later'
        }));
        
    } catch (err) {
        res.json(JSONRPCFramework.error(id, -32603, 'REGISTRATION_FAILED'));
    }
});

/**
 * POST /a2a/v1/agent/status
 * Status do agente autenticado
 */
router.post('/v1/agent/status', (req, res) => {
    const { id } = req.body;
    
    res.json(JSONRPCFramework.success(id, {
        agent: req.agent,
        server_time: Date.now(),
        capabilities: ['liquidity_sniffer', 'whale_telemetry', 'mempool_sniper']
    }));
});

/**
 * POST /a2a/v1/billing/stream
 * Configuração de micro-pagamentos (Superfluid/Sablier placeholder)
 */
router.post('/v1/billing/stream', (req, res) => {
    const { id, params } = req.body;
    
    res.json(JSONRPCFramework.success(id, {
        protocol: 'SUPERFLUID',
        currency: 'USDC_ON_ARBITRUM',
        network: 42161,
        rule: 'PAY_PER_SIGNAL_FLOW',
        rate_per_1000_signals: 0.5, // USDC
        current_balance: req.agent.credits || 0,
        streaming_contract: '0x0000000000000000000000000000000000000000', // Placeholder
        message: 'Contact admin to setup streaming payment channel'
    }));
});

/**
 * GET /a2a/health
 * Healthcheck para agentes
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'operational',
        version: '20.0.0',
        protocol: 'JSON-RPC 2.0',
        timestamp: Date.now()
    });
});

/**
 * POST /a2a/metrics
 * Métricas do sistema (admin only)
 */
router.post('/metrics', (req, res) => {
    const { id } = req.body;
    
    // Apenas enterprise
    if (req.agent.tier !== 'enterprise') {
        return res.json(JSONRPCFramework.error(id, -32006, 'ADMIN_REQUIRED'));
    }
    
    const oracle = req.app.get('sovereignOracle');
    const gateway = req.app.get('a2aGateway');
    
    res.json(JSONRPCFramework.success(id, {
        agents: getAgentStats(),
        oracle: oracle?.getStatus().result,
        gateway: gateway?.getMetrics(),
        timestamp: Date.now()
    }));
});

module.exports = router;
