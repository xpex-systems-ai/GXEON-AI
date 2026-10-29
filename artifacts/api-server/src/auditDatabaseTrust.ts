import { BlockList, isIP } from "node:net";

export type AuditDatabaseNetwork = "private-ca" | "render-external-public-ca" | "supabase-direct-ca";
const reviewPattern = /^https:\/\/github\.com\/xpex-systems-ai\/GXEON-AI\/pull\/456#pullrequestreview-[1-9][0-9]*$/;
export const isRenderAuditDatabaseHost = (hostname: string) => /^dpg-[a-z0-9]{10,64}-[a-z]\.oregon-postgres\.render\.com$/.test(hostname);
export const isSupabaseAuditDatabaseHost = (hostname: string, projectRef: string) =>
  /^[a-z0-9]{20}$/.test(projectRef) && hostname === `db.${projectRef}.supabase.co`;


// An explicit candidate profile, never an attestation. The deployment preflight
// must verify the independent human review; no approval is inferred from env.
export function loadAuditDatabaseNetwork(env: NodeJS.ProcessEnv, mode: string, database: URL): AuditDatabaseNetwork {
  const profile = env.GXEON_AUDIT_DATABASE_NETWORK ?? "private-ca";
  if (profile === "private-ca") return profile;
  if (profile === "supabase-direct-ca") {
    // Candidate sandbox only. Real customers remain disabled at the HTTP/data gates.
    // Direct Supabase endpoint needs public IPv6 or an explicitly purchased IPv4 route;
    // pooler hosts/ports are not silently treated as the direct service.
    if (!["private", "render", "railway"].includes(mode) ||
        env.GXEON_AUDIT_SUPABASE_SANDBOX !== "true" ||
        !isSupabaseAuditDatabaseHost(database.hostname, env.GXEON_AUDIT_SUPABASE_PROJECT_REF ?? "") ||
        env.GXEON_AUDIT_DATABASE_HOST !== database.hostname ||
        database.pathname !== "/postgres" ||
        (database.port && database.port !== "5432") ||
        !/^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----\s*$/.test(env.GXEON_AUDIT_DATABASE_TLS_CA ?? "") ||
        env.NODE_TLS_REJECT_UNAUTHORIZED === "0")
      throw new Error("AUDIT_DATABASE_IDENTITY_REVIEW_REQUIRED");
    return profile;
  }
  if (profile !== "render-external-public-ca" || mode !== "render" ||
      env.GXEON_AUDIT_DATABASE_HOST !== database.hostname ||
      !isRenderAuditDatabaseHost(database.hostname) ||
      (database.port && database.port !== "5432") || env.GXEON_AUDIT_DATABASE_TLS_CA ||
      !/^[a-f0-9]{40}$/.test(env.RENDER_GIT_COMMIT ?? "") ||
      env.GXEON_AUDIT_DATABASE_REVIEW_COMMIT !== env.RENDER_GIT_COMMIT ||
      !reviewPattern.test(env.GXEON_AUDIT_DATABASE_REVIEW_REFERENCE ?? ""))
    throw new Error("AUDIT_DATABASE_IDENTITY_REVIEW_REQUIRED");
  return profile;
}

const deniedV4 = new BlockList(), globalV6 = new BlockList(), deniedV6 = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) deniedV4.addSubnet(address, prefix, "ipv4");
globalV6.addSubnet("2000::", 3, "ipv6");
deniedV6.addSubnet("2001::", 23, "ipv6"); deniedV6.addSubnet("2001:db8::", 32, "ipv6"); deniedV6.addSubnet("2002::", 16, "ipv6");
deniedV6.addSubnet("3fff::", 20, "ipv6");

export function isPublicAuditAddress(address: string): boolean {
  if (isIP(address) === 4) return !deniedV4.check(address, "ipv4");
  return isIP(address) === 6 && globalV6.check(address, "ipv6") && !deniedV6.check(address, "ipv6");
}
