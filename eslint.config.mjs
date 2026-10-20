import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

// Start with the GX-01 security boundary and its reproducible staging tools.
// This does not claim that unrelated legacy modules have been linted.
export const typescriptFiles = [
  "artifacts/api-server/src/middlewares/auditAccess.ts",
  "artifacts/api-server/src/routes/auditWorkflow.ts",
  "artifacts/api-server/src/services/auditWorkflow*.ts",
  "artifacts/api-server/src/services/auditRestRows.ts",
  "artifacts/api-server/src/tests/audit*.ts",
  "artifacts/gxeon-dashboard/src/pages/AuditWorkflowPage.tsx",
  "artifacts/gxeon-dashboard/src/services/auditTransport.ts",
  "lib/api-zod/src/auditWorkflow.ts",
];
export const javascriptFiles = ["scripts/audit-staging/*.mjs", "scripts/build_workspace.mjs", "eslint.config.mjs"];
const globals = Object.fromEntries(["process", "console", "Buffer", "URL", "fetch", "AbortSignal", "setTimeout", "clearTimeout", "structuredClone"].map((name) => [name, "readonly"]));

export default defineConfig(
  { ignores: ["**/node_modules/**", "**/dist/**", ".gx012/**"] },
  { files: typescriptFiles, extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals, parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }] } },
  { files: javascriptFiles, extends: [js.configs.recommended], languageOptions: { globals } },
);
