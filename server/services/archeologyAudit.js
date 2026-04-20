/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DIGITAL ARCHEOLOGY AUDIT SERVICE v1.0
 * Sistema: GXEON PREDATOR v4.0.0 - SUPREME MONETIZATION AUDIT
 *
 * Responsabilidades:
 * 1. Validar fluxo de caixa para carteira do Comandante
 * 2. Logar lucros/taxas no digital_archeology_ledger
 * 3. Validar Mammouth AI confidence >= 0.85
 * 4. Enviar métricas para Grafana (Black_Gold_Neon theme)
 * ═══════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO SUPREMA DE MONETIZAÇÃO (do JSON de Auditoria)
// ═══════════════════════════════════════════════════════════════════════════
const AUDIT_CONFIG = {
    // Carteira de recebimento (COMANDANTE)
    COMMANDER_WALLET: process.env.COMMANDER_WALLET_ADDRESS || '0x3955d559055DadB7067054cB6E6f974710345224',
    
    // Thresholds de monetização
    MIN_PROFIT_THRESHOLD_ETH: parseFloat(process.env.MIN_PROFIT_THRESHOLD) || 0.005, // 0.005 ETH mínimo
    FEE_PROTECTION_BUFFER: 0.15, // 15%
    MIN_AI_CONFIDENCE: 0.85, // Mammouth AI threshold
    
    // Gas management - Low Gwei Strategy
    MAX_GAS_PRICE_GWEI: parseFloat(process.env.MAX_GAS_PRICE_GWEI) || 0.1,
    GAS_LIMIT_BUFFER: 1.2, // 20% buffer
    
    // Integrações
    GRAFANA_ENDPOINT: process.env.GRAFANA_LOKI_URL,
    GRAFANA_API_KEY: process.env.GRAFANA_API_KEY,
    MAMMOUTH_HQ_URL: process.env.MAMMOUTH_HQ_URL,
    
    // Feature flags
    EMERGENCY_KILL_SWITCH: process.env.EMERGENCY_KILL_SWITCH === 'ACTIVE',
    AUDIT_MODE: process.env.AUDIT_MODE || 'STRICT' // STRICT = aborta se confidence < 0.85
};

// ═══════════════════════════════════════════════════════════════════════════
// SERVIÇO DE AUDITORIA DIGITAL
// ═══════════════════════════════════════════════════════════════════════════
class ArcheologyAuditService {
    constructor() {
        this.supabase = null;
        this.stats = {
            totalAudited: 0,
            approvedCount: 0,
            rejectedCount: 0,
            totalProfitUsd: 0,
            totalGasUsd: 0,
            lowConfidenceBlocks: 0
        };
        this.initSupabase();
    }
    
    initSupabase() {
        const supabaseUrl = process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        
        if (supabaseUrl && supabaseKey) {
            this.supabase = createClient(supabaseUrl, supabaseKey);
            console.log('[ARCHEOLOGY_AUDIT] Supabase connected for ledger logging');
        } else {
            console.error('[ARCHEOLOGY_AUDIT] CRITICAL: Supabase not configured - audit logging disabled');
        }
    }
    
