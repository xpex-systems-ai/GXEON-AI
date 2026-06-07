# Supabase Connector Storage Readiness

## Scope

Supabase is the candidate future state store for opportunities, tasks, executions, validations, releases, ledger records, connector states, auth, and storage metadata.

## Checklist

- Review schema requirements before creating connector tables.
- Define RLS policy expectations for every future table.
- Define auth boundaries for operator access.
- Define storage buckets and metadata boundaries before file usage.
- Keep service role usage strictly backend-only.
- Confirm no writes, no migrations, and no service role exposure during P0.

## Exclusions

No migrations, SQL, service role keys, connection strings, direct URLs, or database credentials are included.
