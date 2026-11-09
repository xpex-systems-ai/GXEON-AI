# Jupiter Swap V2 API Analysis

## Response Contract: `GET /swap/v2/order`

### Transaction Field States
- `transaction: null`: Indicates a quote-only response. No transaction payload is available.
- `transaction: ""`: Indicates a price quote where the transaction cannot be built (e.g., liquidity constraints).
- `transaction: string`: A base64 encoded transaction ready for signing.

### Error Code Semantics (`errorCode: 2`)
- `Metis`: Insufficient SOL for gas/fees.
- `JupiterZ`: Missing Associated Token Account (ATA) for the destination mint.
