import type { Pool } from "@workspace/db/pool";

export async function assertAuditPilotDatabase(pool: Pick<InstanceType<typeof Pool>, "query">,
  extensions: { enterprise?: boolean; commercial?: boolean } = {}) {
  const result = await pool.query(`SELECT current_database() AS database, current_user AS role,
    current_setting('server_version_num')::int AS version, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls,
    has_database_privilege(current_user, current_database(), 'CREATE') AS database_create,
    has_schema_privilege(current_user, 'public', 'CREATE') AS schema_create,
    EXISTS (SELECT 1 FROM pg_roles member_role WHERE member_role.rolname <> current_user
      AND pg_has_role(current_user, member_role.oid, 'MEMBER')) AS unexpected_membership
    FROM pg_roles WHERE rolname=current_user`);
  const r = result.rows[0];
  if (!r || r.database !== "gx01_pilot" || r.role !== "gx01_pilot_app" || r.version < 170000 || r.version >= 180000 ||
      r.rolsuper || r.rolcreatedb || r.rolcreaterole || r.rolreplication || r.rolbypassrls || r.database_create || r.schema_create || r.unexpected_membership)
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
  if (extensions.commercial && !extensions.enterprise) throw new Error("ENTERPRISE_COMMERCIAL_IDENTITY_REQUIRED");
  const rules: { table: string; read: boolean; insert: boolean; update: readonly string[]; delete?: boolean }[] = [];
  if (extensions.enterprise) rules.push(
    { table: "omnix_organizations", read: true, insert: false, update: [] },
    { table: "omnix_users", read: true, insert: true, update: ["revoked_before"] },
    { table: "omnix_memberships", read: true, insert: true, update: ["revoked_at"] },
    { table: "omnix_invitations", read: true, insert: true, update: ["accepted_at", "revoked_at"] },
    { table: "omnix_delegations", read: true, insert: true, update: ["revoked_at"] },
    { table: "omnix_identity_sessions", read: true, insert: true, update: ["revoked_at"] },
    { table: "omnix_identity_events", read: false, insert: true, update: [] });
  if (extensions.commercial) rules.push({ table: "omnix_commercial_requests", read: true, insert: true,
    update: ["delivery", "acknowledged_at"], delete: true });
  for (const rule of rules) {
    const table = "public." + rule.table;
    const grants = (await pool.query(`SELECT has_table_privilege(current_user,$1,'SELECT') AS read,
      has_table_privilege(current_user,$1,'INSERT') AS insert, has_table_privilege(current_user,$1,'UPDATE') AS broad_update,
      has_table_privilege(current_user,$1,'DELETE') AS delete, has_table_privilege(current_user,$1,'TRUNCATE') AS truncate,
      has_table_privilege(current_user,$1,'TRIGGER') AS trigger`, [table])).rows[0];
    if (!grants || grants.read !== rule.read || grants.insert !== rule.insert || grants.broad_update ||
        grants.delete !== !!rule.delete || grants.truncate || grants.trigger) throw new Error("OMNIX_EXTENSION_PRIVILEGES_REQUIRED");
    const columns = (await pool.query<{ column_name: string; update: boolean }>(`SELECT column_name,
      has_column_privilege(current_user,$1,column_name,'UPDATE') AS update FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$2`, [table, rule.table])).rows;
    if (!columns.length || columns.some(column => column.update !== rule.update.includes(column.column_name)) ||
        rule.update.some(name => !columns.some(column => column.column_name === name))) throw new Error("OMNIX_EXTENSION_COLUMN_GRANTS_REQUIRED");
  }
}
