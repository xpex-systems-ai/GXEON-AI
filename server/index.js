const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// API ROUTES (prefix /api)
const agentsRouter = require('./routes/agents');
const chatRouter = require('./routes/chat');
const configRouter = require('./routes/config');

app.use('/api/agents', agentsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/config', configRouter);

// HEALTH CHECK (CRÍTICO)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// SERVIR DASHBOARD (build do React)
app.use(express.static(path.join(__dirname, '../dashboard/dist')));

// Fallback para index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/dist/index.html'));
});

// PORTA DINÂMICA (RAILWAY)
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}`);
});