    /**
     * 🔍 AUDITORIA COMPLETA DE OPORTUNIDADE
     * Valida TODOS os critérios antes de aprovar execução
     */
    async auditOpportunity(opportunity) {
        const auditId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        
        console.log(`[ARCHEOLOGY_AUDIT] ${auditId}: Iniciando auditoria suprema...`);
        
        const auditReport = {
            audit_id: auditId,
            timestamp: new Date().toISOString(),
            opportunity_id: opportunity.id,
            checks: {},
            approved: false,
            rejection_reason: null
        };
        
        // ─────────────────────────────────────────────────────────────────
        // CHECK 1: AI Confidence Score (Mammouth AI >= 0.85)
        // ─────────────────────────────────────────────────────────────────
        const confidence = opportunity.confidence || 0;
        const meetsConfidence = confidence >= AUDIT_CONFIG.MIN_AI_CONFIDENCE;
        auditReport.checks.ai_confidence = {
            score: confidence,
            required: AUDIT_CONFIG.MIN_AI_CONFIDENCE,
            passed: meetsConfidence
        };
        
        if (!meetsConfidence) {
            auditReport.rejection_reason = 'AI_CONFIDENCE_TOO_LOW';
            auditReport.approved = false;
            
            // 🚨 LOG GRAFANA: Transação abortada por baixa confiança
            await this.logToGrafana({
                alert_type: 'AI_CONFIDENCE_REJECTION',
                severity: 'WARNING',
                message: `Transação abortada: confidence ${confidence.toFixed(2)} < ${AUDIT_CONFIG.MIN_AI_CONFIDENCE}`,
                opportunity_id: opportunity.id,
                pair_address: opportunity.pair_address,
                confidence: confidence,
                potential_profit_usd: opportunity.profit_usd,
                timestamp: new Date().toISOString()
            });
            
            // Incrementar contador
            this.stats.lowConfidenceBlocks++;
            this.stats.rejectedCount++;
            
            console.warn(`[ARCHEOLOGY_AUDIT] ${auditId}: ❌ REJEITADA - Confidence ${confidence.toFixed(2)} < ${AUDIT_CONFIG.MIN_AI_CONFIDENCE}`);
            
            // Registrar rejeição no ledger
            await this.logRejection(opportunity, 'BELOW_CONFIDENCE_THRESHOLD', confidence);
            
            return auditReport;
        }
        
        // ─────────────────────────────────────────────────────────────────
        // CHECK 2: Profit Threshold (min 0.005 ETH)
        // ─────────────────────────────────────────────────────────────────
        const profitEth = opportunity.profit_eth || (opportunity.profit_usd / 2500); // Approx
        const meetsProfitThreshold = profitEth >= AUDIT_CONFIG.MIN_PROFIT_THRESHOLD_ETH;
        auditReport.checks.profit_threshold = {
            profit_eth: profitEth,
            required: AUDIT_CONFIG.MIN_PROFIT_THRESHOLD_ETH,
            passed: meetsProfitThreshold
        };
        
        if (!meetsProfitThreshold) {
            auditReport.rejection_reason = 'BELOW_PROFIT_THRESHOLD';
            auditReport.approved = false;
            this.stats.rejectedCount++;
            
            console.warn(`[ARCHEOLOGY_AUDIT] ${auditId}: ❌ REJEITADA - Profit ${profitEth.toFixed(6)} ETH < ${AUDIT_CONFIG.MIN_PROFIT_THRESHOLD_ETH}`);
            
            await this.logRejection(opportunity, 'BELOW_PROFIT_THRESHOLD', profitEth);
            return auditReport;
        }
        
        // ─────────────────────────────────────────────────────────────────
        // CHECK 3: Wallet Alignment (Destino = Carteira Comandante)
        // ─────────────────────────────────────────────────────────────────
        const destinationWallet = opportunity.destination_address || AUDIT_CONFIG.COMMANDER_WALLET;
        const isWalletAligned = this.validateWalletAlignment(destinationWallet);
        auditReport.checks.wallet_alignment = {
            destination: destinationWallet,
            expected: AUDIT_CONFIG.COMMANDER_WALLET,
            passed: isWalletAligned
        };
        
        if (!isWalletAligned) {
            auditReport.rejection_reason = 'WALLET_MISMATCH';
            auditReport.approved = false;
            this.stats.rejectedCount++;
            
            console.error(`[ARCHEOLOGY_AUDIT] ${auditId}: 🚨 CRÍTICO - Wallet destino não alinhada!`);
            console.error(`   Esperado: ${AUDIT_CONFIG.COMMANDER_WALLET}`);
            console.error(`   Recebido: ${destinationWallet}`);
            
            // 🚨 LOG GRAFANA: Alerta crítico de segurança
            await this.logToGrafana({
                alert_type: 'WALLET_SECURITY_ALERT',
                severity: 'CRITICAL',
                message: 'Tentativa de redirecionamento de lucro para wallet não autorizada',
                expected_wallet: AUDIT_CONFIG.COMMANDER_WALLET,
                actual_wallet: destinationWallet,
                opportunity_id: opportunity.id,
                timestamp: new Date().toISOString()
            });
            
            await this.logRejection(opportunity, 'WALLET_MISMATCH', destinationWallet);
            return auditReport;
        }
        
        // ─────────────────────────────────────────────────────────────────
        // CHECK 4: Gas Efficiency (Low Gwei Strategy)
        // ─────────────────────────────────────────────────────────────────
        const gasPriceGwei = opportunity.gas_price_gwei || 0.1;
        const isGasEfficient = gasPriceGwei <= AUDIT_CONFIG.MAX_GAS_PRICE_GWEI;
        auditReport.checks.gas_efficiency = {
            gas_price_gwei: gasPriceGwei,
            max_allowed: AUDIT_CONFIG.MAX_GAS_PRICE_GWEI,
            passed: isGasEfficient
        };
        
        if (!isGasEfficient) {
            console.warn(`[ARCHEOLOGY_AUDIT] ${auditId}: ⚠️ Gas alto (${gasPriceGwei} gwei), mas aprovado com warning`);
        }
        
        // ─────────────────────────────────────────────────────────────────
        // CHECK 5: Emergency Kill Switch
        // ─────────────────────────────────────────────────────────────────
        if (AUDIT_CONFIG.EMERGENCY_KILL_SWITCH) {
            auditReport.rejection_reason = 'EMERGENCY_KILL_SWITCH_ACTIVE';
            auditReport.approved = false;
            this.stats.rejectedCount++;
            
            console.error(`[ARCHEOLOGY_AUDIT] ${auditId}: 🚨 KILL SWITCH ATIVO - Todas transações bloqueadas`);
            
            await this.logToGrafana({
                alert_type: 'EMERGENCY_STOP',
                severity: 'CRITICAL',
                message: 'Emergency kill switch está ativo - sistema em modo manutenção',
                timestamp: new Date().toISOString()
            });
            
            return auditReport;
        }
        
        // ─────────────────────────────────────────────────────────────────
        // ✅ TODOS CHECKS PASSARAM - APROVAR EXECUÇÃO
        // ─────────────────────────────────────────────────────────────────
        auditReport.approved = true;
        auditReport.latency_ms = Date.now() - startTime;
        
        this.stats.approvedCount++;
        this.stats.totalProfitUsd += opportunity.profit_usd || 0;
        this.stats.totalGasUsd += opportunity.gas_cost_usd || 0;
        
        console.log(`[ARCHEOLOGY_AUDIT] ${auditId}: ✅ APROVADA para execução`);
        console.log(`   Profit: $${opportunity.profit_usd?.toFixed(2) || 'N/A'} | Confidence: ${confidence.toFixed(2)}`);
        console.log(`   Destino: ${AUDIT_CONFIG.COMMANDER_WALLET.slice(0, 20)}...`);
        
        // Registrar no ledger digital
        await this.logApprovedOpportunity(opportunity, auditReport);
        
        return auditReport;
    }
    
