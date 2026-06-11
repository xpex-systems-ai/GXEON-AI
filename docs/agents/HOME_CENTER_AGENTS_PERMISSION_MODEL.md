# Home Center Agents Permission Model

The default policy is `DENY_EXECUTION_ALLOW_PLANNING`.

## Permission classes

- `READ`: may read internal P0 state only.
- `PLAN`: may define checklists, rollback requirements or proof requirements only.
- `DRAFT`: may generate draft-only previews for operator review only.
- `SUGGEST`: may recommend categories, next steps, risks or offers only.
- `APPROVE_REQUIRED`: any future action must be gated by explicit operator approval.

## Forbidden action classes

| Agent | Forbidden actions |
| --- | --- |
| Scout Agent | external_contact, github_write, auto_apply, payment_action |
| Analyst Agent | execute_task, contact_client, commit_code, payment_action |
| Proposal Agent | send_email, send_dm, submit_proposal, create_invoice |
| Task Agent | execute_code, modify_repo, deploy_service, change_database |
| Evidence Agent | fake_evidence, claim_completion, publish_report |
| Revenue Agent | capture_payment, create_checkout, refund, move_money |
| Security Agent | disable_safety, expose_tokens, approve_own_execution |
| Operator Copilot | override_operator, auto_approve, execute_without_confirmation |

## Manual approval gates

Every Home Center Agent record includes these gates:

1. Operator review required.
2. Execution remains disabled.

These gates are active even while agents are only `READY_FOR_INSTALL`. Future installation must preserve the rule that agents cannot approve their own execution or bypass Junior Sena/operator confirmation.
