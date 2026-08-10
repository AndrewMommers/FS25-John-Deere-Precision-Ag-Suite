# Tasman Dynamics [TasDyn] — FS25 Modding Context and Reference Guide

**Target AI:** Claude
**Project:** John Deere Precision Ag Suite for Farming Simulator 25
**Developer / Organization:** Tasman Dynamics

> This document is a working reference set for the project concept and implementation planning. It is intended to support future engineering decisions rather than serve as a formal bibliography of already-implemented code.

## 1. Official FS25 Modding Resources and DLCs

- **Farming Simulator 25 Modding Tutorials 6.0 (DLC ID: fs25mt60):** Official GIANTS tutorial content for FS25 modding workflows, including mod tools, Blender integration, vehicle setup, animation, and level-of-detail considerations.
  - Link: https://www.farming-simulator.com/dlc-detail.php?dlc_id=fs25mt60

- **GIANTS Developer Network (GDN):** Official engine documentation, modding resources, and community support channels.
  - Link: https://gdn.giants-software.com/

- **FS25 Community LUADOC:** Community-maintained Lua reference for the FS25 scripting environment.
  - Link: https://umbraprior.github.io/FS25-Community-LUADOC/

## 2. In-Game UI and Dashboard Dependencies

- **Dashboard Live (DBL) by jason0611:** Core dependency for rendering custom telemetry and in-cab display data using XML and i3d-based system integration.
  - Link: https://github.com/jason0611/FS22_DashboardLive

- **FarmDashboard API by JoshWalki:** Useful reference architecture for background data collection and external API broadcasting patterns.
  - Link: https://github.com/JoshWalki/FarmDashboard

## 3. John Deere Precision Agriculture References

- **John Deere Operations Center API:** Valuable for understanding how real-world agronomic and field metadata is structured and shared across connected systems.
  - Link: https://developer.deere.com/

- **John Deere File Formats and Setup Documentation:** Relevant for understanding field data conventions, pass structures, and agricultural data models.
  - Link: https://developer.deere.com/dev-docs/files

- **John Deere G5 Universal Display Documentation:** Helpful for understanding display layout ideas, operation logic, and feature concepts that can inspire the front-end design.
  - Link: https://www.deere.com.au/en/technology-products/precision-ag-technology/guidance/g5-universal-display/

## 4. Architectural Notes for This Project

This suite is intended to use a hybrid multi-layer architecture:

1. **In-game Lua Engine (FS25):**
   - Collect telemetry from vehicle and implement states
   - Drive guidance and steering logic
   - Expose custom variables to Dashboard Live for in-cab integration

2. **WebSocket Bridge (Node.js):**
   - Transport live data between the game and the external interface
   - Support local or remote communication patterns
   - Relay session state, commands, and sync events

3. **External G5-style Web Terminal:**
   - Present a browser-based interface for guidance and display replication
   - Handle spatial calculations, map overlays, and pass visualization
   - Support operator interaction for machine coordination flows

## 5. Working Assumptions

- The project is intentionally inspired by modern precision-agriculture interfaces rather than a literal 1:1 clone of Deere software.
- Real-world John Deere implementations are used as reference only and are not treated as source material for direct code reproduction.
- This repository currently functions more as a concept and planning document than as a fully implemented codebase.

## 6. Recommended Future Usage

This reference file should continue to evolve alongside the project and eventually be organized into:

- official external references
- internal architecture notes
- implementation-specific engineering notes
- development checklist and contribution guidance

That will keep the project maintainable as more code and runtime modules are added.
