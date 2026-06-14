# GXEON Connector Security Boundary

All P0 connectors are `MANUAL_FIRST` with manual approval required, frontend secrets disabled, destructive actions disabled, payments disabled, wallet signing disabled, and external automation disabled.

CLI instructions are copyable runbooks only. The API never executes CLI commands, clones external repositories, submits quests, sends messages, mutates production databases, or performs marketplace writes.

OAuth launch actions expose only authorization URLs and scope names. Client secrets and token values are never returned to the frontend.
