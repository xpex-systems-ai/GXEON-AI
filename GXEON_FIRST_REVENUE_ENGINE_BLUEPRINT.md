# GXEON First Revenue Engine Blueprint

**Mission:** GXEON_LEAN_STACK_FOUNDATION  
**Revenue model:** Freelance Revenue Engine  
**Activation mode:** Manual-first, AI-assisted, no unnecessary automation  
**Initial modules:** Radar X, Task Engine, Agent Hub, Financial Core, Portfolio Vault

## Objective

Prepare the first monetization engine that turns market opportunities into tracked proposals, delivered projects, and financial ledger entries without prematurely connecting external marketplaces or automating production workflows.

## Operating principles

1. **Manual-first:** humans approve opportunity selection, proposal submission, delivery commitments, and payment follow-up.
2. **AI-assisted:** ChatGPT/Codex help draft proposals, scope work, create delivery plans, and generate reports.
3. **Supabase-ready:** data model is designed for Supabase/Postgres, but no migration is implemented in this mission.
4. **Financially accountable:** every won project should map to expected revenue, invoices/payment attempts, and ledger activity.
5. **Lean-stack compliant:** no Vercel, Codespaces, Replit, Railway activation, or additional infrastructure providers.

## Opportunity data model

Recommended conceptual fields:

| Field | Purpose |
|---|---|
| `id` | Internal opportunity UUID |
| `source` | Manual, GitHub, referral, marketplace, inbound, outbound |
| `source_url` | Link to public job/client page when available |
| `title` | Opportunity title |
| `client_name` | Client or company name |
| `client_contact` | Contact handle/email, stored only if authorized |
| `market` | Freelance, agency, SaaS setup, automation, AI ops, dashboard, backend |
| `description` | Summarized business need |
| `budget_min` / `budget_max` | Estimated range |
| `currency` | Default target currency |
| `deadline` | Client deadline when known |
| `fit_score` | 0-100 GXEON fit score |
| `urgency_score` | 0-100 urgency score |
| `margin_score` | 0-100 profit/effort score |
| `risk_score` | 0-100 risk score |
| `status` | New, reviewing, qualified, rejected, proposal_drafted, proposed, won, lost, archived |
| `owner_actor_id` | Internal owner/operator |
| `created_at` / `updated_at` | Audit timestamps |

## Proposal data model

Recommended conceptual fields:

| Field | Purpose |
|---|---|
| `id` | Internal proposal UUID |
| `opportunity_id` | Linked opportunity |
| `version` | Proposal version number |
| `proposal_title` | Client-facing proposal title |
| `scope_summary` | Short offer summary |
| `deliverables` | Structured deliverable list |
| `timeline_days` | Estimated delivery duration |
| `price_amount` | Proposed price |
| `currency` | Proposal currency |
| `payment_terms` | Milestone, upfront, upon delivery, retainer |
| `ai_draft_prompt` | Redacted prompt metadata or prompt ID, not secrets |
| `ai_draft_output` | Draft proposal text after human review |
| `human_notes` | Operator edits/decision notes |
| `status` | Draft, ready_for_review, approved, sent, accepted, rejected, expired |
| `sent_at` / `accepted_at` | Pipeline timestamps |

## Client/project pipeline

1. **Lead captured** in Radar X.
2. **Opportunity qualified** by fit, budget, urgency, and risk.
3. **Task Engine creates scoping checklist** for discovery questions and effort estimate.
4. **Agent Hub assigns operator/agent responsibilities** for proposal, delivery, QA, and reporting.
5. **Proposal drafted with AI assistance** and manually reviewed.
6. **Proposal sent manually** by the operator through the chosen client channel.
7. **Won opportunity becomes project** with milestones and financial tracking.
8. **Financial Core tracks expected revenue, payment attempts, ledger movements, and settlement status.**
9. **Portfolio Vault stores final deliverables, case-study notes, screenshots, and proof of work.**

## Manual-first workflow

| Step | Human action | AI/Codex assist | Automation boundary |
|---|---|---|---|
| Discover | Add opportunity manually | Summarize client need | No scraping or marketplace automation |
| Qualify | Approve/reject opportunity | Fit/risk scoring draft | No automatic application |
| Scope | Confirm deliverables | Generate scope checklist | No contract auto-send |
| Price | Approve price | Estimate effort/margin | No payment creation without approval |
| Propose | Send manually | Draft proposal | No client impersonation |
| Deliver | Execute project | Generate implementation plan/report | No production deploy without approval |
| Track | Update financial status | Suggest ledger classification | No DB mutation until approved |

## AI-assisted proposal generation flow

1. Operator selects a qualified opportunity.
2. System compiles non-secret context: title, client need, constraints, budget, timeline, portfolio references.
3. ChatGPT drafts:
   - short client summary;
   - proposed outcome;
   - deliverables;
   - timeline;
   - pricing rationale;
   - risk boundaries;
   - next-step call to action.
4. Operator edits and approves.
5. Proposal status changes to `approved` or `sent` only after manual confirmation.

## Delivery/reporting flow

- Create a delivery checklist per accepted proposal.
- Track milestone status: planned, in_progress, blocked, delivered, accepted.
- Generate client updates manually from structured progress notes.
- Store proof-of-work artifacts in Portfolio Vault.
- Convert successful projects into reusable portfolio case studies after client approval.

## Financial tracking fields

Recommended fields for won projects:

| Field | Purpose |
|---|---|
| `expected_revenue_amount` | Forecast revenue |
| `currency` | Revenue currency |
| `payment_schedule` | Upfront/milestone/final/retainer |
| `invoice_reference` | Manual invoice or payment reference |
| `transaction_id` | Link to `global_transactions` when payment exists |
| `wallet_id` | Link to `actor_wallets` when applicable |
| `ledger_entry_ids` | Related financial ledger entries |
| `payment_status` | Not_started, requested, pending, paid, failed, refunded, disputed |
| `recognized_revenue_amount` | Amount recognized after delivery/acceptance |
| `cost_estimate_amount` | Estimated internal cost |
| `gross_margin_amount` | Revenue minus cost estimate |

## Initial implementation recommendation

Do not implement database tables in this mission. Next mission should first stabilize Supabase environment readiness, then add a small Postgres/Drizzle schema extension for opportunities and proposals only after explicit approval.
