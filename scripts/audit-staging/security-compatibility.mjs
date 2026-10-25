// Bounded fixtures exercise reviewed parent call sites; no tunnel or external request.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile, realpath, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { repoRoot, stateDir } from "./config.mjs";

const versions = [];
async function resolveChain(workspace, names, expected) {
  let req = createRequire(path.join(repoRoot, workspace, "package.json")), manifest, parent;
  for (const name of names) {
    manifest = undefined;
    for (const dir of req.resolve.paths(name) ?? []) {
      try { manifest = await realpath(path.join(dir, name, "package.json")); break; } catch { /* Node package search */ }
    }
    assert.ok(manifest, "Installed chain must resolve " + name);
    parent = req; req = createRequire(manifest);
  }
  const data = JSON.parse(await readFile(manifest, "utf8"));
  assert.equal(data.version, expected);
  versions.push({ workspace, chain: names, version: data.version });
  return { module: parent(data.name), parent, directory: path.dirname(manifest) };
}
const mobile = "artifacts/gxeon-dashboard-mobile";
const metroChain = ["@expo/cli", "@expo/metro", "metro"];
const image = await resolveChain(mobile, [...metroChain, "image-size"], "2.0.3");
const metroRequire = image.parent;
const metroAssets = metroRequire("./src/Assets.js");
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j7ZkAAAAASUVORK5CYII=", "base64");
assert.deepEqual(metroAssets.getAssetSize("png", png, "TEST-DATA.png"), { width: 1, height: 1 });
assert.equal(metroAssets.getAssetSize("txt", Buffer.from("TEST DATA"), "fixture.txt"), null);
assert.throws(() => metroAssets.getAssetSize("png", Buffer.alloc(0), "empty.png"));

for (const chain of [["@expo/cli", "@expo/config-plugins", "xcode", "uuid"], ["@expo/ngrok", "uuid"]]) {
  const item = await resolveChain(mobile, chain, "11.1.1"), uuid = item.module;
  assert.match(uuid.v4(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.throws(() => uuid.v3("TEST DATA", "6ba7b810-9dad-11d1-80b4-00c04fd430c8", new Uint8Array(2)), /buffer|range|length|offset|bounds/i);
  if (chain.includes("xcode")) {
    const Project = item.parent("./lib/pbxProject.js"), project = new Project("TEST-DATA.pbxproj");
    project.hash = { project: { objects: {} } };
    assert.match(project.generateUuid(), /^[A-F0-9]{24}$/);
  }
  else assert.equal(typeof item.parent("./index.js").connect, "function"); // Never invoke connect/startTunnel.
}
// Candidate 0.5.0 broke query-string's CJS call contract; retain and disclose 0.2.2.
const decoder = await resolveChain(mobile, ["expo-router", "query-string", "decode-uri-component"], "0.2.2");
const queryString = decoder.parent("./index.js");
assert.equal(queryString.parse("label=TEST%20DATA&bad=%FF").label, "TEST DATA");
assert.equal(typeof queryString.parse("bad=%FF").bad, "string");
const selector = await resolveChain("artifacts/gxeon-dashboard", ["@tailwindcss/typography", "postcss-selector-parser"], "7.1.6");
const utils = selector.parent("./src/utils.js");
assert.deepEqual(utils.commonTrailingPseudos("a::before,b::before"), ["::before", "a,b"]);
assert.deepEqual(utils.commonTrailingPseudos("a,b"), [null, "a,b"]);
const esbuild = (await resolveChain("artifacts/api-server", ["esbuild"], "0.28.1")).module;
const built = esbuild.transformSync("export const testData: boolean = true;", { loader: "ts", format: "cjs" });
assert.match(built.code, /testData/);
const zod = (await resolveChain("lib/api-zod", ["zod"], "4.6.6")).module;
const validation = zod.z.object({ labels: zod.z.record(zod.z.string(), zod.z.string()) });
assert.equal(validation.safeParse({ labels: { origin: "TEST DATA" } }).success, true);
assert.equal(validation.safeParse({ labels: { origin: 123 } }).success, false);
const preset = await resolveChain(mobile, ["babel-preset-expo"], "54.0.10");
const babel = (await resolveChain(mobile, ["@babel/core"], "7.29.6")).module;
const transformed = babel.transformSync("export const testData: boolean = true;", {
  cwd: path.join(repoRoot, mobile), filename: "GX017-TEST-DATA.ts",
  configFile: path.join(repoRoot, mobile, "babel.config.js"), babelrc: false,
  caller: { name: "metro", platform: "ios", isDev: false },
});
assert.ok(preset.module);
assert.match(transformed.code, /testData/);
const result = { status: "PASS", testData: true, externalNetworkUsed: false, tunnelStarted: false,
  versions, checks: ["Metro actual image-size default import with PNG and empty image", "xcode actual UUID generation and ngrok import without tunnel",
    "UUID v3 buffer bounds", "query-string actual decoding", "typography actual selector utility", "esbuild TypeScript transform", "Zod4 record wire values",
    "Mobile Babel configuration resolves its declared Expo preset and transforms actual TypeScript"],
  legacyZod3GloballyRemediated: false, note: "Global mobile/database Zod3 remains a separately disclosed residual; dedicated build rejects retained v3 inputs." };
result.decodeUriAdvisoryRemediated = false;
await mkdir(path.join(stateDir, "evidence"), { recursive: true });
await writeFile(path.join(stateDir, "evidence/security-compatibility.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
