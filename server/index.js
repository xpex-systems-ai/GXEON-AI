const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('SERVER STARTING OK');

require('dotenv').config({ path: path.join(__dirname, '../config/secure/.env') });

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
app.use(express.static(path.join(__dirname, '../dashboard/dist')));

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SERVER] GXEON v2.1 - runtime-hardening branch`);
  console.log(`[SERVER] Running on port ${PORT}`);
  console.log(`[SERVER] Static serving: dashboard/dist`);
  console.log(`[SERVER] OpenRouter Key: ${process.env.OPENROUTER_API_KEY ? 'Loaded ✓' : 'Missing ✗'}`);
});
