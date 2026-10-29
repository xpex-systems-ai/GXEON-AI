import { ESLint } from "eslint";
import { typescriptFiles, javascriptFiles } from "../../eslint.config.mjs";
import { repoRoot } from "./config.mjs";

const eslint = new ESLint({ cwd: repoRoot });
const results = await eslint.lintFiles([...typescriptFiles, ...javascriptFiles]);
const formatter = await eslint.loadFormatter("stylish");
console.log(formatter.format(results));
const errorCount = results.reduce((n, r) => n + r.errorCount, 0);
console.log(JSON.stringify({ scope: "GX-01 critical code and staging", files: results.length, errorCount }));
if (errorCount) process.exitCode = 1;
