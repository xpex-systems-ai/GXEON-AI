import { readFileSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";

const fileSecrets = ["DATABASE_URL", "GXEON_AUDIT_OPERATOR_TOKEN", "GXEON_AUDIT_REVIEWER_TOKEN",
  "GXEON_AUDIT_DATABASE_TLS_CA", "GXEON_OMNIX_PREVIEW_IDENTITIES", "GXEON_OMNIX_OIDC_CLIENT_SECRET",
  "GXEON_OMNIX_COMMERCIAL_TOKEN", "GXEON_OMNIX_LEAD_TOKEN"] as const;
export function loadAuditPilotSecretFiles(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const result = { ...env };
  try {
    for (const name of fileSecrets) {
      const file = env[name + "_FILE"];
      if (!file) continue;
      if (env[name] || !isAbsolute(file)) throw new Error("INVALID_SECRET_FILE");
      const info = statSync(file);
      if (!info.isFile() || info.size < 1 || info.size > 65536) throw new Error("INVALID_SECRET_FILE");
      result[name] = readFileSync(file, "utf8").trim();
      if (!result[name]) throw new Error("INVALID_SECRET_FILE");
    }
  } catch { throw new Error("AUDIT_SECRET_FILES_REQUIRED"); }
  return result;
}
