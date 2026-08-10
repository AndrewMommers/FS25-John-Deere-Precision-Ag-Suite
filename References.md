# Tasman Dynamics [TasDyn] - FS25 Modding Context & Reference Guide

**Target AI:** Claude
**Project:** John Deere Precision Ag Suite for Farming Simulator 25
**Developer / Organization:** Tasman Dynamics

## 1. Official FS25 Modding Resources & DLCs
* **Farming Simulator 25: Modding Tutorials 6.0 (DLC ID: fs25mt60):** This is the official, free video tutorial series from GIANTS Software for FS25 modding [cite: 1.1.2]. It covers familiarization with modding tools, working with Blender, setting up physics components and functional nodes, configuring `modDesc.xml` and `vehicle.xml`, animating vehicles, building Level of Detail, and more [cite: 1.1.2]. 
Link: https://www.farming-simulator.com/dlc-detail.php?dlc_id=fs25mt60
* **GIANTS Developer Network (GDN):** The official developer hub for tools, engine documentation, and forum discussions.
Link: https://gdn.giants-software.com/
* **FS25 Community LUADOC:** Unofficial but highly comprehensive Lua API documentation for FS25.
Link: https://umbraprior.github.io/FS25-Community-LUADOC/

## 2. In-Game UI & Dashboard Dependencies
* **Dashboard Live (DBL) by jason0611:** The required dependency for rendering custom telemetry and variables on in-cab tractor screens using XML and i3d files.
Link: https://github.com/jason0611/FS22_DashboardLive
* **FarmDashboard API by JoshWalki:** Reference architecture for background data collection and external API broadcasting.
Link: https://github.com/JoshWalki/FarmDashboard

## 3. John Deere Precision Ag Ecosystem (Real-World Logic)
* **John Deere Operations Center API:** Essential for understanding how real-world field boundaries, crop data, and agronomic metadata are structured and synced across a network.
Link: https://developer.deere.com/
* **John Deere File Formats (Rx & Setup Files):** Reference for how planting passes (essential for AutoPath) and field setups are stored in proprietary formats or ESRI shapefiles.
Link: https://developer.deere.com/dev-docs/files
* **John Deere G5 Universal Display Documentation:** For extracting exact UI elements, screen layouts, and features like AutoTrac Turn Automation and Machine Sync to replicate in the web frontend.
Link: https://www.deere.com.au/en/technology-products/precision-ag-technology/guidance/g5-universal-display/

## 4. Project Architectural Overview
This suite utilizes a hybrid multi-layer architecture:
1. **In-game Lua Engine (FS25):** Logs exact coordinates during seeding (via `SowingMachine` specialization), runs the PID steering control loop, and registers custom variables into the Dashboard Live (DBL) API for in-cab rendering.
2. **WebSocket Bridge (Node.js):** A local or server-hosted duplex bridge that routes vehicle `netId` data between the game and the external UI at 60Hz.
3. **External G5 Web Terminal (React/Leaflet):** A web-based 1:1 replica of the John Deere G5 display. It handles heavy spatial logic (Split-Screen Leaflet mapping, Pass Visualization, and AutoPath polyline offset mathematics).