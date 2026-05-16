const hre = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 Deploying GXeonSettlement to Sepolia...");
  
  // Verifica variáveis de ambiente
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;
  
  if (!rpcUrl) {
    console.error("❌ Error: SEPOLIA_RPC_URL not set in .env");
    console.log("   Get a free RPC from: https://alchemy.com or https://infura.io");
    process.exit(1);
  }
  
  if (!privateKey) {
    console.error("❌ Error: PRIVATE_KEY not set in .env");
    console.log("   Export your wallet private key (with 0x prefix)");
    process.exit(1);
  }
  
  console.log(`   Network: Sepolia (Chain ID: 11155111)`);
  console.log(`   RPC: ${rpcUrl.replace(/\/\/.*@/, '//****@')}`); // Hide API key in logs
  
  // Deploy do contrato
  const GXeonSettlement = await hre.ethers.getContractFactory("GXeonSettlement");
  const gxeon = await GXeonSettlement.deploy();
  
  await gxeon.waitForDeployment();
  
  const contractAddress = await gxeon.getAddress();
  
  console.log("\n✅ Contract deployed successfully!");
  console.log("═══════════════════════════════════════════════════");
  console.log(`📋 Contract Address: ${contractAddress}`);
  console.log(`🔍 Etherscan: https://sepolia.etherscan.io/address/${contractAddress}`);
  console.log("═══════════════════════════════════════════════════");
  
  // Aguarda confirmações para verificação
  console.log("\n⏳ Waiting for block confirmations...");
  await gxeon.deploymentTransaction().wait(5);
  
  console.log("✓ Confirmed 5 blocks");
  
  // Tenta verificar no Etherscan se a API key estiver disponível
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("\n🔍 Verifying on Etherscan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on Etherscan");
    } catch (error) {
      console.log("⚠️  Verification failed (can be done manually later):");
      console.log(`   npx hardhat verify --network sepolia ${contractAddress}`);
    }
  } else {
    console.log("\n⚠️  ETHERSCAN_API_KEY not set");
    console.log(`   Verify manually: npx hardhat verify --network sepolia ${contractAddress}`);
  }
  
  // Salva endereço para uso posterior
  const deploymentInfo = {
    network: "sepolia",
    chainId: 11155111,
    contractAddress,
    deployedAt: new Date().toISOString(),
    deployer: new hre.ethers.Wallet(privateKey).address
  };
  
  fs.writeFileSync(
    'deployment-info.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📁 Deployment info saved to: deployment-info.json");
  console.log("\n🎉 GXeon Settlement is live on Sepolia!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error.message);
    process.exit(1);
  });
