const fetch = require('node-fetch');

async function generateResponse(messages) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages
      })
    });

    const data = await response.json();

    return data.choices?.[0]?.message?.content || 'Erro na IA';

  } catch (error) {
    console.error(error);
    return 'Erro ao conectar com IA';
  }
}

module.exports = { generateResponse };
