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

  if (/task|bounty|trabalho|paga|pagamento|radar/.test(normalized)) {
    return {
      type: "agent_economy_scan",
      objective: text,
      tools: ["radar", "marketplace-connectors"],
      risk: "low",
      approvalRequired: false
    };
  }

  if (/github|repositório|repositorio|pull request|issue|código|codigo/.test(normalized)) {
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

async function handleToken(_req, res) {
  if (!apiKey) {
    return json(res, 503, {
      error: "ASSEMBLYAI_API_KEY is not configured on the server."
    });
  }

  const url = new URL("https://streaming.assemblyai.com/v3/token");
  url.searchParams.set("expires_in_seconds", "120");

  const response = await fetch(url, {
    headers: {
      Authorization: apiKey
    }
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

async function handleMission(req, res) {
  try {
    const { transcript } = await readJson(req);
    if (!transcript || typeof transcript !== "string") {
      return json(res, 400, { error: "transcript is required" });
    }

    const mission = classifyMission(transcript);

    return json(res, 200, {
      ok: true,
      mode: "hackathon_demo",
      mission,
      evidence: [
        {
          kind: "voice_transcript",
          status: "captured",
          value: transcript
        },
        {
          kind: "mission_parser",
          status: "classified",
          value: mission.type
        }
      ],
      execution: {
        status: mission.approvalRequired ? "awaiting_operator_approval" : "ready",
        message: mission.approvalRequired
          ? "This mission can change external systems and requires operator approval."
          : "Mission is structured and ready for a connected GXEON executor."
      }
    });
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
}

async function serveStatic(req, res) {
  const requested = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const safe = normalize(requested).replace(/^(..[/\\])+/, "");
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

  if (req.method === "POST" && req.url === "/api/mission") {
    return handleMission(req, res);
  }

  if (req.method === "GET") {
    return serveStatic(req, res);
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(port, () => {
  console.log(`GXEON Voice Operations Agent listening on http://localhost:${port}`);
});
