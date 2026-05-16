// GXEON Onchain Executor
// Executa transações reais em blockchain para completar tasks

const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

function packageInstalled(name) {
  return fs.existsSync(path.join(process.cwd(), 'node_modules', name, 'package.json')) ||
    fs.existsSync(path.join(process.cwd(), 'server', 'node_modules', name, 'package.json'));
}

const serverRequire = createRequire(path.resolve(__dirname, '../server/index.js'));
const ethers = packageInstalled('ethers')
  ? (fs.existsSync(path.join(process.cwd(), 'node_modules', 'ethers', 'package.json')) ? require('ethers') : serverRequire('ethers'))
  : null;

function assertEthersReady() {
  if (!ethers) throw new Error('ETHERS_UNAVAILABLE: install ethers to enable on-chain execution');
}

class OnchainExecutor {
  constructor(config = {}) {
    this.config = {
      maxAmountPerTx: config.maxAmountPerTx || 0.001,
      requireBalanceCheck: config.requireBalanceCheck !== false,
      failOnError: config.failOnError !== false,
      ...config
    };
    
    this.wallets = new Map(); // chain -> wallet
    this.providers = new Map(); // chain -> provider
    
    // Initialize networks
    this.networks = {
      ethereum_sepolia: {
        name: 'Ethereum Sepolia',
        rpc: config.networks?.ethereum_sepolia?.rpc || 'https://rpc.sepolia.org',
        chainId: 11155111,
        symbol: 'ETH'
      },
      polygon_mumbai: {
        name: 'Polygon Mumbai',
        rpc: config.networks?.polygon_mumbai?.rpc || 'https://rpc-mumbai.maticvigil.com',
        chainId: 80001,
        symbol: 'MATIC'
      },
      worldchain_sepolia: {
        name: 'World Chain Sepolia',
        rpc: config.networks?.worldchain_sepolia?.rpc || process.env.WORLDCHAIN_RPC_URL || 'https://worldchain-sepolia.g.alchemy.com/public',
        chainId: 4801,
        symbol: 'ETH'
      }
    };
    
    // Load wallet from env
    this.privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!this.privateKey) {
      console.warn('[OnchainExecutor] WALLET_PRIVATE_KEY not found in environment');
    }
  }
  
  // ==================== WALLET MANAGEMENT ====================
  
  async initializeWallet(networkKey) {
    assertEthersReady();
    if (!this.privateKey) {
      throw new Error('WALLET_PRIVATE_KEY not configured');
    }
    
    const network = this.networks[networkKey];
    if (!network) {
      throw new Error(`Unknown network: ${networkKey}`);
    }
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(network.rpc);
    this.providers.set(networkKey, provider);
    
    // Create wallet
    const wallet = new ethers.Wallet(this.privateKey, provider);
    this.wallets.set(networkKey, wallet);
    
    // Verify connection
    const networkInfo = await provider.getNetwork();
    if (networkInfo.chainId !== BigInt(network.chainId)) {
      throw new Error(`Chain ID mismatch: expected ${network.chainId}, got ${networkInfo.chainId}`);
    }
    
    console.log(`[OnchainExecutor] Wallet initialized on ${network.name}`);
    console.log(`  Address: ${wallet.address}`);
    
    return wallet;
  }
  
  async getWallet(networkKey) {
    if (!this.wallets.has(networkKey)) {
      await this.initializeWallet(networkKey);
    }
    return this.wallets.get(networkKey);
  }
  
  async getProvider(networkKey) {
    if (!this.providers.has(networkKey)) {
      await this.initializeWallet(networkKey);
    }
    return this.providers.get(networkKey);
  }
  
  // ==================== BALANCE & SAFETY CHECKS ====================
  
  async checkBalance(networkKey, minBalance = null) {
    const wallet = await this.getWallet(networkKey);
    const provider = await this.getProvider(networkKey);
    
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = parseFloat(ethers.formatEther(balance));
    
    console.log(`[OnchainExecutor] Balance on ${networkKey}: ${balanceEth} ETH`);
    
    if (minBalance !== null && balanceEth < minBalance) {
      throw new Error(`Insufficient balance: ${balanceEth} < ${minBalance}`);
    }
    
    return {
      balance: balance,
      balanceEth: balanceEth,
      sufficient: minBalance === null || balanceEth >= minBalance
    };
  }
  
  async validateAmount(amount, networkKey) {
    // Convert to number if string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // Check max amount per tx
    if (numAmount > this.config.maxAmountPerTx) {
      throw new Error(`Amount ${numAmount} exceeds max ${this.config.maxAmountPerTx}`);
    }
    
    // Check balance if required
    if (this.config.requireBalanceCheck) {
      const balanceCheck = await this.checkBalance(networkKey, numAmount * 1.5); // 1.5x for gas
      if (!balanceCheck.sufficient) {
        throw new Error(`Insufficient balance for transaction`);
      }
    }
    
    return true;
  }
  
  // ==================== ACTIONS ====================
  
  async executeTransfer(networkKey, toAddress, amount, options = {}) {
    console.log(`[OnchainExecutor] Executing transfer on ${networkKey}`);
    console.log(`  To: ${toAddress}`);
    console.log(`  Amount: ${amount} ETH`);
    
    try {
      // Safety checks
      await this.validateAmount(amount, networkKey);
      
      const wallet = await this.getWallet(networkKey);
      const provider = await this.getProvider(networkKey);
      
      // Get fee data
      const feeData = await provider.getFeeData();
      
      // Build transaction
      const value = ethers.parseEther(amount.toString());
      
      const txRequest = {
        to: toAddress,
        value: value,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      };
      
      // Estimate gas
      const gasEstimate = await provider.estimateGas(txRequest);
      txRequest.gasLimit = gasEstimate;
      
      console.log(`  Gas estimate: ${gasEstimate.toString()}`);
      
      // Send transaction
      const tx = await wallet.sendTransaction(txRequest);
      
      console.log(`  Transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      console.log(`  Confirmed in block: ${receipt.blockNumber}`);
      
      // Generate proof
      return this.generateProof(receipt, networkKey, 'transfer');
      
    } catch (error) {
      console.error(`[OnchainExecutor] Transfer failed:`, error.message);
      if (this.config.failOnError) {
        throw error;
      }
      return {
        success: false,
        error: error.message,
        action: 'transfer',
        network: networkKey
      };
    }
  }
  
  async executeContractCall(networkKey, contractAddress, abi, method, args = [], options = {}) {
    console.log(`[OnchainExecutor] Executing contract call on ${networkKey}`);
    console.log(`  Contract: ${contractAddress}`);
    console.log(`  Method: ${method}`);
    console.log(`  Args: ${JSON.stringify(args)}`);
    
    try {
      const wallet = await this.getWallet(networkKey);
      
      // Create contract instance
      const contract = new ethers.Contract(contractAddress, abi, wallet);
      
      // Check if method exists
      if (!contract[method]) {
        throw new Error(`Method ${method} not found in contract`);
      }
      
      // Estimate gas if value is being sent
      let txOptions = {};
      if (options.value) {
        const value = ethers.parseEther(options.value.toString());
        txOptions.value = value;
        
        // Validate amount
        await this.validateAmount(options.value, networkKey);
      }
      
      // Execute contract call
      const tx = await contract[method](...args, txOptions);
      
      console.log(`  Transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      console.log(`  Confirmed in block: ${receipt.blockNumber}`);
      
      // Generate proof
      return this.generateProof(receipt, networkKey, 'contract_call', {
        contractAddress,
        method,
        args
      });
      
    } catch (error) {
      console.error(`[OnchainExecutor] Contract call failed:`, error.message);
      if (this.config.failOnError) {
        throw error;
      }
      return {
        success: false,
        error: error.message,
        action: 'contract_call',
        network: networkKey,
        contractAddress,
        method
      };
    }
  }
  
  // ==================== PROOF GENERATION ====================
  
  generateProof(receipt, networkKey, actionType, extraData = {}) {
    const network = this.networks[networkKey];
    
    const proof = {
      success: true,
      action: actionType,
      network: networkKey,
      network_name: network.name,
      tx_hash: receipt.hash,
      block_number: receipt.blockNumber,
      gas_used: receipt.gasUsed.toString(),
      gas_price: receipt.gasPrice ? receipt.gasPrice.toString() : null,
      status: receipt.status === 1 ? 'success' : 'failed',
      from: receipt.from,
      to: receipt.to,
      contract_address: receipt.contractAddress || null,
      timestamp: new Date().toISOString(),
      ...extraData
    };
    
    console.log(`[OnchainExecutor] Proof generated:`);
    console.log(`  TX Hash: ${proof.tx_hash}`);
    console.log(`  Block: ${proof.block_number}`);
    console.log(`  Gas Used: ${proof.gas_used}`);
    console.log(`  Status: ${proof.status}`);
    
    return proof;
  }
  
  // ==================== TASK EXECUTION ====================
  
  async executeTaskStep(step, task) {
    console.log(`[OnchainExecutor] Executing step: ${step.action}`);
    
    const networkKey = step.payload?.network || task.chain || 'ethereum_sepolia';
    
    switch (step.action) {
      case 'transfer':
      case 'send_eth':
        return await this.executeTransfer(
          networkKey,
          step.payload.to_address || step.payload.to || task.wallet_required,
          step.payload.amount || '0.0001'
        );
        
      case 'contract_call':
      case 'mint':
      case 'claim':
        return await this.executeContractCall(
          networkKey,
          step.payload.contract_address || step.payload.contract,
          step.payload.abi || [],
          step.payload.method || 'mint',
          step.payload.args || [],
          { value: step.payload.value }
        );
        
      case 'swap':
        // Simplified swap (would need DEX integration)
        console.log('[OnchainExecutor] Swap action requires DEX integration');
        return {
          success: false,
          error: 'Swap not implemented - requires DEX integration',
          action: 'swap'
        };
        
      case 'bridge':
        console.log('[OnchainExecutor] Bridge action requires bridge integration');
        return {
          success: false,
          error: 'Bridge not implemented - requires bridge integration',
          action: 'bridge'
        };
        
      default:
        throw new Error(`Unknown action: ${step.action}`);
    }
  }
  
  // ==================== UTILITY ====================
  
  async getNetworkStatus(networkKey) {
    try {
      const provider = await this.getProvider(networkKey);
      const blockNumber = await provider.getBlockNumber();
      const wallet = await this.getWallet(networkKey);
      const balance = await provider.getBalance(wallet.address);
      
      return {
        connected: true,
        network: networkKey,
        block_number: blockNumber,
        wallet_address: wallet.address,
        balance: ethers.formatEther(balance),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        connected: false,
        network: networkKey,
        error: error.message
      };
    }
  }
}

module.exports = { OnchainExecutor };

// Standalone test
if (require.main === module) {
  async function test() {
    const executor = new OnchainExecutor({
      maxAmountPerTx: 0.001,
      requireBalanceCheck: true,
      failOnError: true
    });
    
    console.log('=== Onchain Executor Test ===\n');
    
    // Test network status
    console.log('Testing Sepolia connection...');
    const status = await executor.getNetworkStatus('ethereum_sepolia');
    console.log('Status:', status);
    
    // Uncomment to test actual transfer (requires funds)
    /*
    console.log('\nTesting transfer...');
    const result = await executor.executeTransfer(
      'ethereum_sepolia',
      '0xYOUR_WALLET_ADDRESS', // Self-transfer
      '0.00001'
    );
    console.log('Transfer result:', result);
    */
  }
  
  test().catch(console.error);
}
