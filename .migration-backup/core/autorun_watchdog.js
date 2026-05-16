// GXEON Autorun Watchdog
// Mantém o GXeon rodando continuamente com estabilidade, retry automático e proteção contra falhas

class AutorunWatchdog {
  constructor(taskEngine, config = {}) {
    this.taskEngine = taskEngine;
    this.config = {
      // Engine loop config
      engineLoop: {
        enabled: config.engineLoop?.enabled !== false,
        intervalMs: config.engineLoop?.intervalMs || 60000,
        maxParallelTasks: config.engineLoop?.maxParallelTasks || 2,
        ...config.engineLoop
      },
      
      // Execution control
      executionControl: {
        cooldownBetweenTasksMs: config.executionControl?.cooldownBetweenTasksMs || 30000,
        maxTasksPerCycle: config.executionControl?.maxTasksPerCycle || 3,
        skipIfRunning: config.executionControl?.skipIfRunning !== false,
        ...config.executionControl
      },
      
      // Watchdog config
      watchdog: {
        enabled: config.watchdog?.enabled !== false,
        heartbeatIntervalMs: config.watchdog?.heartbeatIntervalMs || 15000,
        restartOnFailure: config.watchdog?.restartOnFailure !== false,
        maxFailures: config.watchdog?.maxFailures || 5,
        ...config.watchdog
      },
      
      // Retry strategy
      retryStrategy: {
        enabled: config.retryStrategy?.enabled !== false,
        maxRetries: config.retryStrategy?.maxRetries || 2,
        retryDelayMs: config.retryStrategy?.retryDelayMs || 10000,
        retryOn: config.retryStrategy?.retryOn || ['network_error', 'timeout', 'rpc_error'],
        ...config.retryStrategy
      },
      
      // Failsafe config
      failsafe: {
        maxTxPerHour: config.failsafe?.maxTxPerHour || 10,
        maxValuePerHour: config.failsafe?.maxValuePerHour || 0.005,
        autoPauseOnLimit: config.failsafe?.autoPauseOnLimit !== false,
        ...config.failsafe
      },
      
      // Logging
      logging: {
        level: config.logging?.level || 'info',
        storeErrors: config.logging?.storeErrors !== false,
        storeExecutionHistory: config.logging?.storeExecutionHistory !== false,
        ...config.logging
      }
    };
    
    // State
    this.isRunning = false;
    this.lastHeartbeat = null;
    this.failureCount = 0;
    this.consecutiveFailures = 0;
    this.lastRunTime = null;
    this.executionHistory = [];
    this.errorLog = [];
    
    // Failsafe tracking
    this.hourlyStats = {
      txCount: 0,
      totalValue: 0,
      windowStart: Date.now()
    };
    
    // Intervals
    this.heartbeatInterval = null;
    this.engineLoopInterval = null;
    this.failsafeResetInterval = null;
    
    // Alerts
    this.alerts = [];
  }
  
  // ==================== MAIN CONTROL ====================
  
  start() {
    if (this.isRunning) {
      this.log('warn', 'Watchdog already running');
      return;
    }
    
    this.isRunning = true;
    this.log('info', 'Autorun Watchdog started');
    
    // Start heartbeat
    if (this.config.watchdog.enabled) {
      this.startHeartbeat();
    }
    
    // Start engine loop
    if (this.config.engineLoop.enabled) {
      this.startEngineLoop();
    }
    
    // Start failsafe tracking
    this.startFailsafeTracking();
    
    // Record start
    this.recordExecution('watchdog_start', { timestamp: Date.now() });
  }
  
  stop() {
    this.isRunning = false;
    
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.engineLoopInterval) {
      clearInterval(this.engineLoopInterval);
      this.engineLoopInterval = null;
    }
    
    if (this.failsafeResetInterval) {
      clearInterval(this.failsafeResetInterval);
      this.failsafeResetInterval = null;
    }
    
