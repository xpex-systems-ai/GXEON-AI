const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../config/secure/.env') });

const chatRoute = require('./routes/chat');
const configRoute = require('./routes/config');
const agentRoutes = require('./routes/agents');

const app = express();
const PORT = 3000;

app.use(cors());
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
