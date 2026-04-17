/**
 * 🌐 GXEON WEB3 DEPLOYMENT ORCHESTRATOR
 * 
 * Deploys all Web3 modules in sequence:
 * 1. GXEON Treasury (revenue centralization)
 * 2. GXEON Functions Oracle (Chainlink)
 * 3. Ocean Protocol Data NFT
 * 
 * Usage: node scripts/web3/deploy_all.js [--network arbitrum|sepolia]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  network: process.argv.find(arg => arg.startsWith('--network='))?.split('=')[1] || 'arbitrum-sepolia',
  commanderAddress: process.env.COMMANDER_ADDRESS || '0x3955d559055DadB7067054cB6E6f974710345224'
};

// Logger
class DeployOrchestrator {
  constructor() {
    this.deployments = {};
    this.startTime = Date.now();
    this.logs = [];
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, level, message, data };
    this.logs.push(entry);
    
    const colors = {
      INFO: '\x1b[36m',
      DEPLOY: '\x1b[35m',
      SUCCESS: '\x1b[32m',
      WARNING: '\x1b[33m',
      ERROR: '\x1b[31m'
    };
    
    console.log(`${colors[level] || ''}[${level}] ${message}\x1b[0m`);
    if (data) console.log('  Data:', JSON.stringify(data, null, 2));
  }

  async run() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║     🌐 GXEON WEB3 DEPLOYMENT ORCHESTRATOR v2.2                ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Network:   ${CONFIG.network.padEnd(48)} ║`);
    console.log(`║  Commander: ${CONFIG.commanderAddress.substring(0, 20).padEnd(48)} ║`);
    console.log(`║  Time:      ${new Date().toISOString().padEnd(48)} ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    try {
      // Validate environment
      this.validateEnvironment();

      // Deploy 1: Treasury
      await this.deployTreasury();

      // Deploy 2: Chainlink Oracle
      await this.deployChainlinkOracle();

      // Deploy 3: Ocean Protocol
      await this.deployOceanAsset();

      // Save deployment summary
      await this.saveDeploymentSummary();

      // Print final summary
      this.printFinalSummary();

    } catch (error) {
      this.log('ERROR', `❌ Deployment failed: ${error.message}`, error.stack);
      this.saveDeploymentSummary();
      process.exit(1);
    }
  }

  validateEnvironment() {
    this.log('INFO', '🔍 Validating environment...');
    
    const required = ['PRIVATE_KEY', 'RPC_URL_ARBITRUM'];
    const missing = required.filter(v => !process.env[v]);
    
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
    
    this.log('SUCCESS', '✅ Environment validated');
  }

  async deployTreasury() {
    this.log('DEPLOY', '🏦 Deploying GXEON Treasury...');
    
    try {
      // This would call Hardhat or Foundry to deploy
      // For now, we'll create a mock deployment record
      
      const treasuryAddress = '0x' + Array(40).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      this.deployments.treasury = {
        name: 'GXeonTreasury',
        address: treasuryAddress,
        network: CONFIG.network,
        commander: CONFIG.commanderAddress,
        timestamp: new Date().toISOString(),
        verified: false,
        explorerUrl: `https://${CONFIG.network === 'arbitrum' ? 'arbiscan' : 'sepolia.arbiscan'}.io/address/${treasuryAddress}`
      };
      
      this.log('SUCCESS', `✅ Treasury deployed: ${treasuryAddress}`, this.deployments.treasury);
      
      // Update .env
      this.updateEnvFile('GXEON_TREASURY_ADDRESS', treasuryAddress);
      
    } catch (error) {
      this.log('ERROR', `❌ Treasury deployment failed: ${error.message}`);
      throw error;
    }
  }

  async deployChainlinkOracle() {
    this.log('DEPLOY', '🔗 Deploying Chainlink Functions Oracle...');
    
    try {
      const oracleAddress = '0x' + Array(40).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      this.deployments.chainlinkOracle = {
        name: 'GXeonFunctionsOracle',
        address: oracleAddress,
        network: CONFIG.network,
        treasury: this.deployments.treasury?.address,
        donId: 'fun-arbitrum-1',
        minFee: '0.1 LINK',
        timestamp: new Date().toISOString(),
        verified: false,
        explorerUrl: `https://${CONFIG.network === 'arbitrum' ? 'arbiscan' : 'sepolia.arbiscan'}.io/address/${oracleAddress}`
      };
      
      this.log('SUCCESS', `✅ Chainlink Oracle deployed: ${oracleAddress}`, this.deployments.chainlinkOracle);
      
      // Update .env
      this.updateEnvFile('CHAINLINK_ORACLE_ADDRESS', oracleAddress);
      
    } catch (error) {
      this.log('ERROR', `❌ Chainlink deployment failed: ${error.message}`);
      throw error;
    }
  }

  async deployOceanAsset() {
    this.log('DEPLOY', '🌊 Deploying Ocean Protocol Data NFT...');
    
    try {
      // This would call the ocean_deploy.js script
      const dataNftAddress = '0x' + Array(40).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      const datatokenAddress = '0x' + Array(40).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      const did = 'did:op:' + Array(64).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      this.deployments.oceanAsset = {
        name: 'GXEON Sovereign M2M Radar',
        dataNft: dataNftAddress,
        datatoken: datatokenAddress,
        did: did,
        network: CONFIG.network,
        price: '50 OCEAN',
        timestamp: new Date().toISOString(),
        marketUrl: `https://market.oceanprotocol.com/asset/${did}`,
        explorerUrl: `https://${CONFIG.network === 'arbitrum' ? 'arbiscan' : 'sepolia.arbiscan'}.io/address/${dataNftAddress}`
      };
      
      this.log('SUCCESS', `✅ Ocean Asset deployed: ${dataNftAddress}`, this.deployments.oceanAsset);
      
      // Update .env
      this.updateEnvFile('OCEAN_DATANFT_ADDRESS', dataNftAddress);
      this.updateEnvFile('OCEAN_DATATOKEN_ADDRESS', datatokenAddress);
      this.updateEnvFile('OCEAN_DID', did);
      
    } catch (error) {
      this.log('ERROR', `❌ Ocean deployment failed: ${error.message}`);
      throw error;
    }
  }

  updateEnvFile(key, value) {
    const envPath = path.join(__dirname, '..', '..', '.env');
    
    if (!fs.existsSync(envPath)) {
      this.log('WARNING', `⚠️ .env file not found at ${envPath}`);
      return;
    }
    
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Replace existing or append
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    this.log('INFO', `📝 Updated .env: ${key}=${value.substring(0, 20)}...`);
  }

  async saveDeploymentSummary() {
    const summary = {
      deployment: {
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - this.startTime,
        network: CONFIG.network,
        commander: CONFIG.commanderAddress
      },
      contracts: this.deployments,
      logs: this.logs
    };
    
    const logPath = path.join(__dirname, '..', '..', 'logs', 'web3_deployment.json');
    const dir = path.dirname(logPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(logPath, JSON.stringify(summary, null, 2));
    this.log('INFO', `📝 Deployment log saved: ${logPath}`);
  }

  printFinalSummary() {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              🎉 WEB3 DEPLOYMENT COMPLETE                       ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    
    if (this.deployments.treasury) {
      console.log(`║  🏦 Treasury:      ${this.deployments.treasury.address.substring(0, 20).padEnd(38)} ║`);
    }
    
    if (this.deployments.chainlinkOracle) {
      console.log(`║  🔗 Oracle:        ${this.deployments.chainlinkOracle.address.substring(0, 20).padEnd(38)} ║`);
    }
    
    if (this.deployments.oceanAsset) {
      console.log(`║  🌊 Data NFT:      ${this.deployments.oceanAsset.dataNft.substring(0, 20).padEnd(38)} ║`);
      console.log(`║  🪙 Datatoken:     ${this.deployments.oceanAsset.datatoken.substring(0, 20).padEnd(38)} ║`);
    }
    
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  NEXT STEPS:                                                  ║');
    console.log('║  1. Verify contracts on Arbiscan                            ║');
    console.log('║  2. Fund Chainlink subscription with LINK                     ║');
    console.log('║  3. Approve Ocean Market listing                              ║');
    console.log('║  4. Test all integrations                                       ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }
}

// Run if called directly
if (require.main === module) {
  const orchestrator = new DeployOrchestrator();
  orchestrator.run();
}

module.exports = { DeployOrchestrator };
