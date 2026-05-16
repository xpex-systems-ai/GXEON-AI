/**
 * 🐝 GXEON SWARM CONTROLLER v3.0
 * Hive Mind Coordination & ROI Optimization
 * Gerencia todo o enxame e otimiza conversões
 */

const SwarmScouter = require('./scouter');
const SwarmInfiltrator = require('./infiltrator');
const supabase = require('../services/supabase');
const crypto = require('crypto');

class SwarmController {
  constructor(config = {}) {
    this.config = {
      executionInterval: config.executionInterval || 3600000, // 1h
      maxConcurrentAgents: config.maxConcurrentAgents || 50,
      encryptionEnabled: config.encryptionEnabled !== false,
      autoOptimize: config.autoOptimize !== false,
      profitThreshold: config.profitThreshold || 1.0, // ROI mínimo
      ...config
    };
    
    // Componentes do enxame
    this.scouter = null;
    this.infiltrator = null;
    
    // Estado do sistema
    this.isRunning = false;
    this.lastExecution = null;
    this.executionCount = 0;
    this.agentPool = new Map();
    
    // Métricas de ROI
    this.roiMetrics = {
      totalOutreachCost: 0,
      totalRevenue: 0,
      conversions: 0,
      cac: 0, // Customer Acquisition Cost
      ltv: 0,  // Lifetime Value
      roi: 0   // Return on Investment
    };
    
    // Performance tracking
    this.performance = {
      scanSuccessRate: 0,
      outreachConversionRate: 0,
      apiSignupRate: 0,
      avgRevenuePerConversion: 0
    };
    
    this.timer = null;
  }

  /**
   * INICIALIZAÇÃO DO SWARM
   */
  async initialize() {
    console.log('\n🐝═══════════════════════════════════════════════════════🐝');
    console.log('  GXEON SWARM M2M v3.0 - HIVE MIND ACTIVATION');
    console.log('🐝═══════════════════════════════════════════════════════🐝\n');
    
    // Inicializa componentes
    this.scouter = new SwarmScouter({
      arbiscanApiKey: process.env.ARBISCAN_API_KEY,
      githubToken: process.env.GITHUB_TOKEN,
      rapidapiKey: process.env.RAPIDAPI_KEY,
      maxTargetsPerScan: this.config.maxConcurrentAgents
    });
    
    this.infiltrator = new SwarmInfiltrator({
      demoCalls: 10,
      conversionLink: 'https://rapidapi.com/gxeon-systems/api/gxeon-ai',
      offerType: 'LATENCY_ADVANTAGE_TEST',
      maxOutreachPerHour: this.config.maxConcurrentAgents,
      encryptionKey: process.env.SWARM_ENCRYPTION_KEY
    });
    
    // Inicializa
    await this.scouter.initialize();
    await this.infiltrator.initialize();
    
    // Carrega métricas históricas
    await this.loadHistoricalMetrics();
    
    console.log('\n🐝 Swarm Controller inicializado com sucesso');
    console.log(`   ├─ Max Agents: ${this.config.maxConcurrentAgents}`);
    console.log(`   ├─ Interval: ${this.config.executionInterval / 1000}s`);
    console.log(`   ├─ Encryption: ${this.config.encryptionEnabled ? 'ON' : 'OFF'}`);
    console.log(`   └─ Auto-Optimize: ${this.config.autoOptimize ? 'ON' : 'OFF'}\n`);
    
    return this;
  }

  /**
   * START_SWARM
   * Inicia execução autônoma do enxame
   */
  async start() {
    if (this.isRunning) {
      console.log('[🐝 SWARM] Já está em execução');
      return;
    }
    
    this.isRunning = true;
    console.log('[🐝 SWARM] 🚀 Iniciando modo autônomo...');
    
    // Executa imediatamente
    await this.executeCycle();
    
    // Agenda execuções periódicas
    this.timer = setInterval(async () => {
      if (!this.isRunning) return;
      await this.executeCycle();
    }, this.config.executionInterval);
    
    console.log(`[🐝 SWARM] ⏱️  Ciclo agendado: a cada ${this.config.executionInterval / 1000}s`);
  }

