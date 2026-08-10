# 🚜 Tasman Dynamics — John Deere Precision Ag Suite (FS25)

![FS25](https://img.shields.io/badge/Farming%20Simulator-25-367C2B?style=for-the-badge&logo=fs25)
![John Deere](https://img.shields.io/badge/Brand-John%20Deere-FFDE00?style=for-the-badge&labelColor=367C2B)
![Dashboard Live](https://img.shields.io/badge/Dependency-Dashboard%20Live%20v1.0+-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

A design-focused project for a John Deere-inspired precision agriculture experience in Farming Simulator 25. The goal is to recreate the feel of modern guidance and automation systems, including a G5-style display, AutoPath-style guidance logic, turn automation routines, and a synchronised machine workflow layered over Dashboard Live and a local web application.

> Current status: this repository is currently a planning and reference layer for the mod suite. It is structured to support future implementation, prototyping, and modular delivery as the project matures.

---

## 🟢 Project Scope

This project explores a hybrid Precision Agriculture stack for FS25:

- an in-game Lua layer for telemetry and vehicle behaviour
- Dashboard Live integration for in-cab visualization
- a local bridge for websocket and sync communication
- a G5-like web terminal for guidance, mapping, and machine coordination

The concept is intentionally inspired by real John Deere precision agriculture workflows, but it remains a fan-made simulation project and should be treated as a creative implementation, not an official Deere product.

---

## 🖥️ Planned Feature Set

### G5 / G5Plus-style Display
- Dual-display workflow using in-cab Dashboard Live integration and optional external terminal rendering
- Configurable run-page layout for core tractor telemetry and live controls
- Map-based field visualization with tractor tracking and pass overlays

### AutoPath-style Guidance
- Field pass logging based on planting and operation data
- Guidance-line generation from recorded reference paths
- Offset calculations for later operations such as spraying, fertilizing, and harvest support

### AutoTrac-style Steering
- Closed-loop steering correction using heading and cross-track error logic
- Support for straight and gently curved field operations
- Tunable control gains for stable and responsive steering behaviour

### Turn Automation
- Headland awareness and turn-phase logic
- Controlled deceleration and re-entry logic for field boundaries
- Setup for repeatable headland and row-transition patterns

### Machine Sync
- Leader/follower-style coordination workflows
- Shared operational state across multiple machines
- Manual assist controls for synchronized moving operations

---

## 🏗️ Intended System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     FS25 Lua Mod / Vehicle Logic                        │
│  - Telemetry export              - Guidance inputs                     │
│  - Dashboard Live hooks         - Steering and control logic          │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                    Local WebSocket / bridge layer
                             │
┌────────────────────────────▼────────────────────────────────────────────┐
│                     Local Node.js / Web Bridge                          │
│  - Command routing             - Field data transport                  │
│  - Sync broker                 - Pass and state persistence            │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                    Browser / tablet / external terminal
                             │
┌────────────────────────────▼────────────────────────────────────────────┐
│                     G5-style Web Interface                              │
│  - Live dashboard              - Leaflet/field map                     │
│  - Guidance overlays          - Machine coordination controls        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Requirements and Dependencies

### In-Game Dependencies
- Farming Simulator 25 base game
- Dashboard Live (required for in-cab telemetry rendering)
- Optional vanilla vehicle support depending on display or compatibility needs

### External Dependencies
- Node.js 18 or newer for any bridge or local web tooling
- Modern browser or tablet for the G5-style UI

---

## 📦 Setup and Development Notes

This repository currently acts as the design, architecture, and reference foundation for the project. As implementation modules are added, the project can evolve into a more conventional structure such as:

```text
/engine        - FS25 Lua and mod integration logic
/server        - local bridge or websocket service
/web           - browser UI and telemetry frontend
/docs          - project documentation and reference materials
```

### Planned local setup flow
1. Install the FS25 mod and required dashboard dependencies.
2. Add the bridge service and install project dependencies.
3. Run the local server to expose live telemetry and command streams.
4. Launch the browser UI or tablet display for the G5-style interface.

---

## 📐 Mathematical Foundations

### Guidance Error Model
The cross-track error $e_{ct}$ between the tractor's instantaneous position $(x_{veh}, z_{veh})$ and a recorded reference point $(x_{ref}, z_{ref})$ with heading $\theta_{ref}$ is defined as:

$$e_{ct} = (x_{veh} - x_{ref})\sin(\theta_{ref}) - (z_{veh} - z_{ref})\cos(\theta_{ref})$$

This represents the lateral offset from the desired guidance path and is central to correction logic for line-following behaviour.

### Closed-Loop Steering Controller
The target steering angle $\delta(t)$ can be represented with a standard PID formulation:

$$\delta(t) = K_p e_{ct}(t) + K_i \int_{0}^{t} e_{ct}(\tau)\,d\tau + K_d \frac{de_{ct}(t)}{dt}$$

Where:
- $K_p$ = proportional gain for immediate correction
- $K_i$ = integral gain for removing steady-state drift
- $K_d$ = derivative gain for damping oscillation

---

## 🛠️ Intended Mod Configuration

The in-game mod package would typically register its custom variables and dependencies through Dashboard Live using a structure like:

```xml
<modDesc descVersion="80">
    <title>
        <en>John Deere Precision Ag Technology Suite</en>
    </title>
    <dependencies>
        <dependency>FS25_DashboardLive</dependency>
    </dependencies>
</modDesc>
```

---

## 🤝 Contributing and License

This project is developed under the Tasman Dynamics banner and is intended as a community-driven simulation and modding experiment.

- Contributions, feedback, and proposals are welcome.
- The project is distributed under the MIT License unless otherwise stated.
- This work is a fan-made simulation project inspired by real John Deere precision agriculture systems and is not officially affiliated with, endorsed by, or sponsored by Deere & Company or Giants Software.

---

## 📌 Key Note

This repository is best understood as a concept, research, and design foundation. It captures the intended behaviour, architecture, and technical inspiration behind the project, while leaving room for iterative implementation as the mod suite grows.
