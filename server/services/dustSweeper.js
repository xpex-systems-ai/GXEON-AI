/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧹 GARI BLOCKCHAIN v1.0 — Arqueologia Digital
 * Dust Sweeper: Identificador de taxas esquecidas e liquidez abandonada
 * Sincronização: Brave Extension (Leo) Manifest V3
 * INTEGRAÇÃO: Supreme Monetization Audit v4.0.0
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { ethers } = require('ethers');
const { getArcheologyAuditService } = require('./archeologyAudit');

// Carteira de recebimento do Comandante (revenue destination)
const COMMANDER_WALLET = process.env.COMMANDER_WALLET_ADDRESS || '0x3955d559055DadB7067054cB6E6f974710345224';

// ABI mínima para coletar taxas da Uniswap V3
const V3_POOL_ABI = [
    "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
    "function collect(address recipient, int24 tickLower, int24 tickUpper, uint128 amount0Requested, uint128 amount1Requested) external returns (uint128 amount0, uint128 amount1)",
    "function positions(bytes32 key) external view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
];

const POSITION_MANAGER_ABI = [
    "function positions(uint256 tokenId) external view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
];

// Endereços Uniswap V3 Arbitrum
const UNISWAP_V3_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984';
const UNISWAP_V3_POSITION_MANAGER = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';

// Thresholds de calibragem - LOW GWEI STRATEGY
const SWEEPER_CONFIG = {
    minFeeValueUsd: 5,           // Taxa mínima para considerar ($5)
    gasCostEstimateUsd: 2,       // Custo estimado de gás ($2 Arbitrum)
    profitMarginPercent: 50,     // Margem de lucro mínima (%)
    scanIntervalMs: 300000,      // 5 minutos entre scans
    maxPositionsPerScan: 50,     // Limite de posições por varredura
    braveExtensionEndpoint: null, // Será configurado via env
    maxGasPriceGwei: parseFloat(process.env.MAX_GAS_PRICE_GWEI) || 0.1, // STOP-LOSS
    
    // Filtros de segurança para FAMILY_SUSTENANCE_ENGINE
    filters: {
        requireLockedLiquidity: true,  // Apenas LP bloqueada
        requireRenounced: true,        // Contratos renunciados
        blockHoneypots: true,          // Anti-honeypot
        minConfidence: 0.85            // Mammouth AI threshold
    }
};

class GariDustSweeper {
    constructor(provider, supabaseClient) {
        this.provider = provider;
        this.supabase = supabaseClient;
        this.isRunning = false;
        this.discoveredOpportunities = [];
        this.stats = {
            totalScanned: 0,
            totalFound: 0,
            totalValueUsd: 0,
            lastScanAt: null
        };
    }

    /**
     * 🚀 Inicia o sweeper em modo arqueólogo
     */
    async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        console.log('🧹 [GXEON-GARI] DustSweeper v1.0 — Arqueologia Digital iniciada');
        console.log(`📊 [GARI] Config: minFee=$${SWEEPER_CONFIG.minFeeValueUsd}, gasEst=$${SWEEPER_CONFIG.gasCostEstimateUsd}`);
        
        // Primeiro scan imediato
        await this.scanForAbandonedLiquidity();
        
