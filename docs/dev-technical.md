# FS25 John Deere Precision Ag Technical Implementation Plan

This document defines the engineering plan for building a real-world Deere-inspired precision agriculture system inside Farming Simulator 25. It is intended to translate actual precision-ag technology into a practical and buildable FS25 architecture rather than a shallow visual simulation.

The implementation is based on the structure used by real Deere systems:

- vehicle telemetry and machine state export
- in-cab display workflow
- guidance control and steering correction
- connected data flow between vehicle, bridge, and frontend
- field coverage tracking and pass records
- operational data storage for future analysis and automation

---

## 1. Design Objective

The project should produce a precision-ag stack that behaves like an actual John Deere operational system:

- machine position, heading, speed, and steering are always tracked
- guidance is data-driven and repeatable
- field coverage is visible and measurable
- the operator sees the machine as part of a connected field system
- the display is a practical interface, not just a cosmetic HUD

This is the core difference between a generic mod and a believable precision agricultural suite.

---

## 2. Real-World Architecture to Implement

A real Deere precision-ag stack is organized around connected layers, not a single feature block.

```text
FS25 Simulation / Lua Layer
  - vehicle telemetry export
  - implement state tracking
  - guidance and steering logic
  - field pass logging
  - Dashboard Live variable registration

        │
        ▼
Local bridge / service
  - receives telemetry
  - routes commands and status
  - stores field and session data
  - exposes live machine state

        │
        ▼
Operator frontend
  - G5-style display shell
  - field map and guidance overlays
  - pass coverage and machine status
  - machine monitoring and configuration
```

This structure mirrors how real Deere systems flow from machine to display to data platform.

---

## 3. Engineering Principles

### 3.1 Telemetry first
The precision-ag system must be driven by real machine telemetry. Guidance and coverage are meaningless without reliable position and orientation data.

### 3.2 Data model before UI polish
The project should define the telemetry schema, machine state model, and pass data contract before building deeper UI features.

### 3.3 Real guidance logic
Guidance should follow a proper lateral-error model rather than simply drawing a line on a map. The system must react to heading and offset, not just display values.

### 3.4 Operation-aware architecture
The system should understand when the vehicle is idle, driving, guided, turning, in headland, or in a field operation.

### 3.5 Extensibility
The stack should be modular enough to add section control, variable-rate patterns, and multi-machine coordination later without reworking the entire design.

---

## 4. System Components

## 4.1 FS25 Lua / Mod Layer

This is the data-generation layer. It owns the actual machine state and sends it to the bridge.

### Responsibilities

- export x, z, heading, speed, and steering state
- track implement width and raised/lowered state
- detect active operation and guidance state
- capture pass points and field activity
- register variables for Dashboard Live widgets
- send telemetry to the local bridge at a controlled interval

### Core values to export

These values are captured once by the Lua spec and consumed independently by two downstream paths: the bridge (for the web operator interface) and, optionally, Dashboard Live / Dashboard Live Vanilla Vehicles (for the physical in-cab display), via a `tasDyn.*` `DashboardValueType` registration. Neither path depends on the other — see 4.2.

#### Machine / engine

- vehicleId
- speed
- engineRpm
- gear
- fuelUsage
- operatingTime

#### Position and guidance

- position: x, y, z
- heading
- steeringAngle
- guidanceMode
- guidanceActive
- crossTrackError
- targetHeading
- referenceLineId

#### Implement

- implementState (raised / lowered / active)
- implementWidth
- implementType
- attachedImplementIds
- sectionStates (array, for section control)

#### Precision ag

- fillLevel / targetFillLevel
- seedType or product type
- applicationRate
- fieldNumber

#### Field and operation context

- operationMode
- currentFieldId
- currentOperation
- passId
- coveragePercent

#### System status

- machineStatus
- activeWarnings

### Candidate Lua API

- updateTelemetry()
- updateMachineState()
- logPassPoint()
- applyGuidanceCorrection()
- registerDashboardVariables()
- sendBridgeMessage(type, payload)

---

## 4.2 Dashboard Live and Dashboard Live Vanilla Vehicles (Dependency Layer)

