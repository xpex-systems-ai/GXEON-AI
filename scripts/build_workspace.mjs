import { spawnSync } from "node:child_process";

// Run the same workspace build steps on Windows and Linux, without shell-specific env syntax.
const cli = process.env.npm_execpath;
if (!cli)
  throw new Error(
    "Run this script through pnpm run build or pnpm run build:apps.",
  );
const buildEnv = {
  ...process.env,
  PORT: process.env.PORT || "3000",
  BASE_PATH: process.env.BASE_PATH || "/",
  EXPO_PUBLIC_DOMAIN: process.env.EXPO_PUBLIC_DOMAIN || "localhost",
};
function run(args) {
  console.log(`Build step: pnpm ${args.join(" ")}`);
  const result = spawnSync(process.execPath, [cli, ...args], {
    stdio: "inherit",
    env: buildEnv,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const mode = process.argv[2] ?? "all";
if (!["all", "apps"].includes(mode))
  throw new Error("Unsupported workspace build mode.");
if (mode === "all") {
  run(["run", "typecheck"]);
  run(["run", "build:libs"]);
}
run(["--filter", "@workspace/api-server", "run", "build"]);
run(["--filter", "@workspace/gxeon-dashboard", "run", "build"]);
if (mode === "all") {
  run(["--filter", "@workspace/mockup-sandbox", "run", "build"]);
  run(["--filter", "@workspace/gxeon-dashboard-mobile", "run", "build"]);
}
