const express = require('express');
const cors = require('cors');
const path = require('path');

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
const PORT = 3000;

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());

app.use('/chat', chatRoute);
app.use('/api', configRoute);
app.use('/api', agentRoutes);
app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.listen(PORT, () => {
  console.log(`GXEON rodando na porta ${PORT}`);
  console.log('OpenRouter Key:', process.env.OPENROUTER_API_KEY ? 'Carregada' : 'Não encontrada');
});
