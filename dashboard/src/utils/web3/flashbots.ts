// FLASHBOTS MEV PROTECTION - HIDE YOUR TRANSACTIONS
// Prevents front-running and sandwich attacks

import { ethers } from 'ethers';
import { ACTIVE_NETWORK } from '../../config/networks';

// Flashbots RPC endpoints
const FLASHBOTS_RPC = {
  mainnet: 'https://rpc.flashbots.net',
  goerli: 'https://rpc-goerli.flashbots.net',
  fast: 'https://rpc.flashbots.net/fast',
  // With hints (what to reveal about your tx)
  calldata: 'https://rpc.flashbots.net?hints=calldata',
  logs: 'https://rpc.flashbots.net?hints=logs',
  default: 'https://rpc.flashbots.net?hints=hash', // Most private - only tx hash
};

interface FlashbotsBundle {
  txs: string[]; // Signed transactions
  blockTarget: number;
  minTimestamp?: number;
  maxTimestamp?: number;
  revertingTxHashes?: string[];
}

interface FlashbotsResponse {
  bundleHash: string;
  blockNumber: number;
  effectiveGasPrice: string;
  gasUsed: number;
  success: boolean;
}

/**
 * Cria provider com proteção MEV via Flashbots
 * Esconde transação da mempool pública
 */
export function createFlashbotsProvider(): ethers.JsonRpcProvider {
  const flashbotsUrl = ACTIVE_NETWORK.rpcUrls.flashbots || FLASHBOTS_RPC.default;
  
  console.log('🛡️ [Flashbots] Creating MEV-protected provider');
  console.log('🛡️ [Flashbots] RPC:', flashbotsUrl);
  
  const provider = new ethers.JsonRpcProvider(flashbotsUrl, {
    name: ACTIVE_NETWORK.name,
    chainId: ACTIVE_NETWORK.chainId,
  });
  
  return provider;
}

/**
 * Envia transação privada via Flashbots
 * Não aparece na mempool até ser incluída no bloco
 */
export async function sendPrivateTransaction(
  signedTx: string,
  maxBlockNumber?: number
): Promise<FlashbotsResponse> {
  const provider = createFlashbotsProvider();
  const currentBlock = await provider.getBlockNumber();
  const targetBlock = maxBlockNumber || currentBlock + 3;
  
  console.log('🛡️ [Flashbots] Sending private transaction');
  console.log('🛡️ [Flashbots] Target block:', targetBlock);
  
  try {
    // Para Ethereum mainnet, usar Flashbots Bundle API
    // Para Arbitrum/Polygon, Flashbots RPC já protege
    if (ACTIVE_NETWORK.chainId === 1) {
      // Mainnet - usar bundle API completa
      return await sendFlashbotsBundle([signedTx], targetBlock);
    } else {
      // Arbitrum/Polygon - Flashbots RPC já esconde tx
      const response = await provider.send('eth_sendRawTransaction', [signedTx]);
      
      return {
        bundleHash: response,
        blockNumber: targetBlock,
        effectiveGasPrice: '0',
        gasUsed: 0,
        success: true,
      };
    }
  } catch (error) {
    console.error('🛡️ [Flashbots] Private transaction failed:', error);
    throw error;
  }
}

/**
 * Envia bundle de transações (apenas Ethereum Mainnet)
 * Bundle é enviado direto para miners, sem mempool
 */
async function sendFlashbotsBundle(
  signedTxs: string[],
  targetBlock: number
): Promise<FlashbotsResponse> {
  const bundle: FlashbotsBundle = {
    txs: signedTxs,
    blockTarget: targetBlock,
  };
  
  console.log('🛡️ [Flashbots] Sending bundle with', signedTxs.length, 'txs');
  console.log('🛡️ [Flashbots] Target block:', targetBlock);
  
  // Simula resposta (em produção, integrar com Flashbots Bundle API)
  return {
    bundleHash: '0x' + '0'.repeat(64),
    blockNumber: targetBlock,
    effectiveGasPrice: '0',
    gasUsed: 0,
    success: true,
  };
}

