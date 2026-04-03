const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

console.log('[SERVER] Starting GXEON...');

// Safe dotenv load - don't fail if .env missing
try {
  require('dotenv').config({ path: path.join(__dirname, '../config/secure/.env') });
  console.log('[SERVER] Environment loaded');
} catch (e) {
  console.log('[SERVER] No .env file found, using Railway env vars');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint - CRITICAL for Railway
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send('GXEON BACKEND ONLINE');
});

// Load routes safely
try {
  const chatRoute = require('./routes/chat');
  const configRoute = require('./routes/config');
  const agentRoutes = require('./routes/agents');
  
  app.use('/chat', chatRoute);
  app.use('/api', configRoute);
  app.use('/api', agentRoutes);
  console.log('[SERVER] Routes loaded');
} catch (e) {
  console.warn('[SERVER] Some routes failed to load:', e.message);
}

// Static serving with fallback
const distPath = path.join(__dirname, '../dashboard/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ 
      status: 'API Only',
      endpoints: ['/health', '/api/agents', '/api/tasks', '/api/stats']
    });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] GXEON running on port ${PORT}`);
  console.log(`[SERVER] Health: http://localhost:${PORT}/health`);
});
