/**
 * 🔗 Deploy GXEON Chainlink Functions Oracle
 * 
 * Usage: npx hardhat run deploy/01_deploy_oracle.js --network arbitrum
 * 
 * Requirements:
 * - TREASURY_ADDRESS must be set in .env or logs/deploy_treasury.json
 * - Chainlink Functions Router for Arbitrum:
 *   Mainnet: 0x97083e831b38cE894180C0A5f40D8c5b1647F30A
 * - LINK tokens for subscription funding
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

// Chainlink Functions Router addresses
const ROUTERS = {
  arbitrum: '0x97083e831b38cE894180C0A5f40D8c5b1647F30A', // Mainnet
  arbitrumGoerli: '0xAd5B333C0fE39cF9dB537dFaf84e8F589Ca1357d' // Testnet
};

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         🔗 DEPLOYING GXEON CHAINLINK ORACLE                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Get deployer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  
  console.log(`👤 Deployer: ${deployerAddress}`);
  console.log(`💰 Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployerAddress))} ETH\n`);

  // Get Treasury address
  let TREASURY_ADDRESS = process.env.GXEON_TREASURY_ADDRESS;
  
  if (!TREASURY_ADDRESS) {
    // Try to load from previous deployment
    try {
      const treasuryDeploy = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'logs', 'deploy_treasury.json'), 'utf8')
      );
      TREASURY_ADDRESS = treasuryDeploy.address;
      console.log(`📂 Treasury loaded from deployment: ${TREASURY_ADDRESS}`);
    } catch (e) {
      console.error('❌ Treasury address not found!');
      console.log('   Set GXEON_TREASURY_ADDRESS in .env or deploy Treasury first.');
      process.exit(1);
    }
  }

  // Get router
  const network = hre.network.name;
  const ROUTER_ADDRESS = ROUTERS[network] || process.env.CHAINLINK_ROUTER_ADDRESS;
  
  if (!ROUTER_ADDRESS) {
    console.error(`❌ Unknown network: ${network}`);
    console.log('   Supported: arbitrum, arbitrumGoerli');
    process.exit(1);
  }

  const DON_ID = process.env.CHAINLINK_DON_ID || 'fun-arbitrum-1';

  console.log(`🏦 Treasury: ${TREASURY_ADDRESS}`);
  console.log(`🔗 Router: ${ROUTER_ADDRESS}`);
  console.log(`🆔 DON ID: ${DON_ID}`);
  console.log(`💵 Fee: 0.1 LINK per call\n`);

  // Deploy Oracle
  console.log('📝 Deploying GXeonFunctionsOracle...');
  
  const GXeonOracle = await ethers.getContractFactory('GXeonFunctionsOracle');
  const oracle = await GXeonOracle.deploy(
    ROUTER_ADDRESS,
    ethers.encodeBytes32String(DON_ID),
    TREASURY_ADDRESS
  );
  
  await oracle.waitForDeployment();
  
  const oracleAddress = await oracle.getAddress();
  
  console.log(`✅ Oracle deployed: ${oracleAddress}`);
  console.log(`⛽  Gas used: (see receipt)\n`);

  // Save deployment info
  const deploymentInfo = {
    contract: 'GXeonFunctionsOracle',
    address: oracleAddress,
    network: network,
    chainId: hre.network.config.chainId,
    deployer: deployerAddress,
    treasury: TREASURY_ADDRESS,
    chainlinkRouter: ROUTER_ADDRESS,
    donId: DON_ID,
    timestamp: new Date().toISOString(),
    txHash: oracle.deploymentTransaction().hash,
    explorer: `https://arbiscan.io/address/${oracleAddress}`,
    nextSteps: [
      'Fund Chainlink subscription with LINK',
      'Add oracle address to subscription consumers',
      'Test arbitrage signal request'
    ]
  };

  // Save to file
  const deployDir = path.join(__dirname, '..', 'logs');
  fs.writeFileSync(
    path.join(deployDir, 'deploy_oracle.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📄 Deployment saved to: logs/deploy_oracle.json');
  console.log(`🔍 Arbiscan: ${deploymentInfo.explorer}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Verification instructions
  console.log('⏭️  NEXT STEPS:');
  console.log(`   1. Verify: npx hardhat verify --network arbitrum ${oracleAddress} ${ROUTER_ADDRESS} ${DON_ID} ${TREASURY_ADDRESS}`);
  console.log('   2. Create Chainlink Functions subscription:');
  console.log('      https://functions.chain.link/arbitrum');
  console.log('   3. Fund subscription with LINK tokens');
  console.log(`   4. Add ${oracleAddress} as consumer`);
  console.log('');

  return oracleAddress;
}

main()
  .then((address) => {
    console.log(`🔗 ORACLE ADDRESS: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
