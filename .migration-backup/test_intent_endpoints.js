/**
 * Test Intent-based Liquidity Endpoint Connections
 */

const INTENT_ENDPOINTS = {
  COW_PROTOCOL: 'https://api.cow.fi/mainnet/api/v1',
  ENSO_FINANCE: 'https://api.enso.finance/api/v1',
  ONE_INCH: 'https://api.1inch.dev',
  PARASWAP: 'https://apiv5.paraswap.io',
};

async function testEndpoint(name, url, endpoint) {
  try {
    console.log(`Testing ${name}...`);
    const response = await fetch(`${url}/${endpoint}`);
    const status = response.ok ? '✅ ONLINE' : '❌ OFFLINE';
    console.log(`${name}: ${status} (${response.status})`);
    return { name, status: response.ok, httpStatus: response.status };
  } catch (error) {
    console.log(`${name}: ❌ ERROR - ${error.message}`);
    return { name, status: false, error: error.message };
  }
}

async function main() {
  console.log('🔍 Testing Intent-based Liquidity Endpoints\n');
  console.log('============================================\n');

  const results = await Promise.all([
    testEndpoint('CoW Protocol', INTENT_ENDPOINTS.COW_PROTOCOL, 'solvers'),
    testEndpoint('Enso Finance', INTENT_ENDPOINTS.ENSO_FINANCE, 'routes'),
    testEndpoint('1inch', INTENT_ENDPOINTS.ONE_INCH, 'healthcheck'),
    testEndpoint('Paraswap', INTENT_ENDPOINTS.PARASWAP, 'health'),
  ]);

  console.log('\n============================================');
  console.log('SUMMARY\n');
  console.log('============================================\n');

  const onlineCount = results.filter(r => r.status).length;
  console.log(`Total Endpoints: ${results.length}`);
  console.log(`Online: ${onlineCount}`);
  console.log(`Offline: ${results.length - onlineCount}\n`);

  console.log('Detailed Status:');
  results.forEach(result => {
    console.log(`  ${result.name}: ${result.status ? '✅ ONLINE' : '❌ OFFLINE'}`);
  });

  console.log('\n============================================');
  console.log('STATUS: Intent-based Liquidity Integration');
  console.log('============================================\n');

  if (onlineCount >= 3) {
    console.log('✅ INTEGRATION READY - Multiple endpoints operational');
  } else if (onlineCount >= 2) {
    console.log('⚠️ PARTIAL INTEGRATION - Some endpoints unavailable');
  } else {
    console.log('❌ INTEGRATION LIMITED - Most endpoints offline');
  }

  return results;
}

main()
  .then(results => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