    /**
     * 🔐 Valida se a wallet de destino é a carteira autorizada do Comandante
     */
    validateWalletAlignment(destinationAddress) {
        const normalizedDest = destinationAddress?.toLowerCase();
        const normalizedExpected = AUDIT_CONFIG.COMMANDER_WALLET?.toLowerCase();
        
        return normalizedDest === normalizedExpected;
    }
    
    /**
     * 💾 Log de aprovação no digital_archeology_ledger
     */
    async logApprovedOpportunity(opportunity, auditReport) {
        if (!this.supabase) return;
        
        try {
            const ledgerRecord = {
                tx_hash: opportunity.tx_hash || `pending_${opportunity.id}`,
                tx_type: 'dust_sweep',
                source_address: opportunity.pair_address,
                destination_address: AUDIT_CONFIG.COMMANDER_WALLET,
                executor_address: opportunity.executor_address || process.env.EXECUTOR_WALLET,
                
                gross_profit_eth: opportunity.profit_eth || 0,
                gross_profit_usd: opportunity.profit_usd || 0,
                gas_cost_eth: opportunity.gas_eth || 0,
                gas_cost_usd: opportunity.gas_cost_usd || 0,
                net_profit_eth: (opportunity.profit_eth || 0) - (opportunity.gas_eth || 0),
                net_profit_usd: (opportunity.profit_usd || 0) - (opportunity.gas_cost_usd || 0),
                
                fee_buffer_percent: AUDIT_CONFIG.FEE_PROTECTION_BUFFER * 100,
                fee_buffer_amount_eth: (opportunity.profit_eth || 0) * AUDIT_CONFIG.FEE_PROTECTION_BUFFER,
                fee_buffer_amount_usd: (opportunity.profit_usd || 0) * AUDIT_CONFIG.FEE_PROTECTION_BUFFER,
                
                opportunity_id: opportunity.id,
                pair_address: opportunity.pair_address,
                dex_name: opportunity.dex_name,
                token0_address: opportunity.token0_address,
                token1_address: opportunity.token1_address,
                
                ai_confidence_score: opportunity.confidence,
                ai_model_version: 'Mammouth_v3.0',
                ai_analysis_metadata: {
                    audit_id: auditReport.audit_id,
                    checks_passed: Object.keys(auditReport.checks).filter(k => auditReport.checks[k].passed).length,
                    total_checks: Object.keys(auditReport.checks).length
                },
                
                status: 'approved_pending_execution',
                audit_trail: {
                    audited_at: auditReport.timestamp,
                    audit_latency_ms: auditReport.latency_ms,
                    rejection_reason: null
                },
                grafana_logged: false
            };
            
            const { error } = await this.supabase
                .from('digital_archeology_ledger')
                .insert(ledgerRecord);
            
            if (error) {
                console.error('[ARCHEOLOGY_AUDIT] Erro ao inserir no ledger:', error.message);
            } else {
                console.log('[ARCHEOLOGY_AUDIT] ✅ Registrado no digital_archeology_ledger');
            }
            
        } catch (err) {
            console.error('[ARCHEOLOGY_AUDIT] Erro ao logar aprovação:', err.message);
        }
    }
    
