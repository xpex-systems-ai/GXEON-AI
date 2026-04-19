/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 💰 GXEON PREDATOR MONETIZER v3.0
 * Motor de Monetização: Calcula lucro líquido e emite sinais EXECUTE_SWAP
 * Integrações: Supabase Realtime + Brave Extension
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { createClient } = require('@supabase/supabase-js');
const EventEmitter = require('events');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE MONETIZAÇÃO (do JSON SUPREMO v3.0)
// ═══════════════════════════════════════════════════════════════════════════
const MONETIZATION_CONFIG = {
    // Parâmetros de lucro
    threshold_minimo: parseFloat(process.env.MIN_PROFIT_THRESHOLD) || 5.0, // $5 USD mínimo
    min_liquidity_usd: 10000,
    max_gas_price_gwei: 0.1,
    min_confidence_score: 0.85,
    
    // Modo arqueologia
    archeology_mode: 'ACTIVE',
    
    // Guardian Shield
    auto_pause_on_429: '30s',
    emergency_stop_webhook: process.env.MAMMOUTH_HQ_URL,
    process_persistence: 'ALIVE',
    
    // Configuração de sinais
    signal_cooldown_ms: 5000, // 5s entre sinais para não floodar
    max_signals_per_hour: 100,
    
    // Supabase Realtime
    realtime_channel: 'gxeon_monetizer_signals',
    
    // Brave Extension
    brave_endpoint: process.env.BRAVE_EXTENSION_ENDPOINT || null
};

// ═══════════════════════════════════════════════════════════════════════════
// MOTOR DE MONETIZAÇÃO PREDATOR
// ═══════════════════════════════════════════════════════════════════════════
class PredatorMonetizer extends EventEmitter {
    constructor() {
        super();
        this.supabase = null;
        this.isRunning = false;
        this.signalStats = {
            totalSignals: 0,
            executeSwapSignals: 0,
            blockedByThreshold: 0,
            lastSignalAt: null,
            hourlyCount: 0,
            hourlyResetAt: Date.now()
        };
        this.lastSignalTimestamp = 0;
        this.monitoredOpportunities = new Map(); // Track oportunidades já processadas
        
        this.initSupabase();
    }
    
