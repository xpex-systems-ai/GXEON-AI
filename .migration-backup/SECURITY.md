# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

## Reporting a Vulnerability

At GXeon AI, we take the security of our infrastructure seriously. Given the nature of our platform (DePIN, AI agents, and smart contract automations), we have specific procedures for handling security disclosures.

### ⚠️ Critical: Do NOT Create Public Issues

**DO NOT** report security vulnerabilities via public GitHub Issues. This includes but is not limited to:

- Supabase API keys or database credentials
- Smart contract private keys or deployment configurations
- Vercel/Railway deployment tokens
- Autonolas agent private keys
- Gelato relay API secrets

### ✅ How to Report

Please report security vulnerabilities by emailing the maintainers directly:

**📧 security@xpex-systems.ai**

Include the following information:
- **Type of vulnerability** (e.g., SQL injection, key exposure, contract vulnerability)
- **Affected component** (Supabase, contracts, frontend, etc.)
- **Steps to reproduce** (minimal test case)
- **Impact assessment** (what data/systems are at risk)
- **Suggested fix** (if applicable)

### Response Timeline

| Phase | Timeline | Action |
|-------|----------|--------|
| Acknowledgment | Within 24 hours | Confirm receipt of report |
| Initial Assessment | Within 72 hours | Validate and assess severity |
| Fix Implementation | 1-2 weeks | Develop and test patch |
| Public Disclosure | Coordinated | Release advisory with credit |

### Security Best Practices for Contributors

- Never commit `.env` files or credentials
- Use Row Level Security (RLS) policies for all database tables
- Validate all inputs on both frontend and backend
- Run `npm audit` before submitting PRs
- Keep dependencies updated via automated security alerts

## Hall of Fame

We publicly acknowledge security researchers who responsibly disclose vulnerabilities. Your contribution helps keep the Web3 ecosystem safe.

---

*Last updated: April 2026*
