/**
 * Contract Verification Script for Arbiscan
 * Run after deployment to verify source code
 */

const { run } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  // Read latest deployment
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  const files = fs.readdirSync(deploymentsDir)
    .filter(f => f.startsWith('arbitrum_'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.error('❌ No deployment files found');
    return;
  }
  
  const latestDeployment = JSON.parse(
    fs.readFileSync(path.join(deploymentsDir, files[0]), 'utf8')
  );
  
  console.log('🔍 Verifying contracts on Arbiscan...');
  console.log('Network:', latestDeployment.network);
  console.log('Chain ID:', latestDeployment.chainId);
  console.log('');
  
  // Arbitrum One Addresses
  const ADDRESSES = {
    AAVE_POOL_ADDRESSES_PROVIDER: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    AAVE: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
    UNISWAP_V3_ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    SUSHISWAP_ROUTER: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  };
  
  // ==========================================
  // Verify GXeonMainnetVault
  // ==========================================
  console.log('📋 Verifying GXeonMainnetVault...');
  try {
    await run('verify:verify', {
      address: latestDeployment.contracts.vault.address,
      constructorArguments: [
        ADDRESSES.AAVE_POOL_ADDRESSES_PROVIDER,
        ADDRESSES.USDC,
        ADDRESSES.WETH,
        ADDRESSES.AAVE
      ],
      contract: 'contracts/GXeonMainnetVault.sol:GXeonMainnetVault'
    });
    console.log('✅ Vault verified!');
  } catch (error) {
    console.log('⚠️  Vault verification error:', error.message);
  }
  
  console.log('');
  
  // ==========================================
  // Verify GXeonFlashExecutor
  // ==========================================
  console.log('📋 Verifying GXeonFlashExecutor...');
  try {
    await run('verify:verify', {
      address: latestDeployment.contracts.executor.address,
      constructorArguments: [
        latestDeployment.contracts.vault.address,
        ADDRESSES.USDC,
        ADDRESSES.WETH,
        ADDRESSES.WBTC,
        ADDRESSES.DAI,
        ADDRESSES.UNISWAP_V3_ROUTER,
        ADDRESSES.SUSHISWAP_ROUTER
      ],
      contract: 'contracts/GXeonFlashExecutor.sol:GXeonFlashExecutor'
    });
    console.log('✅ Executor verified!');
  } catch (error) {
    console.log('⚠️  Executor verification error:', error.message);
  }
  
  console.log('');
  console.log('🎉 Verification complete!');
  console.log('');
  console.log('🔗 View verified contracts:');
  console.log('   Vault: https://arbiscan.io/address/' + latestDeployment.contracts.vault.address + '#code');
  console.log('   Executor: https://arbiscan.io/address/' + latestDeployment.contracts.executor.address + '#code');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
