// Trusted, bounded compatibility fixtures. No external URLs, mobile tunnels or certificate provisioning.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { once } from "node:events";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { repoRoot, stateDir } from "./config.mjs";

const baselinePath = path.join(repoRoot, "docs/audit-os/gx-01-6/evidence/baseline-audit.json.gz");
const { gunzipSync: unzip } = await import("node:zlib");
const audit = JSON.parse(unzip(await readFile(baselinePath)));
const expected = [
  ["body-parser", "2.3.0", "2.4.0"], ["fast-uri", "3.1.8", "3.1.9"],
  ["undici", "6.25.0", "6.29.1"], ["ws", "6.2.3", "6.2.6"], ["ws", "7.5.10", "7.5.13"],
  ["js-yaml", "3.14.2", "3.15.2"], ["brace-expansion", "2.1.0", "2.1.7"],
  ["tar", "7.5.19", "7.5.21"], ["@xmldom/xmldom", "0.8.13", "0.8.15"],
  ["@xmldom/xmldom", "0.9.10", "0.9.12"], ["compression", "1.8.1", "1.8.2"],
];
const resolved = [];
for (const [name, before, version] of expected) {
  const paths = [...new Set(Object.values(audit.advisories).filter(a => a.module_name === name)
    .flatMap(a => a.findings.filter(f => f.version === before).flatMap(f => f.paths)))].sort((a, b) => a.length - b.length);
  let match;
  for (const chain of paths) {
    try {
      const [workspace, ...parts] = chain.split(">");
      let req = createRequire(path.join(repoRoot, workspace.replaceAll("__", "/"), "package.json"));
      let parentEntry;
      for (const part of parts.slice(0, -1)) {
        try { parentEntry = req.resolve(part); }
        catch (error) {
          if (error.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") throw error;
          // @expo/metro intentionally exports subpaths only; resolve its package location, not its executable.
          parentEntry = undefined;
          for (const directory of req.resolve.paths(part) ?? []) {
            const candidate = path.join(directory, part, "package.json");
            try { if ((await stat(candidate)).isFile()) { parentEntry = candidate; break; } } catch { /* continue Node search paths */ }
          }
          if (!parentEntry) throw error;
        }
        req = createRequire(parentEntry);
      }
      const entry = req.resolve(name);
      let directory = path.dirname(entry), manifest;
      for (let n = 0; n < 8; n++) {
        try { const data = JSON.parse(await readFile(path.join(directory, "package.json"), "utf8")); if (data.name === name) { manifest = data; break; } } catch { /* find actual package root */ }
        directory = path.dirname(directory);
      }
      if (manifest?.version !== version) continue;
      match = { name, before, version, chain, module: req(name), parent: parentEntry && /(?:@expo\/plist|>plist)>/.test(chain) ? req(parentEntry) : undefined };
      break;
    } catch { /* some audit paths are recursive alternatives; preserve a resolvable installed chain */ }
  }
  assert.ok(match, "Installed parent chain must resolve reviewed version: " + name + " " + version);
  resolved.push(match);
}
const get = (name, version) => resolved.find(r => r.name === name && (!version || r.version === version)).module;
const yaml = get("js-yaml"); assert.deepEqual(yaml.safeLoad(yaml.safeDump({ testData: true, checks: ["fixture"] })), { testData: true, checks: ["fixture"] });
assert.deepEqual(get("brace-expansion")("audit-{one,two}.json"), ["audit-one.json", "audit-two.json"]);
for (const item of resolved.filter(r => r.name === "@xmldom/xmldom")) {
  const document = new item.module.DOMParser().parseFromString('<audit name="TEST DATA"><evidence>one &amp; two</evidence></audit>', "text/xml");
  assert.equal(document.documentElement.getAttribute("name"), "TEST DATA");
  assert.match(new item.module.XMLSerializer().serializeToString(document), /one &amp; two/);
  if (item.parent?.build && item.parent?.parse) assert.deepEqual(item.parent.parse(item.parent.build({ TestData: true, Label: "fixture" })), { TestData: true, Label: "fixture" });
}
const fixture = path.join(stateDir, "dependency-smoke", randomUUID());
await mkdir(path.join(fixture, "restored"), { recursive: true });
await writeFile(path.join(fixture, "test-data.txt"), "TEST DATA bounded archive fixture");
const tar = get("tar");
await tar.c({ cwd: fixture, file: path.join(fixture, "fixture.tar") }, ["test-data.txt"]);
assert.ok((await stat(path.join(fixture, "fixture.tar"))).size < 65536);
await tar.x({ cwd: path.join(fixture, "restored"), file: path.join(fixture, "fixture.tar") });
assert.equal(await readFile(path.join(fixture, "restored/test-data.txt"), "utf8"), "TEST DATA bounded archive fixture");
const apiRequire = createRequire(path.join(repoRoot, "artifacts/api-server/package.json"));
const express = apiRequire("express"), text = "TEST DATA ".repeat(800);
const app = express(); app.use(get("compression")({ threshold: 0 })); app.get("/fixture", (_req, res) => res.type("text/plain").send(text));
const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
try {
  const response = await get("undici").request(`http://127.0.0.1:${server.address().port}/fixture`, { headers: { "accept-encoding": "gzip" }, headersTimeout: 5000, bodyTimeout: 5000 });
  assert.equal(response.statusCode, 200); assert.equal(response.headers["content-encoding"], "gzip");
  assert.equal(gunzipSync(Buffer.from(await response.body.arrayBuffer())).toString(), text);
} finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
for (const version of ["6.2.6", "7.5.13"]) {
  const WebSocket = get("ws", version), socketServer = new WebSocket.Server({ host: "127.0.0.1", port: 0, perMessageDeflate: false });
  await once(socketServer, "listening");
  socketServer.on("connection", socket => socket.on("message", data => socket.send(data)));
  const client = new WebSocket(`ws://127.0.0.1:${socketServer.address().port}`);
  try { await once(client, "open"); const message = once(client, "message"); client.send("TEST DATA echo"); assert.equal(String((await message)[0]), "TEST DATA echo"); }
  finally { client.terminate(); for (const socket of socketServer.clients) socket.terminate(); await new Promise(resolve => socketServer.close(resolve)); }
}
const result = { testData: true, status: "PASS", externalNetworkUsed: false, fixturesRetained: true,
  versions: resolved.map(({ name, before, version, chain }) => ({ name, before, version, chain })),
  checks: ["installed parent resolution", "YAML3 roundtrip", "brace2 expansion", "XML0.8/0.9 and plist roundtrip", "tar7 create/extract new fixture", "Undici6 HTTP + compression1 gzip", "ws6/ws7 echo"],
  fixtureContentSha256: createHash("sha256").update(text).digest("hex") };
await mkdir(path.join(stateDir, "evidence"), { recursive: true });
await writeFile(path.join(stateDir, "evidence/dependency-smoke.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
