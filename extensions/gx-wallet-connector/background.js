// GX Wallet Connector - Background Script
// Manages Web3 wallet connections and agent payments

const API_BASE = 'https://your-gxeon-backend.com';
const FETCH_TIMEOUT = 15000;

// Wallet state
const walletState = {
  address: null,
  chainId: null,
  isConnected: false,
  balance: 0,
  pendingPayments: []
};

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('[GX Wallet] Extension installed');
  loadWalletData();
});

// Load stored wallet data
async function loadWalletData() {
  const stored = await chrome.storage.local.get(['walletAddr', 'chainId', 'balance']);
  
  if (stored.walletAddr) {
    walletState.address = stored.walletAddr;
    walletState.chainId = stored.chainId || 1;
    walletState.isConnected = true;
    walletState.balance = stored.balance || 0;
    
    console.log('[GX Wallet] Loaded:', walletState);
  }
}

// Connect wallet
async function connectWallet(address, chainId = 1) {
  walletState.address = address;
  walletState.chainId = chainId;
  walletState.isConnected = true;
  
  // Store in chrome storage
  await chrome.storage.local.set({
    walletAddr: address,
    chainId: chainId
  });
  
  // Notify other extensions
  chrome.runtime.sendMessage({
    action: 'walletConnected',
    wallet: walletState
  });
  
  console.log('[GX Wallet] Connected:', address);
  
  // Update backend
  await updateBackendWallet();
  
  return { success: true, address };
}

// Disconnect wallet
async function disconnectWallet() {
  walletState.address = null;
  walletState.chainId = null;
  walletState.isConnected = false;
  walletState.balance = 0;
  
  await chrome.storage.local.remove(['walletAddr', 'chainId', 'balance']);
  
  console.log('[GX Wallet] Disconnected');
  
  return { success: true };
}

// Update backend with wallet info
async function updateBackendWallet() {
  try {
    await fetch(`${API_BASE}/api/wallet/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: walletState.address,
        chainId: walletState.chainId
      }),
      timeout: FETCH_TIMEOUT
    });
  } catch (err) {
    console.error('[GX Wallet] Backend update failed:', err);
  }
}

// Register payment for completed task
async function registerPayment(taskId, amount, currency = 'ETH') {
  if (!walletState.isConnected) {
    console.error('[GX Wallet] Cannot register payment - wallet not connected');
    return { error: 'Wallet not connected' };
  }
  
  try {
    const response = await fetch(`${API_BASE}/api/payments/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: walletState.address,
        taskId,
        amount,
        currency,
        timestamp: Date.now()
      }),
      timeout: FETCH_TIMEOUT
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // Add to pending payments
      walletState.pendingPayments.push({
        id: data.paymentId,
        taskId,
        amount,
        currency,
        status: 'pending'
      });
      
      console.log('[GX Wallet] Payment registered:', data.paymentId);
      return { success: true, paymentId: data.paymentId };
    }
  } catch (err) {
    console.error('[GX Wallet] Payment registration failed:', err);
    return { error: err.message };
  }
}

// Fetch wallet balance from backend
async function fetchBalance() {
  if (!walletState.isConnected) return { error: 'Wallet not connected' };
  
  try {
    const response = await fetch(`${API_BASE}/api/wallet/balance?address=${walletState.address}`, {
      timeout: FETCH_TIMEOUT
    });
    
    if (response.ok) {
      const data = await response.json();
      walletState.balance = data.balance || 0;
      
      await chrome.storage.local.set({ balance: walletState.balance });
      
      return { success: true, balance: walletState.balance };
    }
  } catch (err) {
    console.error('[GX Wallet] Fetch balance failed:', err);
    return { error: err.message };
  }
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'connectWallet':
      connectWallet(request.address, request.chainId).then(sendResponse);
      break;
    case 'disconnectWallet':
      disconnectWallet().then(sendResponse);
      break;
    case 'getWalletState':
      sendResponse(walletState);
      break;
    case 'registerPayment':
      registerPayment(request.taskId, request.amount, request.currency).then(sendResponse);
      break;
    case 'fetchBalance':
      fetchBalance().then(sendResponse);
      break;
    case 'getPendingPayments':
      sendResponse({ payments: walletState.pendingPayments });
      break;
  }
  return true;
});

// Listen for agent completion to auto-register payments
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.action === 'taskCompleted' && walletState.isConnected) {
    registerPayment(request.taskId, request.reward || 0.0001, 'ETH').then(sendResponse);
  }
  return true;
});

console.log('[GX Wallet] Background script loaded');
