// GX Analytics Tracker - Background Script
// Tracks agent performance and dashboard data

const API_BASE = 'https://your-gxeon-backend.com';
const FETCH_TIMEOUT = 15000;

// Analytics state
const analyticsState = {
  metrics: {
    tasksCompleted: 0,
    tasksFailed: 0,
    avgExecutionTime: 0,
    totalEarnings: 0,
    activeTime: 0
  },
  history: [],
  agentPerformance: new Map(),
  isTracking: false,
  startTime: null
};

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('[GX Analytics] Extension installed');
  chrome.alarms.create('collectMetrics', { periodInMinutes: 1 }); // Every minute
});

// Alarm handler
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'collectMetrics') {
    collectMetrics();
  }
});

// Collect metrics from backend
async function collectMetrics() {
  try {
    const [agentsRes, statsRes, tasksRes] = await Promise.all([
      fetch(`${API_BASE}/api/agents`, { timeout: FETCH_TIMEOUT }),
      fetch(`${API_BASE}/api/stats`, { timeout: FETCH_TIMEOUT }),
      fetch(`${API_BASE}/api/tasks`, { timeout: FETCH_TIMEOUT })
    ]);
    
    if (agentsRes.ok && statsRes.ok && tasksRes.ok) {
      const agents = await agentsRes.json();
      const stats = await statsRes.json();
      const tasks = await tasksRes.json();
      
      // Update metrics
      if (stats.stats) {
        analyticsState.metrics.tasksCompleted = stats.stats.completed || 0;
        analyticsState.metrics.tasksFailed = stats.stats.pending || 0;
      }
      
      // Track agent performance
      if (agents.agents) {
        agents.agents.forEach(agent => {
          const prev = analyticsState.agentPerformance.get(agent.id);
          const current = {
            ...agent,
            timestamp: Date.now()
          };
          
          analyticsState.agentPerformance.set(agent.id, current);
          
          // Add to history if status changed
          if (prev && prev.status !== agent.status) {
            analyticsState.history.push({
              type: 'status_change',
              agentId: agent.id,
              from: prev.status,
              to: agent.status,
              timestamp: Date.now()
            });
          }
        });
      }
      
      // Keep history limited
      if (analyticsState.history.length > 1000) {
        analyticsState.history = analyticsState.history.slice(-500);
      }
      
      // Calculate active time
      if (analyticsState.isTracking && analyticsState.startTime) {
        analyticsState.metrics.activeTime = Date.now() - analyticsState.startTime;
      }
      
      console.log('[GX Analytics] Metrics collected');
    }
  } catch (err) {
    console.error('[GX Analytics] Collect failed:', err);
  }
}

// Get analytics report
function getAnalyticsReport() {
  const report = {
    timestamp: Date.now(),
    metrics: { ...analyticsState.metrics },
    agentCount: analyticsState.agentPerformance.size,
    agents: Array.from(analyticsState.agentPerformance.values()),
    recentHistory: analyticsState.history.slice(-50),
    isTracking: analyticsState.isTracking,
    uptime: analyticsState.isTracking ? Date.now() - analyticsState.startTime : 0
  };
  
  // Calculate additional stats
  if (report.agents.length > 0) {
    const activeAgents = report.agents.filter(a => a.status === 'active');
    const workingAgents = report.agents.filter(a => a.status === 'working');
    
    report.summary = {
      total: report.agents.length,
      active: activeAgents.length,
      working: workingAgents.length,
      idle: report.agents.length - activeAgents.length - workingAgents.length
    };
  }
  
  return report;
}

// Start tracking
function startTracking() {
  analyticsState.isTracking = true;
  analyticsState.startTime = Date.now();
  
  // Send to backend
  fetch(`${API_BASE}/api/analytics/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startTime: analyticsState.startTime,
      source: 'extension'
    }),
    timeout: FETCH_TIMEOUT
  }).catch(err => console.error('[GX Analytics] Start tracking failed:', err));
  
  return { success: true, startTime: analyticsState.startTime };
}

// Stop tracking
function stopTracking() {
  const duration = analyticsState.startTime ? Date.now() - analyticsState.startTime : 0;
  
  analyticsState.isTracking = false;
  analyticsState.startTime = null;
  
  // Send to backend
  fetch(`${API_BASE}/api/analytics/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      duration,
      metrics: analyticsState.metrics
    }),
    timeout: FETCH_TIMEOUT
  }).catch(err => console.error('[GX Analytics] Stop tracking failed:', err));
  
  return { success: true, duration };
}

// Export analytics data
function exportData() {
  const data = {
    exportDate: Date.now(),
    metrics: analyticsState.metrics,
    history: analyticsState.history,
    agents: Array.from(analyticsState.agentPerformance.entries())
  };
  
  return {
    success: true,
    data: JSON.stringify(data, null, 2),
    filename: `gxeon-analytics-${Date.now()}.json`
  };
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getReport':
      sendResponse(getAnalyticsReport());
      break;
    case 'startTracking':
      sendResponse(startTracking());
      break;
    case 'stopTracking':
      sendResponse(stopTracking());
      break;
    case 'exportData':
      sendResponse(exportData());
      break;
    case 'getMetrics':
      sendResponse(analyticsState.metrics);
      break;
  }
  return true;
});

console.log('[GX Analytics] Background script loaded');
