/**
 * Deployment Script: GXeonMainnetVault + GXeonFlashExecutor
 * Target Network: Arbitrum One (Chain ID: 42161)
 * 
 * Features:
 * - Aave V3 Flash Loans
 * - Uniswap V3 & SushiSwap Integration
 * - 70/30 Profit Distribution
 * - 0.1% Slippage Protection
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// Arbitrum One Contract Addresses
const ADDRESSES = {
  // Aave V3
  AAVE_POOL_ADDRESSES_PROVIDER: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
  
  // Tokens
  USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  AAVE: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
  
  // DEX Routers
  UNISWAP_V3_ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  SUSHISWAP_ROUTER: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  UNISWAP_V2_ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  
  // Chainlink Price Feeds
  USDC_USD_FEED: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
  ETH_USD_FEED: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log('🔥 GXeon Mainnet Deployment - Arbitrum One');
  console.log('===========================================');
  console.log('Deployer:', deployer.address);
  console.log('Network:', network.name, '(Chain ID:', network.chainId, ')');
  console.log('Balance:', ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'ETH');
  console.log('');
  
  if (network.chainId !== 42161n && network.chainId !== 421613n) {
    console.warn('⚠️  WARNING: Not on Arbitrum network!');
    console.warn('Current:', network.chainId);
    console.warn('Expected: 42161 (Arbitrum One) or 421613 (Goerli)');
    console.log('');
  }
  
  // ==========================================
  // STEP 1: Deploy GXeonMainnetVault
  // ==========================================
  console.log('📦 Step 1: Deploying GXeonMainnetVault...');
  
  const Vault = await ethers.getContractFactory('GXeonMainnetVault');
  const vault = await Vault.deploy(
    ADDRESSES.AAVE_POOL_ADDRESSES_PROVIDER,
    ADDRESSES.USDC,
    ADDRESSES.WETH,
    ADDRESSES.AAVE
  );
  
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  
  console.log('✅ Vault deployed:', vaultAddress);
  console.log('   TX:', vault.deploymentTransaction().hash);
  console.log('');
  
  // ==========================================
  // STEP 2: Deploy GXeonFlashExecutor
  // ==========================================
  console.log('📦 Step 2: Deploying GXeonFlashExecutor...');
  
  const Executor = await ethers.getContractFactory('GXeonFlashExecutor');
  const executor = await Executor.deploy(
    vaultAddress,
    ADDRESSES.USDC,
    ADDRESSES.WETH,
    ADDRESSES.WBTC,
    ADDRESSES.DAI,
    ADDRESSES.UNISWAP_V3_ROUTER,
    ADDRESSES.SUSHISWAP_ROUTER
  );
  
  await executor.waitForDeployment();
  const executorAddress = await executor.getAddress();
  
  console.log('✅ Executor deployed:', executorAddress);
  console.log('   TX:', executor.deploymentTransaction().hash);
  console.log('');
  
  // ==========================================
  // STEP 3: Link Contracts
  // ==========================================
  console.log('🔗 Step 3: Linking contracts...');
  
  // Set executor in vault
  const setExecutorTx = await vault.setFlashExecutor(executorAddress);
  await setExecutorTx.wait();
  console.log('✅ Executor linked to Vault');
  
  // Verify slippage is 0.1% (10 bps)
  const slippage = await executor.slippageBps();
  console.log('✅ Slippage configured:', slippage.toString(), 'bps (0.1%)');
  console.log('');
  
  // ==========================================
  // STEP 4: Save Deployment Info
  // ==========================================
  console.log('💾 Step 4: Saving deployment info...');
  
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      vault: {
        address: vaultAddress,
        name: 'GXeonMainnetVault',
        txHash: vault.deploymentTransaction().hash
      },
      executor: {
        address: executorAddress,
        name: 'GXeonFlashExecutor',
        txHash: executor.deploymentTransaction().hash
      }
    },
    configuration: {
      aavePool: ADDRESSES.AAVE_POOL_ADDRESSES_PROVIDER,
      usdc: ADDRESSES.USDC,
      weth: ADDRESSES.WETH,
      uniswapV3: ADDRESSES.UNISWAP_V3_ROUTER,
      sushiswap: ADDRESSES.SUSHISWAP_ROUTER
    }
  };
  
  // Save to file
  const outputDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputFile = path.join(outputDir, `arbitrum_${Date.now()}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log('✅ Deployment info saved:', outputFile);
  console.log('');
  
  // ==========================================
  // STEP 5: Generate Frontend Config
  // ==========================================
  console.log('🎨 Step 5: Generating frontend configuration...');
  
  const frontendConfig = `
// Arbitrum One - Production Deployment
// Generated: ${new Date().toISOString()}

export const ARBITRUM_DEPLOYMENT = {
  chainId: 42161,
  vault: '${vaultAddress}',
  executor: '${executorAddress}',
  usdc: '${ADDRESSES.USDC}',
  weth: '${ADDRESSES.WETH}',
  aavePool: '${ADDRESSES.AAVE_POOL_ADDRESSES_PROVIDER}',
  uniswapV3: '${ADDRESSES.UNISWAP_V3_ROUTER}',
  sushiswap: '${ADDRESSES.SUSHISWAP_ROUTER}',
};
`;
  
  const frontendFile = path.join(
    __dirname, 
    '..', 
    'dashboard', 
    'src', 
    'config',
    'arbitrum_deployment.ts'
  );
  
  fs.writeFileSync(frontendFile, frontendConfig);
  console.log('✅ Frontend config saved:', frontendFile);
  console.log('');
  
  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('🎉 DEPLOYMENT COMPLETE!');
  console.log('========================');
  console.log('');
  console.log('📋 Contract Addresses:');
  console.log('   Vault:', vaultAddress);
  console.log('   Executor:', executorAddress);
  console.log('');
  console.log('🔍 View on Arbiscan:');
  console.log('   https://arbiscan.io/address/' + vaultAddress);
  console.log('   https://arbiscan.io/address/' + executorAddress);
  console.log('');
  console.log('⚡ Next Steps:');
  console.log('   1. Verify contracts on Arbiscan');
  console.log('   2. Deposit USDC initial capital to Vault');
  console.log('   3. Update dashboard/src/config/networks.ts');
  console.log('   4. Test flash loan execution');
  console.log('');
  
  // Save addresses for verification
  const addressesFile = path.join(outputDir, 'arbitrum_addresses.json');
  fs.writeFileSync(addressesFile, JSON.stringify({
    vault: vaultAddress,
    executor: executorAddress,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  return deploymentInfo;
}

// Run deployment
main()
  .then((info) => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
