// GXEON Agent Runner - Background Script
// Handles task execution and communication with backend

const API_BASE = 'https://your-gxeon-backend.com';
const AGENT_ID_PREFIX = 'agent_';
const FETCH_TIMEOUT = 15000;

// Agent state
let agentState = {
  id: null,
  status: 'idle',
  currentTask: null,
  walletConnected: false
};

// Initialize agent on extension install
chrome.runtime.onInstalled.addListener(() => {
  console.log('[GXEON Agent] Extension installed');
  initializeAgent();
});

// Initialize agent
async function initializeAgent() {
  const stored = await chrome.storage.local.get(['agentId', 'walletAddr']);
  
  if (!stored.agentId) {
    agentState.id = `${AGENT_ID_PREFIX}${Date.now()}`;
    await chrome.storage.local.set({ agentId: agentState.id });
  } else {
    agentState.id = stored.agentId;
  }
  
  agentState.walletConnected = !!stored.walletAddr;
  
  console.log('[GXEON Agent] Initialized:', agentState);
  
  // Register with backend
  await registerAgent();
}

// Register agent with backend
async function registerAgent() {
  try {
    const response = await fetch(`${API_BASE}/api/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: agentState.id,
        name: `Browser Agent ${agentState.id.slice(-4)}`,
        type: 'browser_extension',
        status: 'active'
      })
    });
    
    if (response.ok) {
      console.log('[GXEON Agent] Registered successfully');
    }
  } catch (err) {
    console.error('[GXEON Agent] Registration failed:', err);
  }
}

// Fetch next task from queue
async function fetchNextTask() {
  try {
    const response = await fetch(`${API_BASE}/api/tasks/next?agentId=${agentState.id}`, {
      timeout: FETCH_TIMEOUT
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.task) {
        console.log('[GXEON Agent] Received task:', data.task);
        await executeTask(data.task);
      }
    }
  } catch (err) {
    console.error('[GXEON Agent] Fetch task failed:', err);
  }
}

// Execute task based on type
async function executeTask(task) {
  agentState.currentTask = task;
  agentState.status = 'working';
  
  try {
    let result = null;
    
    switch (task.type) {
      case 'scrape_title':
        result = await executeInTab(task.url, 'document.title');
        break;
      case 'collect_price':
        result = await executeInTab(task.url, 'document.querySelector(".price")?.textContent');
        break;
      case 'collect_headline':
        result = await executeInTab(task.url, 'document.querySelector("h1")?.textContent');
        break;
      case 'click_button':
        result = await executeInTab(task.url, `
          document.querySelector("${task.selector}")?.click();
          "clicked";
        `);
        break;
      case 'fill_form':
        result = await executeInTab(task.url, `
          const input = document.querySelector("${task.selector}");
          if (input) { input.value = "${task.value}"; "filled"; }
          else "not found";
        `);
        break;
      default:
        result = { error: 'Unknown task type' };
    }
    
    // Submit result
    await submitTaskResult(task.id, result);
    
  } catch (err) {
    console.error('[GXEON Agent] Task execution failed:', err);
    await submitTaskResult(task.id, { error: err.message });
  } finally {
    agentState.status = 'idle';
    agentState.currentTask = null;
  }
}

// Execute script in tab
async function executeInTab(url, script) {
  const [tab] = await chrome.tabs.query({ url: url + '*' });
  
  if (!tab) {
    // Open new tab if not exists
    const newTab = await chrome.tabs.create({ url, active: false });
    await new Promise(r => setTimeout(r, 2000)); // Wait for load
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: newTab.id },
      func: (code) => eval(code),
      args: [script]
    });
    
    await chrome.tabs.remove(newTab.id);
    return results[0]?.result;
  } else {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (code) => eval(code),
      args: [script]
    });
    return results[0]?.result;
  }
}

// Submit task result
async function submitTaskResult(taskId, result) {
  try {
    await fetch(`${API_BASE}/api/tasks/result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        agentId: agentState.id,
        result
      })
    });
  } catch (err) {
    console.error('[GXEON Agent] Submit result failed:', err);
  }
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getAgentState':
      sendResponse(agentState);
      break;
    case 'connectWallet':
      agentState.walletConnected = true;
      chrome.storage.local.set({ walletAddr: request.walletAddr });
      sendResponse({ success: true });
      break;
    case 'fetchTask':
      fetchNextTask();
      sendResponse({ success: true });
      break;
  }
  return true;
});

// Poll for tasks every 10 seconds
setInterval(fetchNextTask, 10000);

console.log('[GXEON Agent] Background script loaded');
