/**
 * Deployment Script: GXeonFlashExecutor Only
 * Target Network: Arbitrum One (Chain ID: 42161)
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// Arbitrum Mainnet Contract Addresses (for hardhat deployment simulation)
const CHECKSUMMED = {
  USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  UNISWAP_V3_ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  SUSHISWAP_ROUTER: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log('🔥 GXeon Flash Executor Deployment - Arbitrum One');
  console.log('==============================================');
  console.log('Deployer:', deployer.address);
  console.log('Network:', network.name, '(Chain ID:', network.chainId, ')');
  console.log('Balance:', ethers.utils.formatEther(await deployer.provider.getBalance(deployer.address)), 'ETH');
  console.log('');
  
  if (network.chainId !== 42161n) {
    console.warn('⚠️  WARNING: Not on Arbitrum Mainnet!');
  }
  
  // Deploy GXeonFlashExecutor
  console.log('📦 Deploying GXeonFlashExecutor...');
  
  const Executor = await ethers.getContractFactory('GXeonFlashExecutor');
  const executor = await Executor.deploy(
    deployer.address, // Using deployer as vault for now (will update later)
    CHECKSUMMED.USDC,
    CHECKSUMMED.WETH,
    CHECKSUMMED.WBTC,
    CHECKSUMMED.DAI,
    CHECKSUMMED.UNISWAP_V3_ROUTER,
    CHECKSUMMED.SUSHISWAP_ROUTER
  );
  
  await executor.waitForDeployment();
  const executorAddress = await executor.getAddress();
  
  console.log('✅ Executor deployed:', executorAddress);
  console.log('   TX:', executor.deploymentTransaction().hash);
  console.log('');
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      executor: {
        address: executorAddress,
        name: 'GXeonFlashExecutor',
        txHash: executor.deploymentTransaction().hash
      }
    },
    configuration: {
      usdc: CHECKSUMMED.USDC,
      weth: CHECKSUMMED.WETH,
      uniswapV3: CHECKSUMMED.UNISWAP_V3_ROUTER,
      sushiswap: CHECKSUMMED.SUSHISWAP_ROUTER
    }
  };
  
  const outputDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputFile = path.join(outputDir, `executor_arbitrum_${Date.now()}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log('✅ Deployment info saved:', outputFile);
  console.log('');
  
  console.log('🎉 DEPLOYMENT SUCCESSFUL!');
  console.log('========================');
  console.log('');
  console.log('📋 Contract Address:');
  console.log('   Executor:', executorAddress);
  console.log('');
  console.log('🔍 View on Arbiscan:');
  console.log('   https://arbiscan.io/address/' + executorAddress);
  console.log('');
  
  return deploymentInfo;
}

main()
  .then((info) => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
