// Shared WebSocket client for TasDyn G5 web terminal pages.
//
// Include via <script src="telemetry-client.js"></script>, then call
// TasDynTelemetry.connect(onTelemetry, onFields) with callbacks for each
// live telemetry payload and for field boundary updates (fields arrive
// rarely -- once per session, since field geometry is static per map).
// Automatically updates #ws-status and #clock if those elements exist on
// the page, and handles reconnect with backoff.

const TasDynTelemetry = (() => {
    const BRIDGE_URL = `ws://${location.hostname || "localhost"}:8787`;

    let socket = null;
    let reconnectDelay = 1000;
    let onTelemetryCallback = null;
    let onFieldsCallback = null;

    function updateClock() {
        const clockEl = document.getElementById("clock");
        if (!clockEl) return;
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        clockEl.textContent = `${hh}:${mm}`;
    }

    function setStatus(connected) {
        const statusEl = document.getElementById("ws-status");
        if (!statusEl) return;
        statusEl.classList.toggle("connected", connected);
        statusEl.textContent = connected ? "CONNECTED" : "DISCONNECTED";
    }

    function connectSocket() {
        socket = new WebSocket(BRIDGE_URL);

        socket.addEventListener("open", () => {
            setStatus(true);
            reconnectDelay = 1000;
        });

        socket.addEventListener("message", (event) => {
            let message;
            try {
                message = JSON.parse(event.data);
            } catch (err) {
                return;
            }
            if (message.type === "telemetry" && onTelemetryCallback) {
                onTelemetryCallback(message.payload);
            } else if (message.type === "fields" && onFieldsCallback) {
                onFieldsCallback(message.payload);
            }
        });

        socket.addEventListener("close", scheduleReconnect);
        socket.addEventListener("error", () => socket.close());
    }

    function scheduleReconnect() {
        setStatus(false);
        setTimeout(connectSocket, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 10000);
    }

    function connect(onTelemetry, onFields) {
        onTelemetryCallback = onTelemetry;
        onFieldsCallback = onFields || null;
        updateClock();
        setInterval(updateClock, 1000);
        connectSocket();
    }

    function sendCommand(command, state) {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        socket.send(JSON.stringify({ type: "command", command, state }));
    }

    return { connect, sendCommand };
})();
