#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MARKETPLACE SUPREME - FULL INTEGRATION MODULE
 * 
 * Connects all components:
 * - Signal Provider Layer
 * - Signal Marketplace Engine
 * - Monetization Engine
 * - Proof of Value System
 * - Distribution Layer
 * - Acquisition Engine
 * - Observability Engine
 * - API Routes
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Import all marketplace modules
import { orchestrator, telegramIntegration } from './services/marketplaceOrchestrator.js';
import marketplaceRoutes from './routes/signalMarketplace.js';
import { observability, createObservabilityMiddleware } from './services/observabilityEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MarketplaceIntegration {
  constructor(app) {
    this.app = app;
    this.isInitialized = false;
    this.server = null;
  }
  
  async initialize() {
    console.log('\n🏪 ═══════════════════════════════════════════════════════════════');
    console.log('   GXEON MARKETPLACE SUPREME - FULL INTEGRATION');
    console.log('   ═══════════════════════════════════════════════════════════════\n');
    
    try {
      // 1. Initialize orchestrator
      console.log('⏳ Inicializando orquestrador...');
      await this.waitForOrchestrator();
      
      // 2. Setup middleware
      this.setupMiddleware();
      
      // 3. Register routes
      this.setupRoutes();
      
      // 4. Setup static files (dashboard)
      this.setupStaticFiles();
      
      // 5. Setup event listeners
      this.setupEventListeners();
      
      // 6. Start observability
      await observability.init();
      
      this.isInitialized = true;
      
      console.log('\n✅ Marketplace Supreme: INTEGRAÇÃO COMPLETA');
      console.log('   📡 Endpoints ativos: /v1/marketplace/*');
      console.log('   📊 Dashboard: /dashboard');
      console.log('   🔍 Observability: /v1/marketplace/stats');
      console.log('\n═══════════════════════════════════════════════════════════════════\n');
      
      // Log startup event
      await observability.logEvent('SYSTEM_STARTUP', {
        status: 'success',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        modules: [
          'signal_provider_layer',
          'signal_marketplace_engine',
          'monetization_engine',
          'proof_of_value',
          'distribution_layer',
          'acquisition_engine',
          'observability_engine'
        ]
      });
      
      return true;
      
    } catch (err) {
      console.error('❌ Erro na integração:', err);
      await observability.trackError(err, { context: 'initialization' });
      throw err;
    }
  }
  
  waitForOrchestrator() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for orchestrator'));
      }, 30000);
      
      if (orchestrator.isInitialized) {
        clearTimeout(timeout);
        resolve();
        return;
      }
      
      orchestrator.on('marketplace:ready', () => {
        clearTimeout(timeout);
        resolve();
      });
      
      orchestrator.on('marketplace:error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }
  
  setupMiddleware() {
    // Observability middleware for API tracking
    this.app.use('/v1/marketplace', createObservabilityMiddleware(observability));
    
    // Parse JSON bodies
    this.app.use('/v1/marketplace', express.json());
    
    console.log('✅ Middleware configurado');
  }
  
  setupRoutes() {
    // Register marketplace routes
    this.app.use('/v1/marketplace', marketplaceRoutes);
    
    // Dashboard route
    this.app.get('/dashboard', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/dashboard/index.html'));
    });
    
    // Health check endpoint (root level)
    this.app.get('/health', async (req, res) => {
      const health = orchestrator.healthCheck();
      const obsHealth = await observability.healthCheck();
      
      res.json({
        success: true,
        marketplace: health,
        observability: obsHealth,
        timestamp: new Date().toISOString()
      });
    });
    
    console.log('✅ Rotas registradas');
  }
  
  setupStaticFiles() {
    // Serve dashboard static files
    this.app.use('/dashboard', express.static(path.join(__dirname, '../public/dashboard')));
    
    console.log('✅ Arquivos estáticos configurados');
  }
  
  setupEventListeners() {
    // Connect orchestrator events to observability
    orchestrator.on('signal:processed', async (data) => {
      await observability.trackSignalLifecycle(data.signal_id, 'CREATED', {
        pair: data.pair,
        provider: data.provider
      });
    });
    
    orchestrator.on('signal:dispatched', async (data) => {
      await observability.trackSignalLifecycle(data.signal_id, 'SENT', {
        channels: data.channels,
        recipients: data.recipients
      });
    });
    
    orchestrator.on('payment:confirmed', async (data) => {
      await observability.trackPayment(data.type || 'subscription', 'CONFIRMED', {
        amount: data.amount,
        user_id: data.user_id,
        transaction_id: data.transaction_id
      });
    });
    
    orchestrator.on('error', async (err) => {
      await observability.trackError(err, { source: 'orchestrator' });
    });
    
    // Telegram integration events (via orchestrator emit)
    // Note: telegramIntegration listens to orchestrator events internally
    
    console.log('✅ Event listeners configurados');
  }
  
  /**
   * Get full system status
   */
  async getStatus() {
    const orchestratorStats = await orchestrator.getFullStats();
    const observabilityStats = observability.getStats();
    const health = orchestrator.healthCheck();
    
    return {
      initialized: this.isInitialized,
      health: health.status,
      uptime: process.uptime(),
      stats: {
        ...orchestratorStats,
        observability: observabilityStats
      },
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Start server
   */
  start(port = 3000) {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log(`🌑 Servidor rodando na porta ${port}`);
        console.log(`📊 Dashboard: http://localhost:${port}/dashboard`);
        console.log(`🔌 API: http://localhost:${port}/v1/marketplace`);
        resolve(this.server);
      });
    });
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('\n🛑 Desligando marketplace...');
    
    await observability.logEvent('SYSTEM_SHUTDOWN', {
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
    
    if (this.server) {
      this.server.close(() => {
        console.log('✅ Servidor encerrado');
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

export async function createMarketplaceSupreme(app) {
  const integration = new MarketplaceIntegration(app);
  await integration.initialize();
  return integration;
}

export { MarketplaceIntegration };
export default MarketplaceIntegration;
