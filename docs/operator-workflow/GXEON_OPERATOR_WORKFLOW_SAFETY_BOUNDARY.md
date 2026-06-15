# GXEON Operator Workflow Safety Boundary

- No external contact: GXEON does not send WhatsApp, email, Telegram or SMS.
- No payment API: GXEON does not call Mercado Pago or any payment provider.
- No checkout: GXEON does not create checkout sessions or links.
- No invoice: GXEON does not create fiscal or commercial invoices.
- No GitHub write: runtime handoffs do not comment, open PRs or write to GitHub.
- No scraping: handoffs use operator-provided context only.
- No wallet action: GXEON does not connect wallets, sign transactions or move funds.
- No revenue claim without operator proof: all amounts are previews until an operator confirms evidence outside GXEON.
- No autonomous execution: all status transitions are manual UI/API events requested by the operator.
