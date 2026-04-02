// GX Task Monitor - Background Script
// Monitors agent execution, logs, and performance

const API_BASE = 'https://your-gxeon-backend.com';
const FETCH_TIMEOUT = 15000;

// Monitor state
const monitorState = {
  agents: new Map(),
  logs: [],
  performance: {
    tasksCompleted: 0,
    tasksFailed: 0,
    avgExecutionTime: 0
  },
  isMonitoring: false
};

// Initialize monitor
chrome.runtime.onInstalled.addListener(() => {
  console.log('[GX Task Monitor] Extension installed');
  chrome.alarms.create('pollStatus', { periodInMinutes: 0.5 }); // Every 30 seconds
});

// Alarm handler
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'pollStatus') {
    pollAgentStatus();
    fetchSystemLogs();
  }
});

// Poll agent status from backend
async function pollAgentStatus() {
  try {
    const response = await fetch(`${API_BASE}/api/agents`, {
      timeout: FETCH_TIMEOUT
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.agents) {
        data.agents.forEach(agent => {
          const prevState = monitorState.agents.get(agent.id);
          monitorState.agents.set(agent.id, {
            ...agent,
            lastSeen: Date.now()
          });
          
          // Notify on status change
          if (prevState && prevState.status !== agent.status) {
            notifyStatusChange(agent, prevState.status);
          }
        });
      }
    }
  } catch (err) {
    console.error('[GX Task Monitor] Poll failed:', err);
  }
}

// Fetch system logs
async function fetchSystemLogs() {
  try {
    const response = await fetch(`${API_BASE}/logs`, {
      timeout: FETCH_TIMEOUT
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.logs) {
        // Add new logs
        data.logs.forEach(log => {
          if (!monitorState.logs.find(l => l.id === log.id)) {
            monitorState.logs.push(log);
            
            // Notify on error
            if (log.level === 'error') {
              notifyError(log);
            }
          }
        });
        
        // Keep only last 100 logs
        if (monitorState.logs.length > 100) {
          monitorState.logs = monitorState.logs.slice(-100);
        }
      }
    }
  } catch (err) {
    console.error('[GX Task Monitor] Fetch logs failed:', err);
  }
}

// Notify status change
function notifyStatusChange(agent, oldStatus) {
  chrome.notifications.create(`status-${agent.id}`, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: `Agent ${agent.name}`,
    message: `Status: ${oldStatus} → ${agent.status}`
  });
}

// Notify error
function notifyError(log) {
  chrome.notifications.create(`error-${log.id}`, {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Agent Error',
    message: log.message
  });
}

// Calculate performance metrics
function calculateMetrics() {
  const agents = Array.from(monitorState.agents.values());
  const activeAgents = agents.filter(a => a.status === 'active');
  const workingAgents = agents.filter(a => a.status === 'working');
  
  return {
    totalAgents: agents.length,
    activeAgents: activeAgents.length,
    workingAgents: workingAgents.length,
    logsCount: monitorState.logs.length,
    lastPoll: Date.now()
  };
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getMetrics':
      sendResponse(calculateMetrics());
      break;
    case 'getLogs':
      sendResponse({ logs: monitorState.logs });
      break;
    case 'getAgents':
      sendResponse({ agents: Array.from(monitorState.agents.values()) });
      break;
    case 'clearLogs':
      monitorState.logs = [];
      sendResponse({ success: true });
      break;
    case 'startMonitoring':
      monitorState.isMonitoring = true;
      chrome.alarms.create('pollStatus', { periodInMinutes: 0.5 });
      sendResponse({ success: true });
      break;
    case 'stopMonitoring':
      monitorState.isMonitoring = false;
      chrome.alarms.clear('pollStatus');
      sendResponse({ success: true });
      break;
  }
  return true;
});

console.log('[GX Task Monitor] Background script loaded');
