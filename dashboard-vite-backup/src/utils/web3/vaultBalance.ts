import { ethers } from 'ethers';

console.log('🔧 [vaultBalance] Module loading...');

// EMERGENCY FALLBACK - Hardcoded for production reliability
const EMERGENCY_RPC_URL = 'https://rpc.gelato.network/v2/sep/rpc/ded794a60b3b486891820911c7f04c12';
const EMERGENCY_VAULT_ADDRESS = '0x3955d559594C506C39710345224976767714C806';

// Try env vars first, fallback to hardcoded
const GELATO_RPC_URL = (import.meta as any).env?.VITE_GELATO_RPC_URL 
  || (import.meta as any).env?.NEXT_PUBLIC_GELATO_RPC_URL 
  || (import.meta as any).env?.VITE_ALCHEMY_RPC_URL
  || EMERGENCY_RPC_URL; // FORCE FALLBACK

const GXEON_VAULT_ADDRESS = (import.meta as any).env?.VITE_GXEON_VAULT_ADDRESS 
  || (import.meta as any).env?.NEXT_PUBLIC_GXEON_VAULT_ADDRESS
  || EMERGENCY_VAULT_ADDRESS; // FORCE FALLBACK

const USDC_CONTRACT_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

console.log('🔧 [vaultBalance] ENV check:', {
  VITE_GXEON_VAULT_ADDRESS: !!(import.meta as any).env?.VITE_GXEON_VAULT_ADDRESS,
  NEXT_PUBLIC_GXEON_VAULT_ADDRESS: !!(import.meta as any).env?.NEXT_PUBLIC_GXEON_VAULT_ADDRESS,
  FINAL_VAULT: GXEON_VAULT_ADDRESS ? 'SET' : 'NOT SET'
});

console.warn('⚠️ [vaultBalance] RPC URL ATIVA:', GELATO_RPC_URL?.substring(0, 50) + '...');
console.warn('⚠️ [vaultBalance] VAULT ADDRESS ATIVO:', GXEON_VAULT_ADDRESS);

const USDC_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

let provider: ethers.JsonRpcProvider | null = null;

export function initializeProvider(): ethers.JsonRpcProvider {
  console.log('🔌 [vaultBalance] initializeProvider called');
  
  // HARDCODED FALLBACK - DNA DO SISTEMA
  const FALLBACK_RPC = 'https://rpc.gelato.network/v2/sep/rpc/ded794a60b3b486891820911c7f04c12';
  const rpcUrl = GELATO_RPC_URL || FALLBACK_RPC;
  console.log('🔌 [vaultBalance] Using RPC:', rpcUrl.substring(0, 50) + '...');
  console.log('🔌 [vaultBalance] Source:', rpcUrl === FALLBACK_RPC ? 'HARDCODED' : 'ENV');
  
  if (!provider) {
    console.log('🔌 [vaultBalance] Creating new JsonRpcProvider...');
    provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log('✅ [vaultBalance] Provider created');
  } else {
    console.log('♻️ [vaultBalance] Reusing existing provider');
  }
  
  return provider;
}

export async function getVaultBalance(): Promise<string> {
  console.log('💰 [vaultBalance] getVaultBalance called');
  const vaultAddress = GXEON_VAULT_ADDRESS;
  
  if (!vaultAddress) {
    console.error('❌ [vaultBalance] VITE_GXEON_VAULT_ADDRESS is not defined');
    throw new Error('VITE_GXEON_VAULT_ADDRESS is not defined');
  }
  
  console.log('🔍 [vaultBalance] Vault address:', vaultAddress.substring(0, 15) + '...');
  console.log('🔍 [vaultBalance] USDC contract:', USDC_CONTRACT_ADDRESS);
  
  const provider = initializeProvider();
  const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, provider);
  
  try {
    console.log('⏳ [vaultBalance] Fetching balance and decimals...');
    const [balance, decimals] = await Promise.all([
      usdcContract.balanceOf(vaultAddress),
      usdcContract.decimals()
    ]);
    
    console.log(`✅ [vaultBalance] Raw balance: ${balance.toString()}, decimals: ${decimals}`);
    const formattedBalance = ethers.formatUnits(balance, decimals);
    console.log(`💰 [vaultBalance] Formatted balance: ${formattedBalance} USDC`);
    
    return formattedBalance;
  } catch (error) {
    console.error('❌ [vaultBalance] Failed to fetch vault balance:', error);
    throw new Error('Unable to retrieve USDC balance from vault');
  }
}

export async function getVaultBalanceRaw(): Promise<bigint> {
  const vaultAddress = GXEON_VAULT_ADDRESS;
  
  if (!vaultAddress) {
    throw new Error('VITE_GXEON_VAULT_ADDRESS is not defined');
  }
  
  const provider = initializeProvider();
  const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, provider);
  
  try {
    const balance = await usdcContract.balanceOf(vaultAddress);
    return balance;
  } catch (error) {
    console.error('Failed to fetch vault balance:', error);
    throw new Error('Unable to retrieve USDC balance from vault');
  }
}

export function getVaultAddress(): string | undefined {
  return GXEON_VAULT_ADDRESS;
}

export function getProvider(): ethers.JsonRpcProvider {
  return initializeProvider();
}
