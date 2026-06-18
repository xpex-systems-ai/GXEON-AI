# AUDIT_OS_CASES_API_REPORT

Added preview-first internal audit case routes. POST /intake/preview never writes. POST /cases is guarded by GXEON_AUDIT_WRITE_MODE=enabled and GXEON_AUDIT_ALLOW_DB_WRITES=true, then checks database/schema readiness before insert. GET routes degrade safely.