Dashboard Live (DBL) and Dashboard Live Vanilla Vehicles (DBL_VV) are declared mod dependencies, not code this project integrates into. DBL_VV already ships working G4 and G5 in-cab display geometry and XML for the John Deere 6M/6R/7R/8R/8RT/8RX/9R/9RX/S7 lineup, including G5 aPillar and console displays with ISOBUS and RTK pages. That is the physical in-cab hardware layer; it does not need to be rebuilt.

### How data actually flows

DBL is a one-way consumer. It reads live vehicle spec state through its own `DashboardValueType` registrations and paints it onto in-cab display nodes. It exposes no API to read data back out, and no public mechanism for other mods to register new commands into its own namespace.

Because of this, the `tasDynPrecisionAg` Lua spec does not route telemetry through DBL. It reads the same underlying vehicle and implement state independently — plus data DBL has no concept of, such as cross-track error, guidance mode, and pass coverage — and sends it to the bridge for the web operator interface. DBL and the web app are two parallel consumers of the same base game state, not a pipeline.

### Optional in-cab extension

The Lua spec may additionally register its own `tasDyn.*` `DashboardValueType` (via `onRegisterDashboardValueTypes`), which lets DBL_VV's existing G5 display compounds render TasDyn-specific values (for example `<dashboard valueType="tasDyn.guidance" cmd="crossTrackError" .../>`) without building new i3d geometry. This is an enhancement to the physical display, not a requirement for the web app to function.

### Integration rule

The bridge and web app must work correctly whether or not DBL / DBL_VV are installed. DBL enriches the in-cab experience; it is never a dependency of the guidance, pass-tracking, or web-rendering logic.

---

## 4.3 Local Bridge / Service Layer

The bridge is the connection point between game telemetry and the browser UI. It is analogous to the machine-data communication layer in real Deere systems.

Telemetry reaching the bridge originates directly from the `tasDynPrecisionAg` Lua spec's own read of vehicle and implement state (see 4.1). It is not routed through or dependent on Dashboard Live.

### Responsibilities

- accept telemetry from FS25
- broadcast to connected clients
- accept commands from UI or operator tools
- relay machine commands back to the game
- store session and field state
- maintain status and heartbeat flow

### Transport model

- WebSocket for real-time telemetry and command updates
- HTTP endpoint for health, status, and data reads
- optional JSON file persistence for field and session records

### Example telemetry message

```json
{
  "type": "telemetry",
  "vehicleId": "tractor_01",
  "timestamp": 1712345678,
  "payload": {
    "x": 121.3,
    "z": 455.2,
    "heading": 0.82,
    "speed": 8.4,
    "steering": 0.15,
    "implementWidth": 12.8,
    "implementState": "lowered",
    "guidanceActive": true,
    "machineStatus": "working"
  }
}
```

### Example command message

```json
{
  "type": "command",
  "vehicleId": "tractor_01",
  "command": "setGuidanceMode",
  "value": "autoPath"
}
```

---

## 4.4 Frontend Operator Interface

The web app is a full-fidelity recreation of the John Deere G5 Command Center and G5 Universal Display software — not a simplified telemetry dashboard. The visual target is already defined in `docs/Design/`:

- `TasDyn_G5_Command.html` — Command Center overview
- `TasDyn_G5_Master_Display.html` — master display shell, pages 1-6
- `TasDyn_G5_Page1_Guidance_Exact.html` — guidance run screen
- `TasDyn_G5_Page2_Tillage.html` — tillage run screen
- `TasDyn_G5_Page3_AirSeeder.html` — air seeder run screen
- `TasDyn_G5_Page4_RateController.html` — rate controller run screen
- `TasDyn_G5_Page5_Terminal1.html` — terminal run screen
- `TasDyn_G5_Page6_ISOBUSRunPage.html` — ISOBUS run page

These mockups are static; they contain no live data bindings yet. Wiring them to the bridge's WebSocket stream is frontend implementation work, not a redesign.

### Functional areas

- field map and machine tracker
- guidance line and current path overlay
- pass history and coverage display
- run-page switching matching the G5 page set above (guidance, tillage, air seeder, rate controller, ISOBUS, terminal)
- machine status and alerts
- configuration controls for guidance and sync
- field record review

### Recommended frontend stack

- HTML/CSS/JS for the initial prototype, building directly on the existing `docs/Design/` markup
- more structured frontend later if needed
- map rendering for the field view
- WebSocket client for live updates

---

