/**
 * Emergency Asset Tracker - Identify Token Balance
 * Check wallet 0x3955d559055DadB7067054cB6E6f974710345224 on Arbitrum One
 */

const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  console.log('🔍 EMERGENCY ASSET TRACKER');
  console.log('═══════════════════════════════════════════════════');
  
  const WALLET = '0x3955d559055DadB7067054cB6E6f974710345224';
  const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  
  console.log('🎯 Wallet:', WALLET);
  console.log('⚡ Network: Arbitrum One');
  console.log('');
  
  // Connect to Arbitrum
  const provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC_URL);
  
  // Check ETH balance
  const ethBalance = await provider.getBalance(WALLET);
  console.log('💰 ETH Balance:', ethers.utils.formatEther(ethBalance), 'ETH');
  console.log('💰 USD Value (~$3500/ETH): $' + (parseFloat(ethers.utils.formatEther(ethBalance)) * 3500).toFixed(2));
  console.log('');
  
  // Common token addresses on Arbitrum
  const TOKENS = {
    USDC: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7A5da3D93681056889f5eE128F364CCBf',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WBTC: '0x2f2a2543B76A4169547C82791Cf6c4c19c5aF48cc'
  };
  
  const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)'
  ];
  
  console.log('📊 Token Balances:');
  console.log('═══════════════════════════════════════════════════');
  
  let found24_81 = false;
  
  for (const [symbol, address] of Object.entries(TOKENS)) {
    try {
      const token = new ethers.Contract(address, ERC20_ABI, provider);
      const balance = await token.balanceOf(WALLET);
      const decimals = await token.decimals();
      const formatted = ethers.utils.formatUnits(balance, decimals);
      
      if (parseFloat(formatted) > 0) {
        // Estimate USD value (rough estimates)
        let usdValue = 0;
        if (symbol === 'USDC' || symbol === 'USDT') usdValue = parseFloat(formatted);
        else if (symbol === 'WETH' || symbol === 'WBTC') usdValue = parseFloat(formatted) * 3500;
        else if (symbol === 'ARB') usdValue = parseFloat(formatted) * 1.2;
        else if (symbol === 'DAI') usdValue = parseFloat(formatted);
        
        console.log(`✅ ${symbol}: ${formatted} (~$${usdValue.toFixed(2)})`);
        
        // Check if this is the $24.81
        if (Math.abs(usdValue - 24.81) < 1) {
          found24_81 = true;
          console.log(`   🎯 FOUND: $24.81 in ${symbol}!`);
        }
      }
    } catch (error) {
      // Token might not exist or contract error
    }
  }
  
  console.log('');
  console.log('🔗 Arbiscan Link: https://arbiscan.io/address/' + WALLET);
  console.log('');
  
  if (found24_81) {
    console.log('✅ TOKEN IDENTIFIED: The $24.81 was found in one of the checked tokens.');
  } else {
    console.log('⚠️ $24.81 not found in major tokens. Check Arbiscan for recent transactions.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
