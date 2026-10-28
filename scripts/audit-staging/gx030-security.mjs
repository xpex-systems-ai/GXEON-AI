// Actual installed parent call sites and adversarial synthetic regressions.
// No tunnel, external request, customer input, certificate issuance or stored key.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { generateKeyPairSync } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, realpath, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { repoRoot, stateDir } from "./config.mjs";
const versions = [];
async function chain(names, expected) {
  let req = createRequire(path.join(repoRoot, "artifacts/gxeon-dashboard-mobile/package.json")), parent;
  for (const name of names) {
    let manifest;
    for (const root of req.resolve.paths(name) ?? []) {
      try { manifest = await realpath(path.join(root, name, "package.json")); break; } catch { /* Node resolution */ }
    }
    assert.ok(manifest, "Installed package " + name); parent = req; req = createRequire(manifest);
  }
  const manifest = JSON.parse(await readFile(req.resolve("./package.json"), "utf8"));
  assert.equal(manifest.version, expected); versions.push({ chain: names, version: expected });
  return { module: parent(names.at(-1)), require: req, parent };
}
const forge = (await chain(["@expo/cli", "node-forge"], "1.4.2")).module;
const signing = (await chain(["@expo/cli", "@expo/code-signing-certificates"], "0.0.6")).module;
const keys = generateKeyPairSync("rsa", { modulusLength: 1024, publicExponent: 3,
  privateKeyEncoding: { type: "pkcs1", format: "pem" }, publicKeyEncoding: { type: "pkcs1", format: "pem" } });
const keyPair = signing.convertKeyPairPEMToKeyPair({ privateKeyPEM: keys.privateKey, publicKeyPEM: keys.publicKey });
const csr = signing.generateCSR(keyPair, "GX030 SYNTHETIC FIXTURE");
assert.equal(csr.verify(), true, "Expo parent CSR API remains compatible; nothing is issued or uploaded");
const digest = forge.md.sha256.create().update("GX030 TEST DATA"), rawDigest = digest.digest().getBytes();
const valid = keyPair.privateKey.sign(digest); assert.equal(keyPair.publicKey.verify(rawDigest, valid), true);
const a = forge.asn1, create = (type, constructed, value) => a.create(a.Class.UNIVERSAL, type, constructed, value);
const nested = create(a.Type.SEQUENCE, true, [
  create(a.Type.SEQUENCE, true, [create(a.Type.OID, false, a.oidToDer(forge.pki.oids.sha256).getBytes()),
    create(a.Type.NULL, false, ""), create(a.Type.OCTETSTRING, false, "GX030 GARBAGE")]),
  create(a.Type.OCTETSTRING, false, rawDigest)]);
const malformed = keyPair.privateKey.sign(a.toDer(nested).getBytes(), null);
let accepted = false; try { accepted = keyPair.publicKey.verify(rawDigest, malformed); } catch { /* invalid DER rejected */ }
assert.equal(accepted, false, "Nested extra DigestAlgorithm elements must not verify");

const policy = await chain(["@expo/ngrok", "got", "cacheable-request", "http-cache-semantics"], "4.2.0");
const CachePolicy = policy.module, request = { url: "https://fixture.invalid/TEST-DATA", method: "GET", headers: { host: "fixture.invalid" } };
for (const headers of [
  { "cache-control": "max-age=60", "set-cookie": "TEST-DATA=private" },
  { "cache-control": "private, max-age=60" },
  { "cache-control": "no-cache, stale-while-revalidate=999999, stale-if-error=999999" },
  { "cache-control": "max-age=60", vary: "*" },
]) {
  const p = new CachePolicy(request, { status: 200, headers }, { shared: true });
  assert.equal(p.maxAge(), 0);
  assert.equal(p.satisfiesWithoutRevalidation({ ...request, headers: { ...request.headers, "cache-control": "max-stale=999999" } }), false);
  assert.equal(p.useStaleWhileRevalidate(), false);
  assert.equal(p.revalidatedPolicy(request, { status: 503, headers: {} }).modified, true,
    "Origin errors cannot resurrect a zero-freshness private/no-cache response");
  const restored = CachePolicy.fromObject(p.toObject());
  assert.equal(restored.satisfiesWithoutRevalidation({ ...request, headers: { ...request.headers, "cache-control": "max-stale" } }), false);
}
const cacheable = new CachePolicy(request, { status: 200, headers: { "cache-control": "public, max-age=60" } });
assert.equal(cacheable.satisfiesWithoutRevalidation(request), true);
assert.equal(CachePolicy.fromObject(cacheable.toObject()).satisfiesWithoutRevalidation(request), true);
assert.equal(typeof policy.parent("./src/index.js"), "function", "Actual cacheable-request parent import");

