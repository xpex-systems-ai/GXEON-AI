const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

console.log('SERVER STARTING OK');

const envPath = path.join(__dirname, '../config/secure/.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// Startup ENV Validation
const requiredEnv = [
  'SUPABASE_PROJECT_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingEnv = requiredEnv.filter(v => !process.env[v]);

if (missingEnv.length > 0) {
  console.warn('[Startup] Missing ENV variables:', missingEnv);
} else {
  console.log('[Startup] ENV OK');
}

const chatRoute = require('./routes/chat');
const configRoute = require('./routes/config');
const agentRoutes = require('./routes/agents');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/chat', chatRoute);
app.use('/api', configRoute);
app.use('/api', agentRoutes);

// Safe static serving with fallback
const distPath = path.join(__dirname, '../dashboard/dist');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  console.warn('⚠️ Frontend build not found at:', distPath);
  console.warn('Run: cd dashboard && npm run build');
  
  // Serve API-only fallback
  app.get('/', (req, res) => {
    res.json({ 
      status: 'API Only - Frontend build missing',
      endpoints: ['/api/agents', '/api/tasks', '/api/stats']
    });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] GXEON v2.1 - runtime-hardening branch`);
  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[SERVER] Static serving: dashboard/dist`);
  console.log(`[SERVER] OpenRouter Key: ${process.env.OPENROUTER_API_KEY ? 'Loaded ✓' : 'Missing ✗'}`);
});
