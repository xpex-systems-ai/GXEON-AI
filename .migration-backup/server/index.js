import { createRequire } from 'module';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { registerCommonJsBoundary, getSupabaseUrl } = require('./runtime/compatibility.cjs');
registerCommonJsBoundary();
const { buildRuntimeGovernanceSnapshot, buildDashboardSummary } = require('./runtime/governance.cjs');
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🚀 GXEON RAILWAY v13 - Ultra-Fast Boot for Healthcheck
// Inicia servidor em < 100ms, carrega resto em background

// ==================== GXEON_SHIELD - GLOBAL ERROR HANDLERS ====================
// Captura TODOS os erros antes que causem crash no Railway
// 🛡️ CRITICAL: NUNCA deixar o processo morrer - sempre manter ALIVE

process.on('uncaughtException', (err) => {
    const errorMsg = err?.message || err?.toString() || 'Unknown error';
    console.error('[GXEON_SHIELD] Uncaught Exception:', errorMsg);
    
    // 🛡️ Protocolo 429: NUNCA crasha em rate limit ou WebSocket
    if (errorMsg.includes('429') || 
        errorMsg.includes('Unexpected server response') ||
        errorMsg.includes('WebSocket') ||
        errorMsg.includes('ECONNRESET') ||
        errorMsg.includes('ETIMEDOUT') ||
        errorMsg.includes('socket hang up')) {
        console.log('[GXEON_SHIELD] 🛡️ Network error captured - SERVER CONTINUES ALIVE');
        return; // CRÍTICO: Não deixa o processo morrer!
    }
    
    // 🛡️ TODOS outros erros - loga mas MANTÉM processo vivo
    console.error('[GXEON_SHIELD] ⚠️ Error logged - server continues ALIVE');
    // NUNCA chamar process.exit() - Railway precisa do processo sempre rodando
});

process.on('unhandledRejection', (reason, promise) => {
    const errorMsg = reason?.message || reason?.toString() || 'Unknown rejection';
    console.error('[GXEON_SHIELD] Unhandled Rejection:', errorMsg);
    
    // Silencia erros de rede
    if (errorMsg.includes('429') || errorMsg.includes('WebSocket')) {
        console.log('[GXEON_SHIELD] 🛡️ Network rejection silenced - server stable');
    }
    // NÃO crasha - apenas loga
});

// 🚨 Handler para erro em Workers/Threads
process.on('workerThreadsUncaughtException', (err) => {
    console.error('[GXEON_SHIELD] Worker error:', err.message);
    // Não propaga
});

// ═══════════════════════════════════════════════════════════════════════════
// 🛡️ GXEON WEBSOCKET MONKEY-PATCH - Prevents ALL unhandled 'error' events
// ═══════════════════════════════════════════════════════════════════════════
// Este patch é aplicado ANTES de qualquer outro código carregar
// para garantir que TODOS os WebSockets tenham error handlers

// Patch para o módulo 'ws' (WebSocket library usado por ethers.js)
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
    const mod = originalRequire.apply(this, arguments);
    
    // Patch para o módulo 'ws'
    if (id === 'ws' || id.endsWith('/ws')) {
        return createGuardedWebSocket(mod);
    }
    
    return mod;
};

function createGuardedWebSocket(WebSocketClass) {
    // Guard para evitar double-patch
    if (WebSocketClass.__GXEON_GUARDED) return WebSocketClass;
    
    class GuardedWebSocket extends WebSocketClass {
        constructor(...args) {
            super(...args);
            
            // 🛡️ CRITICAL: Attach error handler IMMEDIATELY in constructor
            // This runs BEFORE any user code can attach handlers
            this._gxeonGuarded = true;
            
            // Attach emergency error handler
            this.on('error', (err) => {
                const msg = err?.message || err?.toString() || '';
                
                // Handle 429 specifically
                if (msg.includes('429') || msg.includes('Unexpected server response')) {
                    console.warn('[GXEON_WEBSOCKET_GUARD] 429 captured and neutralized');
                    try {
                        this.terminate();
                    } catch (e) {}
                    return; // Stop error propagation
                }
                
                // Log other errors but don't crash
                // console.debug('[GXEON_WEBSOCKET_GUARD] Error:', msg);
            });
            
            // Also handle unexpected-response
            this.on('unexpected-response', (req, res) => {
                if (res.statusCode === 429) {
                    console.warn('[GXEON_WEBSOCKET_GUARD] 429 on handshake captured');
                    try {
                        this.terminate();
                    } catch (e) {}
                }
            });
        }
    }
    
    // Copy static properties
    Object.setPrototypeOf(GuardedWebSocket, WebSocketClass);
    GuardedWebSocket.prototype = WebSocketClass.prototype;
    GuardedWebSocket.__GXEON_GUARDED = true;
    
    return GuardedWebSocket;
}

