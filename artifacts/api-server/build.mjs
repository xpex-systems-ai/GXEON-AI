import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, writeFile } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  const result = await esbuild({
    entryPoints: { index: path.resolve(artifactDir, "src/index.ts"), "audit-pilot": path.resolve(artifactDir, "src/audit-pilot.ts") },
    metafile: true,
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });
  const entry = Object.entries(result.metafile.outputs).find(([, value]) => value.entryPoint?.endsWith("src/audit-pilot.ts"));
  if (!entry) throw new Error("AUDIT_PILOT_BUILD_MISSING");
  const inputs = Object.entries(entry[1].inputs).filter(([, value]) => value.bytesInOutput > 0).map(([name]) => name.replaceAll("\\", "/"));
  const forbidden = inputs.filter(name => /(?:^|\/)src\/(?:app\.ts|index\.ts|routes\/index\.ts|routes\/(?!auditWorkflow\.ts)|services\/(?!auditWorkflow))/u.test(name) && (name.startsWith("src/") || name.includes("artifacts/api-server/")));
  if (forbidden.length) throw new Error("AUDIT_PILOT_IMPORT_BOUNDARY_FAILED");
  const schemaRequire = createRequire(path.resolve(artifactDir, "../../lib/api-zod/package.json"));
  const zodVersion = schemaRequire("zod/package.json").version;
  const legacyZodInputs = inputs.filter(name => /\/zod\/v3\//u.test(name));
  if (zodVersion !== "4.6.6" || legacyZodInputs.length || !inputs.some(name => /\/zod\/v4\//u.test(name)))
    throw new Error("AUDIT_PILOT_ZOD_BOUNDARY_FAILED");
  await writeFile(path.join(distDir, "audit-pilot-boundary.json"), JSON.stringify({ entry: "src/audit-pilot.ts", inputs, forbiddenImports: forbidden,
    externalImports: entry[1].imports.filter(value => value.external).map(({ path, kind }) => ({ path, kind })),
    zod: { version: zodVersion, legacyInputs: legacyZodInputs }, note: "Only retained inputs of the dedicated output; not a production deployment." }, null, 2));
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
