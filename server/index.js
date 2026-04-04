const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// ROUTES
const agentsRouter = require('./routes/agents');
const chatRouter = require('./routes/chat');
const configRouter = require('./routes/config');

app.use('/agents', agentsRouter);
app.use('/chat', chatRouter);
app.use('/config', configRouter);

// HEALTH CHECK (CRÍTICO)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ROOT
app.get('/', (req, res) => {
  res.status(200).json({ message: 'GXEON backend online' });
});

// PORTA DINÂMICA (RAILWAY)
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
