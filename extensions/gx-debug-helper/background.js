// GX Debug Helper - Background Script
// Validates DOM, fetch, and React logs automatically

const API_BASE = 'https://your-gxeon-backend.com';

// Debug state
const debugState = {
  isDebugging: false,
  errors: [],
  warnings: [],
  reactErrors: [],
  domValidations: [],
  fetchValidations: []
};

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('[GX Debug] Extension installed');
});

// Run validation on current tab
async function validateCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab) return { error: 'No active tab' };
  
  // Inject validation script
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: runValidations
  });
  
  return results[0]?.result || { error: 'Validation failed' };
}

// Validation function injected into page
function runValidations() {
  const issues = {
    reactErrors: [],
    domIssues: [],
    fetchIssues: [],
    consoleErrors: [],
    timestamp: Date.now()
  };
  
  // Check for React errors
  if (window.React && window.React.__DEV__) {
    const originalConsoleError = console.error;
    console.error = function(...args) {
      issues.reactErrors.push(args.join(' '));
      originalConsoleError.apply(console, args);
    };
  }
  
  // Check for common React error patterns
  const bodyText = document.body.innerText;
  if (bodyText.includes('Minified React error')) {
    const match = bodyText.match(/Minified React error #(\d+)/);
    if (match) {
      issues.reactErrors.push(`React Error #${match[1]}`);
    }
  }
  
  // Validate DOM structure
  const criticalElements = ['div#root', 'div#app', 'main', 'body'];
  criticalElements.forEach(selector => {
    const el = document.querySelector(selector);
    if (!el) {
      issues.domIssues.push(`Missing critical element: ${selector}`);
    }
  });
  
  // Check for empty containers
  const containers = document.querySelectorAll('div[id]');
  containers.forEach(container => {
    if (container.children.length === 0 && container.innerText.trim() === '') {
      if (container.id !== 'root' && container.id !== '__react-root') {
        issues.domIssues.push(`Empty container: #${container.id}`);
      }
    }
  });
  
  // Check for fetch errors
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).catch(err => {
      issues.fetchIssues.push(`Fetch failed: ${err.message}`);
      throw err;
    });
  };
  
  // Capture console errors
  const errorMessages = [];
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.target.classList && mutation.target.classList.contains('error')) {
        errorMessages.push(mutation.target.innerText);
      }
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  issues.consoleErrors = errorMessages;
  
  return issues;
}

// Monitor console for errors
function monitorConsole() {
  const originalError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    
    // Capture React errors
    if (message.includes('React') || message.includes('Minified React error')) {
      debugState.reactErrors.push({
        message,
        timestamp: Date.now(),
        stack: args.find(arg => arg && arg.stack)?.stack
      });
      
      // Keep only last 50
      if (debugState.reactErrors.length > 50) {
        debugState.reactErrors = debugState.reactErrors.slice(-50);
      }
    }
    
    debugState.errors.push({
      message,
      timestamp: Date.now()
    });
    
    originalError.apply(console, args);
  };
}

// Get debug report
function getDebugReport() {
  return {
    errors: debugState.errors.slice(-20),
    warnings: debugState.warnings.slice(-20),
    reactErrors: debugState.reactErrors,
    timestamp: Date.now(),
    isDebugging: debugState.isDebugging
  };
}

// Clear debug logs
function clearLogs() {
  debugState.errors = [];
  debugState.warnings = [];
  debugState.reactErrors = [];
  debugState.domValidations = [];
  debugState.fetchValidations = [];
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'validateTab':
      validateCurrentTab().then(sendResponse);
      break;
    case 'getDebugReport':
      sendResponse(getDebugReport());
      break;
    case 'clearLogs':
      clearLogs();
      sendResponse({ success: true });
      break;
    case 'startDebugging':
      debugState.isDebugging = true;
      monitorConsole();
      sendResponse({ success: true });
      break;
    case 'stopDebugging':
      debugState.isDebugging = false;
      sendResponse({ success: true });
      break;
  }
  return true;
});

console.log('[GX Debug] Background script loaded');