    initSupabase() {
        const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && supabaseKey) {
            this.supabase = createClient(supabaseUrl, supabaseKey);
            console.log('[MONETIZER] Supabase client initialized');
        } else {
            console.warn('[MONETIZER] Supabase credentials not found - running in DEGRADED mode');
        }
    }
    
    /**
     * 🚀 Inicia o motor de monetização
     */
    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        console.log('💰 [PREDATOR_MONETIZER] v3.0 - Motor de Monetização Ativado');
        console.log(`📊 [MONETIZER] Config: threshold=$${MONETIZATION_CONFIG.threshold_minimo}, min_confidence=${MONETIZATION_CONFIG.min_confidence_score}`);
        
        // Inscrever-se em mudanças na tabela gari_dust_opportunities
        if (this.supabase) {
            this.subscribeToOpportunities();
        }
        
        // Loop de verificação periódica (fallback)
        this.scanInterval = setInterval(async () => {
            if (!this.isRunning) return;
            await this.scanForProfitableSwaps();
        }, 10000); // 10 segundos
        
        console.log('[MONETIZER] Realtime subscription active + periodic scanner');
    }
    
    stop() {
        this.isRunning = false;
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        console.log('[MONETIZER] Stopped');
    }
    
    /**
     * 📡 Inscrever-se em mudanças realtime do Supabase
     */
    subscribeToOpportunities() {
        const channel = this.supabase
            .channel('monetizer-opportunities')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'gari_dust_opportunities',
                    filter: 'status=eq.discovered'
                },
                (payload) => {
                    console.log('[MONETIZER] Realtime opportunity update:', payload.eventType);
                    
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const opportunity = payload.new;
                        this.evaluateOpportunity(opportunity);
                    }
                }
            )
            .subscribe((status) => {
                console.log('[MONETIZER] Realtime subscription status:', status);
            });
        
        this.realtimeChannel = channel;
    }
    
    /**
     * 🔍 Scanner periódico de oportunidades
     */
    async scanForProfitableSwaps() {
        if (!this.supabase) return;
        
        try {
            // Reset hourly counter if needed
            if (Date.now() - this.signalStats.hourlyResetAt > 3600000) {
                this.signalStats.hourlyCount = 0;
                this.signalStats.hourlyResetAt = Date.now();
            }
            
            // Buscar oportunidades não processadas
            const { data: opportunities, error } = await this.supabase
                .from('gari_dust_opportunities')
                .select('*')
                .eq('status', 'discovered')
                .gt('expires_at', new Date().toISOString())
                .order('profit_usd', { ascending: false })
                .limit(50);
            
            if (error) throw error;
            
            if (!opportunities || opportunities.length === 0) return;
            
            for (const opp of opportunities) {
                // Skip se já processamos recentemente
                if (this.monitoredOpportunities.has(opp.id)) {
                    const lastProcessed = this.monitoredOpportunities.get(opp.id);
                    if (Date.now() - lastProcessed < 300000) continue; // 5 min cooldown
                }
                
                await this.evaluateOpportunity(opp);
                this.monitoredOpportunities.set(opp.id, Date.now());
            }
            
            // Cleanup old entries
            if (this.monitoredOpportunities.size > 1000) {
                const now = Date.now();
                for (const [id, timestamp] of this.monitoredOpportunities.entries()) {
                    if (now - timestamp > 3600000) {
                        this.monitoredOpportunities.delete(id);
                    }
                }
            }
            
        } catch (err) {
            console.error('[MONETIZER] Scan error:', err.message);
        }
    }
    
    /**
     * 🧮 Avalia se uma oportunidade é lucrativa o suficiente
     */
    evaluateOpportunity(opportunity) {
        const {
            id,
            pair_address,
            token0_address,
            token1_address,
            dex_name,
            profit_usd,
            gas_cost_usd,
            estimated_fees_usd,
            confidence,
            metadata = {}
        } = opportunity;
        
        // Verificar rate limiting de sinais
        if (Date.now() - this.lastSignalTimestamp < MONETIZATION_CONFIG.signal_cooldown_ms) {
            return { status: 'SKIPPED', reason: 'signal_cooldown' };
        }
        
        // Verificar limite horário
        if (this.signalStats.hourlyCount >= MONETIZATION_CONFIG.max_signals_per_hour) {
            return { status: 'SKIPPED', reason: 'hourly_limit_reached' };
        }
        
        // 🧮 CÁLCULO DE LUCRO LÍQUIDO
        // Lucro = Taxas estimadas - Custo de gás
        const netProfit = (estimated_fees_usd || 0) - (gas_cost_usd || 0);
        const profitThreshold = MONETIZATION_CONFIG.threshold_minimo;
        
        // Verificar threshold mínimo
        const isProfitable = netProfit > profitThreshold;
        
        // Verificar confiança mínima
        const meetsConfidence = (confidence || 0) >= MONETIZATION_CONFIG.min_confidence_score;
        
        console.log(`[MONETIZER] Evaluating ${pair_address?.slice(0, 12)}...: net=$${netProfit.toFixed(2)}, confidence=${(confidence || 0).toFixed(2)}`);
        
        if (!isProfitable) {
            this.signalStats.blockedByThreshold++;
            return {
                status: 'REJECTED',
                reason: 'below_profit_threshold',
                net_profit: netProfit,
                threshold: profitThreshold
            };
        }
        
        if (!meetsConfidence) {
            return {
                status: 'REJECTED',
                reason: 'below_confidence_threshold',
                confidence: confidence,
                required: MONETIZATION_CONFIG.min_confidence_score
            };
        }
        
        // ✅ OPORTUNIDADE APROVADA - Emitir sinal EXECUTE_SWAP
        return this.emitExecuteSwapSignal({
            id,
            pair_address,
            token0_address,
            token1_address,
            dex_name,
            net_profit: netProfit,
            estimated_fees_usd,
            gas_cost_usd,
            confidence,
            metadata
        });
    }
    
    /**
     * 🚀 EMITIR SINAL EXECUTE_SWAP via Supabase Realtime
     */
    emitExecuteSwapSignal(opportunityData) {
        const signal = {
            type: 'EXECUTE_SWAP',
            protocol: 'GXEON_PREDATOR_v3.0',
            timestamp: Date.now(),
            
            // Dados da oportunidade
            opportunity: {
                id: opportunityData.id,
                pair_address: opportunityData.pair_address,
                token0: opportunityData.token0_address,
                token1: opportunityData.token1_address,
                dex: opportunityData.dex_name,
                chain_id: 42161 // Arbitrum
            },
            
            // Métricas econômicas
            economics: {
                net_profit_usd: Number(opportunityData.net_profit.toFixed(6)),
                estimated_fees_usd: Number(opportunityData.estimated_fees_usd?.toFixed(6)),
                gas_cost_usd: Number(opportunityData.gas_cost_usd?.toFixed(6)),
                roi_percent: Number(((opportunityData.net_profit / opportunityData.gas_cost_usd) * 100).toFixed(2)),
                confidence_score: opportunityData.confidence
            },
            
            // Instrução de execução para Brave Extension
            execution: {
                action: 'collect_fees',
                priority: opportunityData.net_profit > 50 ? 'urgent' : opportunityData.net_profit > 20 ? 'high' : 'normal',
                auto_execute: opportunityData.confidence > 0.9 && opportunityData.net_profit > 20,
                max_slippage: 0.01, // 1%
                deadline_minutes: 5
            },
            
            // Guardian Shield metadata
            guardian: {
                signal_id: `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                process_persistence: 'ALIVE',
                emergency_webhook: MONETIZATION_CONFIG.emergency_stop_webhook
            }
        };
        
        // 1️⃣ Emitir via EventEmitter local
        this.emit('signal:execute_swap', signal);
        
        // 2️⃣ Broadcast via Supabase Realtime
        if (this.supabase) {
            this.broadcastToRealtime(signal);
        }
        
        // 3️⃣ Notificar Brave Extension (se configurado)
        if (MONETIZATION_CONFIG.brave_endpoint) {
            this.notifyBraveExtension(signal);
        }
        
        // Atualizar estatísticas
        this.lastSignalTimestamp = Date.now();
        this.signalStats.totalSignals++;
        this.signalStats.executeSwapSignals++;
        this.signalStats.hourlyCount++;
        this.signalStats.lastSignalAt = new Date().toISOString();
        
        console.log(`🚀 [MONETIZER] EXECUTE_SWAP emitted! Profit: $${opportunityData.net_profit.toFixed(2)} | Confidence: ${opportunityData.confidence}`);
        
        return {
            status: 'EMITTED',
            signal_id: signal.guardian.signal_id,
            net_profit: opportunityData.net_profit,
            timestamp: signal.timestamp
        };
    }
    
    /**
     * 📡 Broadcast para Supabase Realtime
     */
    async broadcastToRealtime(signal) {
        try {
            // Inserir na tabela de sinais (se existir) ou usar broadcast
            // Usando broadcast para não persistir logs de sinais
            const channel = this.supabase.channel(MONETIZATION_CONFIG.realtime_channel);
            
            await channel.send({
                type: 'broadcast',
                event: 'execute_swap_signal',
                payload: signal
            });
            
            console.log('[MONETIZER] Realtime broadcast sent');
            
        } catch (err) {
            console.warn('[MONETIZER] Realtime broadcast failed:', err.message);
        }
    }
    
    /**
     * 🦁 Notificar Extensão Brave via HTTP
     */
    async notifyBraveExtension(signal) {
        try {
            const axios = require('axios');
            
            const bravePayload = {
                type: 'GXEON_EXECUTE_SWAP',
                protocol: 'DNA_CONVERSAO_v3.0',
                timestamp: new Date().toISOString(),
                origin: 'predator_monetizer',
                
                payload: {
                    signal_id: signal.guardian.signal_id,
                    token: signal.opportunity.token0,
                    contract: signal.opportunity.pair_address,
                    
                    raw_value: signal.economics.estimated_fees_usd,
                    net_profit: signal.economics.net_profit_usd,
                    gas_estimate: signal.economics.gas_cost_usd,
                    roi_percent: signal.economics.roi_percent,
                    
                    execution_data: {
                        chainId: 42161,
                        action: signal.execution.action,
                        priority: signal.execution.priority,
                        auto_execute: signal.execution.auto_execute,
                        max_slippage: signal.execution.max_slippage
                    },
                    
                    confidence: signal.economics.confidence_score,
                    priority: signal.execution.priority
                },
                
                handshake: {
                    requestId: `monetizer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    expectsAck: true,
                    dnaVerified: true
                }
            };
            
            const response = await axios.post(
                MONETIZATION_CONFIG.brave_endpoint,
                bravePayload,
                {
                    timeout: 5000,
                    headers: {
                        'X-GXEON-Source': 'predator_monetizer',
                        'X-GXEON-Version': '3.0',
                        'X-DNA-Protocol': 'EXECUTE_SWAP',
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            if (response.data?.acknowledged) {
                console.log(`🤝 [MONETIZER] Brave handshake confirmed for signal ${signal.guardian.signal_id.slice(0, 12)}`);
            }
            
        } catch (err) {
            console.warn('[MONETIZER] Brave notification failed:', err.message);
        }
    }
    
    /**
     * 📊 Retorna estatísticas do monetizer
     */
    getStats() {
        return {
            ...this.signalStats,
            isRunning: this.isRunning,
            config: {
                threshold_minimo: MONETIZATION_CONFIG.threshold_minimo,
                min_confidence: MONETIZATION_CONFIG.min_confidence_score,
                max_signals_per_hour: MONETIZATION_CONFIG.max_signals_per_hour
            },
            monitored_opportunities: this.monitoredOpportunities.size
        };
    }
    
    /**
     * 🛡️ Emergency stop - para todos os sinais
     */
    emergencyStop(reason = 'manual') {
        this.isRunning = false;
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
        }
        
        console.error(`🛑 [MONETIZER] EMERGENCY STOP triggered: ${reason}`);
        
        // Notificar webhook de emergência
        if (MONETIZATION_CONFIG.emergency_stop_webhook) {
            this.notifyEmergencyWebhook(reason);
        }
        
        this.emit('monetizer:emergency_stop', {
            reason,
            timestamp: Date.now(),
            stats: this.getStats()
        });
    }
    
    async notifyEmergencyWebhook(reason) {
        try {
            const axios = require('axios');
            await axios.post(
                MONETIZATION_CONFIG.emergency_stop_webhook,
                {
                    type: 'MONETIZER_EMERGENCY_STOP',
                    reason,
                    timestamp: new Date().toISOString(),
                    guardian_shield: {
                        process_persistence: 'ALIVE',
                        auto_pause: true
                    }
                },
                { timeout: 5000 }
            );
        } catch (err) {
            console.warn('[MONETIZER] Emergency webhook failed:', err.message);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════
let monetizerInstance = null;

function getMonetizer() {
    if (!monetizerInstance) {
        monetizerInstance = new PredatorMonetizer();
    }
    return monetizerInstance;
}

module.exports = {
    PredatorMonetizer,
    getMonetizer,
    MONETIZATION_CONFIG,
    
    // Função de conveniência para iniciar
    startMonetizer: async () => {
        const monetizer = getMonetizer();
        await monetizer.start();
        return monetizer;
    }
};
