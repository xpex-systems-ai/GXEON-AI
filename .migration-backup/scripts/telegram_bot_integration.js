#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GXEON TELEGRAM BOT INTEGRATION v1.0
 * Bot: @gxeonai_bot | Comandante: Júnior Sena
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!botToken || botToken.includes('123456789')) {
  console.error('❌ TELEGRAM_BOT_TOKEN não configurado no .env');
  process.exit(1);
}

const bot = new Telegraf(botToken);

// Comandos básicos
bot.command('start', (ctx) => {
  ctx.reply(`🌑 *GXEON Alpha Bot*

Bem-vindo ao sistema de sinais Smart Money.

*Comandos:*
/signals - Ver sinais disponíveis
/register <email> <tier> - Registrar (BASIC/PRO)
/status - Status da sua conta
/help - Ajuda completa

⚡ Sinais gratuitos: delay 10min
🔥 Sinais PRO: tempo real`, { parse_mode: 'Markdown' });
});

bot.command('help', (ctx) => {
  ctx.reply(`📚 *GXEON Help*

*Planos:*
• BASIC (FREE): 10 sinais/dia, delay 10min
• PRO ($5/mês): sinais ilimitados, tempo real

*Como usar:*
1. Use /register seu@email.com PRO
2. Receba sua API key
3. Acesse sinais via API ou aqui no bot

*Suporte:* @juniorsena`, { parse_mode: 'Markdown' });
});

bot.command('signals', async (ctx) => {
  // TODO: Integrar com SignalHub real
  ctx.reply(`📡 *Sinais Recentes*

🔄 Carregando do GXEON Signal Hub...

_Use /register para acesso completo_`, { parse_mode: 'Markdown' });
});

bot.command('register', (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const email = args[0];
  const tier = args[1] || 'BASIC';
  
  if (!email || !email.includes('@')) {
    return ctx.reply('❌ Email inválido. Use: /register seu@email.com PRO');
  }
  
  // TODO: Gerar API key via SignalHub
  ctx.reply(`✅ *Pré-registro recebido!*

📧 Email: ${email}
🏷️ Tier: ${tier.toUpperCase()}

⏳ Aguardando confirmação de pagamento...

Para ativação imediata, entre em contato: @juniorsena`, { parse_mode: 'Markdown' });
});

bot.command('status', (ctx) => {
  ctx.reply(`📊 *Status do Sistema*

🟢 Signal Hub: Online
🟢 API: Operational  
⚪ Monetization: Standby (aguardando pagamentos)

_Última atualização: ${new Date().toLocaleTimeString()}_`, { parse_mode: 'Markdown' });
});

// Mensagem de boas-vindas no canal
async function sendWelcome() {
  if (chatId) {
    await bot.telegram.sendMessage(chatId, 
      `🌑 *GXEON Signals - Online*

Bot ativado e operacional.
Use /start para começar.

_Comandante Júnior Sena_`, 
      { parse_mode: 'Markdown' }
    );
    console.log('✅ Mensagem de boas-vindas enviada ao canal');
  }
}

// Iniciar bot
bot.launch()
  .then(() => {
    console.log('🤖 GXEON Telegram Bot ativo');
    console.log('   Bot: @gxeonai_bot');
    sendWelcome();
  })
  .catch(err => {
    console.error('❌ Erro ao iniciar bot:', err.message);
  });

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export { bot };
