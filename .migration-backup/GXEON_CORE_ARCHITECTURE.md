# GXEON Core Architecture
This restructure phase establishes deterministic domain boundaries without deleting business logic.

## Domain targets
- `/core`: stable domain logic only.
- `/runtime`: process lifecycle and orchestration control.
- `/workflows`: workflow definitions and step semantics.
- `/adapters`: external integrations.
- `/billing` + `/payments`: financial critical paths only.
