# AUDIT_OS_SECRET_GUARD_REPORT

Implemented detectPotentialSecrets for service_role, JWT-like tokens, DATABASE_URL, sk- keys, API key markers, password=, and postgres URLs. Suspicious intake is blocked before preview/create and sensitive text is not logged.
