import fs from "node:fs";
import path from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const profile = process.argv[2] ?? "compose", native = process.argv.includes("--native");
if (!/^[a-z][a-z0-9-]{0,30}$/.test(profile)) throw new Error("SAFE_LOCAL_PROFILE_REQUIRED");
const dir = path.join(root, ".gx-selfhost", profile);
if (fs.existsSync(dir)) throw new Error("PROFILE_EXISTS_NO_OVERWRITE");
const openssl = process.env.GXEON_OPENSSL_BIN ?? "openssl", secret = () => randomBytes(32).toString("base64url");
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
const write = (name, value, mode = 0o444) => fs.writeFileSync(path.join(dir, name), value, { flag: "wx", mode });
const ssl = args => { try { execFileSync(openssl, args, { cwd: dir, stdio: "ignore", windowsHide: true }); } catch { throw new Error("LOCAL_CERTIFICATE_GENERATION_FAILED"); } };
ssl(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "14", "-subj", "/CN=OMNIX local preview CA", "-keyout", "ca.key", "-out", "ca.crt", "-addext", "basicConstraints=critical,CA:TRUE", "-addext", "keyUsage=critical,keyCertSign,cRLSign"]);
for (const name of ["postgres", "web"]) {
  write(name + ".ext", "basicConstraints=critical,CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:localhost,DNS:postgres,IP:127.0.0.1,IP:::1\n");
  ssl(["req", "-new", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=" + (name === "web" ? "localhost" : "postgres"), "-keyout", name + ".key", "-out", name + ".csr"]);
  ssl(["x509", "-req", "-in", name + ".csr", "-CA", "ca.crt", "-CAkey", "ca.key", "-CAcreateserial", "-days", "14", "-sha256", "-extfile", name + ".ext", "-out", name + ".crt"]);
  fs.chmodSync(path.join(dir, name + ".key"), 0o444);
}
fs.chmodSync(path.join(dir, "ca.key"), 0o400);
const admin = secret(), app = secret(), operator = secret(), reviewer = secret();
write("admin-password", admin); write("app-password", app); write("operator-token", operator); write("reviewer-token", reviewer);
const host = native ? "127.0.0.1" : "postgres", dbPort = native ? 55439 : 5432, port = native ? 8449 : 8443;
write("database-url", `postgresql://gx01_pilot_app:${app}@${host}:${dbPort}/gx01_pilot`);
const identities = [{ id: "test-submitter-a", name: "OMNIX submitter / TEST DATA", role: "operator", organizationId: "test-company-a" },
  { id: "test-reviewer-a", name: "OMNIX reviewer / TEST DATA", role: "reviewer", organizationId: "test-company-a" },
  { id: "test-submitter-b", name: "Other organization / TEST DATA", role: "operator", organizationId: "test-company-b" }].map(i => ({ ...i, code: secret() }));
write("identities.json", JSON.stringify(identities.map(({ code, ...i }) => ({ ...i, accessCodeSha256: createHash("sha256").update(code).digest("hex") }))));
write("access.json", JSON.stringify({ testData: true, identities }, null, 2), 0o400);
write("config.json", JSON.stringify({ profile, native, host, dbPort, port, pgBin: native ? process.env.GXEON_STAGING_PG_BIN : undefined,
  origin: `https://localhost:${port}`, generatedAt: new Date().toISOString(), testData: true }, null, 2), 0o400);
console.log("Portable synthetic profile created; private directory .gx-selfhost/" + profile + ". No credential printed. Local CA is NOT installed in any browser or OS trust store.");