## 5. Guidance and Steering Model

Real Deere guidance systems use a position and heading loop that continuously compares the machine to a reference path. The FS25 implementation should do the same.

### 5.1 Core geometry

The machine state is defined by:

- position: $x$, $z$
- heading: $\theta$
- reference line position: $x_{ref}$, $z_{ref}$
- target course direction: $\theta_{ref}$

### 5.2 Cross-track error

The key measurement is lateral offset from the guidance line:

$$e_{ct} = (x_{veh} - x_{ref})\sin(\theta_{ref}) - (z_{veh} - z_{ref})\cos(\theta_{ref})$$

This gives a numeric error value that can drive steering correction.

### 5.3 Steering controller

A practical controller can be implemented using a PID-style correction model:

$$\delta(t) = K_p e_{ct}(t) + K_i \int_0^t e_{ct}(\tau)\,d\tau + K_d \frac{de_{ct}(t)}{dt}$$

### Implementation notes

- tune gains separately for tractors and harvesters
- apply steering limits to keep behavior realistic
- smooth correction with damping to prevent oscillation
- detect when the machine leaves the guidance line
- support manual override and reacquisition

This is the real engineering pattern behind modern guidance systems.

---

## 6. Field Pass Generation and Coverage Logic

Deere systems store field operations as structured records and use them later for repeated passes and coverage review.

### Required pass record structure

```ts
interface FieldPassRecord {
  passId: string;
  fieldId: string;
  vehicleId: string;
  operationType: 'planting' | 'spraying' | 'fertilizing' | 'harvesting' | 'tillage';
  points: Array<{ x: number; z: number; heading?: number; timestamp?: number }>;
  implementWidth: number;
  status: 'active' | 'complete' | 'paused';
  timestamp: number;
}
```

### Workflow

1. begin an operation
2. record pass samples at a fixed interval
3. store points with heading and vehicle metadata
4. build a path polyline from data
5. offset the path based on implement width
6. store the generated guidance line for reuse

### Coverage logic

The system should understand:

- where the machine has already traveled
- how much overlap exists
- which areas are complete or skipped
- how tool width affects pass pattern planning

This is a major part of actual precision-ag workflow and should be core to the FS25 implementation.

---

## 7. Section Control and Application Efficiency

Section control is one of the best examples of real Deere precision-ag logic. It reduces double application and minimizes wasted inputs.

### Feature requirements

- define implement sections and their physical coverage area
- compare current coverage against already-treated zones
- disable sections where overlap exists
- manage on/off state as vehicle progresses through field

### Data required

- implement width
- section count
- section state
- field coverage mask
- pass direction and location history

### Examples in FS25

- spraying should stop or turn off sections in already sprayed areas
- seeding should respect prior pass overlap
- fertilizer patterns should reflect field records and coverage history

This moves the project beyond a visual “precision” layer and into real operational efficiency.

---

## 8. Field Data and Persistence

Real Deere systems rely on structured field data. That is what converts raw machine movement into useful operations.

### Recommended storage layout

```text
/data/
  fields/
    field_001.json
  passes/
    field_001_planting_001.json
  guidance/
    field_001_guidance_001.json
  sessions/
    session_2026_08_11.json
```

### Persistent data types

- field boundaries
- guidance lines
- pass records
- operation history
- machine state snapshots
- session summaries

### Persistence rules

- save pass data on interval or completion
- maintain field record schema versioning
- separate session data from long-term field history
- ensure old records are not silently corrupted by new versions

---

## 9. Machine Sync and Coordination

Real precision-ag ecosystems are not limited to one machine. They may involve coordinated work between multiple machines and operators. That should inform the design of the FS25 system.

### Potential multi-machine model

- leader / follower roles
- shared field operation status
- synchronized pass progress
- machine heartbeat and local reconnect handling
- command routing between machines

### Example sync message

```json
{
  "type": "syncState",
  "leaderId": "tractor_01",
  "position": { "x": 28.5, "z": 58.2 },
  "heading": 2.1,
  "status": "working"
}
```

This is aligned with real-world machine connectivity and coordinated farm operations.

### Scope note: G5 Terminal vs. a server-wide dashboard

The G5 Terminal (`web/`) is scoped to a single operator's own machine only -- it reads telemetry for whichever vehicle the local player is controlling (gated by `getIsControlled()` in the Lua spec) and stays that way even when playing on someone else's server. It is not the place to build multi-player/server-wide visibility.

