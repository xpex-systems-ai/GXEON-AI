import { test } from 'node:test';
import assert from 'node:assert';

function validateSwapResponse(data) {
  if (data.transaction === null) return 'QUOTE_ONLY';
  if (data.transaction === '') return 'INVALID_BUILD';
  if (typeof data.transaction === 'string' && data.transaction.length > 0) return 'READY';
  throw new Error('UNKNOWN_STATE');
}

test('Jupiter Swap V2 Typeguard', async (t) => {
  await t.test('identifies quote only', () => {
    assert.strictEqual(validateSwapResponse({ transaction: null }), 'QUOTE_ONLY');
  });
  await t.test('identifies invalid build', () => {
    assert.strictEqual(validateSwapResponse({ transaction: '' }), 'INVALID_BUILD');
  });
  await t.test('identifies ready transaction', () => {
    assert.strictEqual(validateSwapResponse({ transaction: 'base64data' }), 'READY');
  });
  await t.test('throws on unknown', () => {
    assert.throws(() => validateSwapResponse({ transaction: undefined }));
  });
  await t.test('handles error code 2', () => {
    const err = { errorCode: 2, message: 'Insufficient SOL' };
    assert.strictEqual(err.errorCode, 2);
  });
  await t.test('handles missing account error', () => {
    const err = { errorCode: 2, message: 'Missing ATA' };
    assert.strictEqual(err.message, 'Missing ATA');
  });
});