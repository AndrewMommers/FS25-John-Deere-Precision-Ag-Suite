const { WebSocket } = require('ws');

const socket = new WebSocket('ws://localhost:8080');

socket.on('open', () => {
  console.log('Mock telemetry client connected');

  let tick = 0;
  const timer = setInterval(() => {
    tick += 1;
    const payload = {
      type: 'telemetry',
      vehicleId: 'tractor_01',
      payload: {
        x: 120 + tick * 0.8,
        z: 340 + tick * 0.6,
        heading: 12 + tick * 0.37,
        speed: 8.4 + Math.sin(tick / 3) * 2,
        steering: 2.1 + Math.cos(tick / 5) * 1.5,
        machineStatus: tick % 2 === 0 ? 'Working' : 'Guided',
      }
    };

    socket.send(JSON.stringify(payload));
    console.log('Sent telemetry tick', tick);

    if (tick >= 5) {
      clearInterval(timer);
      setTimeout(() => socket.close(), 200);
    }
  }, 1000);
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
