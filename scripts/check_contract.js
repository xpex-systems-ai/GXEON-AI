/**
 * Check if address is a deployed contract on Arbitrum
 */

const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  const ADDRESS = '0x3955d559055DadB7067054cB6E6f974710345224';
  const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  
  console.log('🔍 Checking contract on Arbitrum One');
  console.log('=====================================');
  console.log('Address:', ADDRESS);
  console.log('');
  
  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC_URL);
  
  try {
    // Check if address has code (is a contract)
    const code = await provider.getCode(ADDRESS);
    console.log('📝 Contract Code Length:', code.length, 'characters');
    
    if (code === '0x') {
      console.log('❌ This address has NO contract code');
      console.log('   It is an EOA (Externally Owned Account), not a deployed contract');
      console.log('');
      console.log('💡 To deploy GXeonMainnetVault on Arbitrum, run:');
      console.log('   npx hardhat run scripts/deploy_arbitrum.js --network arbitrum');
      process.exit(0);
    }
    
    console.log('✅ Contract code exists');
    console.log('');
    
    // Get transaction count (nonce)
    const nonce = await provider.getTransactionCount(ADDRESS);
    console.log('📊 Transaction Count (Nonce):', nonce);
    console.log('');
    
    // Try to get balance
    const balance = await provider.getBalance(ADDRESS);
    console.log('💰 ETH Balance:', ethers.utils.formatEther(balance), 'ETH');
    console.log('');
    
    // Check token balances
    const USDC = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8';
    const WETH = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
    const AAVE = '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196';
    
    const erc20ABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)', 'function symbol() view returns (string)'];
    
    const usdc = new ethers.Contract(USDC, erc20ABI, provider);
    const usdcBalance = await usdc.balanceOf(ADDRESS);
    const usdcDecimals = await usdc.decimals();
    console.log('💵 USDC Balance:', ethers.utils.formatUnits(usdcBalance, usdcDecimals));
    
    const weth = new ethers.Contract(WETH, erc20ABI, provider);
    const wethBalance = await weth.balanceOf(ADDRESS);
    console.log('💎 WETH Balance:', ethers.utils.formatEther(wethBalance));
    
    const aave = new ethers.Contract(AAVE, erc20ABI, provider);
    const aaveBalance = await aave.balanceOf(ADDRESS);
    const aaveDecimals = await aave.decimals();
    console.log('🏦 AAVE Balance:', ethers.utils.formatUnits(aaveBalance, aaveDecimals));
    console.log('');
    
    // Try to call owner() function
    const vaultABI = ['function owner() external view returns (address)'];
    const vault = new ethers.Contract(ADDRESS, vaultABI, provider);
    
    try {
      const owner = await vault.owner();
      console.log('🔐 Contract Owner:', owner);
    } catch (error) {
      console.log('⚠️  Contract does not have owner() function or call failed');
    }
    
    console.log('');
    console.log('🔗 View on Arbiscan: https://arbiscan.io/address/' + ADDRESS);
    
  } catch (error) {
    console.error('❌ Error checking contract:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
