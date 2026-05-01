/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON ALL-SEEING EYE — TELEMETRY COLLECTOR
 * Coleta métricas em tempo real e envia para Supabase/Grafana
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { performance } from 'perf_hooks';
import os from 'os';

dotenv.config();

// Config
const TELEMETRY_INTERVAL = 5000; // 5 segundos
const HEALTH_CHECK_INTERVAL = 10000; // 10 segundos

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_PROJECT_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

class TelemetryCollector {
    constructor() {
        this.metrics = {
            financial: {
                balance: 0,
                pnl24h: 0,
                gas24h: 0,
                volume24h: 0,
                roi: 0
            },
            health: {
                cpu: 0,
                ram: 0,
                latency: 0,
                uptime: 100
            },
            agents: {
                successRate: 100,
                throughput: 0,
                activeCount: 0
            },
            security: {
                blockedIntrusions: 0,
                integrity: true
            }
        };
        
        this.isRunning = false;
        this.startTime = Date.now();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // COLETA DE MÉTRICAS DO SISTEMA
    // ═══════════════════════════════════════════════════════════════════════
    
    async collectSystemMetrics() {
        // CPU Usage
        const cpuUsage = os.loadavg()[0] * 100 / os.cpus().length;
        
        // Memory Usage
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const ramUsage = ((totalMem - freeMem) / totalMem) * 100;
        
        // Uptime
        const uptime = (Date.now() - this.startTime) / 1000;
        const uptimePct = 100; // Simplificado
        
        this.metrics.health = {
            cpu: parseFloat(cpuUsage.toFixed(2)),
            ram: parseFloat(ramUsage.toFixed(2)),
            latency: await this.measureLatency(),
            uptime: uptimePct
        };
        
        return this.metrics.health;
    }
    
    async measureLatency() {
        const start = performance.now();
        try {
            // Ping simples ao Supabase
            await supabase.from('grafana_health_metrics').select('count', { count: 'exact', head: true });
            const end = performance.now();
            return Math.round(end - start);
        } catch (error) {
            return 999; // Error latency
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // COLETA DE MÉTRICAS FINANCEIRAS (do Cornix)
    // ═══════════════════════════════════════════════════════════════════════
    
    async collectFinancialMetrics() {
        try {
            // Buscar vendas das últimas 24h
            const { data: sales24h, error: salesError } = await supabase
                .from('grafana_cornix_sales')
                .select('unlock_price_brl, payment_status')
                .gte('sold_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .eq('payment_status', 'PAID');
            
            if (salesError) throw salesError;
            
            const revenue24h = sales24h?.reduce((sum, sale) => sum + (sale.unlock_price_brl || 0), 0) || 0;
            const volume24h = sales24h?.length || 0;
            
            // Buscar todas as vendas para balance acumulado
            const { data: allSales, error: allError } = await supabase
                .from('grafana_cornix_sales')
                .select('unlock_price_brl, payment_status')
                .eq('payment_status', 'PAID');
            
            if (allError) throw allError;
            
            const totalBalance = allSales?.reduce((sum, sale) => sum + (sale.unlock_price_brl || 0), 0) || 0;
            
            this.metrics.financial = {
                balance: parseFloat(totalBalance.toFixed(2)),
                pnl24h: parseFloat((revenue24h * 0.95).toFixed(2)), // 95% margin after PIX fees
                gas24h: parseFloat((revenue24h * 0.05).toFixed(2)), // 5% PIX fees
                volume24h: volume24h,
                roi: volume24h > 0 ? parseFloat(((revenue24h * 0.95) / (volume24h * 29.90) * 100).toFixed(2)) : 0
            };
            
            return this.metrics.financial;
        } catch (error) {
            console.error('❌ Erro ao coletar métricas financeiras:', error.message);
            return this.metrics.financial;
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ENVIO PARA SUPABASE
    // ═══════════════════════════════════════════════════════════════════════
    
    async sendHealthMetrics() {
        try {
            const { error } = await supabase
                .from('grafana_health_metrics')
                .insert({
                    railway_uptime_pct: this.metrics.health.uptime,
                    cpu_usage_pct: this.metrics.health.cpu,
                    ram_usage_pct: this.metrics.health.ram,
                    api_latency_ms: this.metrics.health.latency,
                    server_status: 'ONLINE'
                });
            
            if (error) throw error;
            console.log('📊 Health metrics sent → Supabase');
        } catch (error) {
            console.error('❌ Erro ao enviar health metrics:', error.message);
        }
    }
    
    async sendFinancialMetrics() {
        try {
            const { error } = await supabase
                .from('grafana_financial_master')
                .insert({
                    real_time_balance: this.metrics.financial.balance,
                    accumulated_pnl_24h: this.metrics.financial.pnl24h,
                    net_profit_24h: this.metrics.financial.pnl24h,
                    total_gas_24h: this.metrics.financial.gas24h,
                    transaction_volume_24h: this.metrics.financial.volume24h,
                    roi_24h_pct: this.metrics.financial.roi
                });
            
            if (error) throw error;
            console.log('💰 Financial metrics sent → Supabase');
        } catch (error) {
            console.error('❌ Erro ao enviar financial metrics:', error.message);
        }
    }
    
    async sendAgentMetrics() {
        try {
            const { error } = await supabase
                .from('grafana_agent_efficiency')
                .insert({
                    agent_name: 'cornix_signal_generator',
                    operation_success_rate_pct: this.metrics.agents.successRate,
                    message_throughput_per_sec: this.metrics.agents.throughput,
                    active_agents_count: this.metrics.agents.activeCount
                });
            
            if (error) throw error;
            console.log('🤖 Agent metrics sent → Supabase');
        } catch (error) {
            console.error('❌ Erro ao enviar agent metrics:', error.message);
        }
    }
    
    async sendSecurityMetrics() {
        try {
            const { error } = await supabase
                .from('grafana_security_metrics')
                .insert({
                    blocked_intrusions_count: this.metrics.security.blockedIntrusions,
                    contract_integrity_check: this.metrics.security.integrity,
                    security_score: this.metrics.security.integrity ? 100 : 0
                });
            
            if (error) throw error;
            console.log('🛡️ Security metrics sent → Supabase');
        } catch (error) {
            console.error('❌ Erro ao enviar security metrics:', error.message);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // LOG DE AI
    // ═══════════════════════════════════════════════════════════════════════
    
    async logAI(agentName, level, message, context = {}) {
        try {
            const { error } = await supabase
                .from('grafana_ai_logs')
                .insert({
                    agent_name: agentName,
                    log_level: level,
                    message: message,
                    context: context
                });
            
            if (error) throw error;
        } catch (error) {
            console.error('❌ Erro ao log AI:', error.message);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // REGISTRO DE VENDA CORNIX
    // ═══════════════════════════════════════════════════════════════════════
    
    async recordCornixSale(signalData, paymentData) {
        try {
            const { error } = await supabase
                .from('grafana_cornix_sales')
                .insert({
                    signal_id: signalData.signal_id,
                    symbol: signalData.symbol,
                    side: signalData.side,
                    unlock_price_brl: signalData.unlock_price_brl,
                    payment_status: paymentData.status,
                    payment_method: paymentData.method,
                    pix_tx_id: paymentData.tx_id,
                    buyer_region: paymentData.region || 'Unknown',
                    buyer_country: paymentData.country || 'BR'
                });
            
            if (error) throw error;
            
            // Log de sucesso
            await this.logAI('cornix_monetization', 'SUCCESS', 
                `Venda realizada: ${signalData.symbol} ${signalData.side} - R$ ${signalData.unlock_price_brl}`,
                { signal_id: signalData.signal_id, tx_id: paymentData.tx_id }
            );
            
            console.log('💰 Cornix sale recorded → Supabase');
        } catch (error) {
            console.error('❌ Erro ao registrar venda:', error.message);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // ALERTS
    // ═══════════════════════════════════════════════════════════════════════
    
    async triggerAlert(name, type, severity, message, metricValue, thresholdValue) {
        try {
            const { error } = await supabase
                .from('grafana_alert_history')
                .insert({
                    alert_name: name,
                    alert_type: type,
                    severity: severity,
                    message: message,
                    metric_value: metricValue,
                    threshold_value: thresholdValue
                });
            
            if (error) throw error;
            
            console.log(`🚨 ALERT: ${name} - ${message}`);
            
            // Log de alerta
            await this.logAI('alert_system', severity === 'CRITICAL' ? 'ERROR' : 'WARN', 
                message,
                { alert_name: name, severity, metric_value: metricValue }
            );
        } catch (error) {
            console.error('❌ Erro ao registrar alerta:', error.message);
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // LOOP PRINCIPAL
    // ═══════════════════════════════════════════════════════════════════════
    
    async runTelemetryCycle() {
        if (!this.isRunning) return;
        
        try {
            // Coletar e enviar health metrics
            await this.collectSystemMetrics();
            await this.sendHealthMetrics();
            
            // Coletar e enviar financial metrics
            await this.collectFinancialMetrics();
            await this.sendFinancialMetrics();
            
            // Enviar agent metrics
            await this.sendAgentMetrics();
            
            // Enviar security metrics
            await this.sendSecurityMetrics();
            
            // Verificar alertas
            await this.checkAlerts();
            
        } catch (error) {
            console.error('❌ Erro no ciclo de telemetria:', error.message);
        }
    }
    
    async checkAlerts() {
        // Alerta: Profit threshold
        if (this.metrics.financial.pnl24h > 1000) {
            await this.triggerAlert(
                'Profit Threshold Reached',
                'FINANCIAL',
                'INFO',
                `Lucro de R$ ${this.metrics.financial.pnl24h} atingido nas últimas 24h`,
                this.metrics.financial.pnl24h,
                1000
            );
        }
        
        // Alerta: Performance degradation
        if (this.metrics.health.latency > 500) {
            await this.triggerAlert(
                'Performance Degradation > 5%',
                'PERFORMANCE',
                'WARNING',
                `Latência alta detectada: ${this.metrics.health.latency}ms`,
                this.metrics.health.latency,
                500
            );
        }
        
        // Alerta: CPU/RAM alta
        if (this.metrics.health.cpu > 90 || this.metrics.health.ram > 90) {
            await this.triggerAlert(
                'High Resource Usage',
                'INFRASTRUCTURE',
                'WARNING',
                `CPU: ${this.metrics.health.cpu}% | RAM: ${this.metrics.health.ram}%`,
                Math.max(this.metrics.health.cpu, this.metrics.health.ram),
                90
            );
        }
    }
    
    start() {
        this.isRunning = true;
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log('👁️ GXEON ALL-SEEING EYE — Telemetry Collector Started');
        console.log('═══════════════════════════════════════════════════════════════════════════');
        console.log(`⏰ Intervalo: ${TELEMETRY_INTERVAL}ms`);
        console.log(`🎯 Destino: Supabase → Grafana`);
        console.log('');
        
        // Log inicial
        this.logAI('telemetry_collector', 'INFO', 'Telemetry collector iniciado', {
            interval: TELEMETRY_INTERVAL,
            version: '1.0.0'
        });
        
        // Iniciar loop
        this.intervalId = setInterval(() => {
            this.runTelemetryCycle();
        }, TELEMETRY_INTERVAL);
    }
    
    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        console.log('👁️ Telemetry collector stopped');
    }
}

// Singleton export
export const telemetry = new TelemetryCollector();

// Auto-start se executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    telemetry.start();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Encerrando telemetry collector...');
        telemetry.stop();
        process.exit(0);
    });
}
