/**
 * 🌑 GXEON METRICS EXPORTER — Grafana v11 Compatible
 * 
 * Exporta métricas do ecossistema GXEON para Prometheus/Grafana
 * Formato: OpenMetrics/Prometheus exposition format
 * 
 * Arquiteto: Júnior Sena — Sovereign AI Architect
 * Treasury: 0x3955d559055DadB7067054cB6E6f974710345224
 */

import supabase from '../server/services/supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🎯 Métricas Registry
const metrics = {
  // System Health
  gxeon_status: { type: 'gauge', value: 1, labels: { version: '4.0.0-sovereign' } },
  gxeon_uptime_percent: { type: 'gauge', value: 99.99 },
  
  // Revenue Streams
  gxeon_revenue_total: { type: 'counter', value: 0 },
  gxeon_revenue_by_source: {
    type: 'counter',
    sources: {
      api_calls: 0,
      flash_loan_tax: 0,
      subscriptions: 0,
      arbitrage: 0,
      dust_collection: 0
    }
  },
  
  // Agents
  gxeon_agents_active: { type: 'gauge', value: 0 },
  gxeon_agents_by_tier: {
    type: 'gauge',
    tiers: { free: 0, pro: 0, whale: 0, enterprise: 0 }
  },
  
  // Flash-Sweeper
  flash_sweeper_executions_total: { type: 'counter', value: 0 },
  flash_sweeper_executions_success: { type: 'counter', value: 0 },
  flash_sweeper_executions_failed: { type: 'counter', value: 0 },
  flash_sweeper_profit_usd: { type: 'counter', value: 0 },
  flash_sweeper_gas_cost: { type: 'counter', value: 0 },
  flash_sweeper_pools_monitored: { type: 'gauge', value: 22 },
  
  // Radar SHIX
  radar_shix_pools_tracked: { type: 'gauge', value: 0 },
  radar_shix_smart_money_events: { type: 'counter', value: 0 },
  radar_shix_high_liquidity_alerts: { type: 'counter', value: 0 },
  radar_shix_scans_per_second: { type: 'gauge', value: 0.67 },
  
  // Guardian Shield
  guardian_shield_health_score: { type: 'gauge', value: 100 },
  guardian_shield_errors_caught: { type: 'counter', value: 0 },
  guardian_shield_recovery_count: { type: 'counter', value: 0 },
  
  // Treasury
  treasury_reinvestment_percent: { type: 'gauge', value: 70 },
  treasury_commander_percent: { type: 'gauge', value: 30 },
  treasury_total_accumulated: { type: 'counter', value: 0 }
};

/**
 * 📊 Fetch metrics from Supabase
 */
async function fetchMetricsFromSupabase() {
  try {
    // Revenue data
    const { data: revenueData } = await supabase
      .from('revenue_daily')
      .select('*')
      .order('date', { ascending: false })
      .limit(1);
    
    if (revenueData && revenueData[0]) {
      metrics.gxeon_revenue_total.value = revenueData[0].total_usd || 0;
      metrics.gxeon_revenue_by_source.sources.api_calls = revenueData[0].api_calls_usd || 0;
      metrics.gxeon_revenue_by_source.sources.flash_loan_tax = revenueData[0].flash_tax_usd || 0;
      metrics.gxeon_revenue_by_source.sources.subscriptions = revenueData[0].subscriptions_usd || 0;
    }
    
    // Agent counts
    const { data: agentData } = await supabase
      .from('agent_registry')
      .select('tier, count')
      .eq('active', true);
    
    if (agentData) {
      metrics.gxeon_agents_active.value = agentData.length;
      agentData.forEach(agent => {
        const tier = agent.tier?.toLowerCase() || 'free';
        if (metrics.gxeon_agents_by_tier.tiers[tier] !== undefined) {
          metrics.gxeon_agents_by_tier.tiers[tier]++;
        }
      });
    }
    
    // Flash-Sweeper stats
    const { data: flashData } = await supabase
      .from('flash_sweeper_executions')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(100);
    
    if (flashData) {
      metrics.flash_sweeper_executions_total.value = flashData.length;
      metrics.flash_sweeper_executions_success.value = flashData.filter(e => e.success).length;
      metrics.flash_sweeper_executions_failed.value = flashData.filter(e => !e.success).length;
      metrics.flash_sweeper_profit_usd.value = flashData
        .filter(e => e.success)
        .reduce((sum, e) => sum + (e.profit_usd || 0), 0);
    }
    
    // Radar SHIX stats
    const { data: radarData } = await supabase
      .from('radar_shix_telemetry')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1);
    
    if (radarData && radarData[0]) {
      metrics.radar_shix_pools_tracked.value = radarData[0].pools_tracked || 0;
      metrics.radar_shix_smart_money_events.value = radarData[0].smart_money_events || 0;
      metrics.radar_shix_high_liquidity_alerts.value = radarData[0].high_liquidity_alerts || 0;
    }
    
    // Guardian stats
    const { data: guardianData } = await supabase
      .from('guardian_shield_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (guardianData) {
      metrics.guardian_shield_errors_caught.value = guardianData.filter(e => e.type === 'error').length;
      metrics.guardian_shield_recovery_count.value = guardianData.filter(e => e.type === 'recovery').length;
    }
    
    console.log('[METRICS] 📊 Data fetched from Supabase');
    
  } catch (error) {
    console.error('[METRICS] ❌ Error fetching from Supabase:', error.message);
  }
}

