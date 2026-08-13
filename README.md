# 🚜 Tasman Dynamics — John Deere Precision Ag Suite (FS25)

![FS25](https://img.shields.io/badge/Farming%20Simulator-25-367C2B?style=for-the-badge&logo=fs25)
![John Deere](https://img.shields.io/badge/Brand-John%20Deere-FFDE00?style=for-the-badge&labelColor=367C2B)
![Dashboard Live](https://img.shields.io/badge/Dependency-Dashboard%20Live%20v1.0+-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

A John Deere Precision Ag-aligned suite for Farming Simulator 25. The project is designed as a 1:1 ratio simulation of Deere AutoTrac and Operations Center guidance logic within FS25, built around in-game telemetry, Dashboard Live in-cab displays, local machine communication, and a web-based G5-style operator interface.

> Status: this repository is currently in the planning and design phase, structured around a John Deere Precision Ag architecture for future implementation work and a modular build sequence.

---

## 🧭 Project Overview

This project aims to recreate the feel of a modern precision agriculture workflow in FS25 through a layered stack:

- in-game Lua telemetry and machine logic
- Dashboard Live in-cab display integration
- local bridge for live data transfer
- browser-based guidance interface for map and operation monitoring
- future support for automation, pass tracking, and machine sync

The design is intentionally modeled after real Deere precision-ag systems in a 1:1 ratio within the mod's feature scope, while remaining a fan-made simulation concept and not an official product representation.

---

## ✅ Planned Feature Areas

- G5 / G5Plus-style display concepts
- AutoTrac-inspired guidance and field pass generation
- AutoTrac-inspired steering correction logic
- headland turn automation and guidance continuity
- machine sync and leader/follower workflows
- field coverage mapping and pass tracking
- data persistence for guidance lines and field history

---

## 🏗️ Architecture

```text
FS25 Game / Lua Layer
  ├─ vehicle telemetry
  ├─ steering and guidance logic
  ├─ implement state tracking
  └─ Dashboard Live variable export
          │
          ▼
Local Bridge / Server
  ├─ WebSocket telemetry stream
  ├─ command routing
  ├─ session state management
  └─ data persistence
          │
          ▼
Web / Tablet UI
  ├─ live dashboard
  ├─ map and field overlays
  ├─ guidance display
  └─ machine sync controls
```

---

## 📚 Documentation

This repository includes a documentation library for project planning and implementation work:

- [docs/index.md](docs/index.md) — documentation index
- [docs/ag-tech.md](docs/ag-tech.md) — Deere precision-ag concept guide for FS25
- [docs/dev-technical.md](docs/dev-technical.md) — engineering and architecture plan
- [docs/dev-checklist.md](docs/dev-checklist.md) — implementation checklist
- [docs/phase-1-backlog.md](docs/phase-1-backlog.md) — first phase build backlog
- [docs/references.md](docs/references.md) — project references and source material

---

## 🛠️ Current Repo Structure

```text
/
├── README.md
├── LICENSE
├── docs/
│   ├── index.md
│   ├── ag-tech.md
│   ├── dev-technical.md
│   ├── dev-checklist.md
│   ├── phase-1-backlog.md
│   ├── references.md
│   └── Design/            G5 web terminal mockups (static, unwired)
├── mod/                   FS25 mod: telemetry export + command polling
│   ├── modDesc.xml
│   ├── scripts/
│   └── xml/
├── server/                Node.js bridge: file-watches telemetry, serves WebSocket
│   ├── package.json
│   └── src/
├── web/                   Browser dashboard, connects to the bridge over WebSocket
│   ├── index.html
│   └── app.js
└── data/                  fields/ passes/ guidance/ sessions/
```

`mod/` depends on `FS25_DashboardLive` and `FS25_DashboardLive_VanillaVehicles` for the in-cab G5 display; the bridge and web app work independently of both. See [docs/dev-technical.md §4](docs/dev-technical.md) for how these layers connect.

---

## 🚀 Next Recommended Step

The next milestone is the Phase 1 implementation plan documented in [docs/phase-1-backlog.md](docs/phase-1-backlog.md), which focuses on:

1. telemetry export from FS25
2. bridge communication and validation
3. live dashboard rendering
4. basic guidance mode and pass logging

---

## 🤝 Notes

- This is a fan-made simulation project inspired by real John Deere technology.
- It is not affiliated with, endorsed by, or officially supported by Deere & Company or Giants Software.
- The project is intended as a realistic engineering and design concept for FS25 mod development.
