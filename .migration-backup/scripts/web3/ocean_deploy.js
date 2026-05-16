/**
 * 🌊 OCEAN PROTOCOL DEPLOYMENT SCRIPT
 * 
 * Tokeniza a API GXEON como um Data NFT no Ocean Market
 * Permite venda de acesso aos dados de mempool via Compute-to-Data
 * 
 * Usage: node scripts/web3/ocean_deploy.js
 * Network: Arbitrum One (Mainnet) ou Sepolia (Testnet)
 */

const { Ocean, ConfigHelper } = require('@oceanprotocol/lib');
const { ethers, JsonRpcProvider, Wallet } = require('ethers');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Network selection
  NETWORK: process.env.OCEAN_NETWORK || 'arbitrum', // 'arbitrum' ou 'arbitrum-sepolia'
  
  // Asset metadata
  ASSET_NAME: process.env.OCEAN_ASSET_NAME || 'GXEON Sovereign M2M Radar',
  ASSET_SYMBOL: process.env.OCEAN_ASSET_SYMBOL || 'GXEON-DATA',
  ASSET_DESCRIPTION: `High-frequency Arbitrum mempool scanning for MEV and arbitrage opportunities. 
Real-time trading signals for autonomous agents via Machine-to-Machine monetization.

Features:
- Real-time mempool monitoring
- Arbitrage opportunity detection
- Flash loan pool tracking
- MEV bundle pre-signaling
- <50ms response time

Access via Compute-to-Data (C2D) on Ocean Protocol.`,
  
  // Provider configuration
  PROVIDER_URL: process.env.OCEAN_PROVIDER_URL || 'https://gxeon-ai.xmentex2.replit.app',
  
  // Pricing
  PRICE_OCEAN: process.env.OCEAN_PRICE || '50', // 50 OCEAN tokens
  
  // Wallet
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  RPC_URL: process.env.RPC_URL_ARBITRUM || 'https://arb1.arbitrum.io/rpc',
  
  // Ocean Network Configuration
  OCEAN_NETWORK_URL: process.env.OCEAN_NETWORK_URL || 'https://arb1.arbitrum.io/rpc'
};

// Ocean Protocol Arbitrum Addresses
const OCEAN_ADDRESSES = {
  arbitrum: {
    oceanToken: '0xF26c6C93D73fFdeE0cA4B88c5FfE6f1b85AC72f8',
    factory721: '0x1d8b690D0421004b1F70eF4604c6B9F67D0c22c1',
    datatokenFactory: '0x0fC98475C8cb30aB0972b3aBf9038Dee2497668A',
    router: '0x7b624eeA523618d86465178d4B7547bbC1c1c72f',
    sideStaking: '0x225b9c1a942D35eE9802326E33F39957dA42F84d',
    opfCommunityFeeCollector: '0xA8E8d20Ec18F9e13bc1954ba8a8f09b04F59296F',
    provider: '0x68c25a27066b6e6a06c09b6e1d41e8f2c4e9a1d3',
    chainId: 42161
  },
  'arbitrum-sepolia': {
    oceanToken: '0xF556C5F42C35383Aa39c7611E182D3C26C06dE5F',
    factory721: '0x2c5a2749196229d4f4cE57272b09B50658C15C2A',
    datatokenFactory: '0x041Eb71A2b85B7a39C91174Ee15E4A7786e51C62',
    router: '0xd87a4a6fEa17B74A15Aee09a8F232C55c625D4c6',
    sideStaking: '0x21c4c14C23aEf8734E94F79aF1A78706d3D1Cc55',
    opfCommunityFeeCollector: '0x7b0E161cD70b7c6A3A45E3C5895C2C1b0F86f7B8',
    provider: '0x6dAeaC64b33B4aE01392f43b6F745510E69C997E',
    chainId: 421614
  }
};

// Logger
class DeployLogger {
  constructor() {
    this.logs = [];
    this.startTime = Date.now();
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, level, message, data };
    this.logs.push(entry);
    
    const colors = {
      INFO: '\x1b[36m',
      SUCCESS: '\x1b[32m',
      WARNING: '\x1b[33m',
      ERROR: '\x1b[31m',
      DEPLOY: '\x1b[35m'
    };
    
    console.log(`${colors[level] || ''}[${level}] ${message}\x1b[0m`);
    if (data) console.log('  Data:', JSON.stringify(data, null, 2));
  }

  save() {
    const logPath = path.join(__dirname, '..', '..', 'logs', 'ocean_deploy.json');
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    fs.writeFileSync(logPath, JSON.stringify({
      deployment: {
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - this.startTime,
        network: CONFIG.NETWORK
      },
      logs: this.logs
    }, null, 2));
    
    console.log(`\n📝 Log saved to: ${logPath}`);
  }
}

