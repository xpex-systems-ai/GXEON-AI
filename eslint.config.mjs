import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

// Start with the GX-01 security boundary and its reproducible staging tools.
// This does not claim that unrelated legacy modules have been linted.
export const typescriptFiles = [
  "artifacts/api-server/src/middlewares/auditAccess.ts",
  "artifacts/api-server/src/auditPilot*.ts",
  "artifacts/api-server/src/auditRenderIngress.ts",
  "artifacts/api-server/src/auditTelemetry.ts",
  "artifacts/api-server/src/auditDatabaseTrust.ts",
  "artifacts/api-server/src/audit-pilot.ts",
  "artifacts/api-server/src/routes/auditWorkflow.ts",
  "artifacts/api-server/src/services/auditWorkflow*.ts",
  "artifacts/api-server/src/services/auditRestRows.ts",
  "artifacts/api-server/src/tests/audit*.ts",
  "artifacts/gxeon-dashboard/src/pages/AuditWorkflowPage.tsx",
  "artifacts/gxeon-dashboard/src/services/auditTransport.ts",
  "lib/api-zod/src/auditWorkflow.ts",
  "lib/db/src/pool.ts",
  "artifacts/api-server/src/omnixPreview.ts",
  "artifacts/api-server/src/enterpriseIdentity*.ts",
  "artifacts/api-server/src/enterpriseBrowser*.ts",
  "artifacts/api-server/src/omnixLeadIntake*.ts",
  "artifacts/api-server/src/omnixCapabilities.ts",
  "artifacts/api-server/src/omnixReadGateway.ts",
  "artifacts/api-server/src/omnixDistributionRouter.ts",
  "artifacts/api-server/src/omnixRuntimeExtensions.ts",
  "artifacts/api-server/src/omnixCommercial.ts",
  "lib/api-zod/src/omnixPortal.ts",
  "lib/api-zod/src/omnixCapabilities.ts",
  "lib/api-zod/src/omnixEnterprisePortal.ts",
  "lib/api-zod/src/omnixTask.ts",
  "artifacts/gxeon-dashboard/src/services/enterprisePortalTransport.ts",
  "artifacts/gxeon-dashboard/src/pages/OmnixPortalPage.tsx",
  "artifacts/gxeon-dashboard/src/pages/OmnixProductSurface.tsx",
  "artifacts/gxeon-dashboard/src/pages/OmnixCapabilitiesPanel.tsx",
];
export const javascriptFiles = ["scripts/audit-staging/*.mjs", "deploy/self-hosted/*.mjs", "deploy/render/*.mjs", "scripts/build_workspace.mjs", "eslint.config.mjs", "artifacts/gxeon-dashboard-mobile/scripts/build.js"];
const globals = Object.fromEntries(["process", "console", "Buffer", "URL", "fetch", "AbortSignal", "AbortController", "setTimeout", "clearTimeout", "structuredClone"].map((name) => [name, "readonly"]));

export default defineConfig(
  { ignores: ["**/node_modules/**", "**/dist/**", ".gx012/**"] },
  { files: typescriptFiles, extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals, parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }] } },
  { files: javascriptFiles, extends: [js.configs.recommended], languageOptions: { globals } },
  { files: ["artifacts/gxeon-dashboard-mobile/scripts/build.js"], languageOptions: { sourceType: "commonjs", globals: { __dirname: "readonly" } } },
);
