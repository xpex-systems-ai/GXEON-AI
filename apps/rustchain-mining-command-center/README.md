# GXEON RustChain Mining Command Center

A local-first GXEON/XPEX operations dashboard for RustChain telemetry.

## Current architecture

Dashboard → Vite local proxy → GXEON Local Bridge → RustChain public node

The browser does not read private keys, seeds, or mnemonics.

## Run dashboard

```powershell
npm.cmd install
npm.cmd run dev
```

## Run Local Bridge

In a second PowerShell:

```powershell
python .\bridge.py
```

The bridge listens only on `127.0.0.1:8788`, reads public RustChain node telemetry, and never reads or exposes private keys, seed phrases, or mnemonics.

The UI polls `/api/status` every 10 seconds. Vite proxies `/api/*` to `http://127.0.0.1:8788`, avoiding browser CORS/port issues when Vite uses 5173, 5174, or another local port.

Payment remains **NOT VERIFIED** until real settlement, ledger, transaction, or balance-delta evidence is integrated.

## Current known state

- Hardware fingerprint: 6/6 PASS
- Hardware binding: BOUND
- Attestation: ACTION_REQUIRED
- Enrollment: BLOCKED
- Current blocker: `ENROLLMENT_SIGNING_KEY_REQUIRED`
- RTC payment: NOT VERIFIED

## Security boundary

The dashboard is presentation + public telemetry only. Any future signing or wallet-sensitive operation must stay on the Windows host and must not expose private keys to the browser.
