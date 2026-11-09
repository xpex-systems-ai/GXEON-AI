import test from 'node:test';
import assert from 'node:assert';
import { validateJupiterOrderResponse } from './safe-order.js';

test('validates null transaction quote-only response', () => {
  const res = validateJupiterOrderResponse({ transaction: null });
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.state, 'QUOTE_ONLY');
});

test('validates empty string transaction price-quote-only response', () => {
  const res = validateJupiterOrderResponse({ transaction: '' });
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.state, 'PRICE_QUOTE_ONLY');
});

test('validates buildable non-empty transaction string', () => {
  const res = validateJupiterOrderResponse({ transaction: 'AQABAgIA...' });
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.state, 'BUILDABLE_TRANSACTION');
});

test('validates router error code 2 semantics', () => {
  const res = validateJupiterOrderResponse({ errorCode: 2, error: 'Insufficient SOL for fees or missing ATA' });
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.state, 'ROUTER_ERROR');
  assert.strictEqual(res.errorCode, 2);
});

test('rejects invalid response payloads', () => {
  const res = validateJupiterOrderResponse(null);
  assert.strictEqual(res.valid, false);
});

test('rejects unrecognized transaction structures', () => {
  const res = validateJupiterOrderResponse({ transaction: 12345 });
  assert.strictEqual(res.valid, false);
});