const decoder = await chain(["expo-router", "query-string", "decode-uri-component"], "0.5.1");
const decodeTest = spawnSync(process.execPath, ["--input-type=module", "--eval", `
  import assert from 'node:assert/strict'; import {createRequire} from 'node:module';
  const req=createRequire(process.argv[1]), query=req('./index.js');
  assert.equal(query.parse('label=TEST%20DATA&utf=%C3%A1').utf,'á');
  const input='%FF'.repeat(20000); const result=query.parse('bad='+input); assert.equal(typeof result.bad,'string');
  console.log('bounded decoder parent fixture passed');`, decoder.parent.resolve("./index.js")],
  { timeout: 5000, encoding: "utf8", windowsHide: true });
assert.equal(decodeTest.status, 0, "Malformed 60KB query must finish within the child-process budget: " + decodeTest.error?.code);

const merge = await chain(["@expo/cli", "@expo/config", "deepmerge"], "4.3.1");
for (const fn of [merge.module, merge.require("./dist/umd.js")]) {
  for (const target of [JSON.parse('{"__proto__":{"gx030Poison":true},"label":"TEST DATA"}'),
    Object.assign(Object.create(null), JSON.parse('{"__proto__":{"gx030Poison":true}}'))]) {
    const output = fn(target, { enabled: true });
    assert.equal(Object.getPrototypeOf(output), Object.prototype); assert.equal(output.gx030Poison, undefined);
    assert.equal(Object.prototype.gx030Poison, undefined); assert.equal(output.enabled, true);
  }
  assert.deepEqual(fn({ nested: { a: 1 }, list: [1] }, { nested: { b: 2 }, list: [2] }), { nested: { a: 1, b: 2 }, list: [1, 2] });
  const symbol = Symbol("TEST DATA"); assert.equal(fn({ [symbol]: 1 }, {})[symbol], 1);
  assert.deepEqual(fn({ list: [1] }, { list: [2] }, { arrayMerge: (_a, b) => b }), { list: [2] });
}
const config = merge.parent("./build/Config.js");
const parsed = config.getConfig(path.join(repoRoot, "artifacts/gxeon-dashboard-mobile"), { skipSDKVersionRequirement: true, skipPlugins: true });
assert.ok(parsed.exp?.name, "Actual Expo config consumer still parses the repository app config");
const result = { status: "PASS", testData: true, externalNetworkUsed: false, keysPersisted: false, versions,
  checks: ["Expo CSR and RSA valid signature", "extra nested DigestAlgorithm rejected", "zero-freshness cache cannot be resurrected by max-stale or stale-while-revalidate",
    "cache serialization and public positive-TTL response", "query-string CJS/Metro interop and malformed decoding bounded to 5s",
    "deepmerge own/null-prototype malicious targets across CJS/UMD distributions; normal arrays/symbols/custom merge", "actual Expo app config consumer"],
  upstreamUnpatchedAdvisoriesRemain: ["GHSA-ch52-4w7c-c8xp", "GHSA-gcqx-w48m-w2h4"], independentReviewComplete: false };
await mkdir(path.join(stateDir, "evidence"), { recursive: true });
await writeFile(path.join(stateDir, "evidence/gx030-security.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
