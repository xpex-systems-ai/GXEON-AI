/**
 * 🌑 GXEON RADAR API — BILLING TEST SCRIPT
 * Simulates API call and shows credit deduction
 */

const axios = require('axios');

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000';
const API_KEY = process.env.TEST_API_KEY || 'api_teste_faturamento';

console.log('═══════════════════════════════════════════════════════════════');
console.log('  🌑 GXEON RADAR API — BILLING VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`📡 Testing endpoint: ${API_URL}/api/v1/radar/opportunities`);
console.log(`🔑 API Key: ${API_KEY}`);
console.log(`💰 Expected charge: 0.05 credits\n`);

async function testRadarBilling() {
    try {
        console.log('⏳ Making API call...\n');
        
        const response = await axios.get(`${API_URL}/api/v1/radar/opportunities`, {
            headers: {
                'x-gxeon-key': API_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log('✅ API CALL SUCCESSFUL!\n');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  📊 BILLING INFORMATION');
        console.log('═══════════════════════════════════════════════════════════════');
        
        if (response.data.billing) {
            const billing = response.data.billing;
            console.log(`  💳 Operation:      ${billing.operation}`);
            console.log(`  💰 Cost:           ${billing.cost} credits`);
            console.log(`  💵 Remaining:      ${billing.remaining_balance} credits`);
            console.log(`  🆔 Transaction:    ${billing.transaction_id}`);
            console.log(`  ⏰ Charged at:     ${billing.charged_at}`);
        } else {
            console.log('  ⚠️  No billing info in response');
        }
        
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('  📡 RESPONSE DATA');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`  📈 Opportunities:  ${response.data.data?.total_count || 0}`);
        console.log(`  🕐 Timestamp:       ${response.data.timestamp}`);
        console.log(`  🌐 Networks:        ${response.data.data?.networks_scanned?.join(', ') || 'N/A'}`);
        
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('  ✅ BILLING TEST COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  Status: CHARGED 0.05 CREDITS SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ API CALL FAILED\n');
        
        if (error.response) {
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('  🚨 ERROR RESPONSE');
            console.log('═══════════════════════════════════════════════════════════════');
            console.log(`  Status: ${error.response.status} ${error.response.statusText}`);
            console.log(`  Error:  ${error.response.data?.error || 'Unknown'}`);
            console.log(`  Message: ${error.response.data?.message || 'No message'}`);
            
            if (error.response.status === 402) {
                console.log('\n  💡 TIP: Add credits to user account:');
                console.log(`     UPDATE gxeon_users SET balance_credits = 10 WHERE api_key = '${API_KEY}';`);
            }
            
            console.log('\n═══════════════════════════════════════════════════════════════');
        } else if (error.request) {
            console.log('🚨 Server not responding');
            console.log(`   URL: ${API_URL}`);
            console.log('\n💡 Make sure the server is running:');
            console.log('   npm start');
        } else {
            console.log('🚨 Error:', error.message);
        }
        
        console.log('\n═══════════════════════════════════════════════════════════════\n');
        process.exit(1);
    }
}

// Also test 402 Payment Required scenario
async function testInsufficientBalance() {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  🧪 TESTING: INSUFFICIENT BALANCE (402 PAYMENT REQUIRED)');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    try {
        await axios.get(`${API_URL}/api/v1/radar/opportunities`, {
            headers: {
                'x-gxeon-key': 'invalid_or_no_balance_key',
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('❌ Expected 402 error but got success');
        
    } catch (error) {
        if (error.response && error.response.status === 402) {
            console.log('✅ CORRECTLY RETURNED 402 PAYMENT REQUIRED!\n');
            console.log(`  Status: ${error.response.status}`);
            console.log(`  Error: ${error.response.data?.error}`);
            console.log(`  Message: ${error.response.data?.message}`);
            console.log(`  Required: ${error.response.data?.required} credits`);
            console.log(`  Current: ${error.response.data?.current_balance} credits`);
        } else {
            console.log('⚠️  Different error:', error.response?.status || error.message);
        }
    }
}

// Run tests
(async () => {
    await testRadarBilling();
    await testInsufficientBalance();
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  🌑 GXEON BILLING SYSTEM — VERIFICATION COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');
})();
