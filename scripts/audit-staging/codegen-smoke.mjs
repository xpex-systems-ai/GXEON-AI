// Exercise patched parsing/codegen paths without the repository's clean=true config.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import path from "node:path";
import { repoRoot, stateDir } from "./config.mjs";

const req = createRequire(path.join(repoRoot, "lib/api-spec/package.json"));
const orvalPath = req.resolve("orval");
const orvalRequire = createRequire(orvalPath);
const typedocRequire = createRequire(orvalRequire.resolve("typedoc"));
const Markdown = typedocRequire("markdown-it");
assert.match(new Markdown({ html: true }).render("# TEST DATA\n[reference](https://example.invalid)\n<b>fixture</b>"), /href="https:\/\/example.invalid"/);
const fixture = path.join(stateDir, "codegen", randomUUID());
await mkdir(fixture, { recursive: true });
const spec = `openapi: 3.0.3
info:
  title: SyntheticAudit
  version: 1.0.0
paths:
  /fixture:
    get:
      operationId: readSyntheticFixture
      responses:
        '200':
          description: TEST DATA
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Fixture'
components:
  schemas:
    Fixture:
      type: object
      required: [testData]
      properties:
        testData:
          type: boolean
        labels:
          type: object
          additionalProperties:
            type: string
`;
const input = path.join(fixture, "fixture.yaml"), output = path.join(fixture, "client.ts");
await writeFile(input, spec);
const { generate } = await import(pathToFileURL(orvalPath).href);
await generate({ input: { target: input }, output: { target: output, client: "fetch", clean: false, prettier: false } }, repoRoot);
const content = await readFile(output, "utf8");
assert.match(content, /readSyntheticFixture/);
assert.match(content, /testData/);
const rootRequire = createRequire(path.join(repoRoot, "package.json"));
execFileSync(process.execPath, [rootRequire.resolve("typescript/bin/tsc"), "--noEmit", "--skipLibCheck", "--target", "es2022",
  "--module", "esnext", "--moduleResolution", "bundler", "--lib", "es2022,dom", output], { cwd: repoRoot, stdio: "pipe", windowsHide: true });
const schemaRequire = createRequire(path.join(repoRoot, "lib/api-zod/package.json"));
const zodVersion = schemaRequire("zod/package.json").version;
assert.equal(zodVersion, "4.6.6");
const zodOutput = path.join(fixture, "schema.ts"), zodBundle = path.join(fixture, "schema.mjs");
await generate({ input: { target: input }, output: { target: zodOutput, client: "zod", clean: false, prettier: false,
  override: { zod: { version: 4 } } } }, repoRoot);
const zodDirectory = path.dirname(schemaRequire.resolve("zod/package.json"));
const fixtureConfig = path.join(fixture, "tsconfig.json");
await writeFile(fixtureConfig, JSON.stringify({ compilerOptions: { noEmit: true, skipLibCheck: true, target: "ES2022",
  module: "ESNext", moduleResolution: "Bundler", baseUrl: fixture, paths: { zod: [zodDirectory] } }, files: [zodOutput] }));
execFileSync(process.execPath, [rootRequire.resolve("typescript/bin/tsc"), "-p", fixtureConfig], { cwd: repoRoot, stdio: "pipe", windowsHide: true });
const apiRequire = createRequire(path.join(repoRoot, "artifacts/api-server/package.json"));
await apiRequire("esbuild").build({ entryPoints: [zodOutput], outfile: zodBundle, platform: "node", format: "esm", bundle: true,
  alias: { zod: zodDirectory }, logLevel: "silent" });
const generated = await import(pathToFileURL(zodBundle).href);
const schemas = Object.values(generated).filter(value => typeof value?.safeParse === "function");
assert.ok(schemas.some(schema => schema.safeParse({ testData: true, labels: { source: "TEST DATA" } }).success &&
  !schema.safeParse({ testData: true, labels: { source: 123 } }).success), "Generated Zod4 record schema must accept and reject actual wire values");
const sha = text => createHash("sha256").update(text).digest("hex");
const result = { testData: true, status: "PASS", generator: "orval 8.22.0", localYamlReferenceFixture: true,
  fixtureSha256: sha(spec), outputSha256: sha(content), generatedClientTypechecked: true,
  repositoryGeneratedSourcesModified: false, clean: false, externalSpecFetched: false,
  generatedZodSchemaTypechecked: true, generatedZodSchemaValidated: true, schemaZodVersion: zodVersion,
  generatedZodSha256: sha(await readFile(zodOutput, "utf8")) };
await mkdir(path.join(stateDir, "evidence"), { recursive: true });
await writeFile(path.join(stateDir, "evidence/codegen-smoke.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
