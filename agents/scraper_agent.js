#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SCRAPER AGENT — SWARM A2A v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Action: INIT_SWARM_A2A_V1
 * Type: scraper
 * 
 * Responsibilities:
 * - Scrape on-chain and off-chain data
 * - Call execution_agent via gateway
 * - Generate billing event for every operation
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { registry, REGISTRY_CONFIG } = require('../core/agent_registry');
const axios = require('axios');

class ScraperAgent {
  constructor() {
    this.agent_id = 'scraper_agent_001';
    this.name = 'Scraper Agent';
    this.type = 'scraper';
    this.api_key = process.env.SCRAPER_AGENT_API_KEY || null;
    
    this.metrics = {
      scrapes_completed: 0,
      data_items_collected: 0,
      api_calls_made: 0,
      total_cost_usd: 0,
      next_agent_calls: 0
    };
    
    this.isRunning = false;
    this.scrapeInterval = null;
  }

  async initialize() {
    console.log('[SCRAPER_AGENT] Initializing...');
    
    // Register with agent registry
    const config = registry.registerAgent({
      agent_id: this.agent_id,
      name: this.name,
      type: this.type,
      api_key: this.api_key,
      permissions: ['read', 'execute'],
      metadata: {
        capabilities: ['liquidity_scanning', 'price_monitoring', 'opportunity_detection'],
        next_agent: 'execution_agent_001'
      }
    });
    
    this.api_key = config.api_key;
    console.log(`[SCRAPER_AGENT] Registered with API Key: ${this.api_key.substring(0, 16)}...`);
  }

  async start() {
    this.isRunning = true;
    console.log('[SCRAPER_AGENT] Starting scrape loop...');
    
    // Scrape every 10 seconds
    this.scrapeInterval = setInterval(() => {
      this.performScrape();
    }, 10000);
    
    // Initial scrape
    await this.performScrape();
  }

  async performScrape() {
    if (!this.isRunning) return;
    
    const startTime = Date.now();
    
    try {
      // Simulate data scraping
      const scrapedData = await this.scrapeData();
      
      console.log(`[SCRAPER_AGENT] Scraped ${scrapedData.items.length} items`);
      
      this.metrics.scrapes_completed++;
      this.metrics.data_items_collected += scrapedData.items.length;
      
      // Call execution agent via gateway
      await this.callExecutionAgent(scrapedData);
      
    } catch (error) {
      console.error('[SCRAPER_AGENT] Scrape error:', error.message);
    }
  }

  async scrapeData() {
    // Simulate scraping on-chain data
    const mockData = {
      timestamp: new Date().toISOString(),
      items: [
        {
          type: 'liquidity_opportunity',
          chain: 'arbitrum',
          dex: 'uniswap_v3',
          pool: '0x1234...5678',
          liquidity_usd: 1500000,
          volume_24h: 500000,
          estimated_profit: 0.025
        },
        {
          type: 'price_discrepancy',
          token: 'ETH',
          source_price: 3450.50,
          target_price: 3452.00,
          discrepancy_pct: 0.043
        }
      ]
    };
    
    // Simulate processing time
    await this.sleep(500);
    
    return mockData;
  }

  async callExecutionAgent(data) {
    console.log('[SCRAPER_AGENT] Calling execution_agent via gateway...');
    
    const payload = {
      task_type: 'process_scraped_data',
      source_agent: this.agent_id,
      source_type: this.type,
      payload: data,
      priority: 'high',
      billing_context: {
        source: 'scraper_agent',
        data_volume: data.items.length
      }
    };
    
    // Execute via registry (which calls gateway with proper API key)
    const result = await registry.executeViaGateway(this.agent_id, payload);
    
    this.metrics.api_calls_made++;
    
    if (result.success) {
      this.metrics.next_agent_calls++;
      console.log(`[SCRAPER_AGENT] ✅ Execution agent called (${result.latency_ms}ms)`);
      
      // Track billing
      if (result.data?.billing) {
        this.metrics.total_cost_usd += result.data.billing.estimated_cost_usd || 0.006;
      }
    } else {
      console.error(`[SCRAPER_AGENT] ❌ Failed to call execution agent: ${result.error}`);
    }
    
    return result;
  }

  getMetrics() {
    return {
      agent_id: this.agent_id,
      type: this.type,
      ...this.metrics,
      timestamp: new Date().toISOString()
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    this.isRunning = false;
    if (this.scrapeInterval) {
      clearInterval(this.scrapeInterval);
    }
    console.log('[SCRAPER_AGENT] Stopped');
  }
}

// Run if called directly
if (require.main === module) {
  const agent = new ScraperAgent();
  
  async function main() {
    await registry.initialize();
    await agent.initialize();
    await agent.start();
  }
  
  main().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n[SCRAPER_AGENT] SIGINT received');
    await agent.stop();
    await registry.shutdown();
    process.exit(0);
  });
}

module.exports = { ScraperAgent };