const logger = new DeployLogger();

// Main deployment function
async function deployOceanAsset() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         🌊 OCEAN PROTOCOL — DATA NFT DEPLOYMENT               ║');
  console.log('╠═══════════════════════════════════════════════════════════════╣');
  console.log(`║  Network:   ${CONFIG.NETWORK.padEnd(48)} ║`);
  console.log(`║  Asset:     ${CONFIG.ASSET_NAME.padEnd(48)} ║`);
  console.log(`║  Price:    ${(CONFIG.PRICE_OCEAN + ' OCEAN').padEnd(48)} ║`);
  console.log(`║  Provider:  ${CONFIG.PROVIDER_URL.padEnd(48)} ║`);
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Validate configuration
    if (!CONFIG.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in environment');
    }

    logger.log('INFO', '🔑 Initializing wallet and provider...');
    
    // Setup provider and wallet
    const provider = new JsonRpcProvider(CONFIG.RPC_URL);
    const wallet = new Wallet(CONFIG.PRIVATE_KEY, provider);
    const address = await wallet.getAddress();
    
    logger.log('DEPLOY', `💼 Deployer: ${address}`);
    
    // Check balance
    const balance = await provider.getBalance(address);
    const ethBalance = ethers.formatEther(balance);
    logger.log('INFO', `💰 ETH Balance: ${ethBalance}`);
    
    if (parseFloat(ethBalance) < 0.001) {
      throw new Error('Insufficient ETH for gas. Need at least 0.001 ETH');
    }

    // Get Ocean addresses
    const oceanAddrs = OCEAN_ADDRESSES[CONFIG.NETWORK];
    if (!oceanAddrs) {
      throw new Error(`Unsupported network: ${CONFIG.NETWORK}`);
    }

    logger.log('INFO', '🌊 Connecting to Ocean Protocol...');

    // Initialize Ocean
    const config = {
      chainId: oceanAddrs.chainId,
      network: CONFIG.NETWORK,
      nodeUri: CONFIG.RPC_URL,
      providerUri: oceanAddrs.provider,
      aquariusUri: `https://v4.aquarius.oceanprotocol.com`,
      subgraphUri: `https://v4.subgraph.${CONFIG.NETWORK}.oceanprotocol.com/subgraphs/name/oceanprotocol/ocean-subgraph`,
      ...oceanAddrs
    };

    const ocean = await Ocean.getInstance(config);
    
    logger.log('SUCCESS', '✅ Ocean Protocol connected');

    // Create asset metadata
    const metadata = {
      main: {
        type: 'dataset',
        name: CONFIG.ASSET_NAME,
        dateCreated: new Date().toISOString().split('.')[0] + 'Z',
        author: 'GXEON Systems',
        license: 'Enterprise',
        description: CONFIG.ASSET_DESCRIPTION,
        links: [
          { name: 'Dashboard', url: 'https://gxeon-ai.xmentex2.replit.app' },
          { name: 'Documentation', url: 'https://gxeon-ai.xmentex2.replit.app/docs' },
          { name: 'GitHub', url: 'https://github.com/xpex-systems-ai/GXEON-AI' }
        ],
        tags: ['MEV', 'Arbitrage', 'Arbitrum', 'Mempool', 'HFT', 'DeFi', 'Trading', 'AI Agents'],
        categories: ['DeFi', 'Trading', 'Data'],
        network: oceanAddrs.chainId
      },
      additionalInformation: {
        termsAndConditions: true,
        consentForAI: true,
        service: {
          type: 'compute',
          provider: CONFIG.PROVIDER_URL,
          endpoints: {
            c2d: `${CONFIG.PROVIDER_URL}/api/v1/ocean/compute`,
            health: `${CONFIG.PROVIDER_URL}/api/v1/ocean/health`
          }
        },
        gxeon: {
          version: '2.2.0',
          protocol: 'PANDORA_M2M',
          pricing_tiers: {
            basic: { ocean: 50, queries: 1000 },
            pro: { ocean: 500, queries: 15000 },
            whale: { ocean: 5000, queries: 200000 }
          }
        }
      }
    };

    logger.log('DEPLOY', '📦 Creating Data NFT...');

    // Create Data NFT (ERC721)
    const nftParams = {
      name: CONFIG.ASSET_NAME,
      symbol: CONFIG.ASSET_SYMBOL,
      templateIndex: 1,
      baseUri: 'https://gxeon.ai/metadata/',
      transferable: true,
      owner: address
    };

    const dataNft = await ocean.nft.create(nftParams, wallet);
    const dataNftAddress = dataNft.address;
    
    logger.log('SUCCESS', `✅ Data NFT created: ${dataNftAddress}`);

    // Create Datatoken (ERC20) for access
    logger.log('DEPLOY', '💎 Creating Datatoken...');
    
    const datatokenParams = {
      templateIndex: 1,
      minter: address,
      feeManager: address,
      mpFeeAddress: oceanAddrs.opfCommunityFeeCollector,
      feeToken: oceanAddrs.oceanToken,
      feeAmount: 0,
      cap: ethers.parseEther('1000000').toString(),
      name: `${CONFIG.ASSET_NAME} Access Token`,
      symbol: `${CONFIG.ASSET_SYMBOL}-DT`
    };

    const datatoken = await ocean.datatoken.create(datatokenParams, wallet, dataNftAddress);
    const datatokenAddress = datatoken.address;
    
    logger.log('SUCCESS', `✅ Datatoken created: ${datatokenAddress}`);

    // Create Fixed Rate Exchange for pricing
    logger.log('DEPLOY', '💰 Setting up Fixed Rate Exchange...');
    
    const fixedRateParams = {
      datatoken: datatokenAddress,
      baseToken: oceanAddrs.oceanToken, // OCEAN token
      owner: address,
      marketFeeCollector: address,
      baseTokenDecimals: 18,
      datatokenDecimals: 18,
      fixedRate: ethers.parseEther(CONFIG.PRICE_OCEAN).toString(), // Price in OCEAN
      marketFee: 0.001, // 0.1% market fee
      withMint: false
    };

    const exchange = await ocean.exchange.createFixedRate(fixedRateParams, wallet);
    const exchangeId = exchange.exchangeId;
    
    logger.log('SUCCESS', `✅ Fixed Rate Exchange created: ${exchangeId}`);
    logger.log('INFO', `💵 Price: ${CONFIG.PRICE_OCEAN} OCEAN per access`);

    // Create and publish DDO (DID Document)
    logger.log('DEPLOY', '📤 Publishing asset to Aquarius...');
    
    const service = {
      type: 'compute',
      serviceEndpoint: oceanAddrs.provider,
      timeout: 86400, // 24 hours
      compute: {
        allowRawAlgorithm: false,
        allowNetworkAccess: true,
        publisherTrustedAlgorithmPublishers: [],
        publisherTrustedAlgorithms: []
      }
    };

    const ddo = await ocean.assets.create(
      metadata,
      wallet,
      [service],
      dataNftAddress,
      [datatokenAddress]
    );

    const did = ddo.id;
    
    logger.log('SUCCESS', `✅ Asset published! DID: ${did}`);

    // Save deployment info
    const deploymentInfo = {
      network: CONFIG.NETWORK,
      chainId: oceanAddrs.chainId,
      timestamp: new Date().toISOString(),
      deployer: address,
      contracts: {
        dataNft: dataNftAddress,
        datatoken: datatokenAddress,
        exchangeId: exchangeId,
        did: did
      },
      urls: {
        oceanMarket: `https://market.oceanprotocol.com/asset/${did}`,
        explorer: `https://arbiscan.io/address/${dataNftAddress}`,
        provider: CONFIG.PROVIDER_URL
      },
      pricing: {
        token: 'OCEAN',
        amount: CONFIG.PRICE_OCEAN,
        tiers: {
          basic: { price: 50, queries: 1000 },
          pro: { price: 500, queries: 15000 },
          whale: { price: 5000, queries: 200000 }
        }
      }
    };

    const infoPath = path.join(__dirname, '..', '..', 'logs', 'ocean_deployment.json');
    fs.writeFileSync(infoPath, JSON.stringify(deploymentInfo, null, 2));

    logger.log('SUCCESS', '🎉 Deployment complete!');
    logger.log('INFO', '🌊 Ocean Market URL:');
    console.log(`   ${deploymentInfo.urls.oceanMarket}`);
    
    // Summary
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    🎉 DEPLOYMENT SUCCESS                      ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  🏷️  Data NFT:    ${dataNftAddress.substring(0, 20).padEnd(38)} ║`);
    console.log(`║  🪙 Datatoken:    ${datatokenAddress.substring(0, 20).padEnd(38)} ║`);
    console.log(`║  💱 Exchange:     ${exchangeId.substring(0, 20).padEnd(38)} ║`);
    console.log(`║  🆔 DID:          ${did.substring(0, 20).padEnd(38)} ║`);
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  🌊 Market:        https://market.oceanprotocol.com/asset/... ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    logger.save();
    return deploymentInfo;

  } catch (error) {
    logger.log('ERROR', `❌ Deployment failed: ${error.message}`, error.stack);
    logger.save();
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  deployOceanAsset().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { deployOceanAsset, CONFIG, OCEAN_ADDRESSES };