    this.log('info', 'Autorun Watchdog stopped');
    this.recordExecution('watchdog_stop', { timestamp: Date.now() });
  }
  
  // ==================== HEARTBEAT & WATCHDOG ====================
  
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, this.config.watchdog.heartbeatIntervalMs);
    
    this.log('info', `Heartbeat started (${this.config.watchdog.heartbeatIntervalMs}ms interval)`);
  }
  
  performHeartbeat() {
    this.lastHeartbeat = Date.now();
    
    // Check engine status
    const engineStatus = this.checkEngineStatus();
    
    // Check failsafe limits
    const failsafeStatus = this.checkFailsafeLimits();
    
    // Log status
    this.log('debug', 'Heartbeat', {
      engineRunning: engineStatus.running,
      failsafeOk: failsafeStatus.ok,
      consecutiveFailures: this.consecutiveFailures,
      hourlyTx: this.hourlyStats.txCount
    });
    
    // Handle issues
    if (!engineStatus.running && this.config.watchdog.restartOnFailure) {
      this.handleEngineFailure('Engine not running');
    }
    
    if (!failsafeStatus.ok) {
      this.handleFailsafeTrigger(failsafeStatus.reason);
    }
  }
  
  checkEngineStatus() {
    const running = this.taskEngine?.isRunning || false;
    return { running };
  }
  
  handleEngineFailure(reason) {
    this.consecutiveFailures++;
    this.log('error', `Engine failure detected: ${reason}`, {
      consecutiveFailures: this.consecutiveFailures,
      maxFailures: this.config.watchdog.maxFailures
    });
    
    // Record error
    this.recordError('engine_failure', reason);
    
    // Restart if under max failures
    if (this.consecutiveFailures < this.config.watchdog.maxFailures) {
      this.log('info', 'Attempting to restart engine...');
      this.restartEngine();
    } else {
      this.log('error', 'Max failures reached, stopping watchdog');
      this.triggerAlert('max_failures', {
        consecutiveFailures: this.consecutiveFailures,
        reason
      });
      this.stop();
    }
  }
  
  restartEngine() {
    try {
      // Stop if running
      if (this.taskEngine?.isRunning) {
        this.taskEngine.stop();
      }
      
      // Wait a bit
      setTimeout(() => {
        // Start again
        this.taskEngine.start();
        this.log('info', 'Engine restarted successfully');
        
        // Reset failure count on success
        this.consecutiveFailures = 0;
      }, 5000);
      
    } catch (error) {
      this.log('error', 'Failed to restart engine', error.message);
      this.recordError('restart_failed', error.message);
    }
  }
  
  // ==================== ENGINE LOOP ====================
  
  startEngineLoop() {
    // Run immediately
    this.runEngineCycle();
    
    // Set up interval
    this.engineLoopInterval = setInterval(() => {
      this.runEngineCycle();
    }, this.config.engineLoop.intervalMs);
    
    this.log('info', `Engine loop started (${this.config.engineLoop.intervalMs}ms interval)`);
  }
  
  async runEngineCycle() {
    // Check if already running
    if (this.config.executionControl.skipIfRunning && this.taskEngine?.isRunning) {
      this.log('debug', 'Skipping cycle - engine already running');
      return;
    }
    
    // Check failsafe
    const failsafeCheck = this.checkFailsafeLimits();
    if (!failsafeCheck.ok) {
      this.log('warn', `Engine cycle skipped: ${failsafeCheck.reason}`);
      return;
    }
    
    this.lastRunTime = Date.now();
    
    try {
      this.log('info', 'Running engine cycle...');
      
      // Run pipeline with retry
      const result = await this.runWithRetry(() => 
        this.taskEngine.runPipeline()
      );
      
      if (result.success) {
        this.consecutiveFailures = 0;
        this.log('info', 'Engine cycle completed successfully');
        this.recordExecution('cycle_success', { timestamp: Date.now() });
      } else {
        throw new Error(result.error || 'Pipeline failed');
      }
      
    } catch (error) {
      this.log('error', 'Engine cycle failed', error.message);
      this.recordError('cycle_failed', error.message);
      this.handleEngineFailure(error.message);
    }
  }
  
  // ==================== RETRY STRATEGY ====================
  
  async runWithRetry(operation, context = {}) {
    if (!this.config.retryStrategy.enabled) {
      return await operation();
    }
    
    let lastError = null;
    
    for (let attempt = 0; attempt <= this.config.retryStrategy.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.log('info', `Retry attempt ${attempt}/${this.config.retryStrategy.maxRetries}`);
          
          // Exponential backoff: delay * 2^attempt
          const delay = this.config.retryStrategy.retryDelayMs * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
        
        const result = await operation();
        
        // If we got here, operation succeeded
        if (attempt > 0) {
          this.log('info', `Operation succeeded after ${attempt} retries`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          this.log('warn', 'Non-retryable error, aborting', error.message);
          break;
        }
        
        this.log('warn', `Attempt ${attempt + 1} failed: ${error.message}`);
      }
    }
    
    // All retries exhausted
    throw lastError || new Error('All retry attempts failed');
  }
  
  isRetryableError(error) {
    const errorMessage = error.message?.toLowerCase() || '';
    
    return this.config.retryStrategy.retryOn.some(pattern => {
      return errorMessage.includes(pattern.toLowerCase());
    });
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ==================== FAILSAFE ====================
  
  startFailsafeTracking() {
    // Reset hourly stats every hour
    this.failsafeResetInterval = setInterval(() => {
      this.resetHourlyStats();
    }, 60 * 60 * 1000); // 1 hour
    
    this.log('info', 'Failsafe tracking started');
  }
  
  resetHourlyStats() {
    this.hourlyStats = {
      txCount: 0,
      totalValue: 0,
      windowStart: Date.now()
    };
    
    this.log('info', 'Hourly stats reset');
  }
  
  checkFailsafeLimits() {
    // Check transaction count
    if (this.hourlyStats.txCount >= this.config.failsafe.maxTxPerHour) {
      return {
        ok: false,
        reason: `Hourly TX limit reached: ${this.hourlyStats.txCount}/${this.config.failsafe.maxTxPerHour}`
      };
    }
    
    // Check value limit
    if (this.hourlyStats.totalValue >= this.config.failsafe.maxValuePerHour) {
      return {
        ok: false,
        reason: `Hourly value limit reached: ${this.hourlyStats.totalValue}/${this.config.failsafe.maxValuePerHour}`
      };
    }
    
    return { ok: true };
  }
  
  handleFailsafeTrigger(reason) {
    this.log('warn', `Failsafe triggered: ${reason}`);
    this.triggerAlert('failsafe_triggered', { reason });
    
    if (this.config.failsafe.autoPauseOnLimit) {
      this.log('warn', 'Auto-pausing engine due to limit reached');
      
      // Stop engine loop temporarily
      if (this.engineLoopInterval) {
        clearInterval(this.engineLoopInterval);
        this.engineLoopInterval = null;
      }
      
      // Resume after 1 hour (when stats reset)
      setTimeout(() => {
        this.log('info', 'Resuming engine loop after failsafe pause');
        this.startEngineLoop();
      }, 60 * 60 * 1000);
    }
  }
  
  recordTransaction(value = 0) {
    this.hourlyStats.txCount++;
    this.hourlyStats.totalValue += value;
    
    this.log('debug', `Transaction recorded`, {
      txCount: this.hourlyStats.txCount,
      totalValue: this.hourlyStats.totalValue
    });
  }
  
  // ==================== HEALTH CHECK ====================
  
  getHealthStatus() {
    const engineStatus = this.checkEngineStatus();
    const failsafeStatus = this.checkFailsafeLimits();
    
    const checks = {
      watchdog_running: this.isRunning,
      engine_running: engineStatus.running,
      heartbeat_fresh: this.lastHeartbeat ? 
        (Date.now() - this.lastHeartbeat < this.config.watchdog.heartbeatIntervalMs * 2) : false,
      failsafe_ok: failsafeStatus.ok,
      consecutive_failures_acceptable: this.consecutiveFailures < this.config.watchdog.maxFailures,
      hourly_tx_ok: this.hourlyStats.txCount < this.config.failsafe.maxTxPerHour
    };
    
    const healthy = Object.values(checks).every(check => check === true);
    
    return {
      healthy,
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
      stats: {
        consecutiveFailures: this.consecutiveFailures,
        hourlyTxCount: this.hourlyStats.txCount,
        hourlyTotalValue: this.hourlyStats.totalValue,
        lastHeartbeat: this.lastHeartbeat,
        lastRunTime: this.lastRunTime,
        executionCount: this.executionHistory.length,
        errorCount: this.errorLog.length
      }
    };
  }
  
  // ==================== ALERTS ====================
  
  triggerAlert(type, data = {}) {
    const alert = {
      type,
      timestamp: new Date().toISOString(),
      data,
      acknowledged: false
    };
    
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    this.log('warn', `ALERT: ${type}`, data);
    
    // In production, this would send notifications (email, webhook, etc)
    // For now, just log
  }
  
  getAlerts(unacknowledgedOnly = false) {
    if (unacknowledgedOnly) {
      return this.alerts.filter(a => !a.acknowledged);
    }
    return this.alerts;
  }
  
  acknowledgeAlert(index) {
    if (this.alerts[index]) {
      this.alerts[index].acknowledged = true;
      this.alerts[index].acknowledgedAt = new Date().toISOString();
      return true;
    }
    return false;
  }
  
  // ==================== LOGGING & RECORDING ====================
  
  log(level, message, data = null) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logging.level] || 1;
    const messageLevel = levels[level] || 1;
    
    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      const prefix = `[Watchdog][${level.toUpperCase()}]`;
      
      if (data) {
        console.log(`${prefix} ${message}`, data);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }
  
  recordExecution(type, data) {
    if (!this.config.logging.storeExecutionHistory) return;
    
    this.executionHistory.push({
      type,
      timestamp: Date.now(),
      data
    });
    
    // Keep only last 1000 executions
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-1000);
    }
  }
  
  recordError(type, message, data = null) {
    if (!this.config.logging.storeErrors) return;
    
    this.errorLog.push({
      type,
      message,
      timestamp: Date.now(),
      data
    });
    
    // Keep only last 500 errors
    if (this.errorLog.length > 500) {
      this.errorLog = this.errorLog.slice(-500);
    }
  }
  
  // ==================== STATS & REPORT ====================
  
  getStats() {
    return {
      watchdog: {
        running: this.isRunning,
        config: this.config,
        stats: {
          consecutiveFailures: this.consecutiveFailures,
          totalExecutions: this.executionHistory.length,
          totalErrors: this.errorLog.length,
          activeAlerts: this.alerts.filter(a => !a.acknowledged).length
        }
      },
      engine: this.taskEngine ? {
        running: this.taskEngine.isRunning,
        loopInterval: this.taskEngine.config?.loopInterval,
        lastRun: this.lastRunTime
      } : null,
      failsafe: {
        hourlyTxCount: this.hourlyStats.txCount,
        hourlyValue: this.hourlyStats.totalValue,
        txLimit: this.config.failsafe.maxTxPerHour,
        valueLimit: this.config.failsafe.maxValuePerHour
      }
    };
  }
}

module.exports = { AutorunWatchdog };
