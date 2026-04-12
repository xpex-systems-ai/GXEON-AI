import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI, NETWORK_CONFIG } from '../config/contract';

interface Web3State {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  balance: string;
  contractBalance: string;
  isConnected: boolean;
  isCorrectNetwork: boolean;
}

interface UseWeb3Return extends Web3State {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
  getContract: () => ethers.Contract | null;
}

export function useWeb3(): UseWeb3Return {
  const [state, setState] = useState<Web3State>({
    provider: null,
    signer: null,
    account: null,
    chainId: null,
    balance: '0',
    contractBalance: '0',
    isConnected: false,
    isCorrectNetwork: false,
  });

  // Get contract instance
  const getContract = useCallback(() => {
    if (!state.signer) return null;
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, state.signer);
  }, [state.signer]);

  // Fetch balances
  const fetchBalances = useCallback(async (provider: ethers.BrowserProvider, account: string) => {
    try {
      // Get ETH balance
      const balance = await provider.getBalance(account);
      const ethBalance = ethers.formatEther(balance);

      // Get contract balance for this user
      let contractBal = '0';
      try {
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          provider
        );
        // Convert account address to bytes32 for userId
        const userId = '0x' + account.slice(2).padEnd(64, '0');
        const bal = await contract.getBalance(userId);
        contractBal = ethers.formatEther(bal);
      } catch (e) {
        console.log('Contract balance fetch failed:', e);
      }

      setState(prev => ({
        ...prev,
        balance: ethBalance,
        contractBalance: contractBal,
      }));
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    }
  }, []);

  // Connect wallet
  const connect = useCallback(async () => {
    console.log('🔌 [useWeb3] Attempting connection...');
    console.log('🔌 [useWeb3] window.ethereum exists:', !!window.ethereum);
    
    if (!window.ethereum) {
      console.error('❌ [useWeb3] MetaMask not found');
      alert('Please install MetaMask to use this feature');
      return;
    }

    try {
      console.log('🔌 [useWeb3] Creating BrowserProvider...');
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Request account access
      console.log('🔌 [useWeb3] Calling eth_requestAccounts...');
      await provider.send('eth_requestAccounts', []);
      
      console.log('🔌 [useWeb3] Getting signer...');
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      console.log('✅ [useWeb3] Connected to account:', account);
      
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      console.log('🔌 [useWeb3] Network chainId:', chainId);

      const isCorrectNetwork = chainId === NETWORK_CONFIG.chainId;

      setState({
        provider,
        signer,
        account,
        chainId,
        balance: '0',
        contractBalance: '0',
        isConnected: true,
        isCorrectNetwork,
      });

      // Fetch balances
      await fetchBalances(provider, account);

      // Set up event listeners
      window.ethereum.on('accountsChanged', async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setState({
            provider: null,
            signer: null,
            account: null,
            chainId: null,
            balance: '0',
            contractBalance: '0',
            isConnected: false,
            isCorrectNetwork: false,
          });
        } else {
          // Account changed - reconnect
          await connect();
        }
      });

      window.ethereum.on('chainChanged', async () => {
        // Chain changed - reload and reconnect
        window.location.reload();
      });

    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  }, [fetchBalances]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }

    setState({
      provider: null,
      signer: null,
      account: null,
      chainId: null,
      balance: '0',
      contractBalance: '0',
      isConnected: false,
      isCorrectNetwork: false,
    });
  }, []);

  // Switch to correct network
  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + NETWORK_CONFIG.chainId.toString(16) }],
      });
    } catch (switchError: any) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x' + NETWORK_CONFIG.chainId.toString(16),
                chainName: NETWORK_CONFIG.name,
                rpcUrls: [NETWORK_CONFIG.rpcUrl],
                blockExplorerUrls: [NETWORK_CONFIG.explorerUrl],
                nativeCurrency: {
                  name: 'SepoliaETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add network:', addError);
        }
      }
    }
  }, []);

  // Auto-connect on mount if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        try {
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            await connect();
          }
        } catch (e) {
          console.log('No previous connection');
        }
      }
    };

    autoConnect();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, [connect]);

  // Manual refresh trigger when account changes with delay for provider stabilization
  useEffect(() => {
    if (state.account && state.provider) {
      const timer = setTimeout(() => {
        console.log('🔄 [useWeb3] Account detected, fetching balances...');
        fetchBalances(state.provider!, state.account!);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [state.account, state.provider, fetchBalances]);

  return {
    ...state,
    connect,
    disconnect,
    switchNetwork,
    getContract,
  };
}
