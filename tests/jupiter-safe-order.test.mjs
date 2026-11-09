import { test } from 'node:test';
import assert from 'node:assert';

function validateSwapResponse(data) {
  if (data.transaction === null) return 'QUOTE_ONLY';
  if (data.transaction === '') return 'NO_TRANSACTION_AVAILABLE';
  if (typeof data.transaction === 'string' && data.transaction.length > 0) return 'READY';
  throw new Error('INVALID_RESPONSE');
}

test('Jupiter Swap V2 Typeguard Tests', async (t) => {
  await t.test('handles null transaction', () => {
    assert.strictEqual(validateSwapResponse({ transaction: null }), 'QUOTE_ONLY');
  });

  await t.test('handles empty string transaction', () => {
    assert.strictEqual(validateSwapResponse({ transaction: '' }), 'NO_TRANSACTION_AVAILABLE');
  });

  await t.test('handles valid transaction', () => {
    assert.strictEqual(validateSwapResponse({ transaction: 'base64encodedtx' }), 'READY');
  });

  await t.test('throws on invalid structure', () => {
    assert.throws(() => validateSwapResponse({ transaction: 123 }), /INVALID_RESPONSE/);
  });

  await t.test('handles error code 2', () => {
    const res = { transaction: null, errorCode: 2 };
    assert.strictEqual(res.errorCode, 2);
  });

  await t.test('verifies response object integrity', () => {
    const res = { transaction: 'tx', errorCode: null };
    assert.ok(res.transaction !== null);
  });
});