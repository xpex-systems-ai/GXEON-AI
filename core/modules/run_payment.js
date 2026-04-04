const { processPayments } = require('./payment_engine');

(async () => {
  const result = await processPayments();
  console.log('[GX_PAYMENT_RESULT]:', result);
})();
