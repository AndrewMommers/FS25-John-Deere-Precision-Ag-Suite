const connectionStatus = document.getElementById('connectionStatus');
const speedEl = document.getElementById('speed');
const headingEl = document.getElementById('heading');
const steeringEl = document.getElementById('steering');
const autoTracModeEl = document.getElementById('autoTracMode');
const fieldIdEl = document.getElementById('fieldId');
const crossTrackErrorEl = document.getElementById('crossTrackError');
const positionEl = document.getElementById('position');
const implementStateEl = document.getElementById('implementState');
const machineStatusEl = document.getElementById('machineStatus');
const eventFeedEl = document.getElementById('eventFeed');
const toggleAutoTracBtn = document.getElementById('toggleAutoTrac');
const loadAutoTracBtn = document.getElementById('loadAutoTrac');
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

const socket = new WebSocket(`ws://${location.hostname}:8080`);
const pathHistory = [];
const passHistory = [];
const autoTracLines = [];
const referenceLine = [
  { x: 120, z: 340 },
  { x: 160, z: 380 },
  { x: 220, z: 400 },
  { x: 280, z: 410 },
  { x: 340, z: 420 },
  { x: 400, z: 430 }
];

const fieldBoundary = [
  { x: 100, z: 320 },
  { x: 100, z: 460 },
  { x: 460, z: 460 },
  { x: 460, z: 320 }
];

let autoTracMode = 'Manual';
let tractorState = { x: 120, z: 340, heading: 0 };
let currentFieldId = 'field_001';
let currentImplementState = 'Lowered';
let currentPass = { passId: '', fieldId: currentFieldId, points: [] };
let currentCrossTrackError = 0;

function appendLog(message) {
  const text = `${new Date().toLocaleTimeString()} - ${message}\n`;
  eventFeedEl.textContent += text;
  eventFeedEl.scrollTop = eventFeedEl.scrollHeight;
}

function updateConnectionState(connected) {
  connectionStatus.textContent = connected ? 'Connected' : 'Disconnected';
  connectionStatus.classList.toggle('connected', connected);
}

function projectToScreen(point) {
  const width = canvas.width;
  const height = canvas.height;
  return {
    x: 30 + (point.x / 500) * (width - 60),
    y: height - (30 + (point.z / 300) * (height - 60))
  };
}

