import type { Pool } from "@workspace/db/pool";

export async function assertAuditPilotDatabase(pool: Pick<InstanceType<typeof Pool>, "query">) {
  const result = await pool.query(`SELECT current_database() AS database, current_user AS role,
    current_setting('server_version_num')::int AS version, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls,
    has_database_privilege(current_user, current_database(), 'CREATE') AS database_create,
    has_schema_privilege(current_user, 'public', 'CREATE') AS schema_create
    FROM pg_roles WHERE rolname=current_user`);
  const r = result.rows[0];
  if (!r || r.database !== "gx01_pilot" || r.role !== "gx01_pilot_app" || r.version < 170000 || r.version >= 180000 ||
      r.rolsuper || r.rolcreatedb || r.rolcreaterole || r.rolreplication || r.rolbypassrls || r.database_create || r.schema_create)
    throw new Error("AUDIT_DATABASE_BOUNDARY_REQUIRED");
  for (const table of ["audit_assets", "audit_cases", "audit_evidences", "audit_findings", "audit_reports"]) {
    const grants = (await pool.query(`SELECT
      has_table_privilege(current_user, $1, 'SELECT') AS read,
      has_table_privilege(current_user, $1, 'INSERT') AS insert,
      has_table_privilege(current_user, $1, 'UPDATE') AS update,
      has_table_privilege(current_user, $1, 'DELETE') AS delete,
      has_table_privilege(current_user, $1, 'TRUNCATE') AS truncate,
      has_table_privilege(current_user, $1, 'TRIGGER') AS trigger`, ["public." + table])).rows[0];
    if (!grants?.read || !grants.insert || grants.update !== (table === "audit_cases") || grants.delete || grants.truncate || grants.trigger)
      throw new Error("AUDIT_TABLE_PRIVILEGES_REQUIRED");
  }
  const data = (await pool.query("SELECT EXISTS (SELECT 1 FROM audit_cases WHERE metadata->'scope'->>'testData' IS DISTINCT FROM 'true') AS unsafe")).rows[0];
  if (data?.unsafe) throw new Error("SYNTHETIC_PILOT_DATABASE_REQUIRED");
}
