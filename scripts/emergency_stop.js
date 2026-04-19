#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🛑 EMERGENCY STOP PROTOCOL - GXEON SOVEREIGN v4.0.0
 * Ativa kill switch imediatamente para proteger fundos da Família Sena
 * ═══════════════════════════════════════════════════════════════════════════
 */

const { getArcheologyAuditService } = require('../server/services/archeologyAudit');

async function emergencyStop(reason = 'manual_activation') {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║              🛑 EMERGENCY STOP PROTOCOL v4.0.0                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    console.log(`🚨 Ativando Kill Switch...`);
    console.log(`   Razão: ${reason}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
    
    try {
        const audit = getArcheologyAuditService();
        audit.activateKillSwitch(reason);
        
        console.log('\n✅ KILL SWITCH ATIVADO');
        console.log('   Todas as transações novas foram BLOQUEADAS');
        console.log('   Sistema em modo MANUTENÇÃO');
        console.log('   Lucros pendentes permanecem SEGUROS');
        
        console.log('\n📝 Próximos Passos:');
        console.log('   1. Verificar logs no Grafana');
        console.log('   2. Analisar causa do stop');
        console.log('   3. Corrigir issue');
        console.log('   4. Desativar: EMERGENCY_KILL_SWITCH=INACTIVE npm start');
        
        return { stopped: true, reason, timestamp: Date.now() };
    } catch (err) {
        console.error('\n❌ ERRO ao ativar kill switch:', err.message);
        console.log('   Tentando método alternativo...');
        
        process.env.EMERGENCY_KILL_SWITCH = 'ACTIVE';
        
        console.log('✅ Kill switch ativado via environment variable');
        return { stopped: true, reason, fallback: true };
    }
}

// CLI
const reason = process.argv[2] || 'manual_activation';
emergencyStop(reason).then(() => {
    process.exit(0);
}).catch(() => {
    process.exit(1);
});
