const BRIDGE_URL = `ws://${location.hostname || "localhost"}:8787`;

const el = {
  status: document.getElementById("status"),
  speed: document.getElementById("speed"),
  rpm: document.getElementById("rpm"),
  heading: document.getElementById("heading"),
  implement: document.getElementById("implement"),
  width: document.getElementById("width"),
  cte: document.getElementById("cte"),
  autotracBtn: document.getElementById("autotracBtn"),
};

let autotracActive = false;
let socket = null;
let reconnectDelay = 1000;

function connect() {
  socket = new WebSocket(BRIDGE_URL);

  socket.addEventListener("open", () => {
    el.status.classList.add("connected");
    reconnectDelay = 1000;
  });

  socket.addEventListener("message", (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (err) {
      return;
    }
    if (message.type === "telemetry") {
      renderTelemetry(message.payload);
    }
  });

  socket.addEventListener("close", scheduleReconnect);
  socket.addEventListener("error", () => socket.close());
}

function scheduleReconnect() {
  el.status.classList.remove("connected");
  setTimeout(connect, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 10000);
}

function renderTelemetry(payload) {
  if (!payload) return;
  el.speed.textContent = (payload.speed ?? 0).toFixed(1);
  el.rpm.textContent = Math.round(payload.rpm ?? 0);
  el.heading.textContent = (payload.heading ?? 0).toFixed(0);
  el.implement.textContent = payload.implementLowered ? "Lowered" : "Raised";
  el.width.textContent = (payload.implementWidth ?? 0).toFixed(1);
  el.cte.textContent = (payload.crossTrackError ?? 0).toFixed(2);
}

function sendCommand(command, state) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: "command", command, state }));
}

el.autotracBtn.addEventListener("click", () => {
  autotracActive = !autotracActive;
  el.autotracBtn.textContent = `AutoTrac: ${autotracActive ? "On" : "Off"}`;
  el.autotracBtn.classList.toggle("active", autotracActive);
  sendCommand("TOGGLE_AUTOTRAC", autotracActive);
});

connect();
