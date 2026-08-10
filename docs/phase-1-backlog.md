# Phase 1 Build Backlog — First Implementation Sprint

This backlog covers the first implementation phase for the FS25 precision-ag stack. The goal is to build the working foundation for telemetry transmission, bridge connectivity, in-cab display rendering, and basic guidance logic before adding more advanced field automation features.

Project objective for Phase 1:
- establish a reliable game-to-bridge-to-UI pipeline
- render live machine telemetry in a basic dashboard
- capture field position and basic path history
- implement a simple guidance loop with visible correction feedback
- validate end-to-end function before expanding to advanced automation

---

## Phase 1 Success Criteria

By the end of this phase, the following should be true:

- FS25 mod exports live machine state
- a local bridge receives and forwards telemetry
- a browser or tablet UI shows the live vehicle state
- an operator can toggle basic guidance mode
- a pass log is created and visualized
- the system is stable enough to support further precision features

---

## Day 1 — Project Setup and Architecture Lock

### Goals
- finalize the first-phase technical scope
- establish folder structure and repo conventions
- confirm the communication model between Lua, bridge, and UI

### Tasks
- [ ] Create `/engine`, `/server`, `/web`, `/docs`, and `/data`
- [ ] Confirm exact telemetry payload schema for the first implementation
- [ ] Decide on WebSocket message protocol structure
- [ ] Define the minimum machine state model for the UI
- [ ] Create a short “implementation status” README section

### Deliverables
- project folder structure
- telemetry schema document
- agreed communication contract between systems

### Done when
- every component knows what signals are required for MVP
- no unknowns remain about the telemetry flow

---

## Day 2 — FS25 Mod Skeleton and Data Export

### Goals
- create the first mod skeleton
- confirm the mod loads and starts cleanly
- begin exporting basic telemetry from the game

### Tasks
- [ ] Create the initial Lua mod file structure
- [ ] Register the mod with the required metadata
- [ ] Determine update hook / tick timing for telemetry export
- [ ] Export x, z, heading, speed, steering, and machine status
- [ ] Log output to console or temporary debug file for validation

### Deliverables
- working mod boot hook
- telemetry output from the FS25 runtime

### Done when
- machine values are visible in logs while operating in-game
- the export loop is stable and non-blocking

---

## Day 3 — Bridge Server and Telemetry Receiver

### Goals
- create the local bridge server
- accept incoming machine telemetry from the game
- confirm data flow is stable before UI work

### Tasks
- [ ] Initialize the Node server project
- [ ] Add WebSocket server and health endpoint
- [ ] Accept incoming telemetry messages from the mod
- [ ] Validate payload fields and sanitize malformed messages
- [ ] Log incoming telemetry and message counts

### Deliverables
- live telemetry receiver in the server
- basic diagnostics page or console output

### Done when
- the bridge receives real data from the mod without disconnects
- telemetry payloads are valid and consistent

---

## Day 4 — Basic UI Shell and Live Data Rendering

### Goals
- create the first browser UI
- show live machine data in a readable layout
- connect the UI to the bridge websocket

### Tasks
- [ ] Initialize the frontend app in `/web`
- [ ] Create a simple dashboard shell and grid layout
- [ ] Connect to the WebSocket server
- [ ] Render speed, heading, steering, and status values
- [ ] Add a disconnect / reconnect state indicator

### Deliverables
- browser dashboard that shows live machine telemetry
- basic UI state handling for connection loss

### Done when
- the UI updates live as the machine moves in-game
- the dashboard is readable and stable

---

## Day 5 — Map and Field Position Display

### Goals
- visualize the tractor position in a field map
- show location and heading graphically
- prepare for guidance line overlays

### Tasks
- [ ] Add a map library or simple plotting layer
- [ ] Map local coordinates into a visible field view
- [ ] Render tractor icon and heading vector
- [ ] Add a field boundary placeholder or map overlay layer
- [ ] Add a simple coordinate readout panel

### Deliverables
- field map with live tractor marker
- visual trace of machine movement over time

### Done when
- tractor position appears in the UI and tracks correctly with motion
- map overlay looks stable and aligned to gameplay movement

