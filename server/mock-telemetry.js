const { WebSocket } = require('ws');

const socket = new WebSocket('ws://localhost:8080');

socket.on('open', () => {
  console.log('Mock telemetry client connected');

  let tick = 0;
  let autoTracActive = false;

  const timer = setInterval(() => {
    tick += 1;
    const payload = {
      type: 'telemetry',
      vehicleId: 'tractor_01',
      timestamp: Date.now(),
      payload: {
        x: 120 + tick * 0.9,
        z: 340 + tick * 0.55,
        heading: (10 + tick * 0.5) % 360,
        speed: 8.5 + Math.sin(tick / 3) * 1.8,
        steering: autoTracActive ? 1.2 + Math.cos(tick / 4) * 0.9 : 4.5 + Math.cos(tick / 2) * 1.4,
        machineStatus: autoTracActive ? 'AutoTrac' : 'Working',
        autoTracMode: autoTracActive ? 'autotrac' : 'manual',
        fieldId: 'field_001',
        implementState: 'lowered'
      }
    };

    socket.send(JSON.stringify(payload));
    console.log('Sent telemetry tick', tick, autoTracActive ? 'AUTOTRAC' : 'MANUAL');

    if (tick === 6) {
      autoTracActive = true;
      console.log('Switched AutoTrac ON');
    }

    if (tick >= 18) {
      clearInterval(timer);
      setTimeout(() => socket.close(), 200);
    }
  }, 800);
});

socket.on('message', (data) => {
  console.log('Received:', data.toString());
});

socket.on('close', () => {
  console.log('Mock telemetry client disconnected');
});

socket.on('error', (error) => {
  console.error('Socket error:', error.message);
});
