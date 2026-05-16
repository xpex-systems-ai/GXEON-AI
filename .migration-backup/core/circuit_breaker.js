/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SYSTEM_HARDENING_V10 - Circuit Breaker Module
 * Disjuntor de Segurança: Stop all on 5 consecutive errors
 * 
 * Autorizado por: Comandante Júnior Sena
 * ═══════════════════════════════════════════════════════════════════════════
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minuto
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 3;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.halfOpenCalls = 0;
    
    // Callbacks
    this.onOpen = options.onOpen || (() => {});
    this.onClose = options.onClose || (() => {});
    this.onHalfOpen = options.onHalfOpen || (() => {});
    
    // Métricas
    this.metrics = {
      totalCalls: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      stateTransitions: []
    };
  }
  
  async execute(operation, context = '') {
    this.metrics.totalCalls++;
    
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new Error(`Circuit Breaker OPEN for ${context}: System halted due to ${this.failureThreshold} consecutive failures`);
      }
    }
    
    if (this.state === 'HALF_OPEN' && this.halfOpenCalls >= this.halfOpenMaxCalls) {
      throw new Error(`Circuit Breaker HALF_OPEN limit reached for ${context}`);
    }
    
    if (this.state === 'HALF_OPEN') {
      this.halfOpenCalls++;
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.metrics.totalSuccesses++;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxCalls) {
        this.transitionTo('CLOSED');
      }
    } else {
      this.failureCount = 0;
    }
  }
  
  onFailure() {
    this.metrics.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }
  
  transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;
    
    this.metrics.stateTransitions.push({
      from: oldState,
      to: newState,
      timestamp: new Date().toISOString()
    });
    
    // Reset counters
    if (newState === 'CLOSED') {
      this.failureCount = 0;
      this.successCount = 0;
      this.halfOpenCalls = 0;
      this.onClose();
    } else if (newState === 'OPEN') {
      this.onOpen();
    } else if (newState === 'HALF_OPEN') {
      this.halfOpenCalls = 0;
      this.successCount = 0;
      this.onHalfOpen();
    }
    
    // Log state change
    console.error(`🚨 [CIRCUIT_BREAKER] State changed: ${oldState} → ${newState}`);
  }
  
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      metrics: this.metrics,
      isOperational: this.state !== 'OPEN'
    };
  }
  
  forceOpen(reason = 'Manual override') {
    this.transitionTo('OPEN');
    console.error(`🚨 [CIRCUIT_BREAKER] FORCED OPEN: ${reason}`);
  }
  
  forceClose() {
    this.transitionTo('CLOSED');
    console.log(`✅ [CIRCUIT_BREAKER] FORCED CLOSED: System reset`);
  }
}

// Circuit Breaker Global para a Frota
class FleetCircuitBreaker {
  constructor() {
    this.breakers = new Map();
    
    // Breakers por agente
    this.breakers.set('airdrop_hunter', new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 300000, // 5 min
      onOpen: () => console.error('🚨 [FLEET] Airdrop Hunter halted - 5 consecutive failures'),
      onClose: () => console.log('✅ [FLEET] Airdrop Hunter resumed')
    }));
    
    this.breakers.set('task_miner', new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000, // 1 min
      onOpen: () => console.error('🚨 [FLEET] Task Miner halted - 5 consecutive failures'),
      onClose: () => console.log('✅ [FLEET] Task Miner resumed')
    }));
    
    this.breakers.set('liquidity_sniper', new CircuitBreaker({
      failureThreshold: 3, // Mais sensível (movimenta dinheiro real)
      resetTimeout: 120000, // 2 min
      onOpen: () => console.error('🚨 [FLEET] LIQUIDITY SNIPER HALTED - 3 failures'),
      onClose: () => console.log('✅ [FLEET] Liquidity Sniper resumed')
    }));
    
    this.breakers.set('governance', new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 300000,
      onOpen: () => console.error('🚨 [FLEET] Governance halted - 5 consecutive failures'),
      onClose: () => console.log('✅ [FLEET] Governance resumed')
    }));
    
    // Master breaker para toda a frota
    this.masterBreaker = new CircuitBreaker({
      failureThreshold: 10,
      resetTimeout: 600000, // 10 min
      onOpen: () => {
        console.error('🚨🚨🚨 [FLEET] MASTER CIRCUIT BREAKER OPEN - ALL SYSTEMS HALTED');
        console.error('🚨🚨🚨 Manual intervention required');
        // Aqui poderia enviar alerta para o Comandante
      },
      onClose: () => console.log('✅ [FLEET] Master breaker closed - Systems resuming')
    });
  }
  
  async execute(agentName, operation, context = '') {
    const breaker = this.breakers.get(agentName);
    if (!breaker) {
      throw new Error(`Unknown agent: ${agentName}`);
    }
    
    // Verifica master breaker primeiro
    if (!this.masterBreaker.getState().isOperational) {
      throw new Error('Master Circuit Breaker is OPEN - All operations halted');
    }
    
    try {
      const result = await breaker.execute(operation, context);
      return result;
    } catch (error) {
      // Contabiliza falha no master também
      this.masterBreaker.onFailure();
      throw error;
    }
  }
  
  getStatus() {
    const status = {
      master: this.masterBreaker.getState(),
      agents: {}
    };
    
    for (const [name, breaker] of this.breakers) {
      status.agents[name] = breaker.getState();
    }
    
    return status;
  }
  
  emergencyStop() {
    console.error('🚨🚨🚨 EMERGENCY STOP ACTIVATED BY COMMAND');
    this.masterBreaker.forceOpen('EMERGENCY_STOP');
    for (const [name, breaker] of this.breakers) {
      breaker.forceOpen('EMERGENCY_STOP');
    }
  }
  
  reset() {
    console.log('🔄 [CIRCUIT_BREAKER] Manual reset initiated');
    this.masterBreaker.forceClose();
    for (const [name, breaker] of this.breakers) {
      breaker.forceClose();
    }
  }
}

// Singleton export
const fleetCircuitBreaker = new FleetCircuitBreaker();

export { CircuitBreaker, FleetCircuitBreaker, fleetCircuitBreaker };
export default fleetCircuitBreaker;