function drawLine(points, style) {
  if (points.length < 2) return;
  ctx.beginPath();
  points.forEach((point, index) => {
    const { x, y } = projectToScreen(point);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = style.color;
  ctx.lineWidth = style.width;
  if (style.dashed) ctx.setLineDash(style.dash);
  else ctx.setLineDash([]);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPolygon(points, style) {
  if (points.length < 2) return;
  ctx.beginPath();
  points.forEach((point, index) => {
    const { x, y } = projectToScreen(point);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = style.fill;
  ctx.fill();
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.width;
  ctx.stroke();
}

function getSignedDistanceToSegment(point, segA, segB) {
  const vx = segB.x - segA.x;
  const vz = segB.z - segA.z;
  const wx = point.x - segA.x;
  const wz = point.z - segA.z;
  const segLenSq = vx * vx + vz * vz;
  const t = segLenSq > 0 ? Math.max(0, Math.min(1, (wx * vx + wz * vz) / segLenSq)) : 0;
  const projX = segA.x + t * vx;
  const projZ = segA.z + t * vz;
  const dx = point.x - projX;
  const dz = point.z - projZ;
  const cross = wx * vz - wz * vx;
  const dist = Math.sqrt(dx * dx + dz * dz);
  return segLenSq > 0 ? (cross < 0 ? -dist : dist) : dist;
}

function computeCrossTrackError(point, line) {
  if (line.length < 2) return 0;
  let best = { absValue: Infinity, signedValue: 0 };
  for (let i = 0; i < line.length - 1; i += 1) {
    const value = getSignedDistanceToSegment(point, line[i], line[i + 1]);
    if (Math.abs(value) < best.absValue) {
      best = { absValue: Math.abs(value), signedValue: value };
    }
  }
  return best.signedValue;
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

  drawPolygon(fieldBoundary, {
    fill: 'rgba(103,209,165,0.08)',
    stroke: 'rgba(103,209,165,0.55)',
    width: 2
  });

  drawLine(referenceLine, { color: '#67d1a5', width: 2, dashed: true, dash: [8, 6] });

  autoTracLines.forEach((line) => {
    drawLine(line.points, { color: '#8dc63f', width: 2, dashed: false });
  });

  passHistory.forEach((pass) => {
    drawLine(pass.points, { color: '#6cb4ff', width: 2, dashed: false });
  });

  if (pathHistory.length > 1) {
    drawLine(pathHistory, { color: '#f5c96c', width: 2.5, dashed: false });
  }

  const tx = projectToScreen(tractorState).x;
  const ty = projectToScreen(tractorState).y;

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

  const label = autoTracMode === 'AutoTrac' ? 'AutoTrac' : 'Manual';
  ctx.fillStyle = '#eaf4f4';
  ctx.font = '12px Arial';
  ctx.fillText(`Mode: ${label}`, 18, 20);

  if (autoTracMode === 'AutoTrac') {
    const errorText = `${currentCrossTrackError.toFixed(2)} m`;
    ctx.fillText(`CTE: ${errorText}`, 18, 38);
  }
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
      const autoTrac = String(payload.autoTracMode || autoTracMode).toLowerCase();

      tractorState = { x, z, heading };
      currentFieldId = payload.fieldId || currentFieldId;
      currentImplementState = payload.implementState || currentImplementState;
      autoTracMode = autoTrac === 'autotrac' ? 'AutoTrac' : 'Manual';

      pathHistory.push({ x, z });
      if (autoTracMode === 'AutoTrac' && currentPass && currentPass.points) {
        currentPass.points.push({ x, z });
      }

      if (pathHistory.length > 200) {
        pathHistory.shift();
      }
      if (currentPass && currentPass.points && currentPass.points.length > 200) {
        currentPass.points.shift();
      }

      currentCrossTrackError = autoTracMode === 'AutoTrac'
        ? computeCrossTrackError({ x, z }, referenceLine)
        : 0;

      speedEl.textContent = `${Number(payload.speed || 0).toFixed(1)} km/h`;
      headingEl.textContent = `${Number(payload.heading || 0).toFixed(1)}°`;
      steeringEl.textContent = `${Number(payload.steering || 0).toFixed(1)}°`;
      positionEl.textContent = `${Number(x).toFixed(1)}, ${Number(z).toFixed(1)}`;
      machineStatusEl.textContent = payload.machineStatus || 'Idle';
      fieldIdEl.textContent = currentFieldId;
      implementStateEl.textContent = currentImplementState;
      crossTrackErrorEl.textContent = `${currentCrossTrackError.toFixed(2)} m`;
      autoTracModeEl.textContent = autoTracMode;

      if (currentPass.points.length === 1) {
        appendLog(`Started pass ${currentPass.passId} on ${currentFieldId}`);
      }
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
      autoTracMode = message.value === 'autotrac' ? 'AutoTrac' : 'Manual';
      autoTracModeEl.textContent = autoTracMode;
      appendLog(`Command received: ${message.command} => ${message.value}`);
      renderMap();
    }
  } catch (error) {
    appendLog(`Failed to parse message: ${error.message}`);
  }
});

async function saveCurrentPass() {
  if (!currentPass || !currentPass.points || currentPass.points.length === 0) {
    return;
  }

  try {
    const response = await fetch('/api/passes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentPass)
    });

    if (response.ok) {
      const saved = await response.json();
      appendLog(`Saved pass ${saved.passId}`);
      await loadAutoTracLines();
    } else {
      appendLog('Failed to save pass data');
    }
  } catch (error) {
    appendLog(`Failed to save current pass: ${error.message}`);
  }
}

async function loadSavedPasses() {
  try {
    const response = await fetch('/api/passes');
    if (response.ok) {
      const passes = await response.json();
      passHistory.length = 0;
      passHistory.push(...passes);
      appendLog(`Loaded ${passes.length} saved pass record(s)`);
      renderMap();
    }
  } catch (error) {
    appendLog(`Could not load saved passes: ${error.message}`);
  }
}

async function loadAutoTracLines() {
  try {
    const response = await fetch(`/api/autotrac?fieldId=${encodeURIComponent(currentFieldId)}`);
    if (response.ok) {
      const lines = await response.json();
      autoTracLines.length = 0;
      autoTracLines.push(...lines);
      appendLog(`Loaded ${lines.length} AutoTrac line(s)`);
      renderMap();
    }
  } catch (error) {
    appendLog(`Could not load AutoTrac lines: ${error.message}`);
  }
}

loadAutoTracBtn.addEventListener('click', () => {
  loadAutoTracLines();
});

toggleAutoTracBtn.addEventListener('click', async () => {
  const nextMode = autoTracMode === 'AutoTrac' ? 'Manual' : 'AutoTrac';
  const shouldSavePass = autoTracMode === 'AutoTrac';
  autoTracMode = nextMode;
  autoTracModeEl.textContent = autoTracMode;

  if (nextMode === 'AutoTrac') {
    currentPass = {
      passId: `pass_${Date.now()}`,
      fieldId: currentFieldId,
      implementWidth: 12.5,
      points: []
    };
    passHistory.push(currentPass);
    appendLog(`Started new AutoTrac pass ${currentPass.passId}`);
  }

  socket.send(JSON.stringify({
    type: 'command',
    vehicleId: 'tractor_01',
    command: 'setAutoTracMode',
    value: nextMode === 'AutoTrac' ? 'autotrac' : 'manual'
  }));

  if (shouldSavePass && currentPass && currentPass.points && currentPass.points.length > 0) {
    await saveCurrentPass();
    currentPass = { passId: '', fieldId: currentFieldId, points: [] };
  }

  appendLog(`AutoTrac toggled to ${nextMode}`);
  renderMap();
});

loadSavedPasses();
loadAutoTracLines();
renderMap();
appendLog('Dashboard initialised. Waiting for telemetry...');
