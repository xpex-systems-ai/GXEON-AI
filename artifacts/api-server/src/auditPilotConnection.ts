import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { checkServerIdentity } from "node:tls";
import type { AuditPilotConfig } from "./auditPilotConfig";

export function isPrivateAuditAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 10 || a === 127 || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b === 168);
  }
  if (isIP(address) === 6) {
    const text = address.toLowerCase();
    if (text.startsWith("::ffff:") && isIP(text.slice(7)) === 4) return isPrivateAuditAddress(text.slice(7));
    return text === "::1" || /^f[cd][0-9a-f]{2}:/.test(text);
  }
  return false;
}
type Resolve = (hostname: string) => Promise<readonly { address: string; family: number }[]>;
export async function auditPilotConnectionOptions(config: AuditPilotConfig,
  resolve: Resolve = hostname => lookup(hostname, { all: true })) {
  const url = new URL(config.databaseUrl), hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await resolve(hostname);
  if (!addresses.length || addresses.some(a => !isPrivateAuditAddress(a.address))) throw new Error("PRIVATE_AUDIT_DATABASE_ADDRESS_REQUIRED");
  const pinned = addresses.find(a => a.family === 4) ?? addresses[0]!;
  // Connect to the already validated IP: do not perform a second DNS lookup.
  // Verify the certificate against the original operator-approved hostname.
  return { host: pinned.address, port: Number(url.port || 5432), user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password), database: "gx01_pilot", max: 4,
    connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 5000,
    ssl: { rejectUnauthorized: true, minVersion: "TLSv1.2" as const,
      ...(config.databaseCa ? { ca: config.databaseCa } : {}),
      ...(!isIP(hostname) ? { servername: hostname } : {}),
      checkServerIdentity: (_host: string, cert: Parameters<typeof checkServerIdentity>[1]) => checkServerIdentity(hostname, cert) } };
}
