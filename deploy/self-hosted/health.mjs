import { readFileSync } from "node:fs";
import { request } from "node:https";
const servername = new URL(process.env.GXEON_AUDIT_ALLOWED_ORIGINS.split(",")[0]).hostname;
const req = request({ hostname: "127.0.0.1", servername, port: Number(process.env.PORT), path: "/api/readyz",
  ...(process.env.GXEON_AUDIT_HTTPS_CA_FILE ? { ca: readFileSync(process.env.GXEON_AUDIT_HTTPS_CA_FILE) } : {}), rejectUnauthorized: true,
  headers: { Authorization: "Bearer " + readFileSync(process.env.GXEON_AUDIT_OPERATOR_TOKEN_FILE, "utf8").trim() }, timeout: 5000 },
res => { res.resume(); res.on("end", () => { process.exitCode = res.statusCode === 200 ? 0 : 1; }); });
req.on("error", () => { process.exitCode = 1; }); req.on("timeout", () => req.destroy()); req.end();
