/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CORNIX INTEGRATION TEST SUITE
 * Testa todos os endpoints de monetização de sinais
 * ═══════════════════════════════════════════════════════════════════════════
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
    test_symbol: 'BTCUSDT',
    test_side: 'LONG',
    test_entry: 65000,
    test_targets: [66000, 67000, 68000],
    test_stop: 64000,
    test_leverage: 10
};

async function testEndpoint(method, path, body = null, headers = {}) {
    const url = `${BASE_URL}${path}`;
    console.log(`\n🔹 ${method} ${path}`);
    
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        const data = await response.json();
        
        console.log(`   Status: ${response.status}`);
        console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 500));
        
        return { success: response.ok, status: response.status, data };
    } catch (error) {
        console.error(`   ❌ Error:`, error.message);
        return { success: false, error: error.message };
    }
}

async function runTests() {
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('🧪 CORNIX INTEGRATION TESTS');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Time: ${new Date().toISOString()}`);
    
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };
    
    // Test 1: Live signals endpoint (public)
    const test1 = await testEndpoint('GET', '/v1/signals/live');
    results.tests.push({ name: 'GET /v1/signals/live', ...test1 });
    test1.success ? results.passed++ : results.failed++;
    
    // Test 2: Cornix-ready signals (free preview)
    const test2 = await testEndpoint('GET', '/v1/signals/cornix-ready?limit=5');
    results.tests.push({ name: 'GET /v1/signals/cornix-ready', ...test2 });
    test2.success ? results.passed++ : results.failed++;
    
    // Test 3: Leaderboard
    const test3 = await testEndpoint('GET', '/v1/leaderboard?period=MONTHLY&limit=10');
    results.tests.push({ name: 'GET /v1/leaderboard', ...test3 });
    test3.success ? results.passed++ : results.failed++;
    
    // Test 4: Create signal (internal endpoint - needs auth)
    const test4 = await testEndpoint('POST', '/v1/signals', {
        symbol: TEST_CONFIG.test_symbol,
        side: TEST_CONFIG.test_side,
        entry_price: TEST_CONFIG.test_entry,
        targets: TEST_CONFIG.test_targets,
        stop_loss: TEST_CONFIG.test_stop,
        leverage: TEST_CONFIG.test_leverage,
        is_premium: true,
        strategy: 'AI_TREND_V1',
        confidence_score: 85
    }, {
        'x-internal-key': process.env.INTERNAL_API_KEY || 'test-key'
    });
    results.tests.push({ name: 'POST /v1/signals (create)', ...test4 });
    // This will fail without proper internal key, but we track it
    test4.success ? results.passed++ : results.failed++;
    
    // Test 5: Webhook subscribe
    const test5 = await testEndpoint('POST', '/v1/signals/webhook/subscribe', {
        webhook_url: 'https://webhook.site/test-cornix-gxeon',
        symbols: ['BTCUSDT', 'ETHUSDT'],
        signal_types: ['LONG', 'SHORT'],
        min_confidence: 70
    }, {
        'x-user-id': 'test-user-123'
    });
    results.tests.push({ name: 'POST /v1/signals/webhook/subscribe', ...test5 });
    test5.success ? results.passed++ : results.failed++;
    
    // Test 6: Full signal (locked - needs payment)
    const test6 = await testEndpoint('GET', '/v1/signals/test-signal-id/full', null, {
        'x-user-id': 'test-user-123'
    });
    results.tests.push({ name: 'GET /v1/signals/:id/full (locked)', ...test6 });
    // Expected to return 402 for locked signals
    if (test6.status === 402) {
        console.log('   ✅ Correctly returned 402 for locked signal');
        results.passed++;
    } else {
        results.failed++;
    }
    
    // Print Summary
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log(`Total: ${results.tests.length} tests`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`Success Rate: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);
    
    console.log('\n📋 DETAILED RESULTS:');
    results.tests.forEach(test => {
        const icon = test.success ? '✅' : '❌';
        console.log(`   ${icon} ${test.name}: ${test.success ? 'PASS' : 'FAIL'} (${test.status || 'N/A'})`);
    });
    
    // Endpoints Summary
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('🔗 ACTIVE ENDPOINTS');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('Public (Free):');
    console.log('   GET /v1/signals/live          - Live signal stream');
    console.log('   GET /v1/signals/cornix-ready  - Free preview (targets locked)');
    console.log('   GET /v1/leaderboard           - Performance rankings');
    console.log('\nMonetized (PIX):');
    console.log('   GET /v1/signals/:id/pay       - Generate PIX payment');
    console.log('   GET /v1/signals/pix-status/:txId - Check payment status');
    console.log('   GET /v1/signals/:id/full      - Full signal after payment');
    console.log('\nWebhook:');
    console.log('   POST /v1/signals/webhook/subscribe - Subscribe to webhooks');
    console.log('   POST /v1/signals/webhook/test       - Test webhook delivery');
    console.log('\nInternal:');
    console.log('   POST /v1/signals              - Create new signal');
    console.log('   POST /v1/signals/:id/performance - Record result');
    
    return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().then(results => {
        process.exit(results.failed > 0 ? 1 : 0);
    }).catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

export { runTests, testEndpoint };