  /**
   * STOP_SWARM
   * Para execução autônoma
   */
  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[🐝 SWARM] ⏹️  Execução autônoma interrompida');
  }

  /**
   * EXECUTE_CYCLE
   * Ciclo completo de execução do swarm
   */
  async executeCycle() {
    const cycleId = crypto.randomUUID().slice(0, 8);
    const startTime = Date.now();
    
    console.log(`\n🐝══════════ CICLO ${cycleId} [${new Date().toISOString()}] ══════════🐝`);
    
    try {
      // 1. FASE DE SCOUTING
      console.log('[🐝 CICLO] 🔍 Fase 1: Scouting...');
      const scanResults = await this.scouter.executeFullScan();
      console.log(`[🐝 CICLO]    └─ Leads encontrados: ${scanResults.leadsFound || 0}`);
      
      // 2. FASE DE OTIMIZAÇÃO (se ativada)
      if (this.config.autoOptimize) {
        await this.optimizeStrategy();
      }
      
      // 3. FASE DE OUTREACH
      console.log('[🐝 CICLO] 📤 Fase 2: Outreach...');
      const outreachResults = await this.infiltrator.executeOutreachBatch();
      console.log(`[🐝 CICLO]    └─ Tentativas: ${outreachResults.attempted || 0}`);
      console.log(`[🐝 CICLO]    └─ Sucessos: ${outreachResults.successful || 0}`);
      
      // 4. FASE DE MONITORAMENTO DE CONVERSÕES
      console.log('[🐝 CICLO] 💰 Fase 3: ROI Tracking...');
      await this.trackConversions();
      
      // 5. PERSISTÊNCIA DE MÉTRICAS
      await this.persistCycleMetrics(cycleId, {
        scan: scanResults,
        outreach: outreachResults,
        duration: Date.now() - startTime
      });
      
      this.executionCount++;
      this.lastExecution = new Date().toISOString();
      
      // 6. RELATÓRIO DO CICLO
      this.printCycleReport(cycleId, {
        scan: scanResults,
        outreach: outreachResults,
        roi: this.roiMetrics,
        duration: Date.now() - startTime
      });
      
    } catch (error) {
      console.error(`[🐝 CICLO ${cycleId}] ❌ Erro:`, error.message);
      await this.logError(cycleId, error);
    }
    
    console.log(`🐝══════════ CICLO ${cycleId} COMPLETO ══════════🐝\n`);
  }

  /**
   * OTIMIZAÇÃO BASEADA EM ROI
   */
  async optimizeStrategy() {
    const metrics = await this.calculateCurrentROI();
    
    if (metrics.roi < this.config.profitThreshold) {
      console.log('[🐝 OPTIMIZE] ⚠️ ROI abaixo do threshold, ajustando estratégia...');
      
      // Ajusta targeting para focar em leads de maior qualidade
      const adjustments = {
        scoreThreshold: 60, // Aumenta threshold de qualidade
        maxOutreachPerHour: Math.max(10, this.config.maxConcurrentAgents * 0.5),
        focusChannels: ['m2m_api', 'email'] // Prioriza canais com maior conversão
      };
      
      // Aplica ajustes
      this.infiltrator.config.maxOutreachPerHour = adjustments.maxOutreachPerHour;
      
      console.log('[🐝 OPTIMIZE] ✓ Estratégia ajustada para foco em qualidade');
    } else {
      console.log(`[🐝 OPTIMIZE] ✓ ROI saudável: ${metrics.roi.toFixed(2)}x`);
    }
    
    return metrics;
  }

  /**
   * TRACKING DE CONVERSÕES RAPIDAPI
   */
  async trackConversions() {
    try {
      // Busca novas assinaturas na RapidAPI via webhook ou API
      const { data: conversions, error } = await supabase
        .from('rapidapi_conversions')
        .select('*')
        .eq('tracked', false)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString());
        
      if (error) throw error;
      
      if (conversions && conversions.length > 0) {
        for (const conv of conversions) {
          // Atualiza métricas de ROI
          this.roiMetrics.conversions++;
          this.roiMetrics.totalRevenue += conv.revenue || 0;
          
          // Marca como tracked
          await supabase
            .from('rapidapi_conversions')
            .update({ tracked: true, swarm_cycle: this.executionCount })
            .eq('id', conv.id);
            
          console.log(`[🐝 CONVERSION] 💎 Nova conversão: $${conv.revenue} de ${conv.source || 'unknown'}`);
        }
        
        // Recalcula ROI
        this.recalculateROI();
      }
    } catch (err) {
      console.warn('[🐝 TRACKING] Erro ao track conversões:', err.message);
    }
  }

  /**
   * CÁLCULO DE ROI
   */
  async calculateCurrentROI() {
    // Estimativa de custos (infraestrutura + API calls)
    const infraCost = 0.5; // $0.50 por ciclo estimado
    const apiCosts = (this.scouter.scanStats.totalScanned || 0) * 0.001;
    
    this.roiMetrics.totalOutreachCost = infraCost + apiCosts;
    
    if (this.roiMetrics.totalOutreachCost > 0) {
      this.roiMetrics.roi = this.roiMetrics.totalRevenue / this.roiMetrics.totalOutreachCost;
      this.roiMetrics.cac = this.roiMetrics.conversions > 0 
        ? this.roiMetrics.totalOutreachCost / this.roiMetrics.conversions 
        : 0;
    }
    
    return { ...this.roiMetrics };
  }

  recalculateROI() {
    if (this.roiMetrics.totalOutreachCost > 0) {
      this.roiMetrics.roi = this.roiMetrics.totalRevenue / this.roiMetrics.totalOutreachCost;
    }
    this.roiMetrics.ltv = this.roiMetrics.conversions > 0 
      ? this.roiMetrics.totalRevenue / this.roiMetrics.conversions 
      : 0;
  }

  /**
   * PERSISTÊNCIA DE MÉTRICAS
   */
  async persistCycleMetrics(cycleId, data) {
    try {
      await supabase.from('swarm_cycles').insert({
        cycle_id: cycleId,
        execution_number: this.executionCount,
        scan_results: data.scan,
        outreach_results: data.outreach,
        roi_metrics: this.roiMetrics,
        duration_ms: data.duration,
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('[🐝 PERSIST] Erro ao salvar métricas:', err.message);
    }
  }

  async loadHistoricalMetrics() {
    try {
      const { data, error } = await supabase
        .from('swarm_cycles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Calcula métricas agregadas
        const totalRevenue = data.reduce((sum, d) => sum + (d.roi_metrics?.totalRevenue || 0), 0);
        const totalConversions = data.reduce((sum, d) => sum + (d.roi_metrics?.conversions || 0), 0);
        
        this.roiMetrics.totalRevenue = totalRevenue;
        this.roiMetrics.conversions = totalConversions;
        this.executionCount = data.length;
        
        console.log(`[🐝 HISTÓRICO] ${data.length} ciclos carregados, $${totalRevenue.toFixed(2)} em revenue`);
      }
    } catch (err) {
      console.warn('[🐝 HISTÓRICO] Erro ao carregar:', err.message);
    }
  }

  async logError(cycleId, error) {
    try {
      await supabase.from('swarm_errors').insert({
        cycle_id: cycleId,
        error_message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      // Silencioso
    }
  }

  /**
   * RELATÓRIO DO CICLO
   */
  printCycleReport(cycleId, data) {
    const duration = (data.duration / 1000).toFixed(1);
    
    console.log(`
┌─────────────────────────────────────────────────────┐
│  📊 RELATÓRIO DO CICLO ${cycleId}                    │
├─────────────────────────────────────────────────────┤
│  ⏱️  Duração: ${duration}s                                    │
│  🔍 Scans: ${data.scan.leadsFound || 0} leads                       │
│  📤 Outreach: ${data.outreach.successful || 0}/${data.outreach.attempted || 0} sucesso                │
│  💰 Revenue Total: $${this.roiMetrics.totalRevenue.toFixed(2)}                      │
│  📈 ROI: ${this.roiMetrics.roi.toFixed(2)}x                                    │
│  🎯 CAC: $${this.roiMetrics.cac.toFixed(2)}                              │
│  💎 LTV: $${this.roiMetrics.ltv.toFixed(2)}                              │
└─────────────────────────────────────────────────────┘
    `);
  }

  /**
   * API PÚBLICA
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      executionCount: this.executionCount,
      lastExecution: this.lastExecution,
      roi: this.roiMetrics,
      scouter: this.scouter?.getStats(),
      infiltrator: this.infiltrator?.getStats()
    };
  }

  async forceExecution() {
    if (!this.isRunning) {
      console.log('[🐝 SWARM] Executando ciclo manual...');
      await this.executeCycle();
      return true;
    }
    console.log('[🐝 SWARM] Ciclo já em execução automática');
    return false;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[🐝 SWARM] Config atualizada:', newConfig);
  }
}

module.exports = SwarmController;
