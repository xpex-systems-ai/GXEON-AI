const startBtn = document.querySelector("#start");
const stopBtn = document.querySelector("#stop");
const executeBtn = document.querySelector("#execute");
const transcriptEl = document.querySelector("#transcript");
const resultEl = document.querySelector("#result");
const statusEl = document.querySelector("#status");
const nodes = [...document.querySelectorAll(".node")];

let socket;
let audioContext;
let processor;
let mediaStream;
let source;
let finalTranscript = "";

function setStatus(text) {
  statusEl.innerHTML = `Status: <strong>${text}</strong>`;
}

function activate(step) {
  const index = ["voice", "stt", "parse", "gate", "evidence"].indexOf(step);
  nodes.forEach((node, i) => node.classList.toggle("active", i <= index));
}

function floatTo16BitPCM(input) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function renderResult(body) {
  if (!body?.radar) {
    resultEl.textContent = JSON.stringify(body, null, 2);
    return;
  }

  const radar = body.radar;
  const sourceLines = radar.sources.map((s) => {
    const count = s.openCount === null || s.openCount === undefined ? "?" : s.openCount;
    return `• ${s.source}: ${count} open · ${s.evidence}`;
  });

  const taskLines = radar.qualifying.length
    ? radar.qualifying.map((t, i) =>
        `${i + 1}. [${t.source}] ${t.title}${t.reward ? ` · reward: ${t.reward} ${t.currency || ""}` : ""}`
      )
    : ["Nenhuma task zero-upfront qualificada encontrada nesta varredura."];

  resultEl.textContent = [
    "GXEON QUANTUM RADAR",
    `Scanned: ${radar.scannedAt}`,
    `Sources: ${radar.sourceCount}`,
    `Tasks found: ${radar.tasksFound}`,
    `Qualifying: ${radar.qualifyingCount}`,
    "",
    "LIVE SOURCES",
    ...sourceLines,
    "",
    "QUALIFIED OPPORTUNITIES",
    ...taskLines,
    "",
    "EVIDENCE",
    JSON.stringify(body.evidence, null, 2)
  ].join("\n");
}

async function startVoice() {
  startBtn.disabled = true;
  setStatus("solicitando token");
  activate("voice");

  const tokenResponse = await fetch("/api/assembly-token", { cache: "no-store" });
  const tokenBody = await tokenResponse.json();

  if (!tokenResponse.ok) throw new Error(tokenBody.error || "Falha ao obter token da AssemblyAI");

  const token = tokenBody.token;
  if (!token) throw new Error("Token temporário não retornado.");

  const wsUrl = new URL("wss://streaming.assemblyai.com/v3/ws");
  wsUrl.searchParams.set("token", token);
  wsUrl.searchParams.set("sample_rate", "16000");
  wsUrl.searchParams.set("speech_model", "universal-3-5-pro");

  socket = new WebSocket(wsUrl);

  socket.addEventListener("open", async () => {
    setStatus("ouvindo");
    activate("stt");

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    audioContext = new AudioContext({ sampleRate: 16000 });
    source = audioContext.createMediaStreamSource(mediaStream);
    processor = audioContext.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      const pcm = floatTo16BitPCM(event.inputBuffer.getChannelData(0));
      socket.send(pcm.buffer);
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
    stopBtn.disabled = false;
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "Turn") {
      const text = message.transcript || "";
      if (message.end_of_turn) {
        finalTranscript = [finalTranscript, text].filter(Boolean).join(" ").trim();
        transcriptEl.textContent = finalTranscript || "…";
        executeBtn.disabled = !finalTranscript;
      } else {
        transcriptEl.textContent = [finalTranscript, text].filter(Boolean).join(" ").trim() || "…";
      }
    }
  });

  socket.addEventListener("error", () => setStatus("erro de streaming"));
  socket.addEventListener("close", () => {
    if (!finalTranscript) setStatus("conexão encerrada");
  });
}

async function stopVoice() {
  stopBtn.disabled = true;
  if (processor) processor.disconnect();
  if (source) source.disconnect();
  if (mediaStream) mediaStream.getTracks().forEach((track) => track.stop());
  if (audioContext && audioContext.state !== "closed") await audioContext.close();

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "Terminate" }));
    setTimeout(() => socket.close(), 250);
  }

  startBtn.disabled = false;
  executeBtn.disabled = !finalTranscript;
  setStatus(finalTranscript ? "transcrição pronta" : "encerrado");
}

async function executeMission() {
  if (!finalTranscript) return;

  executeBtn.disabled = true;
  activate("parse");
  setStatus("executando missão");

  const response = await fetch("/api/mission", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ transcript: finalTranscript })
  });

  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Falha ao executar missão.");

  activate("gate");
  await new Promise((resolve) => setTimeout(resolve, 180));
  activate("evidence");

  renderResult(body);
  setStatus(body.execution?.status || "concluído");
  executeBtn.disabled = false;
}

startBtn.addEventListener("click", () => {
  finalTranscript = "";
  transcriptEl.textContent = "Conectando à AssemblyAI…";
  resultEl.textContent = "Nenhuma missão estruturada ainda.";
  startVoice().catch((error) => {
    setStatus("erro");
    transcriptEl.textContent = error.message;
    startBtn.disabled = false;
  });
});

stopBtn.addEventListener("click", () => {
  stopVoice().catch((error) => {
    setStatus("erro");
    transcriptEl.textContent = error.message;
  });
});

executeBtn.addEventListener("click", () => {
  executeMission().catch((error) => {
    setStatus("erro");
    resultEl.textContent = error.message;
    executeBtn.disabled = false;
  });
});
