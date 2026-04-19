/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌐 AGENT-TO-AGENT GATEWAY v20.0
 * WebSocket Server para streaming de dados oráculo entre agentes autônomos
 * Protocolo: JSON-RPC 2.0 + JWT Handshake
 * ═══════════════════════════════════════════════════════════════════════════
 */

const WebSocket = require('ws');
const http = require('http');
const { URL } = require('url');
const { agentAuthMiddleware, AGENT_REGISTRY } = require('../middleware/agentAuth');
const { JSONRPCFramework } = require('../services/sovereignOracle');

class A2AGateway {
    constructor(oracle, options = {}) {
        this.oracle = oracle;
        this.port = options.port || 8081;
        this.wss = null;
        this.httpServer = null;
        this.connections = new Map(); // ws -> metadata
        this.channels = new Map(); // channel -> Set(ws)
        this.metrics = {
            connectionsTotal: 0,
            connectionsActive: 0,
            messagesIn: 0,
            messagesOut: 0,
            bytesTransferred: 0
        };
    }
    
    async start() {
        // HTTP server para healthcheck
        this.httpServer = http.createServer((req, res) => {
            if (req.url === '/health') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    status: 'active',
                    version: '20.0.0',
                    connections: this.metrics.connectionsActive,
                    channels: Array.from(this.channels.keys())
                }));
            } else if (req.url === '/metrics') {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(this.getMetrics()));
            } else {
                res.writeHead(404);
                res.end();
            }
        });
        
        // WebSocket Server
        this.wss = new WebSocket.Server({ 
            server: this.httpServer,
            path: '/a2a/v1/stream',
            perMessageDeflate: true, // Compressão BIP
            maxPayload: 1024 * 1024 // 1MB max
        });
        
        this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
        
        this.httpServer.listen(this.port, '0.0.0.0', () => {
            console.log(`[A2A_GATEWAY] WebSocket server on ws://0.0.0.0:${this.port}/a2a/v1/stream`);
        });
        
        // Métricas em alta densidade
        setInterval(() => this.logMetrics(), 30000);
    }
    
    handleConnection(ws, req) {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const connectionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`[A2A_GATEWAY] 🔌 NEW_CONN | IP:${clientIp} | ID:${connectionId}`);
        
        // Estado inicial: awaiting_auth
        const connectionState = {
            id: connectionId,
            ip: clientIp,
            status: 'awaiting_auth',
            agentKey: null,
            agentId: null,
            subscribedChannels: new Set(),
            connectedAt: Date.now(),
            lastPing: Date.now(),
            messagesReceived: 0,
            messagesSent: 0
        };
        
        this.connections.set(ws, connectionState);
        this.metrics.connectionsTotal++;
        this.metrics.connectionsActive++;
        
        // Handlers
        ws.on('message', (data) => this.handleMessage(ws, data));
        ws.on('close', () => this.handleDisconnect(ws));
        ws.on('error', (err) => {
            console.error(`[A2A_GATEWAY] WS Error ${connectionId}: ${err.message}`);
        });
        
        // Send welcome + auth request
        ws.send(JSON.stringify(JSONRPCFramework.notification('a2a.welcome', {
            gateway: 'SOVEREIGN_ORACLE_v20.0',
            protocol: 'JSON-RPC 2.0',
            required_auth: 'agt_handshake',
            capabilities: ['liquidity_sniffer', 'whale_telemetry', 'mempool_sniper'],
            connection_id: connectionId
        })));
        
        // Ping/pong para manter conexão
        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true;
            connectionState.lastPing = Date.now();
        });
    }
    
    handleMessage(ws, data) {
        const state = this.connections.get(ws);
        if (!state) return;
        
        state.messagesReceived++;
        this.metrics.messagesIn++;
        this.metrics.bytesTransferred += data.length;
        
        try {
            const message = JSON.parse(data);
            const { method, params, id } = message;
            
            // Handshake de autenticação (obrigatório primeiro)
            if (state.status === 'awaiting_auth') {
                if (method === 'agt_handshake' || method === 'a2a.authenticate') {
                    this.handleAuth(ws, params, id, state);
                    return;
                } else {
                    ws.send(JSON.stringify(JSONRPCFramework.error(id, -32001, 'AUTH_REQUIRED')));
                    return;
                }
            }
            
            // Processar método
            switch (method) {
                case 'a2a.subscribe':
                    this.handleSubscribe(ws, params, id, state);
                    break;
                case 'a2a.unsubscribe':
                    this.handleUnsubscribe(ws, params, id, state);
                    break;
                case 'a2a.get_status':
                    this.handleGetStatus(ws, id, state);
                    break;
                case 'a2a.get_liquidity_pools':
                    this.handleGetLiquidityPools(ws, params, id, state);
                    break;
                case 'a2a.get_whale_signals':
                    this.handleGetWhaleSignals(ws, params, id, state);
                    break;
                case 'a2a.ping':
                    ws.send(JSON.stringify(JSONRPCFramework.success(id, { pong: Date.now() })));
                    break;
                default:
                    ws.send(JSON.stringify(JSONRPCFramework.error(id, -32601, 'METHOD_NOT_FOUND')));
            }
            
        } catch (err) {
            console.error(`[A2A_GATEWAY] Parse error from ${state.id}: ${err.message}`);
            ws.send(JSON.stringify(JSONRPCFramework.error(null, -32700, 'PARSE_ERROR')));
        }
    }
    
    handleAuth(ws, params, id, state) {
        const { agent_key, capabilities } = params || {};
        
        if (!agent_key || !agent_key.startsWith('agt_')) {
            ws.send(JSON.stringify(JSONRPCFramework.error(id, -32002, 'INVALID_AGENT_KEY')));
            return;
        }
        
        // Validar no registry
        const agent = AGENT_REGISTRY.get(agent_key);
        if (!agent && process.env.AUTO_REGISTER_AGENTS !== 'true') {
            ws.send(JSON.stringify(JSONRPCFramework.error(id, -32003, 'UNKNOWN_AGENT')));
            return;
        }
        
        // Auto-register se necessário
        if (!agent) {
            const { registerAgent } = require('../middleware/agentAuth');
            registerAgent(agent_key, 'ws_connected');
        }
        
        const agentData = AGENT_REGISTRY.get(agent_key);
        
        // Atualizar estado
        state.status = 'authenticated';
        state.agentKey = agent_key;
        state.agentId = agentData.id;
        
        // Registrar no oracle
        this.oracle.registerAgent(agent_key, agentData.tier);
        
        console.log(`[A2A_GATEWAY] 🔓 AUTH_OK | Agent:${agentData.id} | Capabilities:${capabilities?.join(',') || 'none'}`);
        
        ws.send(JSON.stringify(JSONRPCFramework.success(id, {
            authenticated: true,
            agent_id: agentData.id,
            tier: agentData.tier,
            capabilities: ['liquidity_sniffer', 'whale_telemetry', 'mempool_sniper'],
            server_time: Date.now()
        })));
    }
    
    handleSubscribe(ws, params, id, state) {
        const { channels } = params || {};
        
        if (!channels || !Array.isArray(channels)) {
            ws.send(JSON.stringify(JSONRPCFramework.error(id, -32602, 'INVALID_PARAMS')));
            return;
        }
        
        const subscribed = [];
        const failed = [];
        
        for (const channel of channels) {
            // Validar canal
            const validChannels = ['liquidity_sniffer', 'whale_telemetry', 'mempool_sniper', '*'];
            if (!validChannels.includes(channel)) {
                failed.push({ channel, reason: 'INVALID_CHANNEL' });
                continue;
            }
            
            // Adicionar ao canal
            if (!this.channels.has(channel)) {
                this.channels.set(channel, new Set());
            }
            this.channels.get(channel).add(ws);
            
            // Adicionar ao estado do agente
            state.subscribedChannels.add(channel);
            subscribed.push(channel);
        }
        
        // Registrar no oracle para broadcast
        this.oracle.subscribe(ws, Array.from(state.subscribedChannels), state.agentKey);
        
        console.log(`[A2A_GATEWAY] 📡 SUBSCRIBE | Agent:${state.agentId?.slice(0, 8)} | Channels:${subscribed.join(',')}`);
        
        ws.send(JSON.stringify(JSONRPCFramework.success(id, {
            subscribed,
            failed: failed.length > 0 ? failed : undefined
        })));
    }
    
    handleUnsubscribe(ws, params, id, state) {
        const { channels } = params || {};
        
        for (const channel of channels || []) {
            const channelSet = this.channels.get(channel);
            if (channelSet) {
                channelSet.delete(ws);
            }
            state.subscribedChannels.delete(channel);
        }
        
        ws.send(JSON.stringify(JSONRPCFramework.success(id, {
            unsubscribed: channels || []
        })));
    }
    
    handleGetStatus(ws, id, state) {
        const status = this.oracle.getStatus();
        ws.send(JSON.stringify(JSONRPCFramework.success(id, status.result)));
    }
    
    handleGetLiquidityPools(ws, params, id, state) {
        const { min_liquidity, dex, limit } = params || {};
        const pools = this.oracle.getLiquidityPools({
            minLiquidity: min_liquidity,
            dex,
            limit: limit || 50
        });
        
        ws.send(JSON.stringify(JSONRPCFramework.success(id, {
            pools,
            count: pools.length,
            timestamp: Date.now()
        })));
    }
    
    handleGetWhaleSignals(ws, params, id, state) {
        // Simplified - em produção, consultar Supabase
        ws.send(JSON.stringify(JSONRPCFramework.success(id, {
            message: 'Stream via whale_telemetry channel',
            tip: 'Subscribe to whale_telemetry for real-time signals'
        })));
    }
    
    handleDisconnect(ws) {
        const state = this.connections.get(ws);
        if (state) {
            console.log(`[A2A_GATEWAY] 🔌 DISCONNECT | Agent:${state.agentId?.slice(0, 8)} | Duration:${Date.now() - state.connectedAt}ms`);
            
            // Remover de todos os canais
            for (const channel of state.subscribedChannels) {
                const channelSet = this.channels.get(channel);
                if (channelSet) {
                    channelSet.delete(ws);
                }
            }
            
            // Unsubscribe do oracle
            this.oracle.unsubscribe(ws);
            
            this.connections.delete(ws);
            this.metrics.connectionsActive--;
        }
    }
    
    broadcastToChannel(channel, data) {
        const channelSet = this.channels.get(channel);
        if (!channelSet) return;
        
        const payload = JSON.stringify(data);
        
        for (const ws of channelSet) {
            if (ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(payload);
                    this.metrics.messagesOut++;
                    this.metrics.bytesTransferred += payload.length;
                    
                    // Update connection stats
                    const state = this.connections.get(ws);
                    if (state) {
                        state.messagesSent++;
                    }
                } catch (err) {
                    // Ignorar falhas de envio
                }
            }
        }
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            channels: Array.from(this.channels.entries()).map(([name, set]) => ({
                name,
                subscribers: set.size
            })),
            connections: Array.from(this.connections.values()).map(c => ({
                id: c.id,
                agent: c.agentId?.slice(0, 8),
                status: c.status,
                channels: Array.from(c.subscribedChannels),
                duration_ms: Date.now() - c.connectedAt
            }))
        };
    }
    
    logMetrics() {
        const m = this.metrics;
        const connStats = Array.from(this.connections.values()).reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1;
            return acc;
        }, {});
        
        console.log(`[A2A_TLM] 🔌 ${m.connectionsActive}/${m.connectionsTotal} | 📨 ${m.messagesIn}/${m.messagesOut} | 📊 ${(m.bytesTransferred / 1024).toFixed(1)}KB | ${JSON.stringify(connStats)}`);
    }
    
    stop() {
        // Fechar todas as conexões
        for (const [ws, state] of this.connections) {
            ws.close(1001, 'Gateway shutting down');
        }
        this.connections.clear();
        this.channels.clear();
        
        if (this.wss) {
            this.wss.close();
        }
        if (this.httpServer) {
            this.httpServer.close();
        }
        
        console.log('[A2A_GATEWAY] Stopped');
    }
}

module.exports = { A2AGateway };
