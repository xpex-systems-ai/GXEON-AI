/**
 * GXEON Paid-Work #002 — Jupiter Swap V2 Order Response Typeguard & Safety Demo
 * Docs commit: 1de8fd0
 */

export function validateJupiterOrderResponse(response) {
  if (!response || typeof response !== 'object') {
    return { valid: false, error: 'Invalid response format: expected object' };
  }

  const { transaction, errorCode, error } = response;

  // Check transaction status contract
  if (transaction === null) {
    return { valid: true, state: 'QUOTE_ONLY', message: 'Valid quote-only response with null transaction' };
  }

  if (transaction === '') {
    return { valid: true, state: 'PRICE_QUOTE_ONLY', message: 'Valid price quote without buildable transaction' };
  }

  if (typeof transaction === 'string' && transaction.length > 0) {
    return { valid: true, state: 'BUILDABLE_TRANSACTION', message: 'Buildable transaction string present' };
  }

  // Handle router-dependent error codes (e.g. errorCode: 2)
  if (errorCode !== undefined) {
    return {
      valid: true,
      state: 'ROUTER_ERROR',
      errorCode,
      error: error || 'Unknown router error',
      message: `Router returned error code ${errorCode}`
    };
  }

  return { valid: false, error: 'Unrecognized transaction or error contract state' };
}
