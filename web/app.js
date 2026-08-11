const connectionStatus = document.getElementById('connectionStatus');
const speedEl = document.getElementById('speed');
const headingEl = document.getElementById('heading');
const steeringEl = document.getElementById('steering');
const guidanceModeEl = document.getElementById('guidanceMode');
const positionEl = document.getElementById('position');
const machineStatusEl = document.getElementById('machineStatus');
const eventFeedEl = document.getElementById('eventFeed');
const toggleGuidanceBtn = document.getElementById('toggleGuidance');
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

const socket = new WebSocket(`ws://${location.hostname}:8080`);
const pathHistory = [];
const referenceLine = [
  { x: 80, z: 80 },
  { x: 140, z: 120 },
  { x: 220, z: 130 },
  { x: 280, z: 160 },
  { x: 340, z: 180 },
  { x: 420, z: 200 }
];

let guidanceMode = 'Manual';
let tractorState = { x: 80, z: 80, heading: 0 };

function appendLog(message) {
  const text = `${new Date().toLocaleTimeString()} - ${message}\n`;
  eventFeedEl.textContent += text;
  eventFeedEl.scrollTop = eventFeedEl.scrollHeight;
}

function updateConnectionState(connected) {
  connectionStatus.textContent = connected ? 'Connected' : 'Disconnected';
  connectionStatus.classList.toggle('connected', connected);
}

function renderMap() {
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = '#0f1720';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  for (let x = 20; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 20; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const toScreenX = (x) => 30 + (x / 500) * (width - 60);
  const toScreenY = (z) => height - (30 + (z / 300) * (height - 60));

  ctx.beginPath();
  referenceLine.forEach((point, index) => {
    const px = toScreenX(point.x);
    const py = toScreenY(point.z);
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = '#67d1a5';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  if (pathHistory.length > 1) {
    ctx.beginPath();
    pathHistory.forEach((point, index) => {
      const px = toScreenX(point.x);
      const py = toScreenY(point.z);
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = '#f5c96c';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  const tx = toScreenX(tractorState.x);
  const ty = toScreenY(tractorState.z);

  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(tractorState.heading);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, -6);
  ctx.lineTo(-8, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const label = guidanceMode === 'Guided' ? 'Guided' : 'Manual';
  ctx.fillStyle = '#eaf4f4';
  ctx.font = '12px Arial';
  ctx.fillText(`Mode: ${label}`, 18, 20);
}

socket.addEventListener('open', () => {
  updateConnectionState(true);
  appendLog('WebSocket connected to bridge.');
  socket.send(JSON.stringify({ type: 'join', vehicleId: 'tractor_01' }));
});

socket.addEventListener('close', () => {
  updateConnectionState(false);
  appendLog('Connection closed. Reconnect pending.');
});

socket.addEventListener('message', (event) => {
  try {
    const message = JSON.parse(event.data);

    if (message.type === 'telemetry') {
      const payload = message.payload || {};
      const x = Number(payload.x || tractorState.x);
      const z = Number(payload.z || tractorState.z);
      const heading = Number(payload.heading || tractorState.heading);

      tractorState = { x, z, heading };
      pathHistory.push({ x, z });

      if (pathHistory.length > 120) {
        pathHistory.shift();
      }

      speedEl.textContent = `${Number(payload.speed || 0).toFixed(1)} km/h`;
      headingEl.textContent = `${Number(payload.heading || 0).toFixed(1)}°`;
      steeringEl.textContent = `${Number(payload.steering || 0).toFixed(1)}°`;
      positionEl.textContent = `${Number(x).toFixed(1)}, ${Number(z).toFixed(1)}`;
      machineStatusEl.textContent = payload.machineStatus || 'Idle';
      renderMap();
      appendLog(`Telemetry received for ${message.vehicleId || 'tractor_01'}`);
    }

    if (message.type === 'system') {
      appendLog(message.message || 'System message');
    }

    if (message.type === 'heartbeat') {
      updateConnectionState(true);
    }

    if (message.type === 'command') {
      guidanceMode = message.value === 'guided' ? 'Guided' : 'Manual';
      guidanceModeEl.textContent = guidanceMode;
      appendLog(`Command received: ${message.command} => ${message.value}`);
      renderMap();
    }
  } catch (error) {
    appendLog(`Failed to parse message: ${error.message}`);
  }
});

toggleGuidanceBtn.addEventListener('click', () => {
  const nextMode = guidanceMode === 'Guided' ? 'Manual' : 'Guided';
  guidanceMode = nextMode;
  guidanceModeEl.textContent = guidanceMode;

  socket.send(JSON.stringify({
    type: 'command',
    vehicleId: 'tractor_01',
    command: 'setGuidanceMode',
    value: nextMode === 'Guided' ? 'guided' : 'manual'
  }));

  appendLog(`Guidance toggled to ${nextMode}`);
  renderMap();
});

renderMap();
appendLog('Dashboard initialised. Waiting for telemetry...');
