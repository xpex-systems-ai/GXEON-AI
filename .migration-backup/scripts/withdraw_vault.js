/**
 * Withdrawal Script: GXeonMainnetVault Total Profit Extraction
 * Target Network: Arbitrum One (Chain ID: 42161)
 * Recipient: 0x3955d559055DadB7067054cB6E6f974710345224
 * 
 * Uses ethers v6 directly (not hardhat wrapper) for consistent API
 */

const { ethers } = require('ethers');
require('dotenv').config();

async function main() {
  console.log('🚀 GXeon Vault Withdrawal - Arbitrum One');
  console.log('==========================================');
  
  // Configuration
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  const VAULT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x3955d559055DadB7067054cB6E6f974710345224';
  const RECIPIENT = '0x3955d559055DadB7067054cB6E6f974710345224';
  
  // Arbitrum Token Addresses
  const USDC = '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8';
  const WETH = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
  const AAVE = '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196';
  
  if (!PRIVATE_KEY) {
    console.error('❌ Error: PRIVATE_KEY not set in .env');
    process.exit(1);
  }
  
  console.log('   Vault:', VAULT_ADDRESS);
  console.log('   Recipient:', RECIPIENT);
  console.log('   RPC:', ARBITRUM_RPC_URL);
  console.log('');
  
  // Connect to Arbitrum — ethers v6 API
  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('👤 Deployer:', wallet.address);
  console.log('💰 Balance:', ethers.formatEther(await provider.getBalance(wallet.address)), 'ETH');
  console.log('');
  
  // Get contract ABI (minimal for emergencyWithdraw)
  const vaultABI = [
    'function emergencyWithdraw(address token, uint256 amount, address recipient) external',
    'function getVaultBalance() external view returns (uint256)',
    'function owner() external view returns (address)',
    'function balanceOf(address) external view returns (uint256)'
  ];
  
  const vault = new ethers.Contract(VAULT_ADDRESS, vaultABI, wallet);
  
  // Check if wallet is owner
  try {
    const owner = await vault.owner();
    console.log('🔐 Vault Owner:', owner);
    console.log('👤 Your Address:', wallet.address);
    
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      console.error('❌ Error: You are not the owner of this vault!');
      console.error('   Only the owner can execute emergencyWithdraw');
      process.exit(1);
    }
    console.log('✅ Owner verified');
    console.log('');
  } catch (error) {
    console.warn('⚠️  Could not verify owner (contract may not have owner() function)');
    console.log('');
  }
  
  // ERC20 ABI for balance checks
  const erc20ABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'];
  
  console.log('💰 Checking Vault Balances...');
  try {
    const usdc = new ethers.Contract(USDC, erc20ABI, provider);
    const usdcBalance = await usdc.balanceOf(VAULT_ADDRESS);
    const usdcDecimals = await usdc.decimals();
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    
    console.log('   USDC:', usdcFormatted);
    
    const weth = new ethers.Contract(WETH, erc20ABI, provider);
    const wethBalance = await weth.balanceOf(VAULT_ADDRESS);
    const wethFormatted = ethers.formatEther(wethBalance);
    
    console.log('   WETH:', wethFormatted);
    
    const aave = new ethers.Contract(AAVE, erc20ABI, provider);
    const aaveBalance = await aave.balanceOf(VAULT_ADDRESS);
    const aaveDecimals = await aave.decimals();
    const aaveFormatted = ethers.formatUnits(aaveBalance, aaveDecimals);
    
    console.log('   AAVE:', aaveFormatted);
    console.log('');
    
    if (usdcBalance === 0n && wethBalance === 0n && aaveBalance === 0n) {
      console.error('❌ Error: Vault has no balance to withdraw');
      process.exit(1);
    }
    
    // Execute withdrawals
    console.log('🚀 Executing Withdrawals...');
    console.log('');
    
    const txHashes = [];
    
    // Withdraw USDC
    if (usdcBalance > 0n) {
      console.log('📤 Withdrawing USDC...');
      const usdcTx = await vault.emergencyWithdraw(USDC, usdcBalance, RECIPIENT);
      console.log('   TX Hash:', usdcTx.hash);
      txHashes.push({ token: 'USDC', hash: usdcTx.hash });
      await usdcTx.wait();
      console.log('   ✅ USDC Withdrawn');
      console.log('');
    }
    
    // Withdraw WETH
    if (wethBalance > 0n) {
      console.log('📤 Withdrawing WETH...');
      const wethTx = await vault.emergencyWithdraw(WETH, wethBalance, RECIPIENT);
      console.log('   TX Hash:', wethTx.hash);
      txHashes.push({ token: 'WETH', hash: wethTx.hash });
      await wethTx.wait();
      console.log('   ✅ WETH Withdrawn');
      console.log('');
    }
    
    // Withdraw AAVE
    if (aaveBalance > 0n) {
      console.log('📤 Withdrawing AAVE...');
      const aaveTx = await vault.emergencyWithdraw(AAVE, aaveBalance, RECIPIENT);
      console.log('   TX Hash:', aaveTx.hash);
      txHashes.push({ token: 'AAVE', hash: aaveTx.hash });
      await aaveTx.wait();
      console.log('   ✅ AAVE Withdrawn');
      console.log('');
    }
    
    console.log('🎉 WITHDRAWAL COMPLETE!');
    console.log('=========================');
    console.log('');
    console.log('📋 Transaction Hashes:');
    txHashes.forEach(({ token, hash }) => {
      console.log(`   ${token}: https://arbiscan.io/tx/${hash}`);
    });
    console.log('');
    console.log('💸 Recipient:', RECIPIENT);
    console.log('');
    
  } catch (error) {
    console.error('❌ Withdrawal failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
