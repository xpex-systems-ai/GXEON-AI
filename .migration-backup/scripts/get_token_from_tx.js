/**
 * Get Token Contract from Transaction Hash
 * Identify which token contract received the credit in transaction
 */

const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  console.log('🔍 TOKEN VISIBILITY ENFORCEMENT');
  console.log('═══════════════════════════════════════════════════');
  
  const TX_HASH = '0x71139ec3144850f5e6deef3c532b4d80aa8d5b2a325fc5e3ccb7fdc652ad218d';
  const WALLET = '0x3955d559055DadB7067054cB6E6f974710345224';
  const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  
  console.log('🎯 Transaction Hash:', TX_HASH);
  console.log('👤 Wallet:', WALLET);
  console.log('⚡ Network: Arbitrum One');
  console.log('');
  
  // Connect to Arbitrum
  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC_URL);
  
  try {
    // Get transaction receipt
    console.log('📡 Fetching transaction receipt...');
    const receipt = await provider.getTransactionReceipt(TX_HASH);
    
    if (!receipt) {
      console.log('❌ Transaction not found or not yet mined');
      process.exit(1);
    }
    
    console.log('✅ Transaction found');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Status:', receipt.status === 1 ? 'Success' : 'Failed');
    console.log('');
    
    // Parse logs to find token transfers
    console.log('🔍 Parsing transaction logs for token transfers...');
    
    const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'; // Transfer(address,address,uint256)
    
    let tokenContract = null;
    let tokenSymbol = null;
    let tokenDecimals = null;
    let transferAmount = null;
    
    for (const log of receipt.logs) {
      // Check if it's a Transfer event
      if (log.topics[0] === ERC20_TRANSFER_TOPIC) {
        tokenContract = log.address;
        
        // Parse the transfer
        // topics[1] = from (indexed)
        // topics[2] = to (indexed)
        // data = amount (uint256)
        
        const from = '0x' + log.topics[1].slice(26);
        const to = '0x' + log.topics[2].slice(26);
        const amount = ethers.BigNumber.from(log.data);
        
        // Check if transfer is to our wallet
        if (to.toLowerCase() === WALLET.toLowerCase()) {
          transferAmount = amount;
          
          // Get token details
          const tokenContractObj = new ethers.Contract(
            tokenContract,
            ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
            provider
          );
          
          try {
            tokenSymbol = await tokenContractObj.symbol();
            tokenDecimals = await tokenContractObj.decimals();
          } catch (error) {
            tokenSymbol = 'UNKNOWN';
            tokenDecimals = 18;
          }
          
          break;
        }
      }
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    
    if (tokenContract) {
      console.log('✅ TOKEN CONTRACT IDENTIFIED');
      console.log('═══════════════════════════════════════════════════');
      console.log('📋 Token Contract Address:', tokenContract);
      console.log('💎 Token Symbol:', tokenSymbol);
      console.log('🔢 Decimals:', tokenDecimals);
      console.log('💰 Transfer Amount:', ethers.utils.formatUnits(transferAmount, tokenDecimals));
      console.log('');
      console.log('📝 MetaMask Instructions for Comandante:');
      console.log('   1. Open MetaMask');
      console.log('   2. Click "Import Tokens"');
      console.log('   3. Enter Contract Address:', tokenContract);
      console.log('   4. Token Symbol:', tokenSymbol);
      console.log('   5. Decimals:', tokenDecimals);
      console.log('');
      console.log('🔗 Arbiscan TX: https://arbiscan.io/tx/' + TX_HASH);
      console.log('🔗 Arbiscan Token: https://arbiscan.io/token/' + tokenContract);
    } else {
      console.log('⚠️  NO TOKEN TRANSFER FOUND');
      console.log('═══════════════════════════════════════════════════');
      console.log('No ERC20 transfer to wallet found in this transaction.');
      console.log('The transaction may be a native ETH transfer or contract interaction.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('🔗 Arbiscan TX: https://arbiscan.io/tx/' + TX_HASH);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
