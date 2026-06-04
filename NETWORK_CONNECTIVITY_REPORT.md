# NETWORK CONNECTIVITY REPORT — NETWORK_CONNECTIVITY_AUDIT

- **Generated at:** 2026-06-04T12:47:27.118Z
- **Priority:** CRITICAL
- **Mode:** DIAGNOSTIC_ONLY
- **Target host:** `db.zphpeynirstwzrzgvbct.supabase.co`
- **Supabase URL:** `https://zphpeynirstwzrzgvbct.supabase.co`
- **Final status:** FAILED
- **Scope:** diagnostics only; no application code, schema, or database mutation was performed.

## Root cause determination

The immediate root cause of `getaddrinfo EAI_AGAIN` is DNS resolver failure inside this execution environment. The container is configured to use resolver `172.30.2.131`, and `nslookup`, `dig`, and `host` all reported that no DNS servers could be reached due to refused and/or timed-out resolver communication. Because DNS resolution fails first, TCP, TLS, and PostgreSQL checks never reach the Supabase database service.

## Executed commands

- `nslookup db.zphpeynirstwzrzgvbct.supabase.co`: **FAILED** — no DNS servers could be reached.
- `dig db.zphpeynirstwzrzgvbct.supabase.co`: **FAILED** — no DNS servers could be reached.
- `host db.zphpeynirstwzrzgvbct.supabase.co`: **FAILED** — no DNS servers could be reached.
- `ping -c 4 db.zphpeynirstwzrzgvbct.supabase.co`: **FAILED** — temporary failure in name resolution.
- `nc -vz db.zphpeynirstwzrzgvbct.supabase.co 5432`: **FAILED** — getaddrinfo temporary failure in name resolution.
- `nc -vz db.zphpeynirstwzrzgvbct.supabase.co 6543`: **FAILED** — getaddrinfo temporary failure in name resolution.
- `openssl s_client -connect db.zphpeynirstwzrzgvbct.supabase.co:5432`: **FAILED** — DNS lookup failed before TLS handshake.
- `openssl s_client -connect db.zphpeynirstwzrzgvbct.supabase.co:6543`: **FAILED** — DNS lookup failed before TLS handshake.
- `psql $DATABASE_URL -c 'SELECT NOW();'`: **NOT RUN** — `psql` is not installed in this container; `DATABASE_URL` is also not configured in the shell environment used for this audit.
- `curl -I https://zphpeynirstwzrzgvbct.supabase.co`: **FAILED** — HTTPS CONNECT through the configured proxy returned HTTP 403.

## Success criteria

- `dns_resolution`: **false**
- `tcp_5432`: **false**
- `tcp_6543`: **false**
- `postgres_connection`: **false**

## Outbound restrictions observed

- DNS resolver from `/etc/resolv.conf`: `172.30.2.131`.
- DNS egress to the configured resolver is failing with refused/timed-out queries.
- Proxy variables are present (`HTTP_PROXY`/`HTTPS_PROXY` point to `http://proxy:8080`).
- HTTPS egress test to Supabase REST failed with `CONNECT tunnel failed, response 403`.

## Conclusion

The Supabase database cannot be reached from this execution environment because DNS resolution fails before any TCP/TLS/PostgreSQL connection can be attempted. This audit performed diagnostics only and did not create application code, modify schema, or modify the database.

## Deliverables

- `DNS_REPORT.json`
- `TCP_CONNECTIVITY_REPORT.json`
- `POSTGRES_CONNECTIVITY_REPORT.json`
- `NETWORK_CONNECTIVITY_REPORT.md`