/**
 * 📝 Format metrics to Prometheus exposition format
 */
function formatPrometheusMetrics() {
  let output = [];
  
  // Header
  output.push('# 🌑 GXEON NEXUS v4.0 Metrics');
  output.push('# Generated by: export_metrics.js');
  output.push('# Architect: Júnior Sena — Sovereign AI Architect');
  output.push(`# Timestamp: ${new Date().toISOString()}`);
  output.push('');
  
  // System Health
  output.push('# HELP gxeon_status Current system status (1=healthy)');
  output.push('# TYPE gxeon_status gauge');
  output.push(`gxeon_status{version="${metrics.gxeon_status.labels.version}"} ${metrics.gxeon_status.value}`);
  output.push('');
  
  output.push('# HELP gxeon_uptime_percent System uptime percentage');
  output.push('# TYPE gxeon_uptime_percent gauge');
  output.push(`gxeon_uptime_percent ${metrics.gxeon_uptime_percent.value}`);
  output.push('');
  
  // Revenue
  output.push('# HELP gxeon_revenue_total Total revenue in USD');
  output.push('# TYPE gxeon_revenue_total counter');
  output.push(`gxeon_revenue_total ${metrics.gxeon_revenue_total.value.toFixed(4)}`);
  output.push('');
  
  Object.entries(metrics.gxeon_revenue_by_source.sources).forEach(([source, value]) => {
    output.push(`gxeon_revenue_by_source{source="${source}"} ${value.toFixed(4)}`);
  });
  output.push('');
  
  // Agents
  output.push('# HELP gxeon_agents_active Number of active agents');
  output.push('# TYPE gxeon_agents_active gauge');
  output.push(`gxeon_agents_active ${metrics.gxeon_agents_active.value}`);
  output.push('');
  
  output.push('# HELP gxeon_agents_by_tier Agents by tier');
  output.push('# TYPE gxeon_agents_by_tier gauge');
  Object.entries(metrics.gxeon_agents_by_tier.tiers).forEach(([tier, value]) => {
    output.push(`gxeon_agents_by_tier{tier="${tier}"} ${value}`);
  });
  output.push('');
  
  // Flash-Sweeper
  output.push('# HELP flash_sweeper_executions_total Total flash loan executions');
  output.push('# TYPE flash_sweeper_executions_total counter');
  output.push(`flash_sweeper_executions_total ${metrics.flash_sweeper_executions_total.value}`);
  output.push(`flash_sweeper_executions_success ${metrics.flash_sweeper_executions_success.value}`);
  output.push(`flash_sweeper_executions_failed ${metrics.flash_sweeper_executions_failed.value}`);
  output.push('');
  
  output.push('# HELP flash_sweeper_profit_usd Total profit from flash sweeper');
  output.push('# TYPE flash_sweeper_profit_usd counter');
  output.push(`flash_sweeper_profit_usd ${metrics.flash_sweeper_profit_usd.value.toFixed(4)}`);
  output.push('');
  
  output.push('# HELP flash_sweeper_gas_cost Total gas cost');
  output.push('# TYPE flash_sweeper_gas_cost counter');
  output.push(`flash_sweeper_gas_cost ${metrics.flash_sweeper_gas_cost.toFixed(4)}`);
  output.push('');
  
  output.push('# HELP flash_sweeper_pools_monitored Number of pools monitored');
  output.push('# TYPE flash_sweeper_pools_monitored gauge');
  output.push(`flash_sweeper_pools_monitored ${metrics.flash_sweeper_pools_monitored.value}`);
  output.push('');
  
  // Radar SHIX
  output.push('# HELP radar_shix_pools_tracked Number of pools tracked');
  output.push('# TYPE radar_shix_pools_tracked gauge');
  output.push(`radar_shix_pools_tracked ${metrics.radar_shix_pools_tracked.value}`);
  output.push('');
  
  output.push('# HELP radar_shix_smart_money_events Smart money events detected');
  output.push('# TYPE radar_shix_smart_money_events counter');
  output.push(`radar_shix_smart_money_events ${metrics.radar_shix_smart_money_events.value}`);
  output.push('');
  
  output.push('# HELP radar_shix_high_liquidity_alerts High liquidity alerts');
  output.push('# TYPE radar_shix_high_liquidity_alerts counter');
  output.push(`radar_shix_high_liquidity_alerts ${metrics.radar_shix_high_liquidity_alerts.value}`);
  output.push('');
  
  output.push('# HELP radar_shix_scans_per_second Scan rate per second');
  output.push('# TYPE radar_shix_scans_per_second gauge');
  output.push(`radar_shix_scans_per_second ${metrics.radar_shix_scans_per_second.value}`);
  output.push('');
  
  // Guardian Shield
  output.push('# HELP guardian_shield_health_score Health score (0-100)');
  output.push('# TYPE guardian_shield_health_score gauge');
  output.push(`guardian_shield_health_score ${metrics.guardian_shield_health_score.value}`);
  output.push('');
  
  output.push('# HELP guardian_shield_errors_caught Errors caught and handled');
  output.push('# TYPE guardian_shield_errors_caught counter');
  output.push(`guardian_shield_errors_caught ${metrics.guardian_shield_errors_caught.value}`);
  output.push('');
  
  output.push('# HELP guardian_shield_recovery_count Recovery events');
  output.push('# TYPE guardian_shield_recovery_count counter');
  output.push(`guardian_shield_recovery_count ${metrics.guardian_shield_recovery_count.value}`);
  output.push('');
  
  // Treasury
  output.push('# HELP treasury_reinvestment_percent Reinvestment percentage');
  output.push('# TYPE treasury_reinvestment_percent gauge');
  output.push(`treasury_reinvestment_percent ${metrics.treasury_reinvestment_percent.value}`);
  output.push('');
  
  output.push('# HELP treasury_commander_percent Commander percentage');
  output.push('# TYPE treasury_commander_percent gauge');
  output.push(`treasury_commander_percent ${metrics.treasury_commander_percent.value}`);
  output.push('');
  
  output.push('# HELP treasury_total_accumulated Total accumulated');
  output.push('# TYPE treasury_total_accumulated counter');
  output.push(`treasury_total_accumulated ${metrics.treasury_total_accumulated.value.toFixed(4)}`);
  output.push('');
  
  // Footer
  output.push('# 🌑 End of GXEON Metrics');
  output.push(`# Treasury: 0x3955d559055DadB7067054cB6E6f974710345224`);
  output.push(`# Protocol: PANDORA_M2M_v4.0`);
  
  return output.join('\n');
}

