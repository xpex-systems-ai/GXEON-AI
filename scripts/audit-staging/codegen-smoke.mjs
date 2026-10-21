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
const sha = text => createHash("sha256").update(text).digest("hex");
const result = { testData: true, status: "PASS", generator: "orval 8.22.0", localYamlReferenceFixture: true,
  fixtureSha256: sha(spec), outputSha256: sha(content), generatedClientTypechecked: true,
  repositoryGeneratedSourcesModified: false, clean: false, externalSpecFetched: false };
await mkdir(path.join(stateDir, "evidence"), { recursive: true });
await writeFile(path.join(stateDir, "evidence/codegen-smoke.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
