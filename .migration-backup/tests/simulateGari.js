/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 TESTE DNA_CONVERSAO_v21.2 — Simulador GARI para Brave Extension
 * Envia sinal fake de $10.50 para testar handshake e piscar a extensão Leo
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * USO:
 *   node tests/simulateGari.js              # Teste padrão ($10.50)
 *   node tests/simulateGari.js --profit=25  # Lucro customizado
 *   node tests/simulateGari.js --auto       # Modo auto_execute
 *   node tests/simulateGari.js --count=5    # Múltiplos sinais
 * 
 * ESPERADO:
 *   🧬 [SIMULATOR] Enviando oportunidade fake de $10.50...
 *   💎 [GXEON-CONVERSAO] Oportunidade de $10.50 formatada para o Brave.
 *   🤝 [GXEON-DNA] Handshake Successful! Leo pronto para conversão de $10.50
 */

const axios = require('axios');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE TESTE
// ═══════════════════════════════════════════════════════════════════════════

const TEST_CONFIG = {
    // Endpoint do Leo (Brave Extension)
    endpoint: process.env.BRAVE_EXTENSION_ENDPOINT || 'http://localhost:3001/gari/receive',
    
    // Valores padrão do sinal fake
    defaultProfit: 10.50,
    defaultGas: 2.00,
    defaultConfidence: 0.85,
    
    // Timeout
    timeoutMs: 5000
};

// ═══════════════════════════════════════════════════════════════════════════
// GERADOR DE OPORTUNIDADE FAKE
// ═══════════════════════════════════════════════════════════════════════════