console.log('🛡️ [GXEON_SHIELD] WebSocket monkey-patch active - ALL WebSockets will have error handlers');

const express = require('express');
const { getPublicCoreBootStatus, summarizeCoreBoot } = require('./config/coreBoot.cjs');



function sendRuntimeSnapshot(res, statusCode = 200) {
  const snapshot = buildRuntimeGovernanceSnapshot();
  res.status(statusCode).json(snapshot);
}

function createCorsMiddleware(options = {}) {
  const methods = (options.methods || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']).join(',');
  const allowedHeaders = Array.isArray(options.allowedHeaders)
    ? options.allowedHeaders.join(',')
    : (options.allowedHeaders || '*');

  return (req, res, next) => {
    res.header('Access-Control-Allow-Origin', options.origin || '*');
    res.header('Access-Control-Allow-Methods', methods);
    res.header('Access-Control-Allow-Headers', allowedHeaders);

    if (options.credentials) {
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    return next();
  };
}

// ==================== MINIMAL APP (NO DEPENDENCIES) ====================
const app = express();
const PORT = process.env.PORT || 8080;

// CORS ultra-permissivo para Railway
app.use(createCorsMiddleware({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*'
}));

app.use(express.json({ limit: '10mb' }));

// ==================== HEALTHCHECK (ZERO DEPENDENCIES) ====================
// Railway verifica esta rota - deve retornar 200 IMEDIATAMENTE
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    version: '2.0.0-sovereign',
    core_boot: summarizeCoreBoot()
  });
});

app.get('/status', (req, res) => {
  res.json({
    status: 'active',
    version: '2.0.0-sovereign',
    core_boot: summarizeCoreBoot()
  });
});

app.get('/api/v1/core/boot', (req, res) => {
  res.status(200).json(getPublicCoreBootStatus());
});

app.get('/api/v1/runtime/summary', (req, res) => {
  res.status(200).json(buildDashboardSummary());
});

app.get('/api/v1/runtime/reports', (req, res) => {
  sendRuntimeSnapshot(res);
});

app.get('/api/v1/runtime/readiness', (req, res) => {
  const snapshot = buildRuntimeGovernanceSnapshot();
  const ready = snapshot.status === 'ready' || process.env.GXEON_ALLOW_DEGRADED_READINESS === 'true';
  res.status(ready ? 200 : 503).json({
    ready,
    status: snapshot.status,
    generated_at: snapshot.generated_at,
    degraded_reports: snapshot.degraded_reports,
    reports: snapshot.reports
  });
});

app.get('/api/v1/dashboard/summary', (req, res) => {
  res.status(200).json(buildDashboardSummary());
});

app.get('/api/v1/dashboard/runtime', (req, res) => {
  sendRuntimeSnapshot(res);
});

// 🔴 ALCHEMY RATE LIMIT HEALTH ENDPOINT (para dashboard)
app.get('/api/v1/health/alchemy', (req, res) => {
  // Lazy load do sovereignOracle para obter status
  try {
    const { getAlchemyRateLimitStatus } = require('./services/sovereignOracle');
    const status = getAlchemyRateLimitStatus();
    res.json(status);
  } catch (err) {
    // Se sovereignOracle não carregou ainda, retorna OK
    res.json({
      rateLimited: false,
      retryAfter: 0,
      message: 'Oracle initializing',
      timestamp: Date.now()
    });
  }
});

