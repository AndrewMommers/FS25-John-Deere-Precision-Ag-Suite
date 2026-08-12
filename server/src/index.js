const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const webRoot = path.join(__dirname, '..', '..', 'web');
const dataRoot = path.join(__dirname, '..', '..', 'data');
const passesRoot = path.join(dataRoot, 'passes');
const autoTracRoot = path.join(dataRoot, 'autotrac');
const sessionsRoot = path.join(dataRoot, 'sessions');

function ensureDataDirs() {
  fs.mkdirSync(passesRoot, { recursive: true });
  fs.mkdirSync(autoTracRoot, { recursive: true });
  fs.mkdirSync(sessionsRoot, { recursive: true });
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function savePassRecord(pass) {
  if (!pass.passId) {
    pass.passId = `pass_${Date.now()}`;
  }
  const filePath = path.join(passesRoot, `${pass.passId}.json`);
  writeJsonFile(filePath, pass);
  return pass;
}

function loadPassRecords() {
  try {
    return fs.readdirSync(passesRoot)
      .filter((name) => name.endsWith('.json'))
      .map((name) => JSON.parse(fs.readFileSync(path.join(passesRoot, name), 'utf-8')));
  } catch (error) {
    return [];
  }
}

function generateAutoTracLines(fieldId) {
  const passes = loadPassRecords().filter((pass) => pass.fieldId === fieldId);
  return passes.map((pass) => ({
    lineId: `autotrac_${pass.passId}`,
    fieldId: pass.fieldId,
    sourcePassId: pass.passId,
    points: pass.points || [],
    widthOffset: pass.implementWidth || 12,
    heading: pass.points && pass.points.length > 1
      ? Math.atan2(
          pass.points[pass.points.length - 1].z - pass.points[0].z,
          pass.points[pass.points.length - 1].x - pass.points[0].x
        )
      : 0
  }));
}

ensureDataDirs();

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (parsedUrl.pathname === '/api/passes') {
    if (req.method === 'GET') {
      const passes = loadPassRecords();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(passes));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const pass = JSON.parse(body);
          const saved = savePassRecord(pass);
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(saved));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        }
      });
      return;
    }

    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  if (parsedUrl.pathname === '/api/autotrac') {
    const fieldId = parsedUrl.searchParams.get('fieldId') || 'field_001';
    const lines = generateAutoTracLines(fieldId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(lines));
    return;
  }

  const url = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(url).replace(/^\/+/, '');
  const filePath = path.join(webRoot, safePath);

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'fs25-precision-ag-bridge', timestamp: Date.now() }));
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8'
    }[ext] || 'text/plain; charset=utf-8';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);

  ws.send(JSON.stringify({
    type: 'system',
    message: 'Connected to FS25 precision ag bridge',
    timestamp: Date.now()
  }));

  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      if (message.type === 'telemetry') {
        const payload = message.payload || {};
        const telemetry = {
          type: 'telemetry',
          vehicleId: message.vehicleId || 'tractor_01',
          timestamp: message.timestamp || Date.now(),
          payload: {
            x: Number(payload.x || 0),
            z: Number(payload.z || 0),
            heading: Number(payload.heading || 0),
            speed: Number(payload.speed || 0),
            steering: Number(payload.steering || 0),
            machineStatus: String(payload.machineStatus || 'unknown'),
            guidanceMode: String(payload.guidanceMode || 'manual'),
            fieldId: String(payload.fieldId || 'field_001'),
            implementState: String(payload.implementState || 'lowered')
          }
        };

        broadcast(telemetry);
        return;
      }

      if (message.type === 'command') {
        broadcast({
          type: 'command',
          vehicleId: message.vehicleId || 'tractor_01',
          command: message.command,
          value: message.value,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Invalid message received:', error.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadcast(message) {
  const payload = JSON.stringify(message);

  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

setInterval(() => {
  broadcast({
    type: 'heartbeat',
    timestamp: Date.now()
  });
}, 5000);

server.listen(PORT, () => {
  console.log(`FS25 precision ag bridge running on http://localhost:${PORT}`);
});