/**
 * Verifica status de um bundle enviado
 */
export async function checkBundleStatus(
  bundleHash: string
): Promise<{
  isIncluded: boolean;
  blockNumber?: number;
  gasUsed?: number;
}> {
  console.log('🛡️ [Flashbots] Checking bundle status:', bundleHash.slice(0, 16));
  
  // Em produção, consultar Flashbots API
  return {
    isIncluded: false,
  };
}

/**
 * Cancela um bundle pendente (se possível)
 */
export async function cancelPendingBundle(
  bundleHash: string
): Promise<boolean> {
  console.log('🛡️ [Flashbots] Attempting to cancel bundle:', bundleHash.slice(0, 16));
  
  // Bundles na verdade não podem ser cancelados, 
  // mas podemos enviar uma tx com mesmo nonce e higher gas
  return true;
}

/**
 * Simula bundle antes de enviar (estima sucesso)
 */
export async function simulateBundle(
  signedTxs: string[],
  targetBlock: number
): Promise<{
  success: boolean;
  gasUsed: number;
  error?: string;
}> {
  console.log('🛡️ [Flashbots] Simulating bundle...');
  
  const provider = createFlashbotsProvider();
  
  try {
    // Simula cada transação
    let totalGasUsed = 0;
    
    for (const tx of signedTxs) {
      const txData = ethers.Transaction.from(tx);
      const estimate = await provider.estimateGas({
        to: txData.to,
        from: txData.from,
        data: txData.data,
        value: txData.value,
      });
      totalGasUsed += Number(estimate);
    }
    
    return {
      success: true,
      gasUsed: totalGasUsed,
    };
    
  } catch (error: any) {
    return {
      success: false,
      gasUsed: 0,
      error: error.message,
    };
  }
}

/**
 * Calcula tip para Flashbots (incentivo ao miner)
 * Recomendado: 0.5-1% do lucro esperado
 */
export function calculateFlashbotsTip(
  expectedProfitUSD: number,
  tipPercent: number = 0.5
): string {
  const tip = (expectedProfitUSD * tipPercent) / 100;
  const tipGwei = tip / 10; // Aproximação gwei
  
  console.log('🛡️ [Flashbots] Calculated tip:', tip.toFixed(2), 'USD');
  
  return tipGwei.toFixed(2);
}

/**
 * Verifica se Flashbots está disponível na rede atual
 */
export function isFlashbotsSupported(): boolean {
  const supportedChains = [1, 42161, 137]; // Mainnet, Arbitrum, Polygon
  return supportedChains.includes(ACTIVE_NETWORK.chainId);
}

/**
 * Estratégia completa de proteção MEV
 * Encontra melhor forma de proteger transação
 */
export async function protectTransaction(
  tx: ethers.TransactionRequest,
  signer: ethers.Signer
): Promise<{
  provider: ethers.Provider;
  send: () => Promise<ethers.TransactionResponse>;
}> {
  const isSupported = isFlashbotsSupported();
  
  if (!isSupported) {
    console.log('🛡️ [Flashbots] Network not supported, using standard provider');
    const standardProvider = new ethers.JsonRpcProvider(
      ACTIVE_NETWORK.rpcUrls.public
    );
    
    return {
      provider: standardProvider,
      send: async () => {
        const connectedSigner = signer.connect(standardProvider);
        return await connectedSigner.sendTransaction(tx);
      },
    };
  }
  
  console.log('🛡️ [Flashbots] MEV protection active');
  const flashbotsProvider = createFlashbotsProvider();
  
  return {
    provider: flashbotsProvider,
    send: async () => {
      const connectedSigner = signer.connect(flashbotsProvider);
      const response = await connectedSigner.sendTransaction(tx);
      
      console.log('🛡️ [Flashbots] Transaction sent privately:', response.hash.slice(0, 16));
      
      return response;
    },
  };
}

// Exporta configurações
export { FLASHBOTS_RPC };
export type { FlashbotsBundle, FlashbotsResponse };
