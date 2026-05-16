/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 GXEON SOVEREIGN ORACLE v20.0 — Autonomous A2A Provider
 * Arquitetura: Event-Driven Microservices
 * Target: AUTONOMOUS_ORACLE_PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const cors = require('cors');

// ═══════════════════════════════════════════════════════════════════════════
// MINIMAL BOOT (Under 100ms)
// ═══════════════════════════════════════════════════════════════════════════
const app = express();
const PORT = process.env.PORT || 8080;
const GATEWAY_PORT = process.env.GATEWAY_PORT || 8081;

// CORS ultra-permissivo para Railway e agentes
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Agent-Key', 'X-Request-ID']
}));

app.use(express.json({ limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════════════════
// HEALTHCHECK (Zero Dependencies)
// ═══════════════════════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'operational',
        version: '20.0.0',
        mode: 'AUTONOMOUS_ORACLE_PROVIDER'
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        version: '20.0.0-sovereign',
        architecture: 'EVENT_DRIVEN_MICROSERVICES'
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// SERVER START (Under 50ms)
// ═══════════════════════════════════════════════════════════════════════════
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GXEON_ORACLE] v20.0.0 | HTTP on :${PORT} | Mode: AUTONOMOUS`);
});

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND LOADING (Lazy Load)
// ═══════════════════════════════════════════════════════════════════════════
setTimeout(async () => {
    try {
        const path = require('path');
        require('dotenv').config({ path: path.join(__dirname, '../.env') });
        require('dotenv').config({ path: path.join(__dirname, '../config/secure/.env') });

        // Request ID middleware
        app.use((req, res, next) => {
            req.id = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            next();
        });

        // ═══════════════════════════════════════════════════════════════════
        // SOVEREIGN ORACLE v20.0 INITIALIZATION
        // ═══════════════════════════════════════════════════════════════════
        const { SovereignOracle } = require('./services/sovereignOracle');
        const { A2AGateway } = require('./gateway/a2aGateway');
        const a2aRoutes = require('./routes/a2a');
        
        // Initialize Oracle
        const supabase = require('./services/supabase');
        const sovereignOracle = new SovereignOracle();
        
        await sovereignOracle.initialize(supabase);
        await sovereignOracle.start();
        
        // Store in app for access in routes
        app.set('sovereignOracle', sovereignOracle);
        
        console.log('[SOVEREIGN_ORACLE] ✅ Core initialized and scanning');

        // ═══════════════════════════════════════════════════════════════════
        // A2A GATEWAY (WebSocket Server)
        // ═══════════════════════════════════════════════════════════════════
        const a2aGateway = new A2AGateway(sovereignOracle, { port: GATEWAY_PORT });
        await a2aGateway.start();
        
        app.set('a2aGateway', a2aGateway);
        
        console.log(`[A2A_GATEWAY] ✅ WebSocket on :${GATEWAY_PORT}`);

        // ═══════════════════════════════════════════════════════════════════
        // 🧹 GARI BLOCKCHAIN v1.0 — ARQUEOLOGIA DIGITAL (PARALELO)
        // ═══════════════════════════════════════════════════════════════════
        if (process.env.DISABLE_GARI !== 'true') {
            const { getDustSweeper } = require('./services/dustSweeper');
            const gariSweeper = getDustSweeper(null, supabase);
            
            // Iniciar varredura de taxas esquecidas
            await gariSweeper.start();
            
            // Endpoint de status do GARI
            app.get('/gari/status', (req, res) => {
                res.json({
                    service: 'GARI_DUST_SWEEPER',
                    version: '1.0',
                    status: gariSweeper.isRunning ? 'active' : 'inactive',
                    stats: gariSweeper.getStats()
                });
            });
            
            // Endpoint para trigger manual
            app.post('/gari/scan', async (req, res) => {
                await gariSweeper.scanForAbandonedLiquidity();
                res.json({ success: true, stats: gariSweeper.getStats() });
            });
            
            console.log('[GARI_BLOCKCHAIN] ✅ DustSweeper v1.0 ativo — Arqueologia Digital iniciada');
        }

        // ═══════════════════════════════════════════════════════════════════
        // A2A REST ROUTES (JSON-RPC)
        // ═══════════════════════════════════════════════════════════════════
        app.use('/a2a', a2aRoutes);
        
        console.log('[A2A_REST] ✅ JSON-RPC endpoints mounted');

        // ═══════════════════════════════════════════════════════════════════
        // ORACLE STATUS ENDPOINT
        // ═══════════════════════════════════════════════════════════════════
        app.get('/oracle/status', (req, res) => {
            const status = sovereignOracle.getStatus();
            res.json(status);
        });

        // ═══════════════════════════════════════════════════════════════════
        // HIGH-DENSITY LOGGING ENDPOINT (para debug)
        // ═══════════════════════════════════════════════════════════════════
        app.get('/oracle/telemetry', (req, res) => {
            const { getDustSweeper } = require('./services/dustSweeper');
            const gariSweeper = getDustSweeper();
            
            res.json({
                telemetry: sovereignOracle.telemetry,
                buffer: sovereignOracle.eventBuffer?.getMetrics(),
                alchemy: sovereignOracle.alchemyEngine?.getStats(),
                liquidity: sovereignOracle.liquidityEngine?.getMetrics(),
                gateway: a2aGateway?.getMetrics(),
                gari: gariSweeper?.getStats()
            });
        });

        // ═══════════════════════════════════════════════════════════════════
        // ERROR HANDLING
        // ═══════════════════════════════════════════════════════════════════
        app.use((err, req, res, next) => {
            console.error(`[ORACLE_ERROR] ${req.id}:`, err);
            res.status(500).json({ 
                jsonrpc: '2.0',
                error: { 
                    code: -32603, 
                    message: 'INTERNAL_ERROR',
                    data: process.env.NODE_ENV === 'development' ? err.message : undefined
                }
            });
        });

        app.use((req, res) => {
            res.status(404).json({ 
                jsonrpc: '2.0',
                error: { 
                    code: -32601, 
                    message: 'METHOD_NOT_FOUND',
                    data: { path: req.path }
                }
            });
        });

        // ═══════════════════════════════════════════════════════════════════
        // TELEMETRY LOGGING (Alta Densidade)
        // ═══════════════════════════════════════════════════════════════════
        setInterval(() => {
            const memUsage = process.memoryUsage();
            const stats = {
                heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(1) + 'MB',
                heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(1) + 'MB',
                external: (memUsage.external / 1024 / 1024).toFixed(1) + 'MB',
                connections: a2aGateway?.metrics?.connectionsActive || 0,
                pools: sovereignOracle?.liquidityEngine?.metrics?.poolsTracked || 0,
                signals: sovereignOracle?.telemetry?.eventsEmitted || 0
            };
            
            console.log(`[ORACLE_SYS] MEM:${stats.heapUsed} | CONN:${stats.connections} | POOLS:${stats.pools} | SIGS:${stats.signals}`);
        }, 60000);

        console.log('[GXEON_ORACLE] ✅ v20.0.0 FULLY OPERATIONAL');
        console.log('═══════════════════════════════════════════════════════════════════════');
        console.log('  Mode:        AUTONOMOUS_ORACLE_PROVIDER');
        console.log('  HTTP:        :' + PORT);
        console.log('  WebSocket:   :' + GATEWAY_PORT + '/a2a/v1/stream');
        console.log('  Oracle:      ACTIVE');
        console.log('  Gateway:     ACTIVE');
        if (process.env.DISABLE_GARI !== 'true') {
            console.log('  GARI:        ACTIVE (Arqueologia Digital v1.0)');
        }
        console.log('═══════════════════════════════════════════════════════════════════════');

    } catch (err) {
        console.error('[GXEON_ORACLE] ❌ Background load error:', err.message);
        console.error(err.stack);
    }
}, 50);

// ═══════════════════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN — Garante que nenhum lote Supabase seja perdido
// ═══════════════════════════════════════════════════════════════════════════

let isShuttingDown = false;

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    const shutdownStart = Date.now();
    console.log(`[ORACLE_SHUTDOWN] ${signal} received, initiating graceful shutdown...`);
    
    try {
        // 1. Parar de aceitar novas conexões HTTP
        console.log('[ORACLE_SHUTDOWN] Closing HTTP server...');
        await new Promise((resolve) => {
            server.close(() => {
                console.log('[ORACLE_SHUTDOWN] HTTP server closed');
                resolve();
            });
            
            // Force close após timeout
            setTimeout(() => {
                console.warn('[ORACLE_SHUTDOWN] HTTP force timeout');
                resolve();
            }, 5000);
        });
        
        // 2. Flush buffer do Oracle
        const oracle = app.get('sovereignOracle');
        if (oracle && oracle.eventBuffer) {
            console.log('[ORACLE_SHUTDOWN] Flushing event buffer...');
            await oracle.eventBuffer.flush();
            console.log('[ORACLE_SHUTDOWN] Buffer flushed');
        }
        
        // 3. Parar motores do Oracle
        if (oracle) {
            console.log('[ORACLE_SHUTDOWN] Stopping Oracle engines...');
            oracle.stop();
            console.log('[ORACLE_SHUTDOWN] Oracle stopped');
        }
        
        // 4. Fechar WebSocket Gateway
        const gateway = app.get('a2aGateway');
        if (gateway) {
            console.log('[ORACLE_SHUTDOWN] Closing WebSocket Gateway...');
            await new Promise(resolve => {
                gateway.stop();
                setTimeout(resolve, 1000);
            });
            console.log('[ORACLE_SHUTDOWN] Gateway closed');
        }
        
        const shutdownTime = Date.now() - shutdownStart;
        console.log(`[ORACLE_SHUTDOWN] ✅ Completed in ${shutdownTime}ms`);
        
    } catch (err) {
        console.error(`[ORACLE_SHUTDOWN] Error: ${err.message}`);
    }
    
    process.exit(0);
}

// Handlers de sinais
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ GXEON ESCUDO CONTRA FRAME ERRORS — Proteção global do Node
// ═══════════════════════════════════════════════════════════════════════════
process.on('uncaughtException', (err) => {
    // Proteção contra o erro de Frame 126 que derruba o Node
    if (err.message && err.message.includes('Invalid WebSocket frame')) {
        console.warn('🛡️ [GXEON] Frame corrompido detectado e neutralizado. Sistema mantido.');
        // Não derrubar o processo - apenas logar e continuar
        return;
    }
    
    // Rate limit errors - não são fatais
    if (err.message && (err.message.includes('429') || err.message.includes('rate limit'))) {
        console.warn('⚠️ [GXEON] Rate limit detectado em operação secundária.');
        return;
    }
    
    console.error('[ORACLE_FATAL] Uncaught exception:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
    console.error('[ORACLE_FATAL] Unhandled rejection:', reason);
});

module.exports = { app };

