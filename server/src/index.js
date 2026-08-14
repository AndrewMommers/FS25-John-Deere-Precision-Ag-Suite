const http = require("http");
const fs = require("fs");
const WebSocket = require("ws");
const config = require("./config");

let lastTelemetryRaw = null;
let telemetryMessageCount = 0;
let lastFieldsRaw = null;
let commandSeq = 0;

function escapeXmlAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// The mod reads this back via FS25's XMLFile API (raw io.open is write-only
// in the game's Lua sandbox), so commands go out as XML, not JSON. "seq" lets
// the mod detect a new command without ever needing to delete the file.
function buildCommandXml(seq, command) {
  const type = escapeXmlAttr(command.command);
  const state = command.state ? "true" : "false";
  return `<?xml version="1.0" encoding="utf-8" standalone="no"?>\n<commands seq="${seq}" type="${type}" state="${state}" />\n`;
}

function broadcast(message) {
  const data = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

function readTelemetry() {
  fs.readFile(config.telemetryFile, "utf8", (err, raw) => {
    if (err) return; // file not written yet, or game not running
    if (raw === lastTelemetryRaw) return;

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (parseErr) {
      console.warn("[bridge] Discarded malformed telemetry payload:", parseErr.message);
      return;
    }

    lastTelemetryRaw = raw;
    telemetryMessageCount += 1;
    broadcast({ type: "telemetry", timestamp: Date.now(), payload });
  });
}

// Field boundaries are static per map (only written once at mission start by
// the mod), so this is watched at a much lower frequency than telemetry.
function readFields() {
  fs.readFile(config.fieldsFile, "utf8", (err, raw) => {
    if (err) return; // file not written yet, or game not running
    if (raw === lastFieldsRaw) return;

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (parseErr) {
      console.warn("[bridge] Discarded malformed fields payload:", parseErr.message);
      return;
    }

    lastFieldsRaw = raw;
    console.log(`[bridge] Loaded ${payload.length} field boundaries`);
    broadcast({ type: "fields", payload });
  });
}

function sendCommandToGame(command) {
  commandSeq += 1;
  const xml = buildCommandXml(commandSeq, command);

  fs.mkdir(config.bridgeDir, { recursive: true }, (mkdirErr) => {
    if (mkdirErr) {
      console.error("[bridge] Failed to create bridge directory:", mkdirErr.message);
      return;
    }
    fs.writeFile(config.commandsFile, xml, (writeErr) => {
      if (writeErr) console.error("[bridge] Failed to write command:", writeErr.message);
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      telemetryMessageCount,
      connectedClients: wss.clients.size,
    }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("[bridge] Client connected. Total:", wss.clients.size);

  if (lastTelemetryRaw) {
    ws.send(JSON.stringify({ type: "telemetry", timestamp: Date.now(), payload: JSON.parse(lastTelemetryRaw) }));
  }
  if (lastFieldsRaw) {
    ws.send(JSON.stringify({ type: "fields", payload: JSON.parse(lastFieldsRaw) }));
  }

  ws.on("message", (data) => {
    let message;
    try {
      message = JSON.parse(data);
    } catch (err) {
      console.warn("[bridge] Discarded malformed client message");
      return;
    }
    if (message.type === "command" && typeof message.command === "string") {
      sendCommandToGame(message);
    }
  });

  ws.on("close", () => {
    console.log("[bridge] Client disconnected. Total:", wss.clients.size);
  });
});

fs.mkdir(config.bridgeDir, { recursive: true }, (err) => {
  if (err) console.error("[bridge] Failed to create bridge directory:", err.message);
});

fs.watchFile(config.telemetryFile, { interval: 100 }, readTelemetry);
readTelemetry();

fs.watchFile(config.fieldsFile, { interval: 2000 }, readFields);
readFields();

server.listen(config.httpPort, () => {
  console.log(`[bridge] Listening on http://localhost:${config.httpPort}`);
  console.log(`[bridge] Watching telemetry at ${config.telemetryFile}`);
});
