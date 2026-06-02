const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const dashboardDist = path.join(
  repoRoot,
  "artifacts",
  "gxeon-dashboard",
  "dist",
  "public",
);
const indexPath = path.join(dashboardDist, "index.html");
const fallbackPath = path.join(dashboardDist, "404.html");

if (!fs.existsSync(indexPath)) {
  console.error(`GitHub Pages fallback failed: missing ${indexPath}`);
  process.exit(1);
}

fs.copyFileSync(indexPath, fallbackPath);
console.log(`GitHub Pages SPA fallback ready: ${path.relative(repoRoot, fallbackPath)}`);
