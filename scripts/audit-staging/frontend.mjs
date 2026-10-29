import http from "node:http";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { timingSafeEqual } from "node:crypto";
import { loadConfig, repoRoot } from "./config.mjs";

if (process.env.NODE_ENV !== "test" || process.env.GXEON_AUDIT_STAGING !== "true") throw new Error("EXPLICIT_TEST_STAGING_REQUIRED");
const config = await loadConfig();
const root = path.join(repoRoot, "artifacts/gxeon-dashboard/dist/public");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".jpg": "image/jpeg" };
const server = http.createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.url === "/__stage/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ testData: true, instanceId: config.instanceId, pid: process.pid }));
    return;
  }
  if (req.url === "/__stage/stop" && req.method === "POST") {
    const token = Buffer.from(String(req.headers["x-gx-stage-control"] ?? ""));
    const expected = Buffer.from(config.controlToken);
    if (token.length !== expected.length || !timingSafeEqual(token, expected)) { res.writeHead(403); res.end(); return; }
    res.writeHead(200); res.end(); server.closeAllConnections(); server.close(() => process.exit(0)); return;
  }
  if (req.url === "/api" || req.url.startsWith("/api/")) {
    const upstream = http.request({
      hostname: "127.0.0.1", port: config.apiPort, path: req.url,
      method: req.method, headers: { ...req.headers, host: `127.0.0.1:${config.apiPort}` },
      timeout: 15000,
    }, (response) => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
    upstream.on("timeout", () => upstream.destroy());
    upstream.on("error", () => { if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json" }); res.end('{"ok":false,"code":"STAGING_API_UNAVAILABLE"}'); });
    req.pipe(upstream); return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    let file = path.resolve(root, "." + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(400); res.end(); return; }
    let data;
    try { data = await readFile(file); }
    catch {
      if (path.extname(pathname)) { res.writeHead(404); res.end(); return; }
      file = path.join(root, "index.html"); data = await readFile(file);
    }
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] ?? "application/octet-stream" }); res.end(data);
  } catch {
    res.writeHead(400); res.end("Invalid local test request.");
  }
});
server.listen(config.uiPort, "127.0.0.1", () => console.log("GX-01.2 frontend TEST DATA on loopback; no public exposure."));
