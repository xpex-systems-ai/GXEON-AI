// GXEON Agent Runner - Content Script
// Injected into pages for DOM manipulation and data extraction

(function() {
  'use strict';

  console.log('[GXEON] Content script loaded');

  // Listen for commands from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'scrapeData':
        const data = scrapeData(request.selectors);
        sendResponse({ success: true, data });
        break;
      case 'clickElement':
        const clicked = clickElement(request.selector);
        sendResponse({ success: clicked });
        break;
      case 'fillInput':
        const filled = fillInput(request.selector, request.value);
        sendResponse({ success: filled });
        break;
      case 'scrollPage':
        window.scrollTo(0, document.body.scrollHeight);
        sendResponse({ success: true });
        break;
      case 'captureScreenshot':
        // Screenshot handled by background script
        sendResponse({ success: true });
        break;
    }
    return true;
  });

  // Scrape data using CSS selectors
  function scrapeData(selectors) {
    const results = {};
    
    for (const [key, selector] of Object.entries(selectors)) {
      const elements = document.querySelectorAll(selector);
      results[key] = Array.from(elements).map(el => {
        // Try to get relevant content
        return el.textContent?.trim() || 
               el.value || 
               el.getAttribute('src') || 
               el.getAttribute('href') ||
               el.innerHTML;
      });
    }
    
    return results;
  }

  // Click element safely
  function clickElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.click();
      return true;
    }
    return false;
  }

  // Fill input safely
  function fillInput(selector, value) {
    const element = document.querySelector(selector);
    if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  // Auto-detect form fields
  function detectForms() {
    const forms = document.querySelectorAll('form');
    return Array.from(forms).map(form => ({
      id: form.id,
      action: form.action,
      method: form.method,
      inputs: Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
        name: input.name,
        type: input.type,
        selector: getUniqueSelector(input)
      }))
    }));
  }

  // Get unique CSS selector for element
  function getUniqueSelector(el) {
    if (el.id) return `#${el.id}`;
    if (el.className) return `.${el.className.split(' ')[0]}`;
    return el.tagName.toLowerCase();
  }

  // Expose API to page for advanced usage
  window.GXEON = {
    version: '2.1.0',
    scrapeData,
    clickElement,
    fillInput,
    detectForms,
    
    // High-level task execution
    executeTask: async (task) => {
      const response = await chrome.runtime.sendMessage({
        action: 'executeTask',
        task
      });
      return response;
    },
    
    // Get agent status
    getStatus: async () => {
      const response = await chrome.runtime.sendMessage({
        action: 'getAgentState'
      });
      return response;
    }
  };

  console.log('[GXEON] Content script ready - API available at window.GXEON');
})();