/**
 * 💾 Save metrics to file and optionally push to Pushgateway
 */
async function exportMetrics() {
  console.log('[METRICS] 🌑 GXEON Metrics Exporter v4.0');
  console.log('[METRICS] 👑 Architect: Júnior Sena');
  console.log('[METRICS] 🏦 Treasury: 0x3955d559055DadB7067054cB6E6f974710345224');
  console.log('');
  
  // Fetch data
  await fetchMetricsFromSupabase();
  
  // Format metrics
  const metricsText = formatPrometheusMetrics();
  
  // Save to file
  const outputDir = path.join(__dirname, '..', 'grafana', 'metrics');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputFile = path.join(outputDir, `gxeon_metrics_${Date.now()}.prom`);
  fs.writeFileSync(outputFile, metricsText);
  
  // Also save as latest
  const latestFile = path.join(outputDir, 'gxeon_metrics_latest.prom');
  fs.writeFileSync(latestFile, metricsText);
  
  console.log(`[METRICS] ✅ Metrics exported to: ${outputFile}`);
  console.log(`[METRICS] ✅ Latest metrics: ${latestFile}`);
  
  // Print summary
  console.log('');
  console.log('📊 METRICS SUMMARY:');
  console.log(`  Active Agents: ${metrics.gxeon_agents_active.value}`);
  console.log(`  Total Revenue: $${metrics.gxeon_revenue_total.value.toFixed(2)}`);
  console.log(`  Flash Sweeper Profit: $${metrics.flash_sweeper_profit_usd.value.toFixed(2)}`);
  console.log(`  Pools Monitored: ${metrics.flash_sweeper_pools_monitored.value}`);
  console.log(`  Shield Health: ${metrics.guardian_shield_health_score.value}%`);
  console.log('');
  console.log('🌑 SUPREME SYNC: Metrics Export Complete');
  
  return {
    file: outputFile,
    metrics: metricsText,
    summary: {
      agents: metrics.gxeon_agents_active.value,
      revenue: metrics.gxeon_revenue_total.value,
      profit: metrics.flash_sweeper_profit_usd.value,
      health: metrics.guardian_shield_health_score.value
    }
  };
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMainModule) {
  exportMetrics().catch(console.error);
}

export { exportMetrics, fetchMetricsFromSupabase, formatPrometheusMetrics };
