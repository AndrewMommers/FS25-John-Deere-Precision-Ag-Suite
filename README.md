# 🚜 Tasman Dynamics — John Deere Precision Ag Suite (FS25)

![FS25](https://img.shields.io/badge/Farming%20Simulator-25-367C2B?style=for-the-badge&logo=fs25)
![John Deere](https://img.shields.io/badge/Brand-John%20Deere-FFDE00?style=for-the-badge&labelColor=367C2B)
![Dashboard Live](https://img.shields.io/badge/Dependency-Dashboard%20Live%20v1.0+-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

A high-fidelity, hybrid Precision Agriculture ecosystem for **Farming Simulator 25**. This mod suite recreates John Deere’s cutting-edge guidance and automation stack—including the **G5/G5Plus Universal Display**, **AutoPath™**, **AutoTrac™ Turn Automation**, and **Machine Sync**—by combining in-game vehicle logic, **Dashboard Live (DBL)** in-cab integration, and a dedicated low-latency Web Application.

---

## 🟢 Features Overview

### 🖥️ G5 / G5Plus Universal Display
* **Hybrid Dual-Display Architecture:** View core run-page data directly on in-cab tractor monitors via **Dashboard Live (DBL)**, or launch the external web app on a secondary screen or tablet.
* **Layout Manager:** Fully customizable CSS-grid run screens with draggable modules (RPM, speed, section control, fluid levels).
* **Split-Screen Leaflet Mapping:** High-resolution map overlays with dynamic tractor vector tracking and **Pass Visualization** showing covered field area in real time.

### 📐 AutoPath™ & Implement Guidance
* **First-Pass Planting Logging:** Automatically records exact $X, Z$ coordinates and implement widths during seeding operations (`Field_XX_Plant.json`).
* **Dynamic Polyline Offsetting:** Automatically calculates target guidance lines for subsequent operations (spraying, side-dressing, harvesting) based on varying implement widths—eliminating manual A-B line setup.
* **Implement Drift Compensation:** Adjusts tractor heading or steers active implements on sidehills to keep tools centered directly over crop rows.

### 🎯 AutoTrac™ Closed-Loop Steering
* Custom **PID Steering Controller** driving in-game wheel angles to reduce Cross-Track Error ($e_{ct}$) to near-zero.
* Compatible with both straight lines and complex curved field contours.

### 🔄 AutoTrac™ Turn Automation (Automation 4.0)
* **Geofenced Headland Detection:** Detects field boundaries and automatically initiates deceleration, implement lift, teardrop/U-turn maneuver execution, and re-engagement.

### 🚜 Machine Sync
* **Leader-Follower Network:** Real-time WebSocket synchronization between a player-driven combine and an AI-driven tractor/grain cart.
* Features interactive "Nudge Forward / Backward" controls from the G5 interface to fill grain trailers evenly while moving.

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      FS25 Engine (Lua Mod Script)                       │
│  - PID Controller (AutoTrac)          - Seeder Coordinate Logger        │
│  - Dashboard Live (DBL) API Hooks     - Vehicle Telemetry Exporter      │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                  Local WebSocket Stream (60 Hz)
                             │
┌────────────────────────────▼────────────────────────────────────────────┐
│                      TasDyn Local Node.js Bridge                        │
│  - Polyline Offset Math Engine        - Machine Sync Network Broker     │
│  - JSON Persistence (Planting Data)   - Dual-Direction Command Router   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                   HTTP / WS Local Network
                             │
┌────────────────────────────▼────────────────────────────────────────────┐
│                     G5 Web Terminal Application                         │
│  - React UI (1080p Layout Manager)    - Interactive Leaflet Maps        │
│  - Dynamic Pass Visualization         - Machine Sync Nudge Controls     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Requirements & Dependencies

### In-Game Dependencies (FS25 Mods)
* **FS25 Core Game** (v1.1+)
* [**Dashboard Live (DBL)**](https://www.farming-simulator.com/mod.php?mod_id=328619) (Required for in-cab monitor rendering)
* [**Dashboard Live Vanilla Vehicles**](https://www.farming-simulator.com/mod.php?mod_id=328622) *(Optional, for default John Deere G5 A-pillar support)*

### External Server Dependencies
* **Node.js** (v18.0.0 or higher)
* Modern Web Browser (Chrome, Edge, Safari) or Tablet

---

## 📦 Installation & Setup

### 1. Install the FS25 Mod
1. Download the latest `FS25_TasDyn_JohnDeerePrecisionAg.zip` from the **Releases** tab.
2. Move the `.zip` file into your Farming Simulator 25 `mods` folder:
   ```text
   C:\Users\<Your-Username>\Documents\My Games\FarmingSimulator2025\mods\
   ```
3. Ensure **Dashboard Live** (`FS25_DashboardLive.zip`) is also installed in your `mods` folder.

### 2. Set Up the Local Web Bridge
1. Clone or download this repository to your local PC.
2. Open a terminal in the `/server` directory and install the dependencies:
   ```bash
   cd server
   npm install
   ```
3. Start the WebSocket bridge server:
   ```bash
   npm start
   ```
   *The server will start listening on `ws://localhost:8080`.*

### 3. Launch the G5 Interface
Open your web browser or tablet and navigate to:
```text
http://localhost:3000
```
*(Or use your local IP, e.g., `http://192.168.1.50:3000`, to access the G5 display from a physical tablet in your cockpit setup).*

---

## 📐 Mathematical Foundations

### AutoPath™ Polyline Offsetting
The cross-track error $e_{ct}$ between the tractor's instantaneous position $(x_{veh}, z_{veh})$ and the nearest recorded planting reference point $(x_{ref}, z_{ref})$ with heading $	heta_{ref}$ is calculated as:

$$e_{ct} = (x_{veh} - x_{ref})\sin(\theta_{ref}) - (z_{veh} - z_{ref})\cos(\theta_{ref})$$

### Closed-Loop PID Steering Controller
The target steering wheel angle $\delta(t)$ required to eliminate cross-track error is dynamically calculated in Lua using:

$$\delta(t) = K_p e_{ct}(t) + K_i \int_{0}^{t} e_{ct}(\tau)d\tau + K_d \frac{de_{ct}(t)}{dt}$$

Where:
* $K_p$ = Proportional gain (immediate error magnitude response)
* $K_i$ = Integral gain (eliminates steady-state offset on sidehills)
* $K_d$ = Derivative gain (dampens oscillation along straight passes)

---

## 🛠️ Configuration (`modDesc.xml`)

This mod registers custom variables directly into **Dashboard Live**:

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

## 🤝 Contributing & License

Developed under the **Tasman Dynamics [TasDyn]** banner. Contributions, bug reports, and pull requests are welcome!

* Distributed under the **MIT License**. See `LICENSE` for details.
* *Disclaimer: John Deere, AutoPath, AutoTrac, and G5 Display are registered trademarks of Deere & Company. This mod is an fan-made simulation project and is not officially affiliated with or endorsed by Deere & Company or Giants Software.*