        // Loop de varredura
        this.scanInterval = setInterval(async () => {
            if (!this.isRunning) return;
            await this.scanForAbandonedLiquidity();
        }, SWEEPER_CONFIG.scanIntervalMs);
    }

    stop() {
        this.isRunning = false;
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        console.log('🛑 [GARI] DustSweeper parado');
    }

    /**
     * 🔍 Varredura principal — O "olho" que encontra dinheiro esquecido
     */
    async scanForAbandonedLiquidity() {
        const scanStart = Date.now();
        console.log('🧹 [GARI] Iniciando varredura de poeira e taxas esquecidas...');
        
        try {
            // 1. Buscar posições candidatas do banco (geradas pelo Radar)
            const candidates = await this.getCandidatesFromDatabase();
            
            if (candidates.length === 0) {
                console.log('📭 [GARI] Nenhuma posição candidata encontrada no banco');
                return;
            }
            
            console.log(`🔍 [GARI] ${candidates.length} posições candidatas encontradas`);
            
            // 2. Verificar cada posição por taxas acumuladas
            const opportunities = [];
            
            for (const candidate of candidates.slice(0, SWEEPER_CONFIG.maxPositionsPerScan)) {
                try {
                    const analysis = await this.analyzePosition(candidate);
                    
                    if (analysis.isProfitable) {
                        opportunities.push(analysis);
                        console.log(`💎 [GARI] OPORTUNIDADE: $${analysis.profitUsd.toFixed(2)} de lucro em ${candidate.pair_address?.slice(0, 12)}...`);
                    }
                } catch (err) {
                    // Silencioso — posição pode ter sido removida
                }
            }
            
            // 3. Notificar Extensão Brave (Leo) via Protocolo de Conversão v21.2
            if (opportunities.length > 0) {
                // DNA de Conversão: Cada oportunidade é um payload de execução
                for (const opp of opportunities) {
                    await this.notifyBraveExtension(opp);
                }
                await this.logOpportunitiesToSupabase(opportunities);
            }
            
            // 4. Atualizar estatísticas
            this.stats.totalScanned += candidates.length;
            this.stats.totalFound += opportunities.length;
            this.stats.totalValueUsd += opportunities.reduce((sum, opp) => sum + opp.profitUsd, 0);
            this.stats.lastScanAt = new Date().toISOString();
            
            const scanDuration = Date.now() - scanStart;
            console.log(`✅ [GARI] Scan completo: ${opportunities.length} gems em ${candidates.length} scanned (${scanDuration}ms)`);
            
        } catch (err) {
            console.error(`❌ [GARI] Erro na varredura: ${err.message}`);
        }
    }

    /**
     * 📚 Busca candidatas do banco de dados (pools com volume morto)
     */
    async getCandidatesFromDatabase() {
        if (!this.supabase) return [];
        
        try {
            // Buscar pools com liquidez baixa (possivelmente abandonadas)
            // e com histórico de volume (indica que teve atividade)
            const { data, error } = await this.supabase
                .from('radar_liquidity_pools')
                .select('*')
                .lt('liquidity_usd', 50000)        // Liquidez baixa = abandono
                .gt('volume_24h_usd', 1000)        // Mas teve volume
                .gt('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 7 dias
                .order('volume_24h_usd', { ascending: false })
                .limit(SWEEPER_CONFIG.maxPositionsPerScan);
            
            if (error) throw error;
            return data || [];
            
        } catch (err) {
            console.error(`[GARI] DB error: ${err.message}`);
            return [];
        }
    }

    /**
     * 🎯 Análise de viabilidade — Calibragem: valor > gás?
     */
    async analyzePosition(candidate) {
        const { pair_address, token0_address, token1_address, dex_name } = candidate;
        
        // Simulação de análise (em produção, interagir com contrato)
        // Aqui fazemos uma estimativa baseada em heurísticas
        
        const estimatedFeesUsd = this.estimateFeesFromVolume(candidate.volume_24h_usd);
        const gasCostUsd = SWEEPER_CONFIG.gasCostEstimateUsd;
        const profitUsd = estimatedFeesUsd - gasCostUsd;
        
        // Calibragem: vale a pena?
        const isProfitable = profitUsd > SWEEPER_CONFIG.minFeeValueUsd &&
                           profitUsd > (gasCostUsd * (SWEEPER_CONFIG.profitMarginPercent / 100));
        
        return {
            pairAddress: pair_address,
            token0: token0_address,
            token1: token1_address,
            dex: dex_name,
            estimatedFeesUsd,
            gasCostUsd,
            profitUsd,
            isProfitable,
            timestamp: Date.now(),
            confidence: this.calculateConfidence(candidate)
        };
    }

    /**
     * 🧮 Estimativa de taxas baseada no volume
     */
    estimateFeesFromVolume(volume24hUsd) {
        // Uniswap V3: fee tiers de 0.05%, 0.3%, 1%
        // Assumindo 0.3% average, e LP com 1% da pool
        const avgFeeTier = 0.003;
        const lpShare = 0.01;
        
        return volume24hUsd * avgFeeTier * lpShare;
    }

    /**
     * 📊 Calcula confiança da oportunidade (0-1)
     */
    calculateConfidence(candidate) {
        let score = 0.5;
        
        // Mais volume = mais taxas
        if (candidate.volume_24h_usd > 10000) score += 0.2;
        if (candidate.volume_24h_usd > 50000) score += 0.2;
        
        // Pool antiga = mais chances de abandono
        const ageDays = (Date.now() - new Date(candidate.detected_at).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays > 3) score += 0.1;
        
        return Math.min(score, 1.0);
    }

    /**
     * � GXEON_CASCADE_DNA: PROTOCOLO_DE_CONVERSAO_SUPREMO_v21.2
     * DNA de Conversão: Transforma dados brutos em lucro líquido executável
     */
    async notifyBraveExtension(opportunity) {
        const endpoint = process.env.BRAVE_EXTENSION_ENDPOINT || SWEEPER_CONFIG.braveExtensionEndpoint;
        
        if (!endpoint) {
            console.log(`📤 [GARI] Oportunidade $${opportunity.profitUsd.toFixed(2)} descoberta (Brave endpoint não configurado)`);
            return { status: 'skipped', reason: 'endpoint_not_configured' };
        }
        
        try {
            const axios = require('axios');
            
            // 🧬 DNA DE CONVERSÃO: Payload estruturado para execução na Brave Wallet
            const conversionPayload = {
                type: 'GARI_OPPORTUNITY_DETECTED',
                protocol: 'DNA_CONVERSAO_v21.2',
                timestamp: new Date().toISOString(),
                origin: 'gxeon_sovereign_oracle',
                
                // Payload de execução
                payload: {
                    id: `gari_${Date.now()}_${opportunity.pairAddress.slice(0, 8)}`,
                    token: opportunity.token0, // Token principal
                    contract: opportunity.pairAddress,
                    
                    // Valores econômicos
                    raw_value: Number(opportunity.estimatedFeesUsd.toFixed(6)),
                    net_profit: Number(opportunity.profitUsd.toFixed(6)),
                    gas_estimate: Number(opportunity.gasCostUsd.toFixed(6)),
                    roi_percent: Number(((opportunity.profitUsd / opportunity.gasCostUsd) * 100).toFixed(2)),
                    
                    // 🎯 Instrução de execução para Brave Wallet via Leo
                    execution_data: {
                        chainId: 42161,
                        to: opportunity.pairAddress,
                        data: this.generateCollectCalldata(opportunity), // Calldata de coleta
                        value: '0x0',
                        gasLimit: '0x493E0', // 300k gas
                        estimatedUsd: opportunity.gasCostUsd
                    },
                    
                    // Metadados de decisão
                    confidence: Number(opportunity.confidence.toFixed(2)),
                    priority: opportunity.profitUsd > 50 ? 'urgent' : opportunity.profitUsd > 20 ? 'high' : 'normal',
                    action_type: opportunity.confidence > 0.9 && opportunity.profitUsd > 20 ? 'auto_execute' : 'review'
                },
                
                // Handshake DNA
                handshake: {
                    requestId: `dna_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    expectsAck: true,
                    dnaVerified: true
                }
            };
            
            console.log(`💎 [GXEON-CONVERSAO] Oportunidade de $${opportunity.profitUsd.toFixed(2)} formatada para o Brave.`);
            
            // Envia para o braço de visão (Leo/Extensão)
            const response = await axios.post(endpoint, conversionPayload, {
                timeout: 5000,
                headers: {
                    'X-GXEON-Source': 'gari_dustsweeper',
                    'X-GXEON-Version': '21.2',
                    'X-DNA-Protocol': 'CONVERSAO_SUPREMO',
                    'X-Handshake-ID': conversionPayload.handshake.requestId,
                    'Content-Type': 'application/json'
                },
                validateStatus: (status) => status === 200 || status === 202
            });
            
            // ✅ DNA Handshake Confirmation
            if (response.data && response.data.acknowledged === true) {
                console.log(`🤝 [GXEON-DNA] Handshake Successful! Leo pronto para conversão de $${opportunity.profitUsd.toFixed(2)}`);
                return { 
                    status: 'notified', 
                    dna_verified: true, 
                    ackId: response.data.ackId,
                    profit: opportunity.profitUsd 
                };
            } else {
                console.log(`🦁 [GXEON-DNA] Notificação enviada (sem handshake confirmado)`);
                return { status: 'notified', dna_verified: false };
            }
            
        } catch (err) {
            if (err.response) {
                console.error(`❌ [GXEON-DNA] Leo respondeu com erro HTTP ${err.response.status}: ${err.response.data?.error || 'unknown'}`);
            } else if (err.request) {
                console.error(`❌ [GXEON-DNA] Falha na ponte de conversão. Verifique o endpoint: ${err.message}`);
            } else {
                console.error(`❌ [GXEON-DNA] Erro interno: ${err.message}`);
            }
            return { status: 'error', error: err.message };
        }
    }
    
    /**
     * 🔧 Gerar calldata para coleta de taxas (placeholder)
     * Em produção, usa ethers.js para encode da função collect()
     */
    generateCollectCalldata(opportunity) {
        // Placeholder: Na implementação real, codificar:
        // collect(address recipient, int24 tickLower, int24 tickUpper, uint128 amount0Requested, uint128 amount1Requested)
        const mockCalldata = `0x${'00'.repeat(68)}`;
        return mockCalldata;
    }

    /**
     * 💾 Log de oportunidades no Supabase + Auditoria Suprema
     */
    async logOpportunitiesToSupabase(opportunities) {
        if (!this.supabase) return;
        
        // Inicializar serviço de auditoria
        const auditService = getArcheologyAuditService();
        
        try {
            const records = opportunities.map(opp => ({
                pair_address: opp.pairAddress,
                token0_address: opp.token0,
                token1_address: opp.token1,
                dex_name: opp.dex,
                estimated_fees_usd: opp.estimatedFeesUsd,
                gas_cost_usd: opp.gasCostUsd,
                profit_usd: opp.profitUsd,
                confidence: opp.confidence,
                status: 'discovered',
                destination_address: COMMANDER_WALLET, // ✅ Wallet de recebimento alinhada
                detected_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hora
            }));
            
            const { error } = await this.supabase
                .from('gari_dust_opportunities')
                .insert(records);
            
            if (error) throw error;
            
            console.log(`[GARI] ✅ ${records.length} oportunidades logadas no Supabase`);
            console.log(`[GARI] 💰 Revenue destination: ${COMMANDER_WALLET.slice(0, 20)}...`);
            
            // Auditoria para cada oportunidade
            for (const opp of opportunities) {
                if (opp.confidence >= 0.85 && opp.profitUsd >= 12.5) { // 0.005 ETH ~ $12.5
                    console.log(`[GARI] 🔍 Enviando para auditoria: ${opp.pairAddress.slice(0, 12)}...`);
                    // Audit será feita pelo monetizer quando processar
                }
            }
            
        } catch (err) {
            console.error(`[GARI] Log error: ${err.message}`);
        }
    }

    getStats() {
        return { ...this.stats, isRunning: this.isRunning };
    }
}

// Export singleton
let sweeperInstance = null;

function getDustSweeper(provider, supabase) {
    if (!sweeperInstance) {
        sweeperInstance = new GariDustSweeper(provider, supabase);
    }
    return sweeperInstance;
}

module.exports = {
    GariDustSweeper,
    getDustSweeper,
    scanForAbandonedLiquidity: async () => {
        // Função standalone para uso externo
        const sweeper = getDustSweeper();
        return sweeper.scanForAbandonedLiquidity();
    }
};
