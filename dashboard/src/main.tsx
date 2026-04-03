// Import fetch polyfill before React loads
import 'whatwg-fetch';

// Ensure fetch is available globally before React loads
import './utils/safeFetch';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Global error handlers for debug visibility
window.onerror = function (msg, url, line, col, error) {
  console.error("[GLOBAL ERROR]", { msg, url, line, col, error });
  return false;
};

window.onunhandledrejection = function (event) {
  console.error("[UNHANDLED PROMISE]", event.reason);
};

console.log("[MAIN] Application starting...");

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
