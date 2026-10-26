import { randomBytes } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig, repoRoot } from "./config.mjs";
import { initialize, startApps, stopApps, startDatabase, stopDatabase, apiHealth } from "./stage.mjs";

const directory = path.join(repoRoot, ".gx019"), action = process.argv[2];
if (action === "init") {
  let exists = true; try { await access(path.join(repoRoot, ".gx012/config.json")); } catch { exists = false; }
  const config = await loadConfig(!exists); if (!exists) await initialize(config);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const identities = [
    { id: "test-submitter-a", organizationId: "test-company-a", name: "Submissor de demonstração · TEST DATA", role: "operator" },
    { id: "test-reviewer-a", organizationId: "test-company-a", name: "Revisor de demonstração · TEST DATA", role: "reviewer" },
    { id: "test-submitter-b", organizationId: "test-company-b", name: "Outra organização · TEST DATA", role: "operator" },
  ].map(user => ({ ...user, code: randomBytes(32).toString("base64url") }));
  await writeFile(path.join(directory, "access.json"), JSON.stringify({ testData: true, createdAt: new Date().toISOString(), identities }, null, 2), { flag: "wx", mode: 0o600 });
  console.log("Synthetic individual access created in ignored private .gx019/access.json; no credentials printed.");
} else {
  const config = await loadConfig();
  if (action === "up") { await startDatabase(config); await startApps(config, true, true); }
  else if (action === "restart") { await stopApps(config); await stopDatabase(config); await startDatabase(config); await startApps(config, true, true); }
  else if (action === "stop") { await stopApps(config); await stopDatabase(config); }
  else if (action === "status") console.log(JSON.stringify(await apiHealth(config)));
  else throw new Error("USE_INIT_UP_RESTART_STATUS_STOP");
  console.log("OMNIX loopback preview: http://127.0.0.1:5174/omnix · test data only; persistent volume retained.");
}
