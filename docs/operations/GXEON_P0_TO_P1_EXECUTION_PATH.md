# GXEON P0 to P1 Execution Path

## P0 baseline

P0 contains the safe acquisition and planning pipeline:

- Radar X preview-only signals;
- Opportunity Inbox in-memory records;
- qualification;
- proposal preview;
- task preview;
- evidence plan;
- Home Center agent readiness registry.

## P1 addition

P1 adds an internal Task Queue that materializes Task Preview output as a listable task record. The task record includes the source opportunity, checklist, connector requirements, approval gates, forbidden actions, evidence requirements, rollback requirements, and safety flags.

## Operator-confirmed conversion

Task Preview generation does not create a task. Task creation requires a separate operator-confirmed request to `/api/tasks/from-opportunity/:opportunityId`.

## Manual approval semantics

`APPROVED_FOR_MANUAL_EXECUTION` means only that the operator has approved manual work outside autonomous systems. GXEON does not execute, deploy, write to GitHub, contact external users, or collect payments from this status change.
