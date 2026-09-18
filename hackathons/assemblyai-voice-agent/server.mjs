import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");
const port = Number(process.env.PORT || 8787);
const apiKey = process.env.ASSEMBLYAI_API_KEY || "";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let data = "";
  for await (const chunk of req) data += chunk;
  return data ? JSON.parse(data) : {};
}

function classifyMission(text) {
  const normalized = String(text || "").toLowerCase();

  if (/task|bounty|trabalho|paga|pagamento|radar|miss[aã]o/.test(normalized)) {
    return {
      type: "agent_economy_scan",
      objective: text,
      tools: ["radar", "marketplace-connectors"],
      risk: "low",
      approvalRequired: false
    };
  }

  if (/github|reposit[oó]rio|pull request|issue|c[oó]digo/.test(normalized)) {
    return {
      type: "github_operation",
      objective: text,
      tools: ["github"],
      risk: "medium",
      approvalRequired: true
    };
  }

  return {
    type: "general_operation",
    objective: text,
    tools: [],
    risk: "low",
    approvalRequired: false
  };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "user-agent": "GXEON-Voice-Agent/0.1",
        accept: "application/json,text/html;q=0.9,*/*;q=0.8",
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}
    return { ok: response.ok, status: response.status, text, json: parsed };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeTask(task, source) {
  return {
    source,
    id: String(task?.id ?? task?.task_id ?? task?.listing_id ?? ""),
    title: task?.title ?? task?.name ?? task?.summary ?? "Untitled task",
    reward: task?.reward ?? task?.budget ?? task?.price ?? task?.amount ?? null,
    currency: task?.currency ?? task?.token ?? null,
    url: task?.url ?? task?.link ?? task?.html_url ?? null,
    status: task?.status ?? "open"
  };
}

async function scanTaskBounty() {
  try {
    const r = await fetchJson("https://www.task-bounty.com/api/v1/tasks");
    const rows = Array.isArray(r.json?.data) ? r.json.data : [];
    return {
      source: "TaskBounty",
      endpoint: "https://www.task-bounty.com/api/v1/tasks",
      ok: r.ok,
      openCount: rows.length,
      tasks: rows.slice(0, 5).map((t) => normalizeTask(t, "TaskBounty")),
      evidence: r.ok ? "public_api" : `http_${r.status}`
    };
  } catch (error) {
    return { source: "TaskBounty", ok: false, openCount: 0, tasks: [], evidence: error.name || "error" };
  }
}

async function scanClawEarn() {
  try {
    const r = await fetchJson("https://aiagentstore.ai/claw/tasks");
    const rows = Array.isArray(r.json?.items) ? r.json.items : [];
    const available = Number(r.json?.counts?.available ?? rows.length ?? 0);
    return {
      source: "Claw Earn",
      endpoint: "https://aiagentstore.ai/claw/tasks",
      ok: r.ok,
      openCount: available,
      tasks: rows.slice(0, 5).map((t) => normalizeTask(t, "Claw Earn")),
      constraints: ["may require stake/gas depending on task"],
      evidence: r.ok ? "public_api" : `http_${r.status}`
    };
  } catch (error) {
    return { source: "Claw Earn", ok: false, openCount: 0, tasks: [], evidence: error.name || "error" };
  }
}

async function scanAgentHire() {
  try {
    const r = await fetchJson("https://www.agenthire.app/job-board");
    const match = r.text.match(/([0-9]+)\s*Open Jobs/i);
    const count = match ? Number(match[1]) : null;
    return {
      source: "AgentHire",
      endpoint: "https://www.agenthire.app/job-board",
      ok: r.ok,
      openCount: count,
      tasks: [],
      evidence: count === null ? "page_reachable_unparsed" : "public_page"
    };
  } catch (error) {
    return { source: "AgentHire", ok: false, openCount: null, tasks: [], evidence: error.name || "error" };
  }
}

async function scanLoopuman() {
  try {
    const r = await fetchJson("https://loopuman.com/work");
    const noTasks = /No tasks available yet/i.test(r.text);
    return {
      source: "Loopuman",
      endpoint: "https://loopuman.com/work",
      ok: r.ok,
      openCount: noTasks ? 0 : null,
      tasks: [],
      evidence: noTasks ? "public_page_no_tasks" : "public_page"
    };
  } catch (error) {
    return { source: "Loopuman", ok: false, openCount: null, tasks: [], evidence: error.name || "error" };
  }
}


async function scanExecutionMarket() {
  try {
    const r = await fetchJson("https://api.execution.market/api/v1/tasks?status=published&limit=20&offset=0");
    const rows = Array.isArray(r.json) ? r.json
      : Array.isArray(r.json?.tasks) ? r.json.tasks
      : Array.isArray(r.json?.data) ? r.json.data
      : [];
    const tasks = rows
      .filter((t) => ["published", "open", "available"].includes(String(t?.status || "").toLowerCase()) || !t?.status)
      .slice(0, 10)
      .map((t) => ({
        source: "Execution Market",
        id: String(t?.id ?? ""),
        title: t?.title ?? t?.instructions?.slice?.(0, 80) ?? "Execution Market task",
        reward: t?.bounty_usd ?? t?.reward ?? null,
        currency: "USDC",
        url: t?.id ? `https://execution.market/tasks/${t.id}` : "https://execution.market/",
        status: t?.status ?? "published",
        zeroUpfront: true,
        gaslessWorker: true
      }));
    return {
      source: "Execution Market",
      endpoint: "https://api.execution.market/api/v1/tasks?status=published",
      ok: r.ok,
      openCount: tasks.length,
      tasks,
      constraints: ["worker payout is gasless", "some jobs may require physical presence or human evidence"],
      evidence: r.ok ? "public_api" : `http_${r.status}`
    };
  } catch (error) {
    return { source: "Execution Market", ok: false, openCount: null, tasks: [], evidence: error.name || "error" };
  }
}

