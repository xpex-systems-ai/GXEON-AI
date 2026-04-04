const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());

// DEBUG: Log paths
const dashboardPath = path.join(__dirname, '../dashboard/dist');
console.log('[DEBUG] __dirname:', __dirname);
console.log('[DEBUG] Dashboard path:', dashboardPath);
console.log('[DEBUG] Dashboard exists:', fs.existsSync(dashboardPath));
if (fs.existsSync(dashboardPath)) {
  console.log('[DEBUG] Dashboard files:', fs.readdirSync(dashboardPath));
}

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

// SERVIR DASHBOARD (build do React) - MUST be before API root
app.use('/', express.static(dashboardPath));

// Fallback para index.html (SPA)
app.get('*', (req, res) => {
  const indexPath = path.join(dashboardPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Dashboard not found', path: indexPath });
  }
});

// PORTA DINÂMICA (RAILWAY)
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Dashboard path: ${dashboardPath}`);
});
