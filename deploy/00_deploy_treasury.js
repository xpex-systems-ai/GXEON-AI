/**
 * 🏦 Deploy GXEON Treasury Contract
 * 
 * Usage: npx hardhat run deploy/00_deploy_treasury.js --network arbitrum
 */

const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         🏦 DEPLOYING GXEON TREASURY                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Get deployer
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  
  console.log(`👤 Deployer: ${deployerAddress}`);
  console.log(`💰 Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployerAddress))} ETH\n`);

  // Commander address (30% share recipient)
  const COMMANDER_ADDRESS = process.env.COMMANDER_ADDRESS || '0x3955d559055DadB7067054cB6E6f974710345224';
  console.log(`🎖️  Commander: ${COMMANDER_ADDRESS}`);
  console.log(`📊 Split: 70% Vault / 30% Commander\n`);

  // Deploy Treasury
  console.log('📝 Deploying GXeonTreasury...');
  
  const GXeonTreasury = await ethers.getContractFactory('GXeonTreasury');
  const treasury = await GXeonTreasury.deploy(COMMANDER_ADDRESS);
  
  await treasury.waitForDeployment();
  
  const treasuryAddress = await treasury.getAddress();
  
  console.log(`✅ Treasury deployed: ${treasuryAddress}`);
  console.log(`⛽  Gas used: (see receipt)\n`);

  // Save deployment info
  const deploymentInfo = {
    contract: 'GXeonTreasury',
    address: treasuryAddress,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployer: deployerAddress,
    commander: COMMANDER_ADDRESS,
    timestamp: new Date().toISOString(),
    txHash: treasury.deploymentTransaction().hash,
    explorer: `https://arbiscan.io/address/${treasuryAddress}`
  };

  // Save to file
  const deployDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(deployDir)) {
    fs.mkdirSync(deployDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deployDir, 'deploy_treasury.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📄 Deployment saved to: logs/deploy_treasury.json');
  console.log(`🔍 Arbiscan: ${deploymentInfo.explorer}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Verification instructions
  console.log('⏭️  NEXT STEPS:');
  console.log(`   npx hardhat verify --network arbitrum ${treasuryAddress} ${COMMANDER_ADDRESS}`);
  console.log('');

  return treasuryAddress;
}

main()
  .then((address) => {
    console.log(`🏦 TREASURY ADDRESS: ${address}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