A separate, later project -- a full server-wide dashboard (mobble.io-style: every player, vehicle, and field visible at once) -- would need a materially different data contract: a dedicated-server-side export looping over `g_currentMission.vehicleSystem.vehicles` / `userManager`, gated on `g_currentMission.connectedToDedicatedServer`, similar in shape to how `FS25_VG_Livemap` exports all-player state. Do not conflate the two; the G5 Terminal's single-operator export should not be extended into a multi-vehicle broadcast to serve this use case.

---

## 10. UI and Functional Layout

The frontend should be organized as a proper operator display, not as a random dashboard.

### Core UI blocks

- top status bar with machine health and operation mode
- left panel for telemetry and diagnostics
- center map panel with field and guidance overlay
- right panel for guidance state and machine actions
- lower strip for event feed and operational logging

### Design principle

The interface should be clear enough to be useful while driving. It must prioritize actionable operator information over decorative data.

---

## 11. State Model

The bridge and frontend should share an explicit machine state structure.

```ts
interface VehicleState {
  vehicleId: string;
  name: string;
  x: number;
  z: number;
  heading: number;
  speed: number;
  steeringAngle: number;
  implementState: 'raised' | 'lowered' | 'active';
  guidanceMode: 'manual' | 'straight' | 'autoPath' | 'turn';
  guidanceActive: boolean;
  machineStatus: 'idle' | 'working' | 'turning' | 'paused';
  currentFieldId?: string;
  currentOperation?: string;
  crossTrackError?: number;
}
```

This keeps the data contract stable and easy to validate.

---

## 12. Implementation Roadmap

## Phase 1: Telemetry foundation

- export live machine state from FS25
- validate packet flow through the local bridge
- render live values in a basic display
- verify machine update rates and timing

## Phase 2: Guidance engine

- store guidance lines
- compute cross-track error
- apply steering correction logic
- support manual and guided modes

## Phase 3: Pass tracking

- capture path samples during operations
- build pass records and coverage data
- render field overlays
- persist pass summaries

## Phase 4: Section control and efficiency

- implement overlap prevention logic
- support implement section states
- add pass completion and coverage metrics

## Phase 5: Advanced operations

- multiple-machine coordination
- operation planning and analysis
- deeper guidance and automation logic
- extension toward a full Deere-style precision-ag suite

---

## 13. Risks and Constraints

### 13.1 Real-time timing
If telemetry updates are too slow, guidance and pass tracking will feel inaccurate. The system needs controlled, stable message frequency.

### 13.2 Overengineering the UI
The project must keep the UI useful and readable. A real in-cab display should not overwhelm the operator.

### 13.3 Data quality
Field records must be valid and consistent. If the path data is noisy or malformed, guidance will be unreliable.

### 13.4 Mod environment constraints
FS25 integration boundaries and game constraints must be treated as first-class design constraints.

---

## 14. Recommended Execution Order

1. define telemetry schema
2. build bridge and live message flow
3. render operator dashboard with live values
4. implement guidance line logic and error tracking
5. add pass recording and field coverage
6. integrate section control and overlap logic
7. add persistence and operational review
8. expand to multi-machine flow when the core is stable

This progression mirrors actual precision-ag system development in the real world.

---

## 15. Final Engineering Recommendation

The proper implementation direction for this project is to build a connected machine-data system first, then add precision-ag behavior on top.

Do not begin with a broad UI or large feature list. Start with:

- telemetry export
- machine state flow
- a working bridge
- real guidance math
- pass tracking and coverage visibility

Once that foundation is reliable, add more advanced Deere-style functions such as section control, operational review, and multi-machine coordination.

That approach delivers a credible FS25 precision-ag mod and aligns strongly with how John Deere precision agriculture actually works in the real world.

---

## 16. Conclusion

This technical plan gives the project a realistic FS25 implementation path grounded in the actual architecture behind John Deere Precision Ag systems: connected machine data, operator displays, guidance logic, field coverage analysis, and structured farm records.

The FS25 mod should be designed as a layer-based precision-ag platform, not a single disconnected feature. The result should feel like a genuine digital system used to guide, monitor, and optimize field operations in a connected, data-driven workflow.