async function scanTheColony() {
  try {
    const r = await fetchJson("https://thecolony.ai/marketplace");
    const text = r.text || "";
    const tasks = [];
    const paradise = /Paid Task: Build Agent Tools for paradise \+ cryptgregresearch\.org[\s\S]{0,700}?Reward:\s*5000 sats/i.test(text);
    if (paradise) {
      tasks.push({
        source: "The Colony",
        id: "paradise-cryptgregresearch",
        title: "Build Agent Tools for paradise + cryptgregresearch.org",
        reward: 5000,
        currency: "sats",
        url: "https://thecolony.ai/marketplace",
        status: "bidding",
        zeroUpfront: true
      });
    }
    return {
      source: "The Colony",
      endpoint: "https://thecolony.ai/marketplace",
      ok: r.ok,
      openCount: tasks.length,
      tasks,
      evidence: r.ok ? "public_marketplace" : `http_${r.status}`
    };
  } catch (error) {
    return { source: "The Colony", ok: false, openCount: null, tasks: [], evidence: error.name || "error" };
  }
}

async function runRadar() {
  const startedAt = new Date().toISOString();
  const sources = await Promise.all([
    scanTaskBounty(),
    scanClawEarn(),
    scanAgentHire(),
    scanLoopuman(),
    scanExecutionMarket(),
    scanTheColony()
  ]);

  const tasks = sources.flatMap((s) => s.tasks || []);
  const qualifying = tasks.filter((t) => {
    const source = String(t.source || "").toLowerCase();
    if (source.includes("claw earn")) return false;
    return t.zeroUpfront !== false;
  });

  return {
    scannedAt: startedAt,
    sourceCount: sources.length,
    sources,
    tasksFound: tasks.length,
    qualifyingCount: qualifying.length,
    qualifying,
    policy: {
      zeroUpfrontPreferred: true,
      excludesKnownStakeGasSources: true,
      automaticClaim: false,
      note: "Radar discovers and reports. Claiming or paid/irreversible actions stay operator-gated."
    }
  };
}

async function handleToken(_req, res) {
  if (!apiKey) {
    return json(res, 503, {
      error: "ASSEMBLYAI_API_KEY is not configured on the server."
    });
  }

  const url = new URL("https://streaming.assemblyai.com/v3/token");
  url.searchParams.set("expires_in_seconds", "120");

  const response = await fetch(url, {
    headers: { Authorization: apiKey }
  });

  const body = await response.text();

  if (!response.ok) {
    return json(res, response.status, {
      error: "AssemblyAI token request failed",
      detail: body.slice(0, 500)
    });
  }

  res.writeHead(200, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

async function handleRadar(_req, res) {
  try {
    return json(res, 200, { ok: true, radar: await runRadar() });
  } catch (error) {
    return json(res, 500, { ok: false, error: error.message });
  }
}

async function handleMission(req, res) {
  try {
    const { transcript } = await readJson(req);
    if (!transcript || typeof transcript !== "string") {
      return json(res, 400, { error: "transcript is required" });
    }

    const mission = classifyMission(transcript);
    const evidence = [
      { kind: "voice_transcript", status: "captured", value: transcript },
      { kind: "mission_parser", status: "classified", value: mission.type }
    ];

    let radar = null;
    if (mission.type === "agent_economy_scan") {
      radar = await runRadar();
      evidence.push({
        kind: "quantum_radar",
        status: "executed",
        value: {
          scannedAt: radar.scannedAt,
          sourceCount: radar.sourceCount,
          tasksFound: radar.tasksFound,
          qualifyingCount: radar.qualifyingCount
        }
      });
    }

    return json(res, 200, {
      ok: true,
      mode: "live_hackathon_demo",
      mission,
      radar,
      evidence,
      execution: {
        status: mission.approvalRequired ? "awaiting_operator_approval" : "completed",
        message: mission.approvalRequired
          ? "This mission can change external systems and requires operator approval."
          : radar
            ? `Radar executed across ${radar.sourceCount} live sources.`
            : "Mission structured successfully."
      }
    });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
}

async function serveStatic(req, res) {
  const requested = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const safe = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safe);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      "content-type": mime[extname(filePath)] || "application/octet-stream"
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url?.startsWith("/api/assembly-token")) {
    return handleToken(req, res);
  }
  if (req.method === "GET" && req.url === "/api/radar") {
    return handleRadar(req, res);
  }
  if (req.method === "POST" && req.url === "/api/mission") {
    return handleMission(req, res);
  }
  if (req.method === "GET") return serveStatic(req, res);

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`GXEON Voice Operations Agent listening on http://localhost:${port}`);
});
