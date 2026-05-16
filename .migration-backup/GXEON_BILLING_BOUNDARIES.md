# GXEON Billing Boundaries
- Billing/credit deduction must be isolated to `/billing` and DB RPC boundary.
- Payments/provider adapters must live under `/payments` and `/adapters`.
- No mutable in-memory balance may be considered authoritative.
