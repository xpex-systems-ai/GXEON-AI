const express = require('express');
const router = express.Router();
const { generateResponse } = require('../services/aiService');

router.post('/', async (req, res) => {
  const userMessage = req.body.message;

  const messages = [
    { role: 'system', content: 'Você é GXEON, um cérebro estratégico focado em execução, clareza e inteligência.' },
    { role: 'user', content: userMessage }
  ];

  const reply = await generateResponse(messages);

  res.json({ reply });
});

module.exports = router;