function generateFakeOpportunity(options = {}) {
    const profit = parseFloat(options.profit) || TEST_CONFIG.defaultProfit;
    const gas = parseFloat(options.gas) || TEST_CONFIG.defaultGas;
    const confidence = parseFloat(options.confidence) || TEST_CONFIG.defaultConfidence;
    const autoExecute = options.auto || false;
    
    // Endereços fake realistas (formato Ethereum)
    const fakeAddresses = {
        pair: `0x${generateHex(40)}`,
        token0: `0x${generateHex(40)}`,
        token1: `0x${generateHex(40)}`,
        dex: 'uniswap_v3'
    };
    
    const estimatedFees = profit + gas;
    const roi = ((profit / gas) * 100).toFixed(2);
    
    return {
        pairAddress: fakeAddresses.pair,
        token0: fakeAddresses.token0,
        token1: fakeAddresses.token1,
        dex: fakeAddresses.dex,
        
        estimatedFeesUsd: estimatedFees,
        gasCostUsd: gas,
        profitUsd: profit,
        
        confidence: autoExecute ? 0.95 : confidence, // Auto = alta confiança
        timestamp: Date.now(),
        
        // Metadata para teste
        _test: true,
        _testId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
}

function generateHex(length) {
    return Array(length).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTRUTOR DE PAYLOAD DNA_CONVERSAO_v21.2
// ═══════════════════════════════════════════════════════════════════════════

function buildDnaPayload(opportunity) {
    return {
        type: 'GARI_OPPORTUNITY_DETECTED',
        protocol: 'DNA_CONVERSAO_v21.2',
        timestamp: new Date().toISOString(),
        origin: 'gxeon_test_simulator',
        
        payload: {
            id: `gari_test_${Date.now()}_${opportunity.pairAddress.slice(0, 8)}`,
            token: opportunity.token0,
            contract: opportunity.pairAddress,
            
            // Valores econômicos
            raw_value: Number(opportunity.estimatedFeesUsd.toFixed(6)),
            net_profit: Number(opportunity.profitUsd.toFixed(6)),
            gas_estimate: Number(opportunity.gasCostUsd.toFixed(6)),
            roi_percent: Number(((opportunity.profitUsd / opportunity.gasCostUsd) * 100).toFixed(2)),
            
            // Instrução de execução (fake)
            execution_data: {
                chainId: 42161,
                to: opportunity.pairAddress,
                data: `0x${generateHex(68)}`, // Calldata fake
                value: '0x0',
                gasLimit: '0x493E0',
                estimatedUsd: opportunity.gasCostUsd
            },
            
            // Metadados de decisão
            confidence: Number(opportunity.confidence.toFixed(2)),
            priority: opportunity.profitUsd > 50 ? 'urgent' : opportunity.profitUsd > 20 ? 'high' : 'normal',
            action_type: opportunity.confidence > 0.9 && opportunity.profitUsd > 20 ? 'auto_execute' : 'review',
            
            // Flag de teste
            _simulated: true,
            _testId: opportunity._testId
        },
        
        handshake: {
            requestId: `dna_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            expectsAck: true,
            dnaVerified: true,
            testMode: true
        }
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// ENVIO DO SINAL
// ═══════════════════════════════════════════════════════════════════════════

async function sendTestSignal(opportunity) {
    const payload = buildDnaPayload(opportunity);
    
    console.log('\n🧬 [SIMULATOR] ═══════════════════════════════════════════════════════════');
    console.log(`🧬 [SIMULATOR] Enviando oportunidade fake de $${opportunity.profitUsd.toFixed(2)}...`);
    console.log(`🧬 [SIMULATOR] Endpoint: ${TEST_CONFIG.endpoint}`);
    console.log(`🧬 [SIMULATOR] Test ID: ${opportunity._testId}`);
    console.log(`🧬 [SIMULATOR] Action: ${payload.payload.action_type}`);
    console.log('🧬 [SIMULATOR] ═══════════════════════════════════════════════════════════\n');
    
    const startTime = Date.now();
    
    try {
        const response = await axios.post(TEST_CONFIG.endpoint, payload, {
            timeout: TEST_CONFIG.timeoutMs,
            headers: {
                'X-GXEON-Source': 'gari_test_simulator',
                'X-GXEON-Version': '21.2',
                'X-DNA-Protocol': 'CONVERSAO_SUPREMO_TEST',
                'X-Handshake-ID': payload.handshake.requestId,
                'Content-Type': 'application/json'
            },
            validateStatus: (status) => status === 200 || status === 202
        });
        
        const duration = Date.now() - startTime;
        
        console.log(`\n✅ [SIMULATOR] Resposta recebida em ${duration}ms`);
        console.log(`✅ [SIMULATOR] Status HTTP: ${response.status}`);
        
        // Verificar handshake
        if (response.data && response.data.acknowledged === true) {
            console.log('\n🤝 [SIMULATOR] ╔════════════════════════════════════════════════════════╗');
            console.log('🤝 [SIMULATOR] ║  HANDSHAKE SUCCESSFUL!                               ║');
            console.log('🤝 [SIMULATOR] ║  DNA de Conversão ativo e pronto para dinheiro real    ║');
            console.log('🤝 [SIMULATOR] ╚════════════════════════════════════════════════════════╝\n');
            
            console.log(`📬 [SIMULATOR] Ack ID: ${response.data.ackId || 'n/a'}`);
            console.log(`🦁 [SIMULATOR] Leo confirmou: ${response.data.processedCount || 1} oportunidade(s)`);
            
            if (response.data.dnaVerified) {
                console.log('🧬 [SIMULATOR] DNA Verified: TRUE');
            }
            
            return {
                success: true,
                handshake: true,
                duration,
                profit: opportunity.profitUsd,
                ackId: response.data.ackId,
                testId: opportunity._testId
            };
        } else {
            console.log('\n⚠️ [SIMULATOR] Sinal enviado, mas SEM handshake confirmado');
            console.log(`⚠️ [SIMULATOR] Resposta: ${JSON.stringify(response.data)}`);
            
            return {
                success: true,
                handshake: false,
                duration,
                profit: opportunity.profitUsd,
                response: response.data,
                testId: opportunity._testId
            };
        }
        
    } catch (err) {
        const duration = Date.now() - startTime;
        
        console.log('\n❌ [SIMULATOR] ╔════════════════════════════════════════════════════════╗');
        console.log('❌ [SIMULATOR] ║  FALHA NO ENVIO                                        ║');
        console.log('❌ [SIMULATOR] ╚════════════════════════════════════════════════════════╝\n');
        
        if (err.response) {
            console.error(`❌ [SIMULATOR] Leo respondeu com erro HTTP ${err.response.status}`);
            console.error(`❌ [SIMULATOR] Detalhes: ${JSON.stringify(err.response.data)}`);
            
            // Sugestões
            if (err.response.status === 404) {
                console.log('\n💡 [SIMULATOR] Dica: Endpoint não encontrado. Verifique se a extensão está rodando em:');
                console.log(`   ${TEST_CONFIG.endpoint}`);
            } else if (err.response.status === 403) {
                console.log('\n💡 [SIMULATOR] Dica: Acesso negado. Verifique permissões CORS na extensão.');
            }
            
        } else if (err.request) {
            console.error(`❌ [SIMULATOR] Sem resposta do Leo (timeout/connection refused)`);
            console.error(`❌ [SIMULATOR] Erro: ${err.message}`);
            console.log('\n💡 [SIMULATOR] Dica: A extensão Brave não está respondendo.');
            console.log('   Verifique se:');
            console.log('   1. A extensão está instalada e ativa');
            console.log('   2. O endpoint está correto no .env');
            console.log('   3. O servidor local da extensão está rodando');
            
        } else {
            console.error(`❌ [SIMULATOR] Erro interno: ${err.message}`);
        }
        
        return {
            success: false,
            handshake: false,
            duration,
            error: err.message,
            testId: opportunity._testId
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN — EXECUÇÃO DOS TESTES
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
    // Parse args
    const args = process.argv.slice(2);
    const options = {
        profit: getArgValue(args, '--profit') || TEST_CONFIG.defaultProfit,
        gas: getArgValue(args, '--gas') || TEST_CONFIG.defaultGas,
        confidence: getArgValue(args, '--confidence') || TEST_CONFIG.defaultConfidence,
        auto: args.includes('--auto'),
        count: parseInt(getArgValue(args, '--count')) || 1,
        help: args.includes('--help') || args.includes('-h')
    };
    
    if (options.help) {
        showHelp();
        process.exit(0);
    }
    
    console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║  🧬 GXEON DNA_CONVERSAO_v21.2 — SIMULADOR DE SINAL GARI                 ║');
    console.log('║  Testando integração com Brave Extension (Leo)                            ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
    
    console.log(`📊 [SIMULATOR] Configuração:`);
    console.log(`   Lucro: $${options.profit}`);
    console.log(`   Gás: $${options.gas}`);
    console.log(`   Confiança: ${options.confidence}`);
    console.log(`   Modo: ${options.auto ? 'AUTO_EXECUTE' : 'REVIEW'}`);
    console.log(`   Sinais: ${options.count}\n`);
    
    const results = [];
    
    // Enviar sinais
    for (let i = 0; i < options.count; i++) {
        if (i > 0) {
            console.log(`\n⏳ [SIMULATOR] Aguardando 1s antes do próximo sinal...\n`);
            await sleep(1000);
        }
        
        const opportunity = generateFakeOpportunity(options);
        const result = await sendTestSignal(opportunity);
        results.push(result);
    }
    
    // Resumo
    console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
    console.log('║  📊 RESUMO DO TESTE                                                     ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════╝');
    
    const successful = results.filter(r => r.success);
    const handshakes = results.filter(r => r.handshake);
    
    console.log(`\n✅ Sinais enviados: ${successful.length}/${results.length}`);
    console.log(`🤝 Handshakes confirmados: ${handshakes.length}/${results.length}`);
    console.log(`💰 Lucro total simulado: $${results.reduce((sum, r) => sum + (r.profit || 0), 0).toFixed(2)}`);
    console.log(`⏱️  Duração média: ${(results.reduce((sum, r) => sum + r.duration, 0) / results.length).toFixed(0)}ms`);
    
    if (handshakes.length === results.length) {
        console.log('\n🎉 [SIMULATOR] ╔════════════════════════════════════════════════════════╗');
        console.log('🎉 [SIMULATOR] ║  TODOS OS HANDSHAKES CONFIRMADOS!                     ║');
        console.log('🎉 [SIMULATOR] ║  O DNA de Conversão está ativo e pronto               ║');
        console.log('🎉 [SIMULATOR] ║  para operação com DINHEIRO REAL                      ║');
        console.log('🎉 [SIMULATOR] ╚════════════════════════════════════════════════════════╝\n');
        process.exit(0);
    } else if (handshakes.length > 0) {
        console.log('\n⚠️ [SIMULATOR] Alguns handshakes falharam. Verifique logs acima.');
        process.exit(1);
    } else {
        console.log('\n❌ [SIMULATOR] Nenhum handshake confirmado. Verifique:');
        console.log('   1. Se a extensão Brave está instalada');
        console.log('   2. Se o endpoint está correto: ' + TEST_CONFIG.endpoint);
        console.log('   3. Se não há bloqueios CORS/firewall\n');
        process.exit(1);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════

function getArgValue(args, flag) {
    const index = args.findIndex(arg => arg.startsWith(flag));
    if (index !== -1) {
        const value = args[index].split('=')[1];
        if (value) return value;
        // Try next arg if format is `--flag value`
        if (args[index + 1] && !args[index + 1].startsWith('--')) {
            return args[index + 1];
        }
    }
    return null;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showHelp() {
    console.log(`
🧬 GXEON DNA_CONVERSAO_v21.2 — Simulador GARI

USO:
  node tests/simulateGari.js [opções]

OPÇÕES:
  --profit=VALOR     Lucro simulado (padrão: 10.50)
  --gas=VALOR        Custo de gás (padrão: 2.00)
  --confidence=0.XX  Nível de confiança (padrão: 0.85)
  --auto             Modo auto_execute (alta confiança)
  --count=N          Número de sinais (padrão: 1)
  --help, -h         Mostra esta ajuda

EXEMPLOS:
  node tests/simulateGari.js                    # Teste básico $10.50
  node tests/simulateGari.js --profit=50       # Teste com $50
  node tests/simulateGari.js --auto            # Auto-execute mode
  node tests/simulateGari.js --count=3         # 3 sinais sequenciais
  node tests/simulateGari.js --profit=25 --auto --count=5

CONFIGURAÇÃO:
  Defina BRAVE_EXTENSION_ENDPOINT no .env ou
  edite TEST_CONFIG.endpoint neste arquivo.
`);
}

// Run
main().catch(err => {
    console.error('❌ [SIMULATOR] Erro fatal:', err);
    process.exit(1);
});