---

## Day 6 — Basic Guidance Mode and Correction Logic

### Goals
- add the first guided operating mode
- calculate lateral error and steering correction
- expose guidance state visibly to the operator

### Tasks
- [ ] Define a simple guidance mode model: manual / straight / guided
- [ ] Record a reference line or fixed heading target
- [ ] Calculate cross-track error from live vehicle position
- [ ] Apply a simple steering correction formula
- [ ] Show guidance state, target heading, and cross-track error in the UI

### Deliverables
- functional guidance mode
- live guidance correction values visible in the dashboard

### Done when
- the system reduces lateral drift when a reference line is active
- examples of guidance status are visible to the operator

---

## Day 7 — Pass Logging and Coverage Snapshot

### Goals
- record the path traveled during operation
- save pass data for future guidance and overlay work
- confirm the system captures meaningful field activity

### Tasks
- [ ] Sample vehicle position at defined intervals during an operation
- [ ] Store pass points with timestamp and metadata
- [ ] Create a pass record object for a field or operation
- [ ] Render a pass path as a visible line in the map
- [ ] Save data to a JSON or local file structure

### Deliverables
- basic pass log and path visualization
- persisted operation data for later use

### Done when
- a field operation creates a valid pass record
- the pass path accurately reflects the path traveled by the machine

---

## Day 8 — Guidance-Line Reuse and Simple Repetition

### Goals
- generate a reusable guidance line from recorded pass data
- enable follow-up operation logic based on first-pass tracking

### Tasks
- [ ] Load recorded pass data into the frontend or bridge
- [ ] Convert pass points to a guidance polyline
- [ ] Offset line geometry based on vehicle or implement width
- [ ] Add a simple repeat-guidance mode using previously recorded pass data
- [ ] Display the line overlay in the map UI

### Deliverables
- first reusable guidance path
- repeatable line following for a second pass or follow-up operation

### Done when
- the UI can display a generated guidance line and the operator can use it
- the result is believable and consistent with field movement

---

## Day 9 — Stabilization, Error Handling, and UX Refinement

### Goals
- eliminate obvious instability in the telemetry and UI path
- improve operator feedback and recovery behavior

### Tasks
- [ ] Add reconnect / lost-connection handling
- [ ] Handle missing or invalid telemetry gracefully
- [ ] Reduce UI jitter and stale data issues
- [ ] Improve dashboard labels and operation states
- [ ] Add visual state messages such as waiting, guiding, active, and disconnected

### Deliverables
- more polished, robust first-version experience
- reduced user confusion when data drops or reconnects happen

### Done when
- the system remains usable under connection interruption
- operator state is always understandable from the UI

---

## Day 10 — End-to-End Validation and Phase 1 Signoff

### Goals
- validate the entire pipeline from game to UI
- confirm the project is ready for the next technical phase

### Tasks
- [ ] Run a complete in-game round trip: mod → bridge → UI → command state
- [ ] Confirm telemetry is stable during active operation
- [ ] Confirm pass logs are stored and readable
- [ ] Confirm guidance mode works during movement
- [ ] Review all critical bugs and log them as Phase 2 backlog items

### Deliverables
- phase completion report
- list of issues to carry into the next phase
- final signoff criteria met

### Done when
- the system works end-to-end for the core precision-ag workflow
- the project is ready to expand into more advanced guidance, section control, and sync features

---

## Phase 1 Risk Register

### Risk: telemetry instability
- Mitigation: add payload validation and message rate control

### Risk: UI overloading
- Mitigation: keep the first dashboard minimal and focused on core machine data

### Risk: path drift or inaccurate guidance
- Mitigation: use a small, stable reference line model and tune PID-like values conservatively

### Risk: data persistence problems
- Mitigation: store structured pass records early and validate file read/write reliability

---

## Suggested Phase 1 Output

The first implementation should be considered successful if it delivers:

- a live vehicle telemetry stream
- a functioning bridge and UI connection
- a basic guidance mode
- tracking of covered pass history
- enough reliability to begin the next phase of automation work

This is the minimum viable precision-ag foundation for the mod suite.
