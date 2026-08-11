const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const webRoot = path.join(__dirname, '..', '..', 'web');

const server = http.createServer((req, res) => {
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
        broadcast({
          type: 'telemetry',
          vehicleId: message.vehicleId || 'tractor_01',
          payload: message.payload || {},
          timestamp: Date.now()
        });
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
