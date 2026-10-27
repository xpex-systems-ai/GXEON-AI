import fs from "node:fs";
import path from "node:path";
import { request as https } from "node:https";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export function loadProfile(profile) {
  if (!/^[a-z][a-z0-9-]{0,30}$/.test(profile)) throw new Error("SAFE_LOCAL_PROFILE_REQUIRED");
  const dir = path.join(root, ".gx-selfhost", profile), config = JSON.parse(fs.readFileSync(path.join(dir, "config.json")));
  if (!config.testData || config.profile !== profile || ![8443, 8449].includes(config.port) ||
      config.origin !== `https://localhost:${config.port}`) throw new Error("OWN_SYNTHETIC_PROFILE_REQUIRED");
  return { ...config, dir };
}
export function baseEnvironment() {
  return Object.fromEntries(["PATH", "Path", "SystemRoot", "WINDIR", "COMSPEC", "PATHEXT", "HOME", "USERPROFILE", "TEMP", "TMP"]
    .filter(k => process.env[k]).map(k => [k, process.env[k]]));
}
export function command(c, executable, args = [], input, database = "gx01_pilot") {
  if (!["gx01_pilot", "postgres"].includes(database) && !/^gx01_restore_[a-f0-9]{32}$/.test(database)) throw new Error("SAFE_TEST_DATABASE_REQUIRED");
  const env = baseEnvironment();
  let program, parameters;
  if (c.native) {
    if (!c.pgBin || !path.isAbsolute(c.pgBin)) throw new Error("POSTGRES17_BINARY_REQUIRED");
    program = path.join(c.pgBin, executable + (process.platform === "win32" ? ".exe" : ""));
    parameters = ["-h", "127.0.0.1", "-p", String(c.dbPort), "-U", "gx01_pilot_owner", "-d", database, ...args];
    Object.assign(env, { PGPASSWORD: fs.readFileSync(path.join(c.dir, "admin-password"), "utf8").trim(),
      PGSSLMODE: "verify-full", PGSSLROOTCERT: path.join(c.dir, "ca.crt") });
  } else {
    program = "docker";
    parameters = ["compose", "-f", path.join(root, "deploy/self-hosted/compose.yaml"), "exec", "-T", "postgres", executable,
      "-U", "gx01_pilot_owner", "-d", database, ...args];
  }
  try { return execFileSync(program, parameters, { input, env, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true, timeout: 30000, maxBuffer: 16 * 1024 * 1024 }); }
  catch { throw new Error("PORTABLE_DATABASE_OPERATION_FAILED"); }
}
export function sql(c, text, database) { return command(c, "psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1"], text, database).trim(); }
export function web(c, route, { method = "GET", body, cookie, token, trusted = true, servername } = {}) {
  const data = body === undefined ? undefined : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = https({ hostname: "127.0.0.1", port: c.port, path: route, method, agent: false, servername: servername ?? "localhost",
      rejectUnauthorized: true, ...(trusted ? { ca: fs.readFileSync(path.join(c.dir, "ca.crt")) } : {}), timeout: 10000,
      headers: { Origin: c.origin, ...(data ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) } : {}),
        ...(cookie ? { Cookie: cookie } : {}), ...(token ? { Authorization: "Bearer " + token } : {}) } }, res => {
      const parts = []; let size = 0;
      res.on("data", chunk => { size += chunk.length; if (size > (route.startsWith("/assets/") ? 8 : 2) * 1024 * 1024) req.destroy(new Error("BOUNDED_RESPONSE_REQUIRED")); else parts.push(chunk); });
      res.on("end", () => { const text = Buffer.concat(parts).toString("utf8"); resolve({ status: res.statusCode, headers: res.headers,
        text, json: res.headers["content-type"]?.includes("application/json") ? JSON.parse(text) : undefined }); });
    });
    req.on("error", error => { const code = error.code ?? (/^[A-Z0-9_]+$/.test(error.message) ? error.message : "PORTABLE_HTTPS_REQUEST_FAILED"); reject(Object.assign(new Error(code), { code })); });
    req.on("timeout", () => req.destroy(new Error("PORTABLE_HTTPS_TIMEOUT"))); req.end(data);
  });
}
export async function waitReady(c) {
  for (let i = 0; i < 45; i++) {
    try { if ((await web(c, "/api/healthz")).status === 200) return; } catch { /* private startup only */ }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error("PORTABLE_RUNTIME_NOT_READY");
}
