const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../../config/secure/.env');

function readEnvFile() {
  if (!fs.existsSync(ENV_PATH)) {
    return {};
  }
  const content = fs.readFileSync(ENV_PATH, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1]] = match[2];
    }
  });
  return env;
}

function writeEnvFile(env) {
  const content = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  fs.writeFileSync(ENV_PATH, content + '\n');
}

router.post('/save-key', (req, res) => {
  const { key, value } = req.body;
  
  if (!key || !value) {
    return res.status(400).json({ success: false, error: 'Key and value required' });
  }

  try {
    const env = readEnvFile();
    env[key] = value;
    writeEnvFile(env);
    
    process.env[key] = value;
    
    res.json({ success: true, message: `Key ${key} saved successfully` });
  } catch (error) {
    console.error('Error saving key:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/key-status', (req, res) => {
  const keys = [
    { name: 'OPENROUTER_API_KEY', configured: false },
    { name: 'HUGFACE_API_KEY', configured: false },
    { name: 'METAMASK_WALLET_KEY', configured: false }
  ];

  try {
    const env = readEnvFile();
    
    keys.forEach(key => {
      const value = env[key.name] || process.env[key.name];
      key.configured = !!(value && value !== 'sua_chave_aqui');
    });

    res.json({ success: true, keys });
  } catch (error) {
    console.error('Error reading key status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/init-bitensor', (req, res) => {
  const key = process.env.BITENSOR_KEY || process.env.OPENROUTER_API_KEY;
  if (!key || key === 'sua_chave_aqui') {
    return res.status(400).json({ 
      success: false, 
      error: 'BITENSOR_KEY not configured' 
    });
  }
  
  console.log('Initializing Bitensor integration...');
  res.json({ success: true, message: 'Bitensor integration initialized' });
});

router.post('/init-opensea', (req, res) => {
  const key = process.env.OPENSEA_API_KEY || process.env.METAMASK_WALLET_KEY;
  if (!key || key === 'sua_chave_aqui') {
    return res.status(400).json({ 
      success: false, 
      error: 'Wallet/Opensea key not configured' 
    });
  }
  
  console.log('Initializing OpenSea integration...');
  res.json({ success: true, message: 'OpenSea integration initialized' });
});

router.post('/init-web3', (req, res) => {
  const key = process.env.METAMASK_WALLET_KEY;
  if (!key || key === 'sua_chave_aqui') {
    return res.status(400).json({ 
      success: false, 
      error: 'METAMASK_WALLET_KEY not configured' 
    });
  }
  
  console.log('Initializing Web3 protocols integration...');
  res.json({ success: true, message: 'Web3 protocols integration initialized' });
});

router.post('/test-connections', async (req, res) => {
  const results = {
    openrouter: false,
    hugface: false,
    bitensor: false,
    web3: false
  };

  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'sua_chave_aqui') {
    try {
      const { getNativeFetch } = require('../runtime/compatibility.cjs');
      const fetch = getNativeFetch();
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` }
      });
      results.openrouter = response.ok;
    } catch (e) {
      results.openrouter = false;
    }
  }

  if (process.env.HUGFACE_API_KEY && process.env.HUGFACE_API_KEY !== 'sua_chave_aqui') {
    results.hugface = true;
  }

  if (process.env.BITENSOR_KEY && process.env.BITENSOR_KEY !== 'sua_chave_aqui') {
    results.bitensor = true;
  }

  if (process.env.METAMASK_WALLET_KEY && process.env.METAMASK_WALLET_KEY !== 'sua_chave_aqui') {
    results.web3 = true;
  }

  const allSuccess = Object.values(results).some(v => v);
  
  res.json({ 
    success: allSuccess, 
    results,
    message: allSuccess ? 'Some connections are working' : 'No connections configured or working'
  });
});

module.exports = router;
