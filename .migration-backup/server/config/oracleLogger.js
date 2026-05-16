/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📝 ORACLE LOGGER v20.1 — High-Density Technical Logging
 * Otimizado para produção: apenas logs estruturados, nenhum debug humano
 * ═══════════════════════════════════════════════════════════════════════════
 */

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'INFO'] || LOG_LEVELS.INFO;

/**
 * Logger estruturado para produção — apenas JSON parseável
 */
class OracleLogger {
    constructor(module) {
        this.module = module;
        this.metricsBuffer = [];
        this.metricsFlushMs = 60000;
        
        // Flush periódico de métricas
        setInterval(() => this.flushMetrics(), this.metricsFlushMs);
    }
    
    /**
     * Log de erro — sempre logado
     */
    error(event, data = {}) {
        this.log('ERROR', event, data);
    }
    
    /**
     * Log de warning — logado se level >= WARN
     */
    warn(event, data = {}) {
        if (CURRENT_LEVEL >= LOG_LEVELS.WARN) {
            this.log('WARN', event, data);
        }
    }
    
    /**
     * Log de info — logado se level >= INFO
     */
    info(event, data = {}) {
        if (CURRENT_LEVEL >= LOG_LEVELS.INFO) {
            this.log('INFO', event, data);
        }
    }
    
    /**
     * Log de debug — apenas em desenvolvimento
     */
    debug(event, data = {}) {
        if (CURRENT_LEVEL >= LOG_LEVELS.DEBUG) {
            this.log('DEBUG', event, data);
        }
    }
    
    /**
     * Métricas técnicas — buffer para reduzir I/O
     */
    metric(type, value, tags = {}) {
        this.metricsBuffer.push({
            ts: Date.now(),
            type,
            value,
            tags,
            module: this.module
        });
        
        // Auto-flush se buffer grande
        if (this.metricsBuffer.length > 100) {
            this.flushMetrics();
        }
    }
    
    /**
     * Flush de métricas acumuladas
     */
    flushMetrics() {
        if (this.metricsBuffer.length === 0) return;
        
        const metrics = this.metricsBuffer.splice(0, this.metricsBuffer.length);
        
        // Log como JSON estruturado
        console.log(JSON.stringify({
            level: 'METRIC',
            module: this.module,
            batch_size: metrics.length,
            metrics: metrics.reduce((acc, m) => {
                acc[m.type] = (acc[m.type] || 0) + m.value;
                return acc;
            }, {}),
            ts: Date.now()
        }));
    }
    
    /**
     * Core logging — sempre JSON
     */
    log(level, event, data) {
        const entry = {
            level,
            module: this.module,
            event,
            ...data,
            ts: Date.now()
        };
        
        // Saída direta (process.stdout para evover overhead de console)
        process.stdout.write(JSON.stringify(entry) + '\n');
    }
}

/**
 * Logger estático para eventos globais
 */
OracleLogger.global = new OracleLogger('GLOBAL');

module.exports = { OracleLogger, LOG_LEVELS };
