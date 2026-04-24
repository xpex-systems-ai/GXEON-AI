#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AGENT REGISTRY — SWARM A2A v1.0
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Action: INIT_SWARM_A2A_V1
 * Purpose: Register and manage swarm agents with api_key, limits, type, permissions
 * 
 * Central registry for independent agents operating via monetized API
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { Kafka } = require('kafkajs');
const axios = require('axios');
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const REGISTRY_CONFIG = {
  version: '1.0.0',
  gateway_url: process.env.GXEON_GATEWAY_URL || 'http://localhost:3000',
  
  // Kafka for swarm coordination
  kafka: {
    clientId: 'swarm-agent-registry',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  },
  
  // Default agent configurations
  agent_defaults: {
    tier: 'swarm',
    rate_limit: 100, // requests per minute
    timeout_ms: 30000,
    retry_attempts: 3,
    billing_enabled: true
  },
  
  // Swarm topics
  topics: {
    swarm_coordination: 'swarm.coordination',
    swarm_billing: 'swarm.billing',
    swarm_audit: 'swarm.audit'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// AGENT REGISTRY CLASS
// ═══════════════════════════════════════════════════════════════════════════
class AgentRegistry {
  constructor() {
    this.agents = new Map(); // agent_id -> agent_config
    this.apiKeys = new Map(); // api_key -> agent_id
    this.metrics = {
      agents_registered: 0,
      agents_active: 0,
      api_calls_total: 0,
      billing_events: 0
    };
    
    this.kafka = new Kafka(REGISTRY_CONFIG.kafka);
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'swarm-registry' });
  }

  async initialize() {
    console.log('[AGENT_REGISTRY] Initializing Swarm Agent Registry v1.0...');
    
    // Connect to Kafka
    await this.producer.connect();
    await this.consumer.connect();
    
    // Subscribe to swarm topics
    await this.consumer.subscribe({ topics: Object.values(REGISTRY_CONFIG.topics) });
    
    // Start consuming
    this.startConsumer();
    
    console.log('[AGENT_REGISTRY] ✅ Registry active');
    console.log(`[AGENT_REGISTRY] Gateway: ${REGISTRY_CONFIG.gateway_url}`);
  }

  /**
   * Register a new swarm agent
   */
  registerAgent(agentConfig) {
    const agentId = agentConfig.agent_id || `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const apiKey = agentConfig.api_key || this.generateApiKey(agentId);
    
    const config = {
      agent_id: agentId,
      api_key: apiKey,
      name: agentConfig.name || 'Unnamed Agent',
      type: agentConfig.type || 'generic',
      tier: agentConfig.tier || REGISTRY_CONFIG.agent_defaults.tier,
      permissions: agentConfig.permissions || ['read', 'execute'],
      rate_limit: agentConfig.rate_limit || REGISTRY_CONFIG.agent_defaults.rate_limit,
      timeout_ms: agentConfig.timeout_ms || REGISTRY_CONFIG.agent_defaults.timeout_ms,
      retry_attempts: agentConfig.retry_attempts || REGISTRY_CONFIG.agent_defaults.retry_attempts,
      billing_enabled: agentConfig.billing_enabled !== false,
      webhook_url: agentConfig.webhook_url || null,
      metadata: agentConfig.metadata || {},
      registered_at: new Date().toISOString(),
      status: 'active',
      call_count: 0,
      total_cost_usd: 0
    };
    
    this.agents.set(agentId, config);
    this.apiKeys.set(apiKey, agentId);
    this.metrics.agents_registered++;
    this.metrics.agents_active++;
    
    console.log(`[AGENT_REGISTRY] ✅ Agent registered: ${agentId} (${config.type})`);
    console.log(`[AGENT_REGISTRY]    API Key: ${apiKey.substring(0, 16)}...`);
    console.log(`[AGENT_REGISTRY]    Permissions: ${config.permissions.join(', ')}`);
    
    // Emit registration event
    this.emitEvent('AGENT_REGISTERED', {
      agent_id: agentId,
      type: config.type,
      tier: config.tier,
      timestamp: config.registered_at
    });
    
    return config;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  /**
   * Get agent by API key
   */
  getAgentByApiKey(apiKey) {
    const agentId = this.apiKeys.get(apiKey);
    return agentId ? this.agents.get(agentId) : null;
  }

  /**
   * Validate agent permission
   */
  hasPermission(agentId, permission) {
    const agent = this.agents.get(agentId);
    return agent && agent.permissions.includes(permission);
  }

  /**
   * Update agent metrics after API call
   */
  recordApiCall(agentId, callData) {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    agent.call_count++;
    agent.last_call_at = new Date().toISOString();
    
    if (callData.cost_usd) {
      agent.total_cost_usd += callData.cost_usd;
    }
    
    this.metrics.api_calls_total++;
    
    // Emit billing event if enabled
    if (agent.billing_enabled && callData.cost_usd) {
      this.emitEvent('AGENT_BILLED', {
        agent_id: agentId,
        execution_id: callData.execution_id,
        cost_usd: callData.cost_usd,
        latency_ms: callData.latency_ms,
        success: callData.success,
        timestamp: new Date().toISOString()
      });
      this.metrics.billing_events++;
    }
  }

  /**
   * Execute API call through gateway on behalf of agent
   */
  async executeViaGateway(agentId, payload) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    if (!agent.permissions.includes('execute')) {
      throw new Error(`Agent ${agentId} lacks execute permission`);
    }
    
    const startTime = Date.now();
    
    try {
      // Call gateway with agent's API key
      const response = await axios.post(
        `${REGISTRY_CONFIG.gateway_url}/v1/a2a/execute`,
        {
          ...payload,
          agent_id: agentId,
          agent_type: agent.type,
          swarm_call: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': agent.api_key,
            'X-Agent-ID': agentId,
            'X-Swarm-Call': 'true',
            'X-External-Client': 'true'
          },
          timeout: agent.timeout_ms
        }
      );
      
      const latency = Date.now() - startTime;
      
      // Record the call
      this.recordApiCall(agentId, {
        execution_id: response.data?.request_id,
        cost_usd: response.data?.billing?.estimated_cost_usd || 0.006,
        latency_ms: latency,
        success: response.status === 202
      });
      
      return {
        success: true,
        status: response.status,
        data: response.data,
        latency_ms: latency
      };
      
    } catch (error) {
      const latency = Date.now() - startTime;
      
      this.recordApiCall(agentId, {
        execution_id: null,
        cost_usd: 0,
        latency_ms: latency,
        success: false,
        error: error.message
      });
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        latency_ms: latency
      };
    }
  }

  /**
   * Get all active agents
   */
  getActiveAgents() {
    return Array.from(this.agents.values()).filter(a => a.status === 'active');
  }

  /**
   * Get agents by type
   */
  getAgentsByType(type) {
    return Array.from(this.agents.values()).filter(a => a.type === type);
  }

  /**
   * Deactivate agent
   */
  deactivateAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'inactive';
      this.metrics.agents_active--;
      console.log(`[AGENT_REGISTRY] Agent deactivated: ${agentId}`);
    }
  }

  /**
   * Generate API key for agent
   */
  generateApiKey(agentId) {
    const hash = crypto.createHash('sha256');
    hash.update(`${agentId}_${Date.now()}_${Math.random()}`);
    return `swarm_${hash.digest('hex').substring(0, 32)}`;
  }

  /**
   * Emit event to Kafka
   */
  async emitEvent(eventType, data) {
    try {
      await this.producer.send({
        topic: REGISTRY_CONFIG.topics.swarm_coordination,
        messages: [{
          key: data.agent_id || 'system',
          value: JSON.stringify({
            event_type: eventType,
            timestamp: new Date().toISOString(),
            ...data
          })
        }]
      });
    } catch (error) {
      console.error('[AGENT_REGISTRY] Event emit error:', error.message);
    }
  }

  /**
   * Start Kafka consumer
   */
  async startConsumer() {
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          await this.handleSwarmEvent(event);
        } catch (error) {
          console.error('[AGENT_REGISTRY] Event parse error:', error.message);
        }
      }
    });
  }

  /**
   * Handle swarm coordination events
   */
  async handleSwarmEvent(event) {
    switch (event.event_type) {
      case 'AGENT_HEALTH_CHECK':
        // Update agent health status
        break;
      case 'SWARM_CYCLE_COMPLETE':
        // Log swarm cycle completion
        console.log(`[AGENT_REGISTRY] Swarm cycle complete: ${event.cycle_id}`);
        break;
      default:
        // Unknown event type
    }
  }

  /**
   * Get registry metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      agents: this.agents.size,
      agent_types: this.getAgentTypeDistribution()
    };
  }

  /**
   * Get distribution of agent types
   */
  getAgentTypeDistribution() {
    const distribution = {};
    for (const agent of this.agents.values()) {
      distribution[agent.type] = (distribution[agent.type] || 0) + 1;
    }
    return distribution;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('[AGENT_REGISTRY] Shutting down...');
    await this.producer.disconnect();
    await this.consumer.disconnect();
    console.log('[AGENT_REGISTRY] Disconnected from Kafka');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════
const registry = new AgentRegistry();

module.exports = {
  AgentRegistry,
  registry,
  REGISTRY_CONFIG
};