// 🤖 MAMMOUTH HQ INTEGRATION - Endpoint para sincronização com IA Mammouth
// POST /api/v1/mammouth/sync - Envia oportunidades de dust para análise de confiança
app.post('/api/v1/mammouth/sync', async (req, res) => {
  const requestStart = Date.now();
  
  try {
    // Lazy load do Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      getSupabaseUrl(),
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Buscar oportunidades ativas da tabela gari_dust_opportunities
    const { data: opportunities, error } = await supabase
      .from('gari_dust_opportunities')
      .select('*')
      .eq('status', 'discovered')
      .gt('expires_at', new Date().toISOString())
      .order('profit_usd', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    if (!opportunities || opportunities.length === 0) {
      return res.json({
        success: true,
        message: 'No active opportunities found',
        data: [],
        mammouth_analysis: null,
        timestamp: Date.now()
      });
    }
    
    // Preparar dados para análise da Mammouth AI
    const analysisPayload = {
      source: 'gxeon_gari_dust_sweeper',
      chain: 'arbitrum_mainnet',
      opportunities_count: opportunities.length,
      opportunities: opportunities.map(opp => ({
        id: opp.id,
        pair_address: opp.pair_address,
        token0: opp.token0_address,
        token1: opp.token1_address,
        dex: opp.dex_name,
        profit_usd: opp.profit_usd,
        gas_cost_usd: opp.gas_cost_usd,
        estimated_fees_usd: opp.estimated_fees_usd,
        confidence: opp.confidence,
        detected_at: opp.detected_at,
        expires_at: opp.expires_at
      })),
      monetization_params: {
        min_liquidity_usd: 10000,
        max_gas_price_gwei: 0.1,
        min_confidence_score: 0.85,
        archeology_mode: 'ACTIVE'
      }
    };
    
    // Enviar para Mammouth AI Oracle (se configurado)
    let mammouthAnalysis = null;
    const mammouthUrl = process.env.MAMMOUTH_HQ_URL || process.env.MAMMOUTH_AI_API_URL;
    
    if (mammouthUrl) {
      try {
        const axios = require('axios');
        const mammouthResponse = await axios.post(
          `${mammouthUrl}/analyze/dust-opportunities`,
          analysisPayload,
          {
            timeout: 10000,
            headers: {
              'Authorization': `Bearer ${process.env.MAMMOUTH_API_KEY}`,
              'X-GXEON-Source': 'predator_monetizer',
              'Content-Type': 'application/json'
            }
          }
        );
        
        mammouthAnalysis = {
          status: 'completed',
          confidence_analysis: mammouthResponse.data?.confidence_scores || [],
          recommendations: mammouthResponse.data?.recommendations || [],
          high_priority_count: mammouthResponse.data?.high_priority?.length || 0
        };
        
        // Atualizar confiança das oportunidades com dados da Mammouth
        if (mammouthResponse.data?.confidence_scores) {
          for (const score of mammouthResponse.data.confidence_scores) {
            await supabase
              .from('gari_dust_opportunities')
              .update({
                confidence: score.enhanced_confidence,
                metadata: {
                  mammouth_analysis: score,
                  analyzed_at: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', score.opportunity_id);
          }
        }
        
      } catch (mammouthErr) {
        console.warn('[MAMMOUTH_SYNC] AI analysis failed:', mammouthErr.message);
        mammouthAnalysis = {
          status: 'failed',
          error: mammouthErr.message,
          fallback: 'using_local_confidence_scores'
        };
      }
    } else {
      mammouthAnalysis = {
        status: 'skipped',
        reason: 'MAMMOUTH_HQ_URL not configured',
        note: 'Using local confidence calculations'
      };
    }
    
    // Calcular estatísticas
    const totalProfit = opportunities.reduce((sum, opp) => sum + (opp.profit_usd || 0), 0);
    const avgConfidence = opportunities.reduce((sum, opp) => sum + (opp.confidence || 0), 0) / opportunities.length;
    const highConfidenceOpps = opportunities.filter(opp => (opp.confidence || 0) >= 0.85).length;
    
    const latency = Date.now() - requestStart;
    
    res.json({
      success: true,
      message: `Synced ${opportunities.length} opportunities with Mammouth AI`,
      data: {
        opportunities_count: opportunities.length,
        total_profit_usd: totalProfit,
        average_confidence: avgConfidence,
        high_confidence_count: highConfidenceOpps,
        chain: 'arbitrum_mainnet'
      },
      mammouth_analysis: mammouthAnalysis,
      latency_ms: latency,
      timestamp: Date.now()
    });
    
  } catch (err) {
    console.error('[MAMMOUTH_SYNC] Error:', err.message);
    res.status(500).json({
      success: false,
      error: 'MAMMOUTH_SYNC_FAILED',
      message: err.message,
      timestamp: Date.now()
    });
  }
});

// ==================== SERVER START (UNDER 50ms) ====================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GXEON] Server ready on port ${PORT}`);
});

// ==================== EVERYTHING ELSE (LAZY LOAD) ====================
// Carrega todo o resto APÓS o servidor estar ouvindo
setTimeout(async () => {
  try {
    const path = require('path');
    const crypto = require('crypto');
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
    require('dotenv').config({ path: path.join(__dirname, '../config/secure/.env') });

    // Request ID middleware
    app.use((req, res, next) => {
      req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      next();
    });

    function degradedRoute(specifier, error) {
      return (req, res) => res.status(503).json({
        error: 'GXEON_MODULE_DEGRADED',
        module: specifier,
        message: error.message,
        status: 'degraded'
      });
    }

    function loadRoute(specifier) {
      try {
        return require(specifier);
      } catch (error) {
        console.error(`[GXEON] Route ${specifier} degraded:`, error.message);
        return degradedRoute(specifier, error);
      }
    }

    // Rate limiting
    const { apiLimiter, gxeonRateLimiter, operationLimiter } = require('./middleware/rateLimiter');
    app.use('/api', apiLimiter);

    // Enforcer e billing
    const { gxeonEnforcer, gxeonAuthOnly } = require('./middleware/gxeonEnforcer');

    // Routes
    const chatRoute = loadRoute('./routes/chat');
    const configRoute = loadRoute('./routes/config');
    const agentRoutes = loadRoute('./routes/agents');
    const taskEngineRoutes = loadRoute('./routes/task_engine');
    const executorRoutes = loadRoute('./routes/executor');

    // Billed routes
    app.use('/chat', gxeonEnforcer({ llm_call: 0.001 }), chatRoute);
    app.use('/api/agents', gxeonEnforcer({ agent_execution: 0.005 }), loadRoute('./routes/agents_protected'));
    app.use('/api/huggingface', gxeonEnforcer({ llm_call: 0.001 }), (req, res, next) => { req.agentType = 'huggingface'; next(); }, chatRoute);
    app.use('/api/deepseek', gxeonEnforcer({ llm_call: 0.002 }), (req, res, next) => { req.agentType = 'deepseek'; next(); }, chatRoute);
    app.use('/api/grok', gxeonEnforcer({ llm_call: 0.004 }), (req, res, next) => { req.agentType = 'grok'; next(); }, chatRoute);
    app.use('/api/chatgpt', gxeonEnforcer({ llm_call: 0.0025 }), (req, res, next) => { req.agentType = 'chatgpt'; next(); }, chatRoute);
    app.use('/api/onchain', operationLimiter('onchain'), gxeonEnforcer({ onchain_operation: 0.015 }), taskEngineRoutes);
    app.use('/api/task-engine', gxeonEnforcer({ task_pipeline: 0.002 }), taskEngineRoutes);
    app.use('/api/executor', gxeonEnforcer({ agent_execution: 0.003 }), executorRoutes);
    app.use('/api/edge', gxeonEnforcer({ edge_function: 0.001 }), loadRoute('./edge-functions'));
    app.use('/api/v1/radar', gxeonEnforcer({ radar_call: 0.05 }), loadRoute('./routes/radar'));
    app.use('/api/v1/swarm', gxeonEnforcer({ swarm_operation: 0.01 }), loadRoute('./routes/swarm'));
    app.use('/api/v1/sovereign-data', loadRoute('./routes/sovereign-data'));
    app.use('/api/v1/ocean', loadRoute('./routes/ocean'));
    app.use('/api/v1/chainlink', loadRoute('./routes/chainlink'));
    app.use('/v1/memory', gxeonRateLimiter, loadRoute('./routes/memory'));
    app.use('/v1/plugins/execute', gxeonRateLimiter, gxeonEnforcer({ agent_execution: 0.005 }), loadRoute('./routes/agents_protected'));
    app.use('/billing', gxeonAuthOnly, loadRoute('./routes/billing'));
    app.use('/api/v1/profit', gxeonAuthOnly, loadRoute('./routes/profit'));
    app.use('/api/config', gxeonAuthOnly, configRoute);
    app.use('/api', gxeonEnforcer({ agent_execution: 0.005 }), agentRoutes);

    // ═══════════════════════════════════════════════════════════════════════════
    // A2A MONETIZATION LAYER — Agent-to-Agent Revenue System
    // ═══════════════════════════════════════════════════════════════════════════
    // /v1/register-agent — Agent registration with payment
    // /v1/signals — Protected signal access with API Key
    // /v1/agent/status — Check quota and access
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const { default: a2aMonetizationRoutes } = await import('./routes/a2aMonetization.js');
      app.use('/', a2aMonetizationRoutes);
      console.log('[A2A_MONETIZATION] Agent API active: /v1/register-agent, /v1/signals, /v1/agent/*');
    } catch (err) {
      console.error('[A2A_MONETIZATION] Failed to load routes:', err.message);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FALLBACK REGISTRATION (Guaranteed endpoint)
    // ═══════════════════════════════════════════════════════════════════════════
    app.post('/v1/register', async (req, res) => {
      try {
        const { email, name, tier = 'BASIC' } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });
        
        const actorCode = 'GX' + crypto.randomBytes(4).toString('hex').toUpperCase();
        const apiKey = 'gx_' + crypto.randomBytes(24).toString('hex');
        const price = tier === 'BASIC' ? 29.90 : tier === 'PRO' ? 99.90 : 299.90;
        const txId = `REG-${Date.now()}-${actorCode}`;
        const qrData = `00020126580014BR.GOV.BCB.PIX${txId}520400005303986540${price.toFixed(2)}5802BR5909GXEON_AI6009SAO_PAULO`;
        
        res.json({
          success: true,
          actor: { code: actorCode, email, name: name || 'Agent', tier, status: 'pending_payment' },
          payment: { transaction_id: txId, amount: price, currency: 'BRL', method: 'PIX', pix_qr_code: Buffer.from(qrData).toString('base64'), pix_copy_paste: qrData, expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() },
          credentials: { api_key: apiKey, note: 'API key will be activated after payment' }
        });
      } catch (err) {
        res.status(500).json({ error: 'REGISTRATION_FAILED', message: err.message });
      }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // GXZ1 MARKET ECONOMY LAYER — External Data Marketplace API
    // ═══════════════════════════════════════════════════════════════════════════
    // Public endpoints for third-party agent consumption
    // All endpoints enforce billing via gxeonBillingGateMiddleware
    // ═══════════════════════════════════════════════════════════════════════════
    const marketplaceRoutes = loadRoute('./routes/marketplace');
    app.use('/v1', marketplaceRoutes);
    console.log('[GXEON_MARKETPLACE] External API layer active: /v1/signals/*, /v1/agents/*');

    // ═══════════════════════════════════════════════════════════════════════════
    // CORNIX MONETIZATION LAYER — Trading Signal Revenue System
    // ═══════════════════════════════════════════════════════════════════════════
    // /v1/signals/cornix-ready — Cornix-compatible signals with PIX unlock
    // /v1/signals/live — Public live stream (attracts bots)
    // /v1/leaderboard — Performance rankings
    // ═══════════════════════════════════════════════════════════════════════════
    const signalsModule = loadRoute('./routes/signals');
    app.use('/', signalsModule.default || signalsModule);
    console.log('[CORNIX] Signal monetization active: /v1/signals/*, /v1/leaderboard');

    // ═══════════════════════════════════════════════════════════════════════════
    // 🚀 MÓDULO 2 — GXEON HYBRID DATA ENGINE
    // ═══════════════════════════════════════════════════════════════════════════
    // /v1/leads/* — Lead generation with paywall
    // /v1/trends/* — Trend analysis with paywall
    // /v1/tasks/* — Task execution (PRO+)
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const { default: hybridDataRoutes } = await import('./routes/hybridDataApi.js');
      app.use('/', hybridDataRoutes);
      console.log('[🚀 MODULO_2] Hybrid Data Engine active: /v1/leads/*, /v1/trends/*, /v1/tasks/*');
    } catch (err) {
      console.error('[🚀 MODULO_2] Failed to load routes:', err.message);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🧠 GXEON SMART ENGINE v1.0
    // ═══════════════════════════════════════════════════════════════════════════
    // /v1/leads/smart — AI-powered lead scoring
    // /v1/leads/smart-free — Preview with partial data
    // Scoring: no_website(+30), rating>4.5(+25), low_competition(+20), etc
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const { default: smartLeadsRoutes } = await import('./routes/smartLeadsApi.js');
      app.use('/', smartLeadsRoutes);
      console.log('[🧠 SMART_ENGINE] Active: /v1/leads/smart, /v1/leads/smart-free');
    } catch (err) {
      console.error('[🧠 SMART_ENGINE] Failed to load:', err.message);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🏪 MÓDULO 3 — DATA MARKETPLACE ENGINE v1.0
    // ═══════════════════════════════════════════════════════════════════════════
    // /v1/marketplace/datasets — Catálogo de datasets
    // /v1/marketplace/purchase — Fluxo de compra com PIX
    // /v1/marketplace/access/:id — Acesso a dados comprados
    // /v1/marketplace/usage — Analytics de consumo
    // ═══════════════════════════════════════════════════════════════════════════
    try {
      const { default: marketplaceRoutes } = await import('./routes/marketplace_datasets.js');
      app.use('/v1/marketplace', marketplaceRoutes);
      console.log('[🏪 MARKETPLACE] Active: /v1/marketplace/datasets, /v1/marketplace/purchase, /v1/marketplace/access/*');
    } catch (err) {
      console.error('[🏪 MARKETPLACE] Failed to load:', err.message);
    }

    // Error handling
    app.use((err, req, res, next) => {
      console.error(`[GXEON_ERROR] ${req.id || 'unknown'}:`, err);
      if (err.message?.includes('GXEON_PAYMENT_REQUIRED')) {
        return res.status(402).json({ error: "GXEON_PAYMENT_REQUIRED", message: "Saldo insuficiente." });
      }
      if (err.message?.includes('GXEON_AUTH_REQUIRED')) {
        return res.status(401).json({ error: "GXEON_AUTH_REQUIRED", message: "API Key obrigatória." });
      }
      res.status(500).json({ error: "INTERNAL_ERROR" });
    });

    app.use((req, res) => {
      res.status(404).json({ error: "NOT_FOUND", message: `${req.method} ${req.path}` });
    });

    console.log('[GXEON] All routes loaded');

    // Background services
    if (process.env.DISABLE_GUARDIAN !== 'true') {
      const GuardianService = require('./services/guardianService');
      GuardianService.startMonitoring();
      console.log('[GXEON_GUARDIAN] Active');
    }

    // Radar v2.0 - Liquidity-first monitoring (Twitter API 402 bypassed)
    // 🛡️ GXEON_SHIELD: Soft start com delay para evitar rate limit 429
    if ((process.env.ALCHEMY_API_KEY || process.env.ARBITRUM_RPC_URL) && process.env.DISABLE_RADAR !== 'true') {
      const radarShix = require('./services/radarShix');
      
      // 🛡️ Protocolo: Delay inicial de 20s + stagger de 10s entre conexões
      setTimeout(async () => {
        try {
          console.log('[GXEON_SHIELD] 🛡️ Radar soft-start: iniciando após 20s de estabilização...');
          const result = await radarShix.start();
          if (result) {
            console.log('[RADAR_SHIX v2.0] ✅ Active - DexLiquidity + SmartMoney monitoring');
          } else {
            console.log('[GXEON_SHIELD] ⚠️ Radar iniciado em modo DEGRADED (WebSocket offline)');
          }
        } catch (radarError) {
          console.error('[GXEON_SHIELD] ⚠️ Radar start error:', radarError.message);
          if (radarError.message?.includes('429')) {
            console.log('[GXEON_SHIELD] 🛡️ Rate limit 429 detectado - servidor continua em modo DEGRADED (apenas DexScreener)');
          }
          // 🛡️ CRÍTICO: NÃO relança erro - servidor continua vivo!
        }
      }, 20000); // 20 segundos de delay inicial
    }

    if (process.env.SWARM_AUTOSTART === 'true') {
      setTimeout(async () => {
        const { initializeSwarm } = require('./agents');
        await initializeSwarm({ autoStart: true });
        console.log('[SWARM_M2M] Active');
      }, 5000);
    }

    console.log('[GXEON] Sovereign v2.0.0 ready');
  } catch (err) {
    console.error('[GXEON] Background load error:', err.message);
  }
}, 50); // 50ms - servidor já responde healthcheck