    /**
     * 📝 Log de rejeição no ledger
     */
    async logRejection(opportunity, reason, value) {
        if (!this.supabase) return;
        
        try {
            const rejectionRecord = {
                tx_hash: `rejected_${opportunity.id}_${Date.now()}`,
                tx_type: 'dust_sweep',
                source_address: opportunity.pair_address || 'unknown',
                destination_address: AUDIT_CONFIG.COMMANDER_WALLET,
                
                gross_profit_usd: opportunity.profit_usd || 0,
                gas_cost_usd: opportunity.gas_cost_usd || 0,
                net_profit_usd: 0,
                
                opportunity_id: opportunity.id,
                pair_address: opportunity.pair_address,
                dex_name: opportunity.dex_name,
                
                ai_confidence_score: opportunity.confidence || 0,
                
                status: 'rejected',
                audit_trail: {
                    rejected_at: new Date().toISOString(),
                    rejection_reason: reason,
                    rejection_value: value
                },
                grafana_logged: true
            };
            
            await this.supabase
                .from('digital_archeology_ledger')
                .insert(rejectionRecord);
            
        } catch (err) {
            console.error('[ARCHEOLOGY_AUDIT] Erro ao logar rejeição:', err.message);
        }
    }
    
    /**
     * 📊 Enviar logs para Grafana (Loki)
     */
    async logToGrafana(logData) {
        if (!AUDIT_CONFIG.GRAFANA_ENDPOINT) {
            console.log('[ARCHEOLOGY_AUDIT] Grafana endpoint não configurado - log local apenas');
            return;
        }
        
        try {
            const lokiPayload = {
                streams: [{
                    stream: {
                        job: 'gxeon_archeology_audit',
                        alert_type: logData.alert_type,
                        severity: logData.severity
                    },
                    values: [
                        [Date.now() * 1000000, JSON.stringify(logData)]
                    ]
                }]
            };
            
            await axios.post(
                `${AUDIT_CONFIG.GRAFANA_ENDPOINT}/loki/api/v1/push`,
                lokiPayload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AUDIT_CONFIG.GRAFANA_API_KEY}`
                    },
                    timeout: 5000
                }
            );
            
            console.log(`[ARCHEOLOGY_AUDIT] 📊 Log enviado para Grafana: ${logData.alert_type}`);
            
        } catch (err) {
            console.warn('[ARCHEOLOGY_AUDIT] Falha ao enviar para Grafana:', err.message);
        }
    }
    
    /**
     * 📈 Obter estatísticas de auditoria
     */
    getStats() {
        return {
            ...this.stats,
            totalAudited: this.stats.approvedCount + this.stats.rejectedCount,
            approval_rate: this.stats.approvedCount > 0 
                ? (this.stats.approvedCount / (this.stats.approvedCount + this.stats.rejectedCount) * 100).toFixed(2) + '%'
                : '0%',
            commander_wallet: AUDIT_CONFIG.COMMANDER_WALLET.slice(0, 20) + '...',
            min_confidence: AUDIT_CONFIG.MIN_AI_CONFIDENCE
        };
    }
    
    /**
     * 🚨 Ativar kill switch de emergência
     */
    activateKillSwitch(reason = 'manual') {
        console.error(`[ARCHEOLOGY_AUDIT] 🚨 KILL SWITCH ATIVADO: ${reason}`);
        process.env.EMERGENCY_KILL_SWITCH = 'ACTIVE';
        
        this.logToGrafana({
            alert_type: 'KILL_SWITCH_ACTIVATED',
            severity: 'CRITICAL',
            message: `Kill switch ativado: ${reason}`,
            timestamp: new Date().toISOString()
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════
let auditServiceInstance = null;

function getArcheologyAuditService() {
    if (!auditServiceInstance) {
        auditServiceInstance = new ArcheologyAuditService();
    }
    return auditServiceInstance;
}

module.exports = {
    ArcheologyAuditService,
    getArcheologyAuditService,
    AUDIT_CONFIG,
    
    // Função de conveniência
    auditOpportunity: async (opportunity) => {
        const service = getArcheologyAuditService();
        return service.auditOpportunity(opportunity);
    }
};
