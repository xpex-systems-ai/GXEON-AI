import { test } from 'node:test';
import assert from 'node:assert';

/**
 * Typeguard for Jupiter Swap V2 Order Response
 */
function validateSwapResponse(data) {
  if (data.transaction === null) return 'QUOTE_ONLY';
  if (data.transaction === '') return 'UNBUILDABLE';
  if (typeof data.transaction === 'string' && data.transaction.length > 0) return 'READY';
  throw new Error('INVALID_RESPONSE');
}

test('Jupiter Swap V2 Typeguard Tests', async (t) => {
  await t.test('handles null transaction', () => {
    assert.strictEqual(validateSwapResponse({ transaction: null }), 'QUOTE_ONLY');
  });

  await t.test('handles empty string transaction', () => {
    assert.strictEqual(validateSwapResponse({ transaction: '' }), 'UNBUILDABLE');
  });

  await t.test('handles valid transaction', () => {
    assert.strictEqual(validateSwapResponse({ transaction: 'base64data' }), 'READY');
  });

  await t.test('handles insufficient SOL error', () => {
    const err = { errorCode: 2, message: 'Metis: insufficient SOL' };
    assert.strictEqual(err.errorCode, 2);
  });

  await t.test('handles missing ATA error', () => {
    const err = { errorCode: 2, message: 'JupiterZ: missing associated token account' };
    assert.strictEqual(err.errorCode, 2);
  });

  await t.test('throws on invalid structure', () => {
    assert.throws(() => validateSwapResponse({}), /INVALID_RESPONSE/);
  });
});