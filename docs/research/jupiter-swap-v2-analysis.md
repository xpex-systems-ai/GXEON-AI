# Jupiter Swap V2 API Analysis

## Overview
Analysis of the `GET /swap/v2/order` endpoint based on Jupiter docs commit `1de8fd0`.

## Key Findings
1. **Transaction Field Ambiguity**:
   - `transaction: null`: Indicates a quote-only response.
   - `transaction: ""`: Indicates a price quote where a transaction cannot be built.
   - `transaction: <string>`: A base64 encoded transaction ready for signing.
2. **Error Handling**:
   - `errorCode: 2` is overloaded. It represents both 'Insufficient SOL' (Metis) and 'Missing Associated Token Account' (JupiterZ). Implementers must check the `message` field or associated metadata to differentiate.

## Recommendations
- Always implement a strict typeguard for the `transaction` field before attempting to deserialize or sign the payload.